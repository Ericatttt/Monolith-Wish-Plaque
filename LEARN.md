# Wish Plaque — 工程学习文档

> 本文档详细拆解 Wish Plaque 的每一层代码，帮助你彻底理解这个 Solana Mobile 应用是怎么运作的。

---

## 目录

1. [整体架构](#1-整体架构)
2. [入口文件 App.tsx](#2-入口文件-apptsx)
3. [Provider 层 — WalletProvider](#3-provider-层--walletprovider)
4. [导航层 — AppNavigator](#4-导航层--appnavigator)
5. [数据读取 — useWishes](#5-数据读取--usewishes)
6. [链上操作 — useProgram](#6-链上操作--useprogram)
7. [页面层 — 三个 Screen](#7-页面层--三个-screen)
8. [工具层 — solana.ts & constants.ts](#8-工具层--solanats--constantsts)
9. [类型系统 — types/index.ts](#9-类型系统--typesindexts)
10. [国际化 — i18n](#10-国际化--i18n)
11. [Solana 核心概念详解](#11-solana-核心概念详解)
12. [关键工程决策](#12-关键工程决策)
13. [数据流全程追踪](#13-数据流全程追踪)
14. [如何扩展](#14-如何扩展)

---

## 1. 整体架构

```
App.tsx
 └── SafeAreaProvider          ← 处理刘海/状态栏安全区域
      └── WalletProvider       ← 全局钱包状态 (publicKey, connect, signAndSendTransaction)
           └── NavigationContainer  ← React Navigation 容器
                └── AppNavigator   ← 底部 Tab 导航
                     ├── HomeScreen      (神社 — 浏览所有愿望)
                     ├── CreateWishScreen (许愿 — 创建新愿望)
                     └── MyWishesScreen  (我的 — 我的愿望列表)
```

**依赖关系图：**

```
Screen
  ↓ 使用
useWishes / useProgram (hooks)
  ↓ 调用
WalletProvider (context) + solana.ts (工具)
  ↓ 通信
Solana Devnet RPC → 链上 Anchor Program
```

---

## 2. 入口文件 App.tsx

```tsx
import './src/i18n';          // ← 第一行：初始化 i18next，必须在所有组件之前加载
import { WalletProvider } from './src/providers/WalletProvider';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>        // ← 最外层：提供安全区域 insets
      <WalletProvider>        // ← 第二层：钱包全局状态
        <NavigationContainer> // ← 第三层：导航上下文
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </WalletProvider>
    </SafeAreaProvider>
  );
}
```

**要点：**
- Provider 的嵌套顺序很重要。`WalletProvider` 包裹 `NavigationContainer`，意味着所有页面都可以通过 `useWallet()` 访问钱包状态。
- `import './src/i18n'` 在最顶部执行，确保 i18next 在任何 `t()` 调用前已初始化。

---

## 3. Provider 层 — WalletProvider

**文件：** `src/providers/WalletProvider.tsx`

这是整个应用的钱包核心，封装了 Mobile Wallet Adapter (MWA) 的所有复杂逻辑。

### 3.1 MWA 是什么？

Mobile Wallet Adapter 是 Solana Mobile Stack 的核心协议。它定义了 **App（dApp）** 和 **钱包 App** 之间的通信方式：

```
你的 App (Wish Plaque)
        ↕ MWA 协议 (本地 socket)
钱包 App (Phantom / Solflare)
        ↕
   Solana 网络
```

App 不直接持有私钥，所有签名都在钱包 App 内部完成。

### 3.2 IDENTITY 标识

```ts
const IDENTITY = {
  name: '神社许愿墙',
  uri: 'https://wishwall.app',
  icon: '/icon.png',
} as const;
```

这是你的 App 在钱包授权界面显示的信息。用户会看到"神社许愿墙 正在请求访问"。

### 3.3 connect() — 首次授权

```ts
const connect = async () => {
  await transact(async (wallet) => {
    const result = await wallet.authorize({
      cluster: 'devnet',
      identity: IDENTITY,
    });

    authTokenRef.current = result.auth_token;  // 保存 token
    const pubKey = new PublicKey(
      Buffer.from(result.accounts[0].address, 'base64')  // base64 → PublicKey
    );
    setPublicKey(pubKey);
    setConnected(true);
  });
};
```

- `transact()` 打开与钱包 App 的连接通道
- `wallet.authorize()` 弹出钱包授权界面，用户选择账户
- 返回的 `auth_token` 是后续操作的凭证，用 `useRef` 存储（不触发重渲染）
- 账户地址以 base64 格式返回，需要转换为 `PublicKey`

### 3.4 signAndSendTransaction() — 签名并广播

```ts
const signAndSendTransaction = async (transaction: any): Promise<string> => {
  const [sigBytes] = await transact(async (wallet) => {
    // reauthorize：复用 token，不重新弹出账户选择
    if (authTokenRef.current) {
      try {
        const reAuthResult = await wallet.reauthorize({
          auth_token: authTokenRef.current,
          identity: IDENTITY,
        });
        authTokenRef.current = reAuthResult.auth_token; // token 会刷新
      } catch {
        // token 过期 → 重新完整授权
        const authResult = await wallet.authorize({ cluster: 'devnet', identity: IDENTITY });
        authTokenRef.current = authResult.auth_token;
      }
    }

    return wallet.signAndSendTransactions({ transactions: [transaction] });
  });

  // sigBytes 是 Uint8Array，需要转为 base58 字符串
  const signature = bs58.encode(Buffer.from(sigBytes));
  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
};
```

**为什么用 `reauthorize` 而不是每次都 `authorize`？**

`authorize()` 会弹出账户选择界面，用户必须手动选账户，体验差。
`reauthorize()` 静默复用已授权的账户，只弹出交易确认指纹界面。

**为什么用 `signAndSendTransactions` 而不是 `signTransactions`？**

这是开发中踩到的最大坑（见第 12 节）。简短回答：`signTransactions` + 手动广播在 Hermes 引擎中会静默失败。

---

## 4. 导航层 — AppNavigator

**文件：** `src/navigation/AppNavigator.tsx`

使用 `@react-navigation/bottom-tabs` 创建底部三 Tab 导航：

```tsx
const Tab = createBottomTabNavigator();

export const AppNavigator = () => {
  const { t } = useTranslation();  // 语言切换时 tabBarLabel 自动更新

  return (
    <Tab.Navigator
      screenOptions={{
        headerRight: () => <LanguageToggle />,  // 右上角语言切换按钮
        // ... 样式配置
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="CreateWish" component={CreateWishScreen} />
      <Tab.Screen name="MyWishes" component={MyWishesScreen} />
    </Tab.Navigator>
  );
};
```

**关于 `headerTitle` 动态更新：**

各 Screen 内部通过 `navigation.setOptions()` 在语言切换时更新 Header 标题：

```tsx
useEffect(() => {
  navigation.setOptions({ headerTitle: t('home.title') });
}, [i18n.language]);  // 监听语言变化
```

---

## 5. 数据读取 — useWishes

**文件：** `src/hooks/useWishes.ts`

这个 Hook 负责从链上读取所有愿望数据，是整个应用数据层的核心。

### 5.1 整体流程

```
Step 1: 读取 WishWallState PDA → 获取 total_wishes（总愿望数）
Step 2: 根据 ID 1~N 推导所有 Wish PDA 地址
Step 3: 分批调用 getMultipleAccountsInfo 批量拉取账户数据
Step 4: 手写 Borsh 反序列化，解析每个账户的字段
Step 5: 按 created_at 降序排列，setState 触发 UI 更新
```

### 5.2 Borsh 反序列化工具函数

Borsh 是 Anchor 使用的二进制序列化格式，数据按字节存储，没有字段名。

```ts
// 读取 4 字节无符号整数（小端序）
function readU32LE(data: Uint8Array, offset: number): number {
  return (
    (data[offset]) |
    (data[offset + 1] << 8) |
    (data[offset + 2] << 16) |
    (data[offset + 3] << 24)
  ) >>> 0;  // >>> 0 确保结果为无符号
}

// 读取 8 字节无符号整数（小端序）
// JavaScript 的 Number 只能精确表示 2^53 以内的整数
// 因此用 hi * 2^32 + lo 分段组合
function readU64LE(data: Uint8Array, offset: number): number {
  const lo = readU32LE(data, offset);
  const hi = readU32LE(data, offset + 4);
  return hi * 0x100000000 + lo;
}

// 读取 Borsh 字符串：4字节长度 + UTF-8字节
function readString(data: Uint8Array, offset: number): [string, number] {
  const len = readU32LE(data, offset);  // 先读长度
  offset += 4;
  const bytes = data.slice(offset, offset + len);
  const str = Buffer.from(bytes).toString('utf8');
  return [str, offset + len];  // 返回字符串和新偏移量
}
```

### 5.3 WishWallState 解析

链上 WishWallState 账户的内存布局：

```
字节偏移  字段              大小
0        discriminator     8 字节  (Anchor 账户标识符)
8        authority         32 字节 (PublicKey)
40       total_wishes      8 字节  (u64)
48       bump              1 字节
```

```ts
function parseTotalWishes(data: Uint8Array): number {
  return readU64LE(data, 8 + 32); // 跳过 8字节discriminator + 32字节authority
}
```

### 5.4 Wish 账户解析

```
字节偏移  字段              大小
0        discriminator     8 字节
8        owner             32 字节 (PublicKey)
40       wish_id           8 字节  (u64)
48       content           4+n 字节 (Borsh string: 长度前缀 + UTF-8内容)
?        nickname          4+m 字节 (Borsh string)
?        created_at        8 字节  (u64, Unix timestamp)
?        status            1 字节  (enum: 0=Pending, 1=Fulfilled, 2=Unfulfilled)
?        nft_mint          32 字节 (PublicKey)
?        total_donations   8 字节  (u64, lamports)
?        bump              1 字节
```

注意：content 和 nickname 是变长字段，所以后面的偏移量是动态的，必须顺序解析。

### 5.5 批量读取

```ts
for (let i = 0; i < wishPDAs.length; i += BATCH_SIZE) { // BATCH_SIZE = 100
  const batch = wishPDAs.slice(i, i + BATCH_SIZE);
  const accounts = await connection.getMultipleAccountsInfo(batch);
  // 解析每个账户...
}
```

`getMultipleAccountsInfo` 单次最多接受 100 个地址，所以需要分批。

### 5.6 owner 过滤

```ts
if (owner && !wish.owner.equals(owner)) continue;
```

同一个 Hook 同时服务两个页面：
- `useWishes()` — 不传 owner，返回所有人的愿望（神社页面）
- `useWishes(publicKey)` — 传入当前钱包地址，只返回自己的（我的页面）

### 5.7 useFocusEffect 自动刷新

```ts
useFocusEffect(
  useCallback(() => {
    refresh();
  }, [refresh])
);
```

`useFocusEffect` 来自 `@react-navigation/native`，每次用户切换到这个 Tab 时触发，保证数据是最新的。

---

## 6. 链上操作 — useProgram

**文件：** `src/hooks/useProgram.ts`

负责构建并发送三种链上交易：创建愿望、更新状态、捐赠。

### 6.1 Discriminator

Anchor 为每个指令计算一个 8 字节标识符（SHA256 哈希的前 8 字节），用于区分不同指令：

```ts
const DISCRIMINATORS = {
  createWish:       new Uint8Array([47,  64, 159, 45,  95,  19,  61, 165]),
  updateWishStatus: new Uint8Array([112, 35,   2, 99, 119, 226, 112,  55]),
  donateToWish:     new Uint8Array([214, 30,  39, 19,  82,  94, 204, 106]),
};
```

这些值从 Anchor IDL (`wish_wall.json`) 中提取，是固定不变的。

### 6.2 手写 Borsh 序列化

发送交易时，指令数据也必须用 Borsh 格式编码（与反序列化对应）：

```ts
// Borsh 字符串编码：4字节小端LE长度 + UTF-8内容
function encodeString(str: string): Buffer {
  const strBytes = Buffer.from(str, 'utf8');
  const lenBuf = Buffer.alloc(4);
  new DataView(lenBuf.buffer).setUint32(0, strBytes.length, true); // true = 小端
  return Buffer.concat([lenBuf, strBytes]);
}

// u64 编码：8字节小端LE
function encodeU64(value: number): Buffer {
  const buf = Buffer.alloc(8);
  const view = new DataView(buf.buffer);
  view.setUint32(0, value >>> 0, true);               // 低 32 位
  view.setUint32(4, Math.floor(value / 0x100000000) >>> 0, true); // 高 32 位
  return buf;
}
```

### 6.3 createWish 完整流程

```ts
const createWish = async (content: string, nickname: string): Promise<string> => {
  // 1. 获取当前 total_wishes，计算下一个 wish_id
  const stateInfo = await connection.getAccountInfo(statePda);
  const dv = new DataView(stateInfo.data.buffer, stateInfo.data.byteOffset);
  const totalWishes = dv.getUint32(40, true) + dv.getUint32(44, true) * 0x100000000;
  const nextWishId = totalWishes + 1;

  // 2. 推导新 Wish 的 PDA 地址
  const [wishPda] = getWishPDA(nextWishId);

  // 3. 构建指令数据（discriminator + 内容 + 昵称）
  const data = Buffer.concat([
    Buffer.from(DISCRIMINATORS.createWish),
    encodeString(content),
    encodeString(nickname),
  ]);

  // 4. 构建 TransactionInstruction（指定程序ID + 账户列表 + 数据）
  const ix = new TransactionInstruction({
    programId: WISH_WALL_PROGRAM_ID,
    keys: [
      { pubkey: statePda,  isSigner: false, isWritable: true  }, // 状态账户（需要更新 total_wishes）
      { pubkey: wishPda,   isSigner: false, isWritable: true  }, // 新创建的 Wish 账户
      { pubkey: publicKey, isSigner: true,  isWritable: true  }, // 付款人（支付 rent）
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // 系统程序（用于创建账户）
    ],
    data,
  });

  // 5. 组装 Transaction
  const tx = new Transaction();
  tx.add(ix);
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.feePayer = publicKey;

  // 6. 通过 WalletProvider 签名并广播
  return signAndSendTransaction(tx);
};
```

### 6.4 donateToWish 关键点

```ts
const ix = new TransactionInstruction({
  keys: [
    { pubkey: wishPda,     isSigner: false, isWritable: true  }, // 更新 total_donations
    { pubkey: publicKey,   isSigner: true,  isWritable: true  }, // 捐赠者（扣 SOL）
    { pubkey: wishOwner,   isSigner: false, isWritable: true  }, // 愿望主人（收 SOL）
    { pubkey: SystemProgram.programId, ... },
  ],
  data: Buffer.concat([
    Buffer.from(DISCRIMINATORS.donateToWish),
    encodeU64(amount.toNumber()),  // 捐赠金额（lamports）
  ]),
});
```

捐赠本质是一个 SOL 转账 + 更新链上计数器的组合操作。

---

## 7. 页面层 — 三个 Screen

### 7.1 HomeScreen — 神社

**职责：** 展示所有人的愿望列表，支持捐赠。

**核心结构：**
```tsx
const { wishes, isLoading, error, refresh } = useWishes(); // 无参数 = 全部愿望

// 三种状态分支
if (isLoading && wishes.length === 0) → 显示加载动画
if (error)                            → 显示错误 + 重试按钮
if (wishes.length === 0)              → 显示空状态
else                                  → FlatList 渲染列表

// FlatList 优势：虚拟化渲染，只渲染屏幕内的条目，100条也不卡
<FlatList
  data={wishes}
  keyExtractor={(item) => item.publicKey.toBase58()} // PDA地址作为唯一key
  renderItem={({ item }) => <WishCard wish={item} onDonate={...} />}
  refreshControl={<RefreshControl onRefresh={refresh} />} // 下拉刷新
/>
```

**捐赠 Modal：**
点击 WishCard 的助力按钮 → 弹出 Modal → 输入金额 → 调用 `donateToWish()`

### 7.2 CreateWishScreen — 许愿

**职责：** 表单输入 + 提交链上交易。

**未连接状态：**
```tsx
if (!isConnected) {
  return (
    <View>
      <Text>需要连接钱包</Text>
      <Button onPress={connect}>连接钱包</Button>
    </View>
  );
}
```

**切换钱包逻辑：**
```tsx
onPress={async () => {
  setIsSwitching(true);
  try {
    await disconnect(); // 先清空本地状态
    await connect();    // 重新发起 MWA authorize（弹出账户选择）
  } catch (e) {
    // 用户取消也没关系
  } finally {
    setIsSwitching(false);
  }
}}
```

**KeyboardAvoidingView：**
```tsx
<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
```
弹出键盘时自动上移内容，避免输入框被遮挡。

### 7.3 MyWishesScreen — 我的

**职责：** 展示当前钱包的愿望，支持标记状态（还愿）。

```tsx
const { publicKey, isConnected } = useWallet();
const { wishes, isLoading, error, refresh } = useWishes(publicKey ?? undefined);
// 传入 publicKey，Hook 内部会过滤 owner === publicKey 的愿望
```

**状态更新 Modal：**
点击愿望卡片 → 弹出「愿望实现 / 事与愿违」选择 → 调用 `updateWishStatus()`

---

## 8. 工具层 — solana.ts & constants.ts

### 8.1 constants.ts — 全局配置

```ts
export const WISH_WALL_PROGRAM_ID = new PublicKey('HXP5UvapL8Pv9P1vY7LYhAMv2VcbJZnn7zhfRJ9Eb8Bv');
export const RPC_ENDPOINT = 'https://solana-devnet.g.alchemy.com/v2/...';
export const WISH_WALL_STATE_SEED = 'wish-wall-state'; // PDA 种子
export const WISH_SEED = 'wish';                        // PDA 种子
export const MAX_CONTENT_LENGTH = 500;
export const MAX_NICKNAME_LENGTH = 50;
```

### 8.2 solana.ts — 工具函数

**连接对象（单例）：**
```ts
export const connection = new Connection(RPC_ENDPOINT, 'confirmed');
// 'confirmed' 是确认级别：交易被超过 2/3 验证节点确认
// 还有 'processed'（最快但最不安全）和 'finalized'（最慢但最安全）
```

**PDA 推导：**
```ts
// WishWallState PDA：种子 = "wish-wall-state"
export const getWishWallStatePDA = (): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(WISH_WALL_STATE_SEED)],
    WISH_WALL_PROGRAM_ID
  );
};

// Wish PDA：种子 = "wish" + wish_id（u64小端序）
export const getWishPDA = (wishId: number): [PublicKey, number] => {
  const wishIdBuffer = Buffer.alloc(8);
  wishIdBuffer.writeBigUInt64LE(BigInt(wishId)); // 8字节小端序
  return PublicKey.findProgramAddressSync(
    [Buffer.from(WISH_SEED), wishIdBuffer],
    WISH_WALL_PROGRAM_ID
  );
};
```

返回值是 `[PublicKey, bump]`，`bump` 是确保地址不在椭圆曲线上的调整值（Anchor 会验证这个值）。

**辅助函数：**
```ts
export const lamportsToSol = (lamports) => lamports / 1_000_000_000;
export const solToLamports = (sol) => new BN(Math.floor(sol * 1_000_000_000));
export const formatDate = (timestamp: BN) => new Date(timestamp.toNumber() * 1000).toLocaleDateString();
export const truncatePublicKey = (key, length = 8) => `${key.slice(0,8)}...${key.slice(-8)}`;
```

---

## 9. 类型系统 — types/index.ts

```ts
// 愿望状态枚举
export enum WishStatus {
  Pending = 'pending',       // 待实现（初始状态）
  Fulfilled = 'fulfilled',   // 已实现
  Unfulfilled = 'unfulfilled', // 未实现
}

// 链上 Wish 账户的 TypeScript 映射
export interface Wish {
  owner: PublicKey;           // 许愿人钱包地址
  wishId: BN;                 // 愿望ID（从1开始递增）
  content: string;            // 愿望内容
  nickname: string;           // 署名昵称
  createdAt: BN;              // Unix时间戳
  status: WishStatus;
  nftMint: PublicKey;         // NFT铸造地址（未来功能，当前为默认值）
  totalDonations: BN;         // 累计收到的捐赠（lamports）
  bump: number;               // PDA bump值
}

// 带地址的 Wish（UI 展示需要 PDA 地址作为 key）
export interface WishWithKey {
  publicKey: PublicKey;  // 该 Wish 账户的 PDA 地址
  account: Wish;
}
```

**为什么用 `BN`（Big Number）？**

Solana 的 u64 最大值是 2^64 - 1，超过了 JavaScript `Number` 的安全整数范围（2^53）。`@coral-xyz/anchor` 提供的 `BN` 类用任意精度整数表示这类值。

---

## 10. 国际化 — i18n

**文件：** `src/i18n/zh.ts`, `src/i18n/en.ts`, `src/i18n/index.ts`

使用 `i18next` + `react-i18next`。

### 10.1 初始化配置

```ts
// src/i18n/index.ts
i18n
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    lng: 'zh',           // 默认中文
    fallbackLng: 'en',   // 找不到翻译时回退到英文
    interpolation: { escapeValue: false },
  });
```

### 10.2 在组件中使用

```tsx
const { t, i18n } = useTranslation();

// 简单文本
<Text>{t('home.subtitle')}</Text>

// 带参数（插值）
<Text>{t('myWishes.subtitle', { count: wishes.length })}</Text>
// zh.ts: subtitle: '共 {{count}} 个愿望'

// 切换语言
i18n.changeLanguage('en');  // 或 'zh'
```

### 10.3 LanguageToggle 组件

```tsx
// src/components/LanguageToggle.tsx
const { i18n, t } = useTranslation();

const toggleLanguage = () => {
  i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh');
};
```

切换后，所有使用 `t()` 的组件都会自动重渲染。

---

## 11. Solana 核心概念详解

### 11.1 PDA（Program Derived Address）

PDA 是由程序 ID + 种子推导出的地址，特点：
- **确定性**：相同输入永远推导出相同地址，无需查询即可预知
- **无私钥**：PDA 在椭圆曲线之外，没有对应的私钥，只有程序本身能"签名"操作它

```
WishWallState PDA = hash("wish-wall-state" + program_id)
Wish[5] PDA       = hash("wish" + [5 as u64 LE] + program_id)
```

这就是为什么我们不需要索引服务：知道 `total_wishes = 100`，就能推导出 100 个 Wish PDA 地址，直接批量查询。

### 11.2 Rent（账户租金）

Solana 上存储数据需要支付租金。交够最低押金（rent-exempt threshold）后账户永久免租。

Wish Plaque 每次许愿约花费 **0.016 SOL**，全部是 2306 字节 Wish 账户的租金押金（不是手续费）。

```
2306 字节 × 约 6960 lamports/字节 ≈ 16,040,160 lamports ≈ 0.016 SOL
```

### 11.3 Discriminator

Anchor 给每个账户类型和指令计算一个 8 字节哈希标识：
```
account discriminator = SHA256("account:WishWallState")[0:8]
instruction discriminator = SHA256("global:create_wish")[0:8]
```

程序接收交易时，先检查前 8 字节匹配哪个指令，再解析后续参数。

### 11.4 Borsh 序列化

Borsh（Binary Object Representation Serializer for Hashing）是 Anchor 使用的二进制格式：
- 固定大小类型（u8, u32, u64, PublicKey）：直接按大小写入
- 动态类型（String, Vec）：先写 4 字节长度，再写内容
- 枚举：写 1 字节 variant index
- 全部使用**小端序**（Little-Endian）

### 11.5 Transaction 结构

```
Transaction
  ├── recentBlockhash  ← 最近区块哈希（防重放攻击，有效期约 150 秒）
  ├── feePayer         ← 支付手续费的账户
  └── instructions[]
       └── TransactionInstruction
            ├── programId  ← 调用哪个程序
            ├── keys[]     ← 涉及的账户列表（注明是否签名、是否可写）
            └── data       ← Borsh 编码的指令参数
```

---

## 12. 关键工程决策

### 12.1 为什么不用 BorshCoder？

Anchor 提供了 `BorshCoder` 可以自动序列化/反序列化，非常方便。但它依赖 `Buffer.readUIntLE()` 等 Node.js API，**在 React Native 的 Hermes 引擎中不可用**，会抛出 `TypeError: undefined is not a function`。

解决方案：完全手写 Borsh 解析，只用 `DataView` 和 `Uint8Array`，这两个是标准 JS/Hermes 内置的。

### 12.2 为什么 signAndSendTransactions 而不是 signTransactions？

**问题现象：** 用 `signTransactions()` + `connection.sendRawTransaction()` 时，钱包弹窗正常、指纹确认成功，但链上没有任何记录，也没有报错。

**根本原因：** Hermes 中，`signedTx.serialize()` 返回的 `Uint8Array` 在某些序列化路径上出现兼容性问题，导致发送的交易数据格式错误，被网络静默丢弃。

**解决方案：** 改用 `wallet.signAndSendTransactions()`，将签名+广播整个过程委托给钱包 App（钱包 App 有完整的 Node.js 环境），彻底绕开 Hermes 的序列化问题。

### 12.3 为什么用 reauthorize 而不是每次 authorize？

`authorize()` 总是弹出账户列表让用户选择，即使是同一个账户的第二次操作也会弹，体验极差。

`reauthorize()` 复用上次授权的 `auth_token`，只弹出交易确认界面，保持了"同一账户、静默续期"的流畅体验。

### 12.4 为什么用 useFocusEffect 而不是 useEffect？

`useEffect([], [])` 只在组件首次挂载时执行一次，切换 Tab 不会重新触发。

`useFocusEffect` 在每次页面获得焦点时执行，保证用户切换回来时数据是最新的（比如刚在「许愿」页发了一个愿望，切回「神社」就能看到）。

---

## 13. 数据流全程追踪

### 场景：用户许愿

```
1. 用户点击「🙏 许愿」按钮
   → CreateWishScreen.handleSubmit()

2. 验证表单（非空、长度）

3. 调用 useProgram.createWish(content, nickname)

4. 查询链上 WishWallState 获取 total_wishes
   → connection.getAccountInfo(statePda)
   → DataView 解析 offset 40 的 u64 = 当前总数

5. 推导新 Wish 的 PDA 地址
   → getWishPDA(total_wishes + 1)
   → PublicKey.findProgramAddressSync(["wish", wishId_u64_LE], programId)

6. 构建 TransactionInstruction
   → data = discriminator(8B) + encodeString(content) + encodeString(nickname)
   → keys = [statePda(可写), wishPda(可写), userKey(签名+可写), SystemProgram]

7. 组装 Transaction
   → 获取 recentBlockhash
   → tx.feePayer = userPublicKey

8. 调用 WalletProvider.signAndSendTransaction(tx)

9. 进入 transact() — 打开与钱包 App 的连接
   → wallet.reauthorize() — 静默续期（不弹账户选择）
   → wallet.signAndSendTransactions({ transactions: [tx] })
   → 钱包弹出交易确认界面，用户指纹确认
   → 钱包内部签名 + 广播到 Solana 网络
   → 返回 Uint8Array 签名

10. bs58.encode(Buffer.from(sigBytes)) → 转为可读的交易签名字符串

11. connection.confirmTransaction(signature, 'confirmed')
    → 等待链上确认

12. 返回 txSignature → Alert 显示成功

13. 用户切回「神社」Tab
    → useFocusEffect 触发 refresh()
    → 重新拉取数据 → 新愿望出现
```

---

## 14. 如何扩展

### 添加新的链上指令

1. 在 Rust 程序中添加新 instruction
2. 重新部署，获得新的 discriminator（从 IDL 读取）
3. 在 `useProgram.ts` 的 `DISCRIMINATORS` 中添加
4. 编写对应的 encode 函数和 Hook 方法
5. 在 Screen 中调用

### 添加新页面

1. 创建 `src/screens/NewScreen.tsx`
2. 在 `src/navigation/AppNavigator.tsx` 添加 Tab
3. 在 `src/i18n/zh.ts` 和 `en.ts` 添加对应文案

### 切换到 Mainnet

```ts
// src/utils/constants.ts
export const CLUSTER = 'mainnet-beta';
export const RPC_ENDPOINT = 'https://your-mainnet-rpc-endpoint';
```

注意：还需要在 `WalletProvider.tsx` 的 `authorize()` 中改 `cluster: 'mainnet-beta'`。

### 降低许愿成本

当前 Wish 账户 2306 字节的原因：
- `content` 预留 `500 chars × 4 bytes` (UTF-8 最坏情况)
- `nickname` 预留 `50 chars × 4 bytes`
- 未使用的 `nft_mint` 字段 32 字节

优化方向：将 Rust 合约中 `MAX_CONTENT_LEN` 改为字节限制而非字符数，并移除 `nft_mint`，可将账户大小降低 60%，许愿成本从 ~0.016 SOL 降到 ~0.006 SOL。

---

## 附录：文件速查

| 文件 | 职责 |
|------|------|
| `App.tsx` | 入口，Provider 嵌套，i18n 初始化 |
| `src/providers/WalletProvider.tsx` | MWA 封装，connect / reauthorize / signAndSendTransactions |
| `src/navigation/AppNavigator.tsx` | 底部 Tab 导航 |
| `src/hooks/useWishes.ts` | 链上数据读取，Borsh 反序列化 |
| `src/hooks/useProgram.ts` | 链上写操作，Borsh 序列化，交易构建 |
| `src/hooks/useWallet.ts` | WalletContext 的简单 re-export |
| `src/screens/HomeScreen.tsx` | 神社页，FlatList + 捐赠 Modal |
| `src/screens/CreateWishScreen.tsx` | 许愿页，表单 + 钱包连接/切换 |
| `src/screens/MyWishesScreen.tsx` | 我的页，状态更新 Modal |
| `src/components/WishCard.tsx` | 愿望卡片 UI 组件 |
| `src/components/LanguageToggle.tsx` | 语言切换按钮 |
| `src/utils/solana.ts` | connection 单例，PDA 推导，工具函数 |
| `src/utils/constants.ts` | Program ID，RPC，种子，UI 常量 |
| `src/utils/wish_wall.json` | Anchor IDL（合约接口描述） |
| `src/types/index.ts` | TypeScript 类型定义 |
| `src/i18n/zh.ts` | 中文字符串 |
| `src/i18n/en.ts` | 英文字符串 |
| `generate_icon.py` | 用 Pillow 生成鸟居图标的 Python 脚本 |
