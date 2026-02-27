# 神社许愿墙 - React Native 应用

基于 Solana 区块链的去中心化许愿墙移动应用。

## 功能特性

- ⛩️ **神社许愿板**: 浏览最近20个愿望，为他人捐赠支持
- ✨ **许愿界面**: 写下心愿并存储到区块链上
- 📜 **我的愿望**: 管理自己的愿望，标记实现状态

## 技术栈

- **Framework**: React Native + Expo
- **Navigation**: React Navigation (Bottom Tabs)
- **Blockchain**: Solana Web3.js + Anchor
- **Wallet**: Solana Mobile Wallet Adapter
- **Language**: TypeScript

## 项目结构

```
src/
├── components/
│   └── WishCard.tsx          # 愿望卡片组件
├── screens/
│   ├── HomeScreen.tsx        # 神社许愿板
│   ├── CreateWishScreen.tsx  # 许愿界面
│   └── MyWishesScreen.tsx    # 我的愿望
├── hooks/
│   ├── useWallet.ts          # 钱包连接 hook
│   ├── useProgram.ts         # 程序交互 hook
│   └── useWishes.ts          # 愿望查询 hook
├── utils/
│   ├── constants.ts          # 常量配置
│   ├── solana.ts             # Solana 工具函数
│   └── wish_wall.json        # Anchor IDL
├── navigation/
│   └── AppNavigator.tsx      # 底部导航
└── types/
    └── index.ts              # TypeScript 类型定义
```

## 安装和运行

### 前置要求

- Node.js 16+
- npm 或 yarn
- Expo CLI
- Android 设备或模拟器（支持 Solana Mobile）

### 安装依赖

```bash
cd wish-wall-app
npm install
```

### 运行应用

```bash
# 启动 Expo 开发服务器
npm start

# 或直接在 Android 上运行
npm run android
```

## 核心依赖

```json
{
  "dependencies": {
    "expo": "~54.0.33",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "@solana/web3.js": "^1.x.x",
    "@coral-xyz/anchor": "^0.x.x",
    "@solana-mobile/mobile-wallet-adapter-protocol": "^2.x.x",
    "@react-navigation/native": "^6.x.x",
    "@react-navigation/bottom-tabs": "^6.x.x",
    "react-native-get-random-values": "^1.x.x",
    "buffer": "^6.x.x"
  }
}
```

## 配置

### 更新 Program ID

在 `src/utils/constants.ts` 中更新智能合约的 Program ID：

```typescript
export const WISH_WALL_PROGRAM_ID = new PublicKey(
  'YOUR_DEPLOYED_PROGRAM_ID_HERE'
);
```

### 切换网络

在 `src/utils/constants.ts` 中修改网络配置：

```typescript
export const CLUSTER = 'devnet'; // 或 'mainnet-beta'
```

## 使用流程

### 1. 连接钱包

在许愿或查看我的愿望之前，需要先连接 Solana Mobile 钱包：
- 点击"连接钱包"按钮
- 授权应用访问钱包
- 连接成功后会显示钱包地址和余额

### 2. 创建愿望

1. 进入"许愿"标签
2. 输入心愿内容（最多500字符）
3. 输入署名昵称（最多50字符）
4. 点击"许愿"按钮
5. 确认交易（约需 0.01-0.02 SOL）
6. 等待交易确认

### 3. 浏览愿望板

1. 进入"神社"标签
2. 上下滑动浏览最近的20个愿望
3. 点击"助力"按钮为他人捐赠
4. 输入捐赠金额并确认

### 4. 管理我的愿望

1. 进入"我的"标签
2. 查看自己的所有愿望
3. 点击愿望进行还愿
4. 选择"愿望实现"或"事与愿违"

## 愿望状态说明

- 🟡 **黄色 - 待实现**: 初始状态
- 🟢 **绿色 - 已实现**: 标记为愿望实现
- 🟡 **黄色 - 未实现**: 标记为事与愿违（保持黄色）

## 开发说明

### 调试

```bash
# 查看日志
npx expo start --dev-client

# 清除缓存
npx expo start -c
```

### 构建 APK

```bash
# 安装 EAS CLI
npm install -g eas-cli

# 登录 Expo 账号
eas login

# 配置构建
eas build:configure

# 构建 Android APK
eas build --platform android --profile preview
```

## 常见问题

### 1. 钱包连接失败

确保：
- 设备上已安装兼容的 Solana 钱包（如 Phantom Mobile）
- 应用已获得必要权限
- 网络连接正常

### 2. 交易失败

可能原因：
- 钱包余额不足
- 网络拥堵
- RPC 节点问题

解决方案：
- 确保钱包有足够 SOL
- 等待网络恢复
- 切换 RPC 节点

### 3. 愿望不显示

可能原因：
- 交易尚未确认
- 缓存问题

解决方案：
- 等待交易确认（约10-30秒）
- 下拉刷新列表

## 安全注意事项

- ✅ 永不分享私钥
- ✅ 仅连接信任的应用
- ✅ 确认交易详情
- ✅ 保持钱包应用更新

## 待实现功能

- [ ] NFT 展示（待智能合约添加 NFT 功能）
- [ ] 愿望详情页
- [ ] 分享功能
- [ ] 搜索和过滤
- [ ] 推送通知
- [ ] 离线缓存
- [ ] 多语言支持

## License

MIT

---

**注意**: 此应用目前连接到 Solana Devnet 测试网络。在切换到 Mainnet 之前，请确保充分测试所有功能。
