/**
 * Hedera Account Utilities
 *
 * Utility functions for working with Hedera accounts.
 * Note: HashConnect/HashPack integration has been removed.
 * Use MetaMask with RainbowKit for wallet connection instead.
 */

import { AccountId } from '@hashgraph/sdk';

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

/**
 * Example usage:
 *
 * ```tsx
 * import { getAccountInfo } from '~/lib/hedera/hashpack';
 *
 * function AccountDisplay({ accountId }: { accountId: string }) {
 *   const [account, setAccount] = useState(null);
 *
 *   useEffect(() => {
 *     getAccountInfo(accountId)
 *       .then(setAccount)
 *       .catch(console.error);
 *   }, [accountId]);
 *
 *   return account ? <div>Balance: {account.balance}</div> : null;
 * }
 * ```
 */
