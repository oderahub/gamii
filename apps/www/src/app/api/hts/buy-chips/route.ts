import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createBuyChipsTransaction } from '~/lib/hedera/hts-operations';
import { MIN_PURCHASE } from '~/lib/hedera/tokens';
import type { BuyChipsRequest, BuyChipsResponse } from '~/types';

/**
 * POST /api/hts/buy-chips
 *
 * Creates a transaction for buying POKER_CHIP with HBAR
 * Returns transaction bytes for client to sign
 */
export async function POST(
    request: NextRequest
): Promise<NextResponse<BuyChipsResponse>> {
    try {
        const body = (await request.json()) as BuyChipsRequest;
        const { playerAddress, hbarAmount } = body;

        // Validation
        if (!playerAddress || !hbarAmount) {
            return NextResponse.json(
                { success: false, error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        if (hbarAmount < MIN_PURCHASE) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Minimum purchase: ${String(MIN_PURCHASE)} HBAR`,
                },
                { status: 400 }
            );
        }

        // Create transaction (treasury signs, player needs to sign)
        const { transactionBytes, chipAmount } = await createBuyChipsTransaction(
            playerAddress,
            hbarAmount
        );

        return NextResponse.json({
            success: true,
            transactionBytes,
            chipAmount,
            message:
                'Transaction created. Please sign with your wallet to complete purchase.',
        });
    } catch (error) {
        console.error('[API] Buy chips error:', error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error ? error.message : 'Transaction creation failed',
            },
            { status: 500 }
        );
    }
}
