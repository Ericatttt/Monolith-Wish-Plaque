# 神社许愿墙 (Wish Wall Shrine)

一个基于 Solana 区块链的去中心化许愿墙应用。用户可以在链上写下心愿，浏览他人的愿望并捐赠支持，以及管理自己的愿望和标记实现状态。

## 项目概述

**核心理念**: "痛苦分享可以减半，快乐分享就会加倍"

### 功能特点

- ✨ **链上许愿**: 将心愿永久存储在 Solana 区块链上
- 👀 **浏览愿望**: 查看所有用户最近的愿望
- 💰 **捐赠支持**: 为他人的愿望捐赠 SOL
- ✅ **还愿功能**: 标记愿望为"已实现"或"未实现"
- 🔐 **去中心化**: 完全链上存储，无需中心化服务器

## 技术栈

### 智能合约
- **Framework**: Anchor 0.32.1
- **Language**: Rust
- **Blockchain**: Solana (Devnet → Mainnet)

### 前端 (计划中)
- **Framework**: React Native + Expo
- **Wallet**: Solana Mobile Wallet Adapter
- **Platform**: Android (Solana Mobile)

## 项目结构

```
wish_wall/
├── programs/
│   └── wish_wall/
│       └── src/
│           ├── lib.rs          # 主程序逻辑
│           ├── state.rs        # 数据结构定义
│           └── error.rs        # 错误定义
├── tests/
│   └── wish_wall.ts           # 测试文件
├── target/
│   ├── deploy/
│   │   └── wish_wall.so       # 编译后的程序
│   └── idl/
│       └── wish_wall.json     # IDL 文件
└── Anchor.toml                # Anchor 配置
```

## 智能合约

### 数据结构

#### WishWallState (全局状态)
```rust
pub struct WishWallState {
    pub authority: Pubkey,        // 程序管理员
    pub total_wishes: u64,        // 总许愿数
    pub bump: u8,                 // PDA bump
}
```

#### Wish (单个愿望)
```rust
pub struct Wish {
    pub owner: Pubkey,            // 许愿人钱包地址
    pub wish_id: u64,             // 愿望ID
    pub content: String,          // 愿望内容 (max 500 chars)
    pub nickname: String,         // 昵称 (max 50 chars)
    pub created_at: i64,          // 创建时间戳
    pub status: WishStatus,       // 状态
    pub nft_mint: Pubkey,         // NFT Mint 地址 (未来功能)
    pub total_donations: u64,     // 收到的捐赠总额
    pub bump: u8,
}
```

#### WishStatus (愿望状态)
```rust
pub enum WishStatus {
    Pending,      // 黄色 - 初始状态
    Fulfilled,    // 绿色 - 已实现
    Unfulfilled,  // 黄色 - 未实现
}
```

### 核心指令

1. **initialize** - 初始化程序状态
   - 创建全局 WishWallState PDA
   - 设置程序管理员

2. **create_wish** - 创建新愿望
   - 验证内容长度（≤500字符）
   - 验证昵称长度（≤50字符）
   - 创建 Wish PDA 账户
   - 记录时间戳

3. **update_wish_status** - 更新愿望状态
   - 仅愿望所有者可更新
   - 设置为 Fulfilled 或 Unfulfilled

4. **donate_to_wish** - 捐赠 SOL
   - 从捐赠者转账到愿望所有者
   - 更新捐赠总额计数

### PDA 设计

- **State PDA**: `["wish-wall-state"]`
- **Wish PDA**: `["wish", wish_id.to_le_bytes()]`

## 安装和构建

### 前置要求

- Rust 1.92+
- Solana CLI 3.0+
- Anchor CLI 0.32+
- Node.js 16+
- Yarn

### 构建程序

```bash
# 克隆项目
cd wish_wall

# 安装依赖
yarn install

# 构建程序
anchor build

# 运行测试
anchor test
```

### 部署到 Devnet

```bash
# 配置 Solana CLI
solana config set --url devnet

# 检查余额 (需要至少 2 SOL)
solana balance

# 如果余额不足，请求空投
solana airdrop 2

# 部署程序
anchor deploy --provider.cluster devnet
```

### 部署到 Mainnet

```bash
# 配置 Solana CLI
solana config set --url mainnet-beta

# 确保钱包有足够 SOL (约 3-5 SOL)
solana balance

# 部署程序
anchor deploy --provider.cluster mainnet-beta
```

## 测试

测试文件包含以下测试用例:

- ✅ 初始化程序状态
- ✅ 创建愿望
- ✅ 更新愿望状态（已实现/未实现）
- ✅ 捐赠 SOL 给愿望
- ✅ 验证空内容拒绝
- ✅ 验证空昵称拒绝
- ✅ 查询所有愿望

运行测试:
```bash
anchor test
```

## 使用成本

### 用户操作成本

- **创建愿望**: ~0.01-0.02 SOL
  - 账户 rent: ~0.0089 SOL
  - 交易费: ~0.00001 SOL

- **更新状态**: ~0.00001 SOL (仅交易费)

- **捐赠**: 自定义金额 + ~0.00001 SOL 交易费

### 部署成本

- **Devnet**: 免费（测试用）
- **Mainnet**: 约 2-5 SOL

## 程序 ID

当前程序 ID（需在部署后更新）:
```
5h3QsDrsKy4WFmjjqkVGSHyiKXas2enKbYirWv3SCE7c
```

## 未来功能

### 近期计划

- [ ] React Native 移动应用
  - 神社许愿板界面
  - 许愿创建界面
  - 我的愿望管理界面
- [ ] Solana Mobile Wallet 集成
- [ ] 改进的UI/UX设计

### 长期计划

- [ ] NFT 铸造功能
  - 每个愿望自动铸造为 NFT
  - 使用 Metaplex Token Metadata
- [ ] 愿望分类和标签
- [ ] 搜索和过滤功能
- [ ] 社交分享功能
- [ ] 愿望评论系统

## 安全考虑

- ✅ 所有权验证（仅所有者可更新愿望状态）
- ✅ 输入验证（内容和昵称长度限制）
- ✅ 溢出保护（使用 checked_add）
- ✅ PDA 权限控制

## 许可证

MIT

## 贡献

欢迎提交 Pull Request 和 Issue!

## 联系方式

如有问题或建议，请提交 GitHub Issue。

---

**注意**: 此项目目前处于开发阶段，仅部署在 Devnet 用于测试。在 Mainnet 部署前请确保进行充分的安全审计。
