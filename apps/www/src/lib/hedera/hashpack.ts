/**
 * HashPack Wallet Integration
 *
 * Utilities for connecting to HashPack wallet on Hedera.
 * HashPack is the most popular Hedera wallet, supporting both
 * native Hedera accounts and EVM-compatible addresses.
 */

import { AccountId } from '@hashgraph/sdk';

/**
 * HashPack pairing data structure
 */
export interface HashConnectPairingData {
  accountIds: string[];
  network: string;
  topic: string;
}

/**
 * HashConnect instance type
 */
interface HashConnectType {
  init: (appMetadata: AppMetadata, network: string, debug: boolean) => Promise<void>;
  connectToLocalWallet: () => void;
  pairingEvent: {
    on: (callback: (data: HashConnectPairingData) => void) => void;
  };
  disconnectionEvent: {
    on: (callback: () => void) => void;
  };
  transactionEvent: {
    on: (callback: (data: TransactionEventData) => void) => void;
  };
  sendTransaction: (accountId: string, transaction: unknown) => Promise<unknown>;
  disconnect: () => Promise<void>;
}

interface AppMetadata {
  name: string;
  description: string;
  icon: string;
  url: string;
}

interface TransactionEventData {
  success: boolean;
}

/**
 * Initialize HashConnect for HashPack wallet
 * Note: This requires installing hashgraph/hashconnect
 *
 * Installation:
 * ```bash
 * pnpm add @hashgraph/hashconnect
 * ```
 */
export async function initHashPack(): Promise<HashConnectType> {
  try {
    // Check if HashConnect is available
    if (typeof window === 'undefined') {
      throw new Error('HashConnect can only be used in browser');
    }

    // Dynamic import for client-side only
    const { HashConnect } = await import('@hashgraph/hashconnect');

    const hashconnect = new HashConnect() as unknown as HashConnectType;

    // Initialize (v1 API requires appMetadata and network parameters)
    await hashconnect.init(
      {
        name: 'Texas Holdem ZK Poker',
        description: 'Decentralized Texas Hold\'em Poker on Hedera',
        icon: '/logo.png',
        url: window.location.origin,
      },
      'testnet', // network
      true // debug mode
    );

    return hashconnect;
  } catch (error) {
    console.error('Failed to initialize HashPack:', error);
    throw error;
  }
}

/**
 * Connect to HashPack wallet
 * Initiates pairing with HashPack extension/mobile app
 */
export async function connectHashPack(): Promise<{
  hashconnect: HashConnectType;
  accountId: string;
  network: string;
  topic: string;
}> {
  const hashconnect = await initHashPack();

  return new Promise((resolve, reject) => {
    // Set up pairing event listener
    hashconnect.pairingEvent.on((pairingData: HashConnectPairingData) => {
      if (pairingData.accountIds.length === 0) {
        const error = new Error('No accounts found in HashPack wallet');
        reject(error);
        return;
      }

      resolve({
        hashconnect,
        accountId: pairingData.accountIds[0] ?? '',
        network: pairingData.network,
        topic: pairingData.topic,
      });
    });

    // Trigger connection
    try {
      hashconnect.connectToLocalWallet();
    } catch (error) {
      console.error('Failed to connect to HashPack:', error);
      const connectionError = error instanceof Error ? error : new Error('Unknown connection error');
      reject(connectionError);
    }
  });
}

/**
 * Convert Hedera account ID to EVM address
 * Hedera accounts can have both native (0.0.x) and EVM addresses
 * Note: Use getAccountInfo() for accurate EVM address from Mirror Node
 */
export function accountIdToEvmAddress(accountId: string): string {
  try {
    const account = AccountId.fromString(accountId);
    // Convert to hex format - for display purposes only
    // For accurate EVM address, use Mirror Node API via getAccountInfo()
    const num = account.num;
    return `0x${num.toString(16).padStart(40, '0')}`;
  } catch (error) {
    console.error('Failed to convert account ID to EVM address:', error);
    return '';
  }
}

interface AccountInfoResponse {
  account: string;
  evm_address: string;
  balance: {
    balance: number;
    tokens?: { token_id: string; balance: number }[];
  };
}

interface AccountInfo {
  accountId: string;
  evmAddress: string;
  balance: number;
  tokens: { token_id: string; balance: number }[];
}

/**
 * Get account info from Mirror Node
 */
export async function getAccountInfo(accountId: string): Promise<AccountInfo> {
  const mirrorNodeUrl = process.env.NEXT_PUBLIC_HEDERA_MIRROR_NODE ?? 'https://testnet.mirrornode.hedera.com';

  try {
    const response = await fetch(`${mirrorNodeUrl}/api/v1/accounts/${accountId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch account info');
    }

    const data = await response.json() as AccountInfoResponse;
    return {
      accountId: data.account,
      evmAddress: data.evm_address,
      balance: data.balance.balance,
      tokens: data.balance.tokens ?? [],
    };
  } catch (error) {
    console.error('Failed to get account info:', error);
    throw error;
  }
}

declare global {
  interface Window {
    hashconnect?: unknown;
  }
}

/**
 * Check if HashPack extension is installed
 */
export function isHashPackInstalled(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for HashPack extension
  return Boolean(window.hashconnect);
}

/**
 * Get HashPack download link
 */
export function getHashPackDownloadUrl(): string {
  return 'https://www.hashpack.app/download';
}

/**
 * Sign a transaction with HashPack
 * This can be used for both native Hedera transactions and EVM transactions
 */
export async function signTransaction(
  hashconnect: HashConnectType,
  transaction: unknown,
  accountId: string
): Promise<unknown> {
  try {
    // Send transaction to HashPack for signing
    const result = await hashconnect.sendTransaction(accountId, transaction);

    return result;
  } catch (error) {
    console.error('Failed to sign transaction:', error);
    throw error;
  }
}

/**
 * Disconnect from HashPack
 */
export async function disconnectHashPack(hashconnect: HashConnectType): Promise<void> {
  try {
    await hashconnect.disconnect();
  } catch (error) {
    console.error('Failed to disconnect HashPack:', error);
    throw error;
  }
}

interface HashPackCallbacks {
  onPaired?: (data: HashConnectPairingData) => void;
  onDisconnected?: () => void;
  onTransactionApproved?: (data: TransactionEventData) => void;
  onTransactionRejected?: () => void;
}

/**
 * Listen for HashPack events
 */
export function listenHashPackEvents(
  hashconnect: HashConnectType,
  callbacks: HashPackCallbacks
): void {
  if (callbacks.onPaired) {
    hashconnect.pairingEvent.on((data: HashConnectPairingData) => {
      callbacks.onPaired?.(data);
    });
  }

  if (callbacks.onDisconnected) {
    hashconnect.disconnectionEvent.on(() => {
      callbacks.onDisconnected?.();
    });
  }

  const hasTransactionHandlers = Boolean(callbacks.onTransactionApproved) || Boolean(callbacks.onTransactionRejected);
  if (hasTransactionHandlers) {
    hashconnect.transactionEvent.on((data: TransactionEventData) => {
      if (data.success) {
        callbacks.onTransactionApproved?.(data);
      } else {
        callbacks.onTransactionRejected?.();
      }
    });
  }
}

/**
 * Example usage in a React component:
 *
 * ```tsx
 * import { connectHashPack, getAccountInfo } from '~/lib/hedera/hashpack';
 *
 * function WalletConnect() {
 *   const [account, setAccount] = useState(null);
 *
 *   const handleConnect = async () => {
 *     try {
 *       const { accountId, hashconnect } = await connectHashPack();
 *       const info = await getAccountInfo(accountId);
 *       setAccount(info);
 *     } catch (error) {
 *       console.error('Connection failed:', error);
 *     }
 *   };
 *
 *   return (
 *     <button onClick={handleConnect}>
 *       Connect HashPack
 *     </button>
 *   );
 * }
 * ```
 */
