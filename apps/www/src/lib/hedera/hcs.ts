/**
 * Hedera Consensus Service (HCS) Utilities
 *
 * This module provides utilities for real-time messaging using HCS:
 * - Game Events: Real-time game state updates
 * - Game Chat: Player communication
 * - Global Lobby: Live games list
 *
 * Replaces inefficient 4-second polling with instant consensus-based messaging.
 */

import {
  TopicId,
  TopicMessageSubmitTransaction,
  TopicMessageQuery,
  Client,
  Hbar
} from '@hashgraph/sdk';
import { createHederaClient } from './client';
import { env } from '~/env';

/**
 * HCS Topic IDs from environment
 */
export const HCS_TOPICS = {
  GAME_EVENTS: env.NEXT_PUBLIC_GAME_EVENTS_TOPIC_ID,
  GAME_CHAT: env.NEXT_PUBLIC_GAME_CHAT_TOPIC_ID,
  GLOBAL_LOBBY: env.NEXT_PUBLIC_GLOBAL_LOBBY_TOPIC_ID,
} as const;

/**
 * Message Types
 */
export enum MessageType {
  // Game Events
  GAME_CREATED = 'GAME_CREATED',
  GAME_STARTED = 'GAME_STARTED',
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  PLAYER_ACTION = 'PLAYER_ACTION',
  HAND_DEALT = 'HAND_DEALT',
  COMMUNITY_CARDS = 'COMMUNITY_CARDS',
  SHOWDOWN = 'SHOWDOWN',
  GAME_ENDED = 'GAME_ENDED',

  // Chat Messages
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  CHAT_EMOJI = 'CHAT_EMOJI',

  // Lobby Updates
  LOBBY_UPDATE = 'LOBBY_UPDATE',
}

/**
 * Base message structure
 */
export interface HCSMessage<T = any> {
  type: MessageType;
  gameId?: string;
  playerId?: string;
  playerAddress?: string;
  timestamp: number;
  data: T;
}

/**
 * Game event message types
 */
export interface GameCreatedData {
  gameId: string;
  creator: string;
  buyIn: string;
  maxPlayers: number;
}

export interface PlayerActionData {
  action: 'fold' | 'check' | 'call' | 'raise';
  amount?: string;
}

export interface ChatMessageData {
  message: string;
  sender: string;
  senderAddress: string;
}

export interface LobbyUpdateData {
  activeGames: number;
  games: Array<{
    id: string;
    players: number;
    maxPlayers: number;
    buyIn: string;
    status: 'waiting' | 'active' | 'ended';
  }>;
}

/**
 * Submit a message to an HCS topic
 */
export async function submitHCSMessage<T>(
  topicId: string,
  message: HCSMessage<T>
): Promise<string> {
  if (!topicId) {
    throw new Error('Topic ID is required');
  }

  const client = createHederaClient();

  try {
    const messageJson = JSON.stringify(message);
    const messageBytes = Buffer.from(messageJson, 'utf-8');

    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(messageBytes)
      .setMaxTransactionFee(new Hbar(1));

    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    client.close();
    return receipt.status.toString();
  } catch (error) {
    client.close();
    throw error;
  }
}

/**
 * Subscribe to messages from an HCS topic using Mirror Node REST API
 * This is more efficient for web applications than the SDK's subscription
 */
export async function getTopicMessages(
  topicId: string,
  startTimestamp?: number
): Promise<HCSMessage[]> {
  const mirrorNodeUrl = env.NEXT_PUBLIC_HEDERA_MIRROR_NODE;

  // Build query parameters
  const params = new URLSearchParams();
  if (startTimestamp) {
    params.append('timestamp', `gt:${startTimestamp}`);
  }
  params.append('limit', '100');
  params.append('order', 'asc');

  const url = `${mirrorNodeUrl}/api/v1/topics/${topicId}/messages?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch topic messages: ${response.statusText}`);
    }

    const data = await response.json();

    return data.messages?.map((msg: any) => {
      try {
        // Decode base64 message
        const messageText = Buffer.from(msg.message, 'base64').toString('utf-8');
        return JSON.parse(messageText) as HCSMessage;
      } catch (error) {
        console.error('Failed to parse HCS message:', error);
        return null;
      }
    }).filter(Boolean) || [];
  } catch (error) {
    console.error('Error fetching topic messages:', error);
    return [];
  }
}

/**
 * Helper: Submit a game event message
 */
export async function submitGameEvent<T>(
  gameId: string,
  type: MessageType,
  data: T,
  playerId?: string
): Promise<string> {
  const message: HCSMessage<T> = {
    type,
    gameId,
    playerId,
    timestamp: Date.now(),
    data,
  };

  return submitHCSMessage(HCS_TOPICS.GAME_EVENTS || '', message);
}

/**
 * Helper: Submit a chat message
 */
export async function submitChatMessage(
  gameId: string,
  sender: string,
  senderAddress: string,
  messageText: string
): Promise<string> {
  const message: HCSMessage<ChatMessageData> = {
    type: MessageType.CHAT_MESSAGE,
    gameId,
    playerAddress: senderAddress,
    timestamp: Date.now(),
    data: {
      message: messageText,
      sender,
      senderAddress,
    },
  };

  return submitHCSMessage(HCS_TOPICS.GAME_CHAT || '', message);
}

/**
 * Helper: Submit a lobby update
 */
export async function submitLobbyUpdate(
  data: LobbyUpdateData
): Promise<string> {
  const message: HCSMessage<LobbyUpdateData> = {
    type: MessageType.LOBBY_UPDATE,
    timestamp: Date.now(),
    data,
  };

  return submitHCSMessage(HCS_TOPICS.GLOBAL_LOBBY || '', message);
}

/**
 * Helper: Get game events for a specific game
 */
export async function getGameEvents(
  gameId: string,
  since?: number
): Promise<HCSMessage[]> {
  const messages = await getTopicMessages(HCS_TOPICS.GAME_EVENTS || '', since);
  return messages.filter(msg => msg.gameId === gameId);
}

/**
 * Helper: Get chat messages for a game
 */
export async function getGameChat(
  gameId: string,
  since?: number
): Promise<HCSMessage<ChatMessageData>[]> {
  const messages = await getTopicMessages(HCS_TOPICS.GAME_CHAT || '', since);
  return messages.filter(msg => msg.gameId === gameId) as HCSMessage<ChatMessageData>[];
}

/**
 * Helper: Get latest lobby state
 */
export async function getLobbyState(
  since?: number
): Promise<HCSMessage<LobbyUpdateData> | null> {
  const messages = await getTopicMessages(HCS_TOPICS.GLOBAL_LOBBY || '', since);

  // Return the most recent lobby update
  const lobbyUpdates = messages.filter(msg => msg.type === MessageType.LOBBY_UPDATE);
  return lobbyUpdates.length > 0
    ? lobbyUpdates[lobbyUpdates.length - 1] as HCSMessage<LobbyUpdateData>
    : null;
}

/**
 * Create a polling function for real-time updates
 * This replaces the 4-second contract polling
 */
export function createHCSPoller<T>(
  fetchFn: (since?: number) => Promise<HCSMessage<T>[]>,
  onMessage: (messages: HCSMessage<T>[]) => void,
  intervalMs: number = 2000
) {
  let lastTimestamp = Date.now();
  let intervalId: NodeJS.Timeout;

  const poll = async () => {
    try {
      const messages = await fetchFn(lastTimestamp);

      if (messages.length > 0) {
        onMessage(messages);
        // Update to the latest message timestamp
        lastTimestamp = Math.max(...messages.map(m => m.timestamp));
      }
    } catch (error) {
      console.error('HCS polling error:', error);
    }
  };

  const start = () => {
    // Initial fetch
    poll();
    // Set up interval
    intervalId = setInterval(poll, intervalMs);
  };

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };

  return { start, stop };
}
