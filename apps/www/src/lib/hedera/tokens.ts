/**
 * Hedera Token Service (HTS) Utilities
 *
 * This module provides utilities for interacting with HTS tokens:
 * - POKER_CHIP: Fungible token for in-game currency
 * - TOURNAMENT_TICKET: NFT for tournament entries
 * - ACHIEVEMENT_BADGE: NFT for player achievements
 */

import {
  TokenId,
  AccountId,
  TransferTransaction,
  TokenAssociateTransaction,
  TokenMintTransaction,
  NftId,
  Hbar
} from '@hashgraph/sdk';
import { createHederaClient } from './client';
import { env } from '~/env';

/**
 * Token IDs from environment
 */
export const TOKENS = {
  POKER_CHIP: env.NEXT_PUBLIC_POKER_CHIP_TOKEN_ID,
  TOURNAMENT_TICKET: env.NEXT_PUBLIC_TOURNAMENT_TICKET_NFT_ID,
  ACHIEVEMENT_BADGE: env.NEXT_PUBLIC_ACHIEVEMENT_BADGE_NFT_ID,
} as const;

/**
 * Associate a token with an account
 * Required before an account can receive tokens
 */
export async function associateToken(
  accountId: string,
  tokenId: string
): Promise<string> {
  const client = createHederaClient();

  const transaction = new TokenAssociateTransaction()
    .setAccountId(AccountId.fromString(accountId))
    .setTokenIds([TokenId.fromString(tokenId)])
    .freezeWith(client);

  const txResponse = await transaction.execute(client);
  const receipt = await txResponse.getReceipt(client);

  client.close();
  return receipt.status.toString();
}

/**
 * Transfer POKER_CHIP tokens between accounts
 */
export async function transferPokerChips(
  fromAccountId: string,
  toAccountId: string,
  amount: number
): Promise<string> {
  const client = createHederaClient();
  const tokenId = TokenId.fromString(TOKENS.POKER_CHIP);

  // Amount is in "cents" (with 2 decimals)
  const transferAmount = amount; // e.g., 1000 = 10.00 CHIP

  const transaction = await new TransferTransaction()
    .addTokenTransfer(tokenId, AccountId.fromString(fromAccountId), -transferAmount)
    .addTokenTransfer(tokenId, AccountId.fromString(toAccountId), transferAmount)
    .freezeWith(client);

  const txResponse = await transaction.execute(client);
  const receipt = await txResponse.getReceipt(client);

  client.close();
  return receipt.status.toString();
}

/**
 * Get token balance for an account
 */
export async function getTokenBalance(
  accountId: string,
  tokenId: string
): Promise<number> {
  const client = createHederaClient();

  try {
    // Use Mirror Node API to get balance
    const mirrorNodeUrl = env.NEXT_PUBLIC_HEDERA_MIRROR_NODE;
    const response = await fetch(
      `${mirrorNodeUrl}/api/v1/accounts/${accountId}/tokens?token.id=${tokenId}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch token balance');
    }

    const data = await response.json();
    const balance = data.tokens?.[0]?.balance || 0;

    client.close();
    return Number(balance);
  } catch (error) {
    client.close();
    throw error;
  }
}

/**
 * Mint an NFT (Tournament Ticket or Achievement Badge)
 */
export async function mintNFT(
  tokenId: string,
  metadata: string
): Promise<number> {
  const client = createHederaClient();

  const transaction = new TokenMintTransaction()
    .setTokenId(TokenId.fromString(tokenId))
    .setMetadata([Buffer.from(metadata)])
    .setMaxTransactionFee(new Hbar(20));

  const txResponse = await transaction.execute(client);
  const receipt = await txResponse.getReceipt(client);
  const serialNumber = receipt.serials[0];

  client.close();
  return serialNumber ? Number(serialNumber) : 0;
}

/**
 * Transfer an NFT to another account
 */
export async function transferNFT(
  tokenId: string,
  serialNumber: number,
  fromAccountId: string,
  toAccountId: string
): Promise<string> {
  const client = createHederaClient();
  const nftId = new NftId(TokenId.fromString(tokenId), serialNumber);

  const transaction = await new TransferTransaction()
    .addNftTransfer(nftId, AccountId.fromString(fromAccountId), AccountId.fromString(toAccountId))
    .freezeWith(client);

  const txResponse = await transaction.execute(client);
  const receipt = await txResponse.getReceipt(client);

  client.close();
  return receipt.status.toString();
}

/**
 * Get NFTs owned by an account
 */
export async function getNFTsForAccount(
  accountId: string,
  tokenId: string
): Promise<Array<{ serial_number: number; metadata: string }>> {
  const mirrorNodeUrl = env.NEXT_PUBLIC_HEDERA_MIRROR_NODE;

  const response = await fetch(
    `${mirrorNodeUrl}/api/v1/accounts/${accountId}/nfts?token.id=${tokenId}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch NFTs');
  }

  const data = await response.json();
  return data.nfts || [];
}

/**
 * Get token info from Mirror Node
 */
export async function getTokenInfo(tokenId: string) {
  const mirrorNodeUrl = env.NEXT_PUBLIC_HEDERA_MIRROR_NODE;

  const response = await fetch(`${mirrorNodeUrl}/api/v1/tokens/${tokenId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch token info');
  }

  return await response.json();
}

/**
 * Helper: Format POKER_CHIP amount for display
 * Converts from smallest unit to decimal (e.g., 1000 -> "10.00")
 */
export function formatPokerChips(amount: number): string {
  return (amount / 100).toFixed(2);
}

/**
 * Helper: Parse POKER_CHIP amount from string
 * Converts from decimal to smallest unit (e.g., "10.00" -> 1000)
 */
export function parsePokerChips(amountStr: string): number {
  const amount = parseFloat(amountStr);
  return Math.floor(amount * 100);
}
