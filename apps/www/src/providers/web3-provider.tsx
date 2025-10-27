'use client';

import type { PropsWithChildren } from 'react';

import { wagmiConfig } from '~/lib/viem';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type State, WagmiProvider } from 'wagmi';

const queryClient = new QueryClient();

interface Web3ProviderProps extends PropsWithChildren {
  initialState?: State;
}

export const Web3Provider = ({ children, initialState }: Web3ProviderProps) => {
  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
};