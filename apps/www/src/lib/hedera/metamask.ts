/**
 * MetaMask + Hedera Integration
 *
 * Utilities for adding Hedera network to MetaMask and managing connections
 */

import { hederaTestnet } from './chains';

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
}

/**
 * Add Hedera Testnet to MetaMask
 */
export async function addHederaToMetaMask(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  const ethereum = window.ethereum as EthereumProvider;

  try {
    await ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: `0x${hederaTestnet.id.toString(16)}`, // 296 = 0x128
          chainName: hederaTestnet.name,
          nativeCurrency: {
            name: hederaTestnet.nativeCurrency.name,
            symbol: hederaTestnet.nativeCurrency.symbol,
            decimals: hederaTestnet.nativeCurrency.decimals,
          },
          rpcUrls: hederaTestnet.rpcUrls.default.http,
          blockExplorerUrls: [hederaTestnet.blockExplorers.default.url],
        },
      ],
    });
    return true;
  } catch (error) {
    console.error('Failed to add Hedera to MetaMask:', error);
    throw error;
  }
}

interface ErrorWithCode {
  code: number;
}

function isErrorWithCode(error: unknown): error is ErrorWithCode {
  return typeof error === 'object' && error !== null && 'code' in error;
}

/**
 * Switch MetaMask to Hedera Testnet
 */
export async function switchToHederaNetwork(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  const ethereum = window.ethereum as EthereumProvider;

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${hederaTestnet.id.toString(16)}` }],
    });
    return true;
  } catch (error: unknown) {
    // If the chain hasn't been added yet, add it
    if (isErrorWithCode(error) && error.code === 4902) {
      return await addHederaToMetaMask();
    }
    throw error;
  }
}

/**
 * Check if MetaMask is installed
 */
export function isMetaMaskInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const ethereum = window.ethereum as EthereumProvider | undefined;
  return Boolean(ethereum?.isMetaMask);
}

/**
 * Get MetaMask download URL
 */
export function getMetaMaskDownloadUrl(): string {
  return 'https://metamask.io/download/';
}

/**
 * Request accounts from MetaMask
 */
export async function requestAccounts(): Promise<string[]> {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  const ethereum = window.ethereum as EthereumProvider;

  try {
    const accounts = await ethereum.request({
      method: 'eth_requestAccounts',
    });
    return accounts as string[];
  } catch (error) {
    console.error('Failed to request accounts:', error);
    throw error;
  }
}

/**
 * Check current network and switch to Hedera if needed
 */
export async function ensureHederaNetwork(): Promise<boolean> {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  const ethereum = window.ethereum as EthereumProvider;

  try {
    const chainId = await ethereum.request({ method: 'eth_chainId' }) as string;
    const hederaChainId = `0x${hederaTestnet.id.toString(16)}`;

    if (chainId !== hederaChainId) {
      await switchToHederaNetwork();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to ensure Hedera network:', error);
    throw error;
  }
}
