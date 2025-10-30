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

  if (!TOKENS.POKER_CHIP) {
    throw new Error('POKER_CHIP token ID not configured in environment');
  }

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
): Promise<{ serial_number: number; metadata: string }[]> {
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

// ============================================================================
// MVP: RAKE & CHIP ECONOMY
// ============================================================================

export const RAKE_PERCENTAGE = 0.05;
export const MAX_RAKE_TINYBARS = BigInt(10_000_000);
export const EXCHANGE_RATE = 100;
export const MIN_PURCHASE = 0.1;

export function calculateRake(potAmount: bigint): bigint {
  const rake = (potAmount * BigInt(Math.floor(RAKE_PERCENTAGE * 100))) / 100n;
  return rake > MAX_RAKE_TINYBARS ? MAX_RAKE_TINYBARS : rake;
}

export function logRakeCollection(gameAddress: string, potAmount: bigint, rakeAmount: bigint, winnerAddress: string): void {
  console.log('[HTS MVP] Rake:', { game: gameAddress, pot: potAmount, rake: rakeAmount, winner: winnerAddress });
}

export async function simulateBuyChips(playerAddress: string, hbarAmount: number): Promise<{ success: boolean; chipAmount: number; transactionId: string; }> {
  console.log('[HTS MVP] Buy:', { player: playerAddress, hbar: hbarAmount, chips: hbarAmount * EXCHANGE_RATE, token: TOKENS.POKER_CHIP });
  await new Promise<void>(r => { setTimeout(r, 2000); });
  return { success: true, chipAmount: hbarAmount * EXCHANGE_RATE, transactionId: `0.0.${String(Date.now())}-mock` };
}

export function getSimulatedChipBalance(address: string): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(`chip_balance_${address}`) ?? '0', 10);
}

export function updateSimulatedChipBalance(address: string, amount: number): void {
  if (typeof window === 'undefined') return;
  const current = getSimulatedChipBalance(address);
  localStorage.setItem(`chip_balance_${address}`, (current + amount).toString());
}
