/**
 * API Route: Send Chat Message
 *
 * Handles HCS chat message submission server-side where
 * Hedera private keys are accessible.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { submitChatMessage } from '~/lib/hedera/hcs';

interface ChatMessageRequest {
  gameId: string;
  sender: string;
  senderAddress: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatMessageRequest;
    const { gameId, sender, senderAddress, message } = body;

    // Validation
    if (!gameId || typeof gameId !== 'string') {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      );
    }

    if (!sender || typeof sender !== 'string') {
      return NextResponse.json(
        { error: 'Sender is required' },
        { status: 400 }
      );
    }

    if (!senderAddress || typeof senderAddress !== 'string') {
      return NextResponse.json(
        { error: 'Sender address is required' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    if (message.length > 500) {
      return NextResponse.json(
        { error: 'Message too long (max 500 characters)' },
        { status: 400 }
      );
    }

    // Submit message to HCS (server-side has access to private key)
    const status = await submitChatMessage(
      gameId,
      sender,
      senderAddress,
      message.trim()
    );

    return NextResponse.json(
      {
        success: true,
        status,
        message: 'Message sent successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Chat API] Error sending message:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      },
      { status: 500 }
    );
  }
}
