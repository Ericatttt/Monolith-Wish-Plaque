# ⛩️ Wish Plaque — On-Chain Shrine Wishing Wall

> *"Sharing pain halves it. Sharing joy doubles it."*
> 「痛苦分享可以减半，快乐分享就会加倍。」

A native Android app that turns the ancient Japanese shrine tradition of writing wishes on wooden plaques into a permanent, on-chain experience. Every wish is stored as a real Solana account — immutable, public, and witnessed by the world.

Built for the **Solana Mobile Hackathon** as a first-class mobile experience using the Solana Mobile Stack.

---

## ✨ Features

| Tab | Description |
|-----|-------------|
| ⛩️ **Shrine** | Browse all wishes posted on-chain by everyone, in real time |
| ✍️ **Make a Wish** | Write your wish, sign with your wallet via MWA, publish to Solana in seconds |
| 🪬 **My Wishes** | View all wishes you have ever made — your personal on-chain journal |

- 🌐 **Bilingual UI** — full Chinese / English toggle
- 🔄 **Auto-refresh** on screen focus via `useFocusEffect`
- 🔑 **Switch wallet** without leaving the app
- 📜 **All wishes** loaded with infinite scroll — no artificial limits

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile Framework | React Native 0.81.5 + Expo 54 |
| JS Engine | Hermes |
| Language | TypeScript |
| Blockchain | Solana Devnet |
| Smart Contract | Anchor 0.32 |
| Wallet Integration | Mobile Wallet Adapter v2 (`@solana-mobile/mobile-wallet-adapter-protocol-web3js`) |
| On-chain Data | `@solana/web3.js` — deterministic PDA derivation, no third-party indexers |
| Navigation | React Navigation 7 (Bottom Tabs) |
| i18n | i18next + react-i18next |

---

## 🔗 On-Chain Architecture

Each wish is stored as a standalone **PDA (Program Derived Address)** account on Solana:

```
WishWallState PDA  →  stores total_wishes counter
Wish PDA [1..N]    →  each wish: owner, content, nickname, created_at, status, total_donations
```

**Data fetching flow (no indexer required):**
1. Fetch `WishWallState` PDA → read `total_wishes`
2. Derive all wish PDAs deterministically (`wish_id` 1 → N)
3. Batch fetch with `getMultipleAccountsInfo` (100 per batch)
4. Manual Borsh deserialization (BorshCoder is incompatible with Hermes)

**Transaction signing flow:**
- Uses `wallet.signAndSendTransactions()` + MWA `reauthorize` — delegates signing and broadcast entirely to the wallet app, solving silent failure issues in Hermes.

---

## 📁 Project Structure

```
.
├── src/
│   ├── components/
│   │   ├── WishCard.tsx           # Wish card component
│   │   └── LanguageToggle.tsx     # zh/en language switch
│   ├── screens/
│   │   ├── HomeScreen.tsx         # ⛩️ Shrine — all wishes
│   │   ├── CreateWishScreen.tsx   # ✍️ Make a wish
│   │   └── MyWishesScreen.tsx     # 🪬 My wishes
│   ├── hooks/
│   │   ├── useWishes.ts           # Fetch & parse on-chain wishes
│   │   └── useProgram.ts          # Anchor program interactions
│   ├── providers/
│   │   └── WalletProvider.tsx     # MWA wallet context
│   ├── utils/
│   │   ├── solana.ts              # Connection, PDA helpers
│   │   ├── constants.ts           # Program ID, cluster config
│   │   └── wish_wall.json         # Anchor IDL
│   ├── i18n/
│   │   ├── zh.ts                  # Chinese strings
│   │   └── en.ts                  # English strings
│   ├── navigation/
│   │   └── AppNavigator.tsx       # Bottom tab navigator
│   └── types/
│       └── index.ts               # TypeScript types
└── program/                       # Anchor smart contract (Rust)
    ├── programs/wish_wall/src/
    │   ├── lib.rs                 # 4 instructions + Context structs
    │   ├── state.rs               # WishWallState, Wish, WishStatus
    │   └── error.rs               # Custom error codes
    └── README.md                  # Full contract documentation
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Android device or emulator with a Solana wallet installed (e.g. [Phantom Mobile](https://phantom.app/download))
- JDK 17+ and Android SDK (for local APK build)

### Install dependencies

```bash
npm install
```

### Run in development

```bash
npm run android
```

### Build release APK locally

```bash
cd android
./gradlew assembleRelease
# APK → android/app/build/outputs/apk/release/app-release.apk
```

---

## ⚙️ Configuration

Update `src/utils/constants.ts` to point to your deployed program:

```typescript
export const WISH_WALL_PROGRAM_ID = new PublicKey('YOUR_PROGRAM_ID');
export const CLUSTER = 'devnet'; // or 'mainnet-beta'
```

---

## 🧩 Key Engineering Challenges

### 1. Silent transaction failures in Hermes
The standard pattern — `signTransactions()` → manual serialization → `sendRawTransaction()` — failed silently in React Native's Hermes engine: the wallet confirmed but nothing landed on-chain.

**Fix:** delegate everything to `wallet.signAndSendTransactions()` combined with MWA's `reauthorize` flow.

### 2. Borsh deserialization without BorshCoder
Anchor's `BorshCoder` relies on browser APIs incompatible with Hermes.

**Fix:** wrote manual byte-level Borsh parsing functions (`readU32LE`, `readU64LE`, `readString`) to deserialize on-chain account data from scratch.

---

## 🗺️ Roadmap

- [x] Wish donations — support others' wishes with SOL (contract + UI complete)
- [ ] NFT plaques — mint fulfilled wishes as on-chain keepsakes
- [ ] Social layer — react to wishes, build connections
- [ ] Search & filter wishes
- [ ] Push notifications on wish fulfillment
- [ ] Mainnet deployment with reduced account size

---

## 📄 License

MIT

---

> ⚠️ Currently connected to **Solana Devnet**. Devnet SOL has no real value and is for testing only.
