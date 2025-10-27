/**
 * React Hooks for Hedera Consensus Service (HCS)
 *
 * These hooks provide real-time updates from HCS topics,
 * replacing the inefficient 4-second polling mechanism.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  type HCSMessage,
  type ChatMessageData,
  type LobbyUpdateData,
  getGameEvents,
  getGameChat,
  getLobbyState,
  submitGameEvent,
  submitChatMessage,
  MessageType,
} from '~/lib/hedera/hcs';

/**
 * Hook to subscribe to game events for a specific game
 * Replaces contract event polling
 */
export function useGameEvents(gameId: string | undefined, enabled: boolean = true) {
  const [events, setEvents] = useState<HCSMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const lastTimestampRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled || !gameId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchEvents = async () => {
      try {
        const newEvents = await getGameEvents(gameId, lastTimestampRef.current);

        if (isMounted && newEvents.length > 0) {
          setEvents(prev => [...prev, ...newEvents]);
          // Update timestamp to latest message
          lastTimestampRef.current = Math.max(...newEvents.map(e => e.timestamp));
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchEvents();

    // Poll every 2 seconds (much faster than 4-second contract polling)
    const intervalId = setInterval(fetchEvents, 2000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [gameId, enabled]);

  return { events, loading, error };
}

/**
 * Hook to subscribe to game chat messages
 */
export function useGameChat(gameId: string | undefined, enabled: boolean = true) {
  const [messages, setMessages] = useState<HCSMessage<ChatMessageData>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sending, setSending] = useState(false);
  const lastTimestampRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled || !gameId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchMessages = async () => {
      try {
        const newMessages = await getGameChat(gameId, lastTimestampRef.current);

        if (isMounted && newMessages.length > 0) {
          setMessages(prev => [...prev, ...newMessages]);
          lastTimestampRef.current = Math.max(...newMessages.map(m => m.timestamp));
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchMessages();

    // Poll for new messages every 1 second (instant chat feel)
    const intervalId = setInterval(fetchMessages, 1000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [gameId, enabled]);

  // Function to send a message
  const sendMessage = useCallback(
    async (sender: string, senderAddress: string, message: string) => {
      if (!gameId) return;

      setSending(true);
      try {
        await submitChatMessage(gameId, sender, senderAddress, message);
      } catch (err) {
        setError(err as Error);
      } finally {
        setSending(false);
      }
    },
    [gameId]
  );

  return { messages, sendMessage, sending, loading, error };
}

/**
 * Hook to subscribe to global lobby updates
 */
export function useLobbyState(enabled: boolean = true) {
  const [lobbyState, setLobbyState] = useState<LobbyUpdateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const lastTimestampRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchLobbyState = async () => {
      try {
        const update = await getLobbyState(lastTimestampRef.current);

        if (isMounted && update) {
          setLobbyState(update.data);
          lastTimestampRef.current = update.timestamp;
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchLobbyState();

    // Poll every 3 seconds for lobby updates
    const intervalId = setInterval(fetchLobbyState, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [enabled]);

  return { lobbyState, loading, error };
}

/**
 * Hook to submit game events
 * Use this when you need to publish game state changes
 */
export function useGameEventPublisher(gameId: string | undefined) {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const publishEvent = useCallback(
    async <T,>(type: MessageType, data: T, playerId?: string) => {
      if (!gameId) {
        throw new Error('Game ID is required');
      }

      setPublishing(true);
      setError(null);

      try {
        await submitGameEvent(gameId, type, data, playerId);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setPublishing(false);
      }
    },
    [gameId]
  );

  return { publishEvent, publishing, error };
}

/**
 * Hook to get the latest event of a specific type
 * Useful for getting current game state
 */
export function useLatestGameEvent<T = any>(
  gameId: string | undefined,
  eventType: MessageType
) {
  const { events } = useGameEvents(gameId);

  const latestEvent = events
    .filter(e => e.type === eventType)
    .pop() as HCSMessage<T> | undefined;

  return latestEvent?.data || null;
}

/**
 * Hook to monitor game state changes
 * Returns a simplified game state object
 */
export function useGameState(gameId: string | undefined) {
  const { events, loading, error } = useGameEvents(gameId);

  const [gameState, setGameState] = useState({
    status: 'waiting' as 'waiting' | 'active' | 'ended',
    players: [] as string[],
    currentPlayer: null as string | null,
    pot: '0',
    communityCards: [] as number[],
  });

  useEffect(() => {
    // Process events to build current game state
    events.forEach(event => {
      switch (event.type) {
        case MessageType.GAME_STARTED:
          setGameState(prev => ({ ...prev, status: 'active' }));
          break;
        case MessageType.PLAYER_JOINED:
          setGameState(prev => ({
            ...prev,
            players: [...prev.players, event.playerId || ''],
          }));
          break;
        case MessageType.GAME_ENDED:
          setGameState(prev => ({ ...prev, status: 'ended' }));
          break;
        // Add more event handlers as needed
      }
    });
  }, [events]);

  return { gameState, loading, error };
}
