'use client';

import '@rainbow-me/rainbowkit/styles.css';
import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';

import { wagmiConfig } from '~/lib/viem';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, useAccount, useChainId, useSwitchChain } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';

const queryClient = new QueryClient();

const HEDERA_TESTNET_ID = 296;
const HEDERA_TESTNET_HEX = '0x128';

const ChainSwitcher = ({ children }: { children: React.ReactNode }) => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (!isConnected || chainId === HEDERA_TESTNET_ID) return;

    const addAndSwitchChain = async () => {
      try {
        if (switchChain) {
          switchChain({ chainId: HEDERA_TESTNET_ID });
        } else {
          await window.ethereum?.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: HEDERA_TESTNET_HEX,
                chainName: 'Hedera Testnet',
                rpcUrls: ['https://testnet.hashio.io/api'],
                nativeCurrency: {
                  name: 'HBAR',
                  symbol: 'HBAR',
                  decimals: 18,
                },
                blockExplorerUrls: ['https://hashscan.io/testnet'],
              }
            ]
          });

          await window.ethereum?.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: HEDERA_TESTNET_HEX }],
          });
        }
      } catch (error) {
        console.error('Failed to add/switch to Hedera Testnet:', error);
      }
    };

    void addAndSwitchChain();
  }, [isConnected, chainId, switchChain]);

  return <>{children}</>;
}

export const Web3Provider = ({ children }: PropsWithChildren) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <ChainSwitcher>
            {children}
          </ChainSwitcher>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};