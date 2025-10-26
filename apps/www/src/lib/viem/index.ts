import type { Abi } from 'viem';
import {
  type Config,
  cookieStorage,
  createConfig,
  createStorage,
  http,
} from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { env } from '~/env';

import { GAME_ABI, GAME_FACTORY_ABI } from './abi';
import { hederaTestnet } from '~/lib/hedera/chains';

export const projectId = env.NEXT_PUBLIC_WALLETCONNECT_ID;

// Contract addresses - will be deployed on Hedera Testnet
const AddressConfig = {
  GAME_FACTORY_ADDRESS: env.NEXT_PUBLIC_GAME_FACTORY_ADDRESS || '',
  REVEAL_VERIFIER: env.NEXT_PUBLIC_REVEAL_VERIFIER_ADDRESS || '',
  SHUFFLE_VERIFIER: env.NEXT_PUBLIC_SHUFFLE_VERIFIER_ADDRESS || '',
};

const metadata = {
  name: 'Texas Hold\'em ZK Poker',
  description: 'Play poker with zero-knowledge shuffles on Hedera',
  url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
};

// Only initialize WalletConnect on client side to avoid SSR indexedDB errors
const getConnectors = () => {
  const connectors = [];

  // Always available: injected wallet (MetaMask, etc.)
  connectors.push(injected({ shimDisconnect: true }));

  // Only add WalletConnect on client side
  if (typeof window !== 'undefined') {
    connectors.push(walletConnect({ projectId, metadata, showQrModal: false }));
  }

  return connectors;
};

export const wagmiConfig: Config = createConfig({
  chains: [hederaTestnet],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
  connectors: getConnectors(),
  transports: {
    [hederaTestnet.id]: http(env.NEXT_PUBLIC_HEDERA_JSON_RPC, {
      batch: false, // Disable batching for compatibility
      retryCount: 5,
      retryDelay: 1000,
      timeout: 60_000, // 60 second timeout
      fetchOptions: {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    }),
  },
  batch: {
    multicall: false, // Disable global multicall batching
  },
  cacheTime: 0,
});

export const gameFactoryConfig = {
  abi: GAME_FACTORY_ABI as Abi,
  address: AddressConfig.GAME_FACTORY_ADDRESS as `0x${string}`,
};

export const gameConfig = {
  abi: GAME_ABI as Abi,
  chainId: hederaTestnet.id,
};