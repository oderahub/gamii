import type { Abi } from 'viem';
import { type Config, http } from 'wagmi';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { env } from '~/env';

import { GAME_ABI, GAME_FACTORY_ABI } from './abi';
import { hederaTestnet } from '~/lib/hedera/chains';

// Contract addresses deployed on Hedera Testnet
const AddressConfig = {
  GAME_FACTORY_ADDRESS: env.NEXT_PUBLIC_GAME_FACTORY_ADDRESS ?? '',
  REVEAL_VERIFIER: env.NEXT_PUBLIC_REVEAL_VERIFIER_ADDRESS ?? '',
  SHUFFLE_VERIFIER: env.NEXT_PUBLIC_SHUFFLE_VERIFIER_ADDRESS ?? '',
};

export const wagmiConfig: Config = getDefaultConfig({
  appName: 'Texas Hold\'em ZK Poker',
  projectId: env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '',
  chains: [hederaTestnet],
  ssr: false, // Disable SSR for better Next.js compatibility
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
});

export const gameFactoryConfig = {
  abi: GAME_FACTORY_ABI as Abi,
  address: AddressConfig.GAME_FACTORY_ADDRESS as `0x${string}`,
};

export const gameConfig = {
  abi: GAME_ABI as Abi,
  chainId: hederaTestnet.id,
};