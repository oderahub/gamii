import { defineChain } from 'viem';

/**
 * Hedera Testnet Chain Configuration
 * Chain ID: 296
 * Native Currency: HBAR (8 decimals)
 */
export const hederaTestnet = defineChain({
  id: 296,
  name: 'Hedera Testnet',
  network: 'hedera-testnet',
  nativeCurrency: {
    decimals: 18, // MetaMask requires 18 decimals for EVM compatibility
    name: 'HBAR',
    symbol: 'HBAR',
  },
  rpcUrls: {
    default: {
      http: [
        'https://testnet.hashio.io/api',
        'https://testnet.mirrornode.hedera.com',
        'https://pool.arkhia.io/hedera/testnet/json-rpc/v1',
      ],
    },
    public: {
      http: [
        'https://testnet.hashio.io/api',
        'https://testnet.mirrornode.hedera.com',
        'https://pool.arkhia.io/hedera/testnet/json-rpc/v1',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'HashScan',
      url: 'https://hashscan.io/testnet',
    },
  },
  testnet: true,
});

/**
 * Hedera Mainnet Chain Configuration
 * Chain ID: 295
 */
export const hederaMainnet = defineChain({
  id: 295,
  name: 'Hedera Mainnet',
  network: 'hedera-mainnet',
  nativeCurrency: {
    decimals: 18, // MetaMask requires 18 decimals for EVM compatibility
    name: 'HBAR',
    symbol: 'HBAR',
  },
  rpcUrls: {
    default: {
      http: ['https://mainnet.hashio.io/api'],
    },
    public: {
      http: ['https://mainnet.hashio.io/api'],
    },
  },
  blockExplorers: {
    default: {
      name: 'HashScan',
      url: 'https://hashscan.io/mainnet',
    },
  },
  testnet: false,
});
