# Wish Wall — Anchor Smart Contract

> Program ID: `HXP5UvapL8Pv9P1vY7LYhAMv2VcbJZnn7zhfRJ9Eb8Bv`
> Network: Solana Devnet
> Framework: Anchor 0.32

---

## 目录 / Contents

1. [整体架构](#整体架构)
2. [账户结构](#账户结构)
3. [指令说明](#指令说明)
4. [PDA 推导规则](#pda-推导规则)
5. [错误码](#错误码)
6. [安全机制](#安全机制)
7. [字节布局参考](#字节布局参考)
8. [构建与部署](#构建与部署)

---

## 整体架构

合约由三个源文件组成：

```
programs/wish_wall/src/
├── lib.rs      # 程序入口：4 条指令 + 4 个 Context 结构体
├── state.rs    # 账户数据结构：WishWallState、Wish、WishStatus
└── error.rs    # 自定义错误码：6 种错误
```

**核心设计思路：**

整个许愿墙只有**两类链上账户**：

| 账户 | 作用 | 数量 |
|------|------|------|
| `WishWallState` | 全局计数器，记录当前总愿望数 | 唯一，全局共享 |
| `Wish` | 单条愿望数据 | 每发一条愿望创建一个 |

没有数据库，没有索引服务——所有数据直接住在链上账户里，客户端通过确定性的 PDA 推导即可按 ID 批量拉取全部愿望。

---

## 账户结构

### WishWallState

```rust
#[account]
pub struct WishWallState {
    pub authority: Pubkey,     // 合约部署者/管理员地址
    pub total_wishes: u64,     // 已创建的愿望总数（自增计数器）
    pub bump: u8,              // PDA bump seed（节省每次重新计算的开销）
}
```

**空间：49 字节**

| 字段 | 类型 | 字节数 | 说明 |
|------|------|--------|------|
| Discriminator | — | 8 | Anchor 自动加，用于账户类型识别 |
| `authority` | Pubkey | 32 | 管理员公钥 |
| `total_wishes` | u64 | 8 | 愿望计数器 |
| `bump` | u8 | 1 | PDA bump |
| **合计** | | **49** | |

`total_wishes` 同时充当**下一条愿望的 ID 生成器**：创建愿望时先 `+1`，再用新值作为当前愿望的 `wish_id`，保证 ID 从 1 开始连续递增。

---

### Wish

```rust
#[account]
pub struct Wish {
    pub owner: Pubkey,           // 许愿者的钱包地址
    pub wish_id: u64,            // 愿望 ID（1, 2, 3, …）
    pub content: String,         // 愿望正文（最多 500 字符）
    pub nickname: String,        // 许愿者昵称（最多 50 字符）
    pub created_at: i64,         // 创建时间（Unix 时间戳，秒）
    pub status: WishStatus,      // 愿望状态（见下）
    pub nft_mint: Pubkey,        // NFT 铸造地址（预留字段，当前为默认值）
    pub total_donations: u64,    // 累计收到的捐赠（单位：lamports）
    pub bump: u8,                // PDA bump
}
```

**空间：2306 字节**

| 字段 | 类型 | 字节数 | 说明 |
|------|------|--------|------|
| Discriminator | — | 8 | Anchor 账户标识符 |
| `owner` | Pubkey | 32 | 所有者公钥 |
| `wish_id` | u64 | 8 | 唯一 ID |
| `content` | String | 4 + 500×4 = 2004 | 4 字节长度前缀 + 最多 500 个 UTF-8 字符（每字符最多 4 字节）|
| `nickname` | String | 4 + 50×4 = 204 | 同上，最多 50 字符 |
| `created_at` | i64 | 8 | Unix 时间戳 |
| `status` | enum | 1 | Pending/Fulfilled/Unfulfilled |
| `nft_mint` | Pubkey | 32 | NFT 预留字段 |
| `total_donations` | u64 | 8 | 捐赠累计（lamports）|
| `bump` | u8 | 1 | PDA bump |
| **合计** | | **2306** | |

> 按最大空间预分配（2306 字节），Rent-exempt 押金约 **0.016 SOL**，这正是发愿时用户需支付的主要费用。

---

### WishStatus

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum WishStatus {
    Pending,      // 0 — 待定（黄色）
    Fulfilled,    // 1 — 已实现（绿色）
    Unfulfilled,  // 2 — 未实现（保持黄色）
}
```

序列化为单字节整数：`0 = Pending`，`1 = Fulfilled`，`2 = Unfulfilled`。客户端手动解析时直接读对应字节与此对应。

---

## 指令说明

### 1. `initialize`

**作用：** 初始化全局状态账户，整个合约生命周期只需调用一次。

```rust
pub fn initialize(ctx: Context<Initialize>) -> Result<()>
```

**参数：** 无

**执行流程：**
1. 创建 `WishWallState` PDA 账户（seeds: `["wish-wall-state"]`）
2. 将 `authority` 设为调用者公钥
3. `total_wishes = 0`
4. 记录 bump 以备后续使用

**涉及账户：**

| 账户 | 权限 | 说明 |
|------|------|------|
| `state` | init, writable | 新建的全局状态 PDA |
| `authority` | signer, writable | 部署者，支付 rent |
| `system_program` | — | 创建账户所需 |

---

### 2. `create_wish`

**作用：** 发布一条新愿望，在链上创建对应的 `Wish` PDA 账户。

```rust
pub fn create_wish(
    ctx: Context<CreateWish>,
    content: String,
    nickname: String,
) -> Result<()>
```

**参数：**
- `content`：愿望正文，1–500 字符
- `nickname`：许愿者昵称，1–50 字符

**执行流程：**
1. 校验 `content` 非空且 ≤ 500 字符
2. 校验 `nickname` 非空且 ≤ 50 字符
3. `state.total_wishes += 1`（使用 `checked_add` 防溢出）
4. 创建新的 `Wish` PDA，seeds: `["wish", wish_id.to_le_bytes()]`
5. 填充所有字段：owner、wish_id、content、nickname、created_at（链上时钟）、status = Pending、nft_mint = Pubkey::default()、total_donations = 0

**用户成本：** 约 0.016–0.02 SOL（2306 字节账户的 rent-exempt 押金 + 交易手续费）

**涉及账户：**

| 账户 | 权限 | 说明 |
|------|------|------|
| `state` | writable | 更新计数器 |
| `wish` | init, writable | 新建愿望账户 |
| `owner` | signer, writable | 许愿者，支付 rent |
| `system_program` | — | 创建账户所需 |

> **注意：** Wish PDA 的种子用的是 `state.total_wishes + 1`（创建前的值加一），客户端在构建交易时需先读取当前 `total_wishes`，加 1 后推导出正确的 PDA 地址。

---

### 3. `update_wish_status`

**作用：** 许愿者将自己的愿望标记为"已实现"或"未实现"。

```rust
pub fn update_wish_status(
    ctx: Context<UpdateWishStatus>,
    new_status: WishStatus,
) -> Result<()>
```

**参数：**
- `new_status`：新状态，`Fulfilled` 或 `Unfulfilled`

**执行流程：**
1. 验证 `wish.owner == ctx.accounts.owner.key()`（只有原作者可更新）
2. 将 `wish.status` 更新为 `new_status`
3. 打印对应日志

**权限控制：** Anchor 的 `Signer` 约束保证调用者已签名，`require!` 验证签名者与存储的 `wish.owner` 一致，双重保障只有原作者可修改。

**涉及账户：**

| 账户 | 权限 | 说明 |
|------|------|------|
| `wish` | writable | 要更新的愿望 PDA |
| `owner` | signer | 必须是该愿望的原始创建者 |

---

### 4. `donate_to_wish`

**作用：** 向某条愿望的作者捐赠 SOL，表达支持。

```rust
pub fn donate_to_wish(
    ctx: Context<DonateToWish>,
    amount: u64,
) -> Result<()>
```

**参数：**
- `amount`：捐赠金额，单位 lamports（1 SOL = 1,000,000,000 lamports），必须 > 0

**执行流程：**
1. 校验 `amount > 0`
2. 通过 **CPI（Cross-Program Invocation）** 调用 System Program 的 `transfer`，将 SOL 从 `donor` 直接转账给 `wish_owner`
3. `wish.total_donations += amount`（使用 `checked_add` 防溢出）

**资金流向：** SOL 直接进入许愿者的个人钱包，不经过任何托管账户，合约不抽成。

**涉及账户：**

| 账户 | 权限 | 说明 |
|------|------|------|
| `wish` | writable | 更新 `total_donations` 计数 |
| `donor` | signer, writable | 捐赠者，SOL 来源 |
| `wish_owner` | writable | 愿望作者，SOL 去向；地址受约束 `address = wish.owner` |
| `system_program` | — | 执行 SOL 转账所需 |

> `wish_owner` 使用 `UncheckedAccount` + `address = wish.owner` 约束，而非加载完整账户数据，节省计算资源的同时确保地址正确性。

---

## PDA 推导规则

所有账户均为 **PDA（Program Derived Address）**，无私钥，由程序完全控制。

### WishWallState PDA

```
seeds = ["wish-wall-state"]
program_id = HXP5UvapL8Pv9P1vY7LYhAMv2VcbJZnn7zhfRJ9Eb8Bv
```

全局唯一，整个程序只有一个。

### Wish PDA

```
seeds = ["wish", wish_id as little-endian u64 bytes]
program_id = HXP5UvapL8Pv9P1vY7LYhAMv2VcbJZnn7zhfRJ9Eb8Bv
```

例如，第 3 条愿望的种子：
```
[0x77, 0x69, 0x73, 0x68,   // "wish"
 0x03, 0x00, 0x00, 0x00,   // 3 as u64 little-endian
 0x00, 0x00, 0x00, 0x00]
```

**客户端批量拉取逻辑（无需索引服务）：**
1. 获取 `WishWallState` PDA → 读取 `total_wishes = N`
2. 循环推导 wish ID 1 → N 的所有 PDA 地址
3. 调用 `getMultipleAccountsInfo`（每批 100 个）获取原始字节数据
4. 手动 Borsh 反序列化（因 Hermes JS 引擎不支持 BorshCoder）

---

## 错误码

| 错误名 | 错误码 | 触发条件 | 错误信息 |
|--------|--------|----------|----------|
| `ContentTooLong` | 6000 | 愿望内容超过 500 字符 | Content exceeds maximum length of 500 characters |
| `NicknameTooLong` | 6001 | 昵称超过 50 字符 | Nickname exceeds maximum length of 50 characters |
| `UnauthorizedStatusUpdate` | 6002 | 非愿望作者试图修改状态 | Only the wish owner can update the wish status |
| `InvalidDonationAmount` | 6003 | 捐赠金额为 0 | Invalid donation amount |
| `EmptyContent` | 6004 | 愿望内容为空字符串 | Content cannot be empty |
| `EmptyNickname` | 6005 | 昵称为空字符串 | Nickname cannot be empty |

> Anchor 自定义错误码从 `6000` 开始（`0x1770`）。

---

## 安全机制

### 1. 所有权校验（Owner Check）
`update_wish_status` 中使用 `require!(wish.owner == ctx.accounts.owner.key())` 在程序逻辑层验证调用者身份，配合 Anchor 的 `Signer` 约束，双重保障只有原作者可修改自己的愿望状态。

### 2. 地址绑定约束（Address Constraint）
`donate_to_wish` 中使用 `#[account(mut, address = wish.owner)]` 约束 `wish_owner` 账户地址，防止攻击者将捐赠资金重定向到任意地址。

### 3. 算术溢出保护
所有计数器递增均使用 Rust 的 `checked_add().unwrap()`，防止整数溢出。

### 4. Bump Seed 规范化
账户约束中明确传入 `bump = state.bump` / `bump = wish.bump`（从存储值读取），而非每次重新查找，避免 bump seed 规范化攻击，同时降低计算开销。

### 5. 输入长度限制
在指令函数入口处即校验字符串长度，拒绝超长数据，防止账户空间溢出。

---

## 字节布局参考

客户端手动反序列化 `Wish` 账户时的字节偏移（供 `src/hooks/useWishes.ts` 参考）：

```
偏移      长度         字段
0         8            Anchor discriminator（跳过）
8         32           owner (Pubkey)
40        8            wish_id (u64 little-endian)
48        4            content 字符串长度前缀 (u32 LE)
52        len          content 字节数据（实际长度由前缀决定）
52+len    4            nickname 字符串长度前缀 (u32 LE)
56+len    nickLen      nickname 字节数据
…         8            created_at (i64 LE)
…         1            status (0=Pending, 1=Fulfilled, 2=Unfulfilled)
…         32           nft_mint (Pubkey，通常全 0)
…         8            total_donations (u64 LE)
…         1            bump
```

> 由于 `content` 和 `nickname` 是变长字段，后续字段的偏移需动态计算。详见 `src/hooks/useWishes.ts` 中的 `readString` / `readU64LE` / `readU32LE` 函数。

---

## 构建与部署

### 前置要求

- Rust 1.79+（见 `rust-toolchain.toml`）
- Solana CLI 2.0+
- Anchor CLI 0.32+
- Node.js 18+ / Yarn

### 构建

```bash
cd program
yarn install
anchor build
```

### 运行测试

```bash
anchor test
```

测试覆盖：初始化、创建愿望、更新状态、捐赠、空内容拒绝、空昵称拒绝。

### 部署到 Devnet

```bash
solana config set --url devnet
solana airdrop 2          # 确保余额充足
anchor deploy --provider.cluster devnet
```

### 部署到 Mainnet

```bash
solana config set --url mainnet-beta
anchor deploy --provider.cluster mainnet-beta
```

> 主网部署约需 2–5 SOL。建议在主网部署前将 `MAX_CONTENT_LEN` 从 500 缩减至 200，可将单条愿望账户费用从 ~0.016 SOL 降至 ~0.006 SOL。

---

## 未来扩展方向

| 功能 | 设计思路 |
|------|----------|
| NFT 铸造 | `nft_mint` 字段已预留，实现时调用 Token Program CPI 铸造 NFT 并将 mint 地址写入账户 |
| 愿望关闭 | 新增 `close_wish` 指令，使用 Anchor `close = owner` 约束关闭账户并退还 rent |
| 愿望搜索 | 链上无法原生全文检索，需引入 Helius / TheGraph 等链下索引服务 |
| 捐赠分成 | 修改 `donate_to_wish`，将一部分捐赠通过 CPI 转入 `authority` 账户作为协议收入 |

---

**注意：** 当前程序部署在 Solana Devnet，Devnet SOL 无真实价值，仅供测试使用。
