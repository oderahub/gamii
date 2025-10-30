/**
 * HTS Operations - Real Hedera Token Service Implementation
 *
 * This module handles:
 * - Real HBAR → POKER_CHIP exchanges
 * - Winner NFT minting and transfers
 * - Token balance queries from Mirror Node
 */

import {
    TransferTransaction,
    AccountId,
    Hbar,
    TokenId,
    PrivateKey,
    TokenMintTransaction,
    Transaction,
} from '@hashgraph/sdk';
import { createHederaClient } from './client';
import { TOKENS, EXCHANGE_RATE } from './tokens';
import { HCS_TOPICS, submitHCSMessage, MessageType } from './hcs';
import { env } from '~/env';
import type { NFTMetadata } from '~/types';

/**
 * Create buy chips transaction (server-side)
 * Returns transaction bytes for client to sign
 */
export async function createBuyChipsTransaction(
    playerAddress: string,
    hbarAmount: number
): Promise<{ transactionBytes: string; chipAmount: number }> {
    if (!TOKENS.POKER_CHIP) {
        throw new Error('POKER_CHIP token not configured');
    }

    if (
        !env.NEXT_PUBLIC_HEDERA_ED25519_ACCOUNT_ID ||
        !process.env.HEDERA_ED25519_PRIVATE_KEY_DER
    ) {
        throw new Error('Treasury account not configured');
    }

    const client = createHederaClient();
    const chipAmount = Math.floor(hbarAmount * EXCHANGE_RATE * 100);

    const treasuryId = AccountId.fromString(
        env.NEXT_PUBLIC_HEDERA_ED25519_ACCOUNT_ID
    );
    const treasuryKey = PrivateKey.fromStringDer(
        process.env.HEDERA_ED25519_PRIVATE_KEY_DER
    );

    // Atomic swap: HBAR for POKER_CHIP
    const transaction = new TransferTransaction()
        .addHbarTransfer(AccountId.fromString(playerAddress), new Hbar(-hbarAmount))
        .addHbarTransfer(treasuryId, new Hbar(hbarAmount))
        .addTokenTransfer(
            TokenId.fromString(TOKENS.POKER_CHIP),
            treasuryId,
            -chipAmount
        )
        .addTokenTransfer(
            TokenId.fromString(TOKENS.POKER_CHIP),
            AccountId.fromString(playerAddress),
            chipAmount
        )
        .freezeWith(client);

    const signedTx = await transaction.sign(treasuryKey);
    const txBytes = Buffer.from(signedTx.toBytes()).toString('base64');

    client.close();

    return {
        transactionBytes: txBytes,
        chipAmount: chipAmount / 100,
    };
}

/**
 * Submit signed transaction to Hedera (client-side)
 */
export async function submitSignedTransaction(
    transactionBytes: string
): Promise<string> {
    const client = createHederaClient();

    const transaction = Transaction.fromBytes(
        Buffer.from(transactionBytes, 'base64')
    );
    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    client.close();

    if (receipt.status.toString() !== 'SUCCESS') {
        throw new Error(`Transaction failed: ${receipt.status.toString()}`);
    }

    return txResponse.transactionId.toString();
}

/**
 * Get real token balance from Mirror Node
 */
export async function getRealTokenBalance(
    accountId: string,
    tokenId: string
): Promise<number> {
    const mirrorNodeUrl = env.NEXT_PUBLIC_HEDERA_MIRROR_NODE;

    try {
        const response = await fetch(
            `${mirrorNodeUrl}/api/v1/accounts/${accountId}/tokens?token.id=${tokenId}`
        );

        if (!response.ok) {
            throw new Error(`Mirror Node API error: ${response.status}`);
        }

        const data = (await response.json()) as {
            tokens?: { balance: number }[];
        };
        return data.tokens?.[0]?.balance ?? 0;
    } catch (error) {
        console.error('[HTS] Failed to fetch balance:', error);
        return 0;
    }
}

/**
 * Mint and transfer winner NFT (server-side)
 */
export async function mintWinnerNFT(
    gameAddress: string,
    winnerAddress: string,
    gameData: {
        potSize: string;
        winningHand?: string;
        totalPlayers: number;
    }
): Promise<{ nftSerial: number; transactionId: string }> {
    if (!TOKENS.ACHIEVEMENT_BADGE) {
        throw new Error('ACHIEVEMENT_BADGE token not configured');
    }

    if (
        !env.NEXT_PUBLIC_HEDERA_ED25519_ACCOUNT_ID ||
        !process.env.HEDERA_ED25519_PRIVATE_KEY_DER
    ) {
        throw new Error('Treasury account not configured');
    }

    const client = createHederaClient();
    const treasuryId = AccountId.fromString(
        env.NEXT_PUBLIC_HEDERA_ED25519_ACCOUNT_ID
    );

    // Create NFT metadata
    const metadata: NFTMetadata = {
        name: `Winner Trophy - Game ${gameAddress.slice(0, 10)}...`,
        description: `Victory in Texas Hold'em ZK Poker. Won ${gameData.potSize} HBAR${gameData.winningHand ? ` with ${gameData.winningHand}` : ''}`,
        image: 'ipfs://QmTrophyImageHash', // Replace with actual IPFS hash
        attributes: {
            gameId: gameAddress,
            timestamp: Date.now(),
            potSize: gameData.potSize,
            handType: gameData.winningHand ?? 'Unknown',
            players: gameData.totalPlayers,
            rarity: 'Winner',
        },
    };

    // Mint NFT
    const mintTx = new TokenMintTransaction()
        .setTokenId(TokenId.fromString(TOKENS.ACHIEVEMENT_BADGE))
        .setMetadata([Buffer.from(JSON.stringify(metadata))]);

    const mintResponse = await mintTx.execute(client);
    const mintReceipt = await mintResponse.getReceipt(client);
    const serialNumber = mintReceipt.serials[0]?.toNumber();

    if (!serialNumber) {
        client.close();
        throw new Error('Failed to mint NFT');
    }

    // Transfer NFT to winner
    const transferTx = new TransferTransaction().addNftTransfer(
        TokenId.fromString(TOKENS.ACHIEVEMENT_BADGE),
        serialNumber,
        treasuryId,
        AccountId.fromString(winnerAddress)
    );

    const transferResponse = await transferTx.execute(client);
    await transferResponse.getReceipt(client);

    client.close();

    // Notify via HCS
    if (HCS_TOPICS.GAME_EVENTS) {
        await submitHCSMessage(HCS_TOPICS.GAME_EVENTS, {
            type: MessageType.WINNER_NFT_AWARDED,
            gameId: gameAddress,
            playerAddress: winnerAddress,
            timestamp: Date.now(),
            data: {
                nftSerial: serialNumber,
                tokenId: TOKENS.ACHIEVEMENT_BADGE,
            },
        }).catch((err: unknown) =>
            console.error('[HCS] Failed to publish NFT event:', err)
        );
    }

    return {
        nftSerial: serialNumber,
        transactionId: mintResponse.transactionId.toString(),
    };
}

/**
 * Check if account has token association
 */
export async function isTokenAssociated(
    accountId: string,
    tokenId: string
): Promise<boolean> {
    try {
        const balance = await getRealTokenBalance(accountId, tokenId);
        return balance >= 0;
    } catch {
        return false;
    }
}
