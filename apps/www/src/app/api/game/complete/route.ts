import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { mintWinnerNFT } from '~/lib/hedera/hts-operations';
import { env } from '~/env';
import type { GameCompleteRequest, GameCompleteResponse } from '~/types';

/**
 * POST /api/game/complete
 *
 * Called when a game completes with a winner
 * Automatically mints and transfers ACHIEVEMENT_BADGE NFT to winner
 */
export async function POST(
    request: NextRequest
): Promise<NextResponse<GameCompleteResponse>> {
    try {
        const body = (await request.json()) as GameCompleteRequest;
        const { gameAddress, winnerAddress, gameData } = body;

        // Validation
        if (!gameAddress || !winnerAddress || typeof gameData.totalPlayers !== 'number') {
            return NextResponse.json(
                { success: false, error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        // Verify addresses are valid
        if (!gameAddress.startsWith('0x') || !winnerAddress.startsWith('0x')) {
            return NextResponse.json(
                { success: false, error: 'Invalid address format' },
                { status: 400 }
            );
        }

        console.log('[API] Game complete:', {
            game: gameAddress,
            winner: winnerAddress,
            pot: gameData.potSize,
            players: gameData.totalPlayers,
        });

        // Mint and transfer NFT to winner
        const { nftSerial, transactionId } = await mintWinnerNFT(
            gameAddress,
            winnerAddress,
            gameData
        );

        console.log('[API] Winner NFT minted:', {
            serial: nftSerial,
            txId: transactionId,
        });

        return NextResponse.json({
            success: true,
            nftSerial,
            tokenId: env.NEXT_PUBLIC_ACHIEVEMENT_BADGE_NFT_ID,
            transactionId,
        });
    } catch (error) {
        console.error('[API] Game complete error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'NFT minting failed',
            },
            { status: 500 }
        );
    }
}
