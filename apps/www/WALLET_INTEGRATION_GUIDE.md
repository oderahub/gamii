# 🔐 Wallet Integration Guide - MetaMask & HashPack

## Overview

This guide covers the wallet integration for Texas Hold'em ZK Poker on Hedera. We support two wallet options:

1. **MetaMask** - EVM-compatible wallet (most popular)
2. **HashPack** - Native Hedera wallet (recommended for full Hedera features)

## ✅ Completed Implementation

### 1. Removed Web3Modal/WalletConnect Dependency
- **Before**: Used Web3Modal v5 with WalletConnect project ID requirement
- **After**: Simple injected wallet connector (MetaMask) + custom HashPack integration
- **Benefits**:
  - No external service dependencies
  - Faster connection
  - Simpler codebase

### 2. MetaMask Integration (`/src/lib/hedera/metamask.ts`)

**Features:**
- ✅ Auto-add Hedera Testnet to MetaMask
- ✅ Auto-switch to Hedera network when connecting
- ✅ Network validation before transactions
- ✅ Helper functions for account management

**Key Functions:**
```typescript
// Add Hedera to MetaMask
await addHederaToMetaMask();

// Switch to Hedera network
await switchToHederaNetwork();

// Ensure user is on Hedera before transactions
await ensureHederaNetwork();

// Check if MetaMask is installed
isMetaMaskInstalled();
```

### 3. HashPack Integration (`/src/lib/hedera/hashpack.ts`)

**Features:**
- ✅ HashConnect integration for wallet pairing
- ✅ Native Hedera account support (0.0.x format)
- ✅ Transaction signing for both EVM and native Hedera transactions
- ✅ Event listeners for connection state

**Key Functions:**
```typescript
// Initialize HashConnect
const hashconnect = await initHashPack();

// Connect to HashPack
const { accountId, hashconnect } = await connectHashPack();

// Get account info from Mirror Node
const info = await getAccountInfo(accountId);

// Sign transactions
await signTransaction(hashconnect, transaction, accountId);

// Convert between Hedera and EVM addresses
const evmAddress = accountIdToEvmAddress('0.0.123456');
```

### 4. Unified Wallet UI (`/src/components/navbar/connect-button.tsx`)

**Features:**
- ✅ Modal with wallet selection
- ✅ Shows wallet installation status
- ✅ Auto-detects installed wallets
- ✅ Displays connected address
- ✅ One-click disconnect

**User Experience:**
```
1. Click "Connect Wallet" button
2. Choose MetaMask or HashPack
3. If MetaMask: Auto-switch to Hedera network
4. If HashPack: Open pairing dialog
5. Connected! Address shown in navbar
```

## 🚀 How to Test

### Prerequisites
- Node.js and pnpm installed
- Browser with MetaMask extension OR HashPack extension

### Step 1: Start Development Server
```bash
cd apps/www
pnpm install
pnpm dev
```

### Step 2: Test MetaMask Connection

1. **If you DON'T have MetaMask:**
   - Click "Connect Wallet" → "MetaMask"
   - You'll be redirected to download MetaMask
   - Install extension and create/import wallet
   - Return to app and try again

2. **If you HAVE MetaMask:**
   - Click "Connect Wallet" → "MetaMask"
   - App will automatically add Hedera Testnet to your networks
   - Approve the network addition in MetaMask
   - Approve the connection request
   - You're connected! ✅

3. **Verify Connection:**
   - Your address should appear in the navbar (e.g., `0x3D46...0D58`)
   - MetaMask should show "Hedera Testnet" as active network
   - Try switching networks in MetaMask - app should detect it

### Step 3: Test HashPack Connection

1. **If you DON'T have HashPack:**
   - Click "Connect Wallet" → "HashPack"
   - You'll be redirected to https://www.hashpack.app/download
   - Install extension and create/import wallet
   - Return to app and try again

2. **If you HAVE HashPack:**
   - Click "Connect Wallet" → "HashPack"
   - HashPack pairing dialog will open
   - Approve the connection
   - You're connected! ✅

3. **Verify Connection:**
   - Your address should appear in the navbar
   - HashPack should show the connected dApp
   - Test disconnecting from HashPack extension

### Step 4: Test Game Functionality

1. **Create a Game:**
   - Click "Create Game" button
   - Set buy-in amount
   - Approve transaction in wallet
   - Wait for confirmation

2. **Join a Game:**
   - Click on an available game
   - Click "Join Game"
   - Approve transaction
   - Wait to be added to game

3. **Play Actions:**
   - Place bets during your turn
   - Fold/Call/Raise as needed
   - Watch for real-time updates via HCS

## 🔧 Configuration

### Hedera Testnet Details
```env
Network: Hedera Testnet
Chain ID: 296
RPC URL: https://testnet.hashio.io/api
Mirror Node: https://testnet.mirrornode.hedera.com
Block Explorer: https://hashscan.io/testnet
```

### Environment Variables (`.env.local`)
```bash
# No WalletConnect ID needed anymore! ✅

# Hedera Network
NEXT_PUBLIC_HEDERA_NETWORK="testnet"
NEXT_PUBLIC_HEDERA_CHAIN_ID="296"
NEXT_PUBLIC_HEDERA_JSON_RPC="https://testnet.hashio.io/api"
NEXT_PUBLIC_HEDERA_MIRROR_NODE="https://testnet.mirrornode.hedera.com"

# Contract Addresses
NEXT_PUBLIC_GAME_FACTORY_ADDRESS="0x8701aC94337A987957a6F0a74448Dbc6F67b0D58"
NEXT_PUBLIC_REVEAL_VERIFIER_ADDRESS="0x2001A5eD2d73f97a3D09099501CE245258aA4524"

# HTS Tokens
NEXT_PUBLIC_POKER_CHIP_TOKEN_ID="0.0.7143243"
NEXT_PUBLIC_TOURNAMENT_TICKET_NFT_ID="0.0.7143244"
NEXT_PUBLIC_ACHIEVEMENT_BADGE_NFT_ID="0.0.7143245"

# HCS Topics
NEXT_PUBLIC_GAME_EVENTS_TOPIC_ID="0.0.7143266"
NEXT_PUBLIC_GAME_CHAT_TOPIC_ID="0.0.7143269"
NEXT_PUBLIC_GLOBAL_LOBBY_TOPIC_ID="0.0.7143270"
```

## 🐛 Troubleshooting

### MetaMask Issues

**Problem**: "Network not found" error
**Solution**:
```typescript
// Manually add Hedera network
await addHederaToMetaMask();
```

**Problem**: Transactions failing
**Solution**:
- Check you're on Hedera Testnet (Chain ID: 296)
- Verify you have HBAR for gas fees
- Check contract addresses are correct

**Problem**: "User rejected request"
**Solution**: User cancelled in MetaMask - this is expected behavior

### HashPack Issues

**Problem**: HashPack not detected
**Solution**:
- Verify extension is installed and enabled
- Refresh the page
- Check browser console for errors

**Problem**: Pairing fails
**Solution**:
- Make sure you have an account in HashPack
- Try disconnecting all dApps in HashPack and reconnecting
- Check you're on testnet in HashPack settings

### General Issues

**Problem**: Wallet connects but transactions fail
**Solution**:
- Verify contract addresses in `.env.local`
- Check you have testnet HBAR (get from https://portal.hedera.com)
- Inspect browser console for detailed error messages

**Problem**: "Wrong network" after connecting
**Solution**:
```typescript
// App will auto-switch, but you can manually trigger:
await ensureHederaNetwork();
```

## 📊 Wallet Comparison

| Feature | MetaMask | HashPack |
|---------|----------|----------|
| **Installation** | ✅ Popular, easy to find | ✅ Hedera-specific |
| **EVM Compatibility** | ✅ Full support | ⚠️ Limited |
| **Native Hedera (0.0.x)** | ❌ Not supported | ✅ Full support |
| **HTS Tokens** | ⚠️ Via EVM bridge | ✅ Native support |
| **HCS Messages** | ❌ Not supported | ✅ Native support |
| **Transaction Fees** | 💰 Higher (EVM) | 💰 Lower (native) |
| **User Familiarity** | ✅ Very high | ⚠️ Hedera users only |
| **Recommended For** | New users, testing | Production, power users |

## 🎯 Next Steps

### Testing Checklist
- [ ] Test MetaMask connection on fresh browser
- [ ] Test HashPack connection on fresh browser
- [ ] Test network switching in MetaMask
- [ ] Create a game with MetaMask wallet
- [ ] Join a game with HashPack wallet
- [ ] Test all game actions (bet, fold, call, raise)
- [ ] Test wallet disconnection
- [ ] Test reconnection after page refresh

### Future Enhancements
- [ ] Add Wallet Balance display
- [ ] Show recent transactions
- [ ] Add "Switch Wallet" option without disconnecting
- [ ] Support WalletConnect for mobile wallets
- [ ] Add Ledger hardware wallet support
- [ ] Implement wallet account switching

## 📚 References

- [Hedera Docs](https://docs.hedera.com)
- [HashPack Docs](https://docs.hashpack.app)
- [MetaMask Docs](https://docs.metamask.io)
- [Wagmi Docs](https://wagmi.sh)
- [HashConnect SDK](https://github.com/Hashpack/hashconnect)

## 💡 Tips for Users

1. **For Testing**: Use MetaMask - it's faster to set up
2. **For Production**: Use HashPack - lower fees and better Hedera integration
3. **Keep Both**: Some features work better with native Hedera accounts
4. **Get Testnet HBAR**: Visit https://portal.hedera.com and request testnet funds

---

**Last Updated**: October 27, 2025
**Author**: Claude Code
**Status**: ✅ Ready for Testing
