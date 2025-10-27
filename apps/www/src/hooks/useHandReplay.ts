'use client';

/**
 * React Hook for Hand Replay
 *
 * Manages hand replay creation, loading, and playback
 */

import { useState, useCallback } from 'react';
import {
  createHandReplayFile,
  getHandReplay,
  getGameReplays,
  type HandReplayData,
} from '~/lib/hedera/hfs';

export function useHandReplay(gameId?: string) {
  const [loading, setLoading] = useState(false);
  const [replay, setReplay] = useState<HandReplayData | null>(null);
  const [replays, setReplays] = useState<HandReplayData[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Save a new hand replay to HFS
   */
  const saveReplay = useCallback(
    async (handData: Partial<HandReplayData>): Promise<string> => {
      if (!gameId) {
        throw new Error('Game ID is required to save replay');
      }

      setLoading(true);
      setError(null);

      try {
        const fileId = await createHandReplayFile(gameId, handData);
        return fileId;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save replay';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [gameId]
  );

  /**
   * Load a single hand replay from HFS
   */
  const loadReplay = useCallback(async (fileId: string): Promise<HandReplayData> => {
    setLoading(true);
    setError(null);

    try {
      const data = await getHandReplay(fileId);
      setReplay(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load replay';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load all replays for a game
   */
  const loadGameReplays = useCallback(
    async (fileIds: string[]): Promise<HandReplayData[]> => {
      if (!gameId) {
        throw new Error('Game ID is required to load game replays');
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getGameReplays(gameId, fileIds);
        setReplays(data);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load game replays';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [gameId]
  );

  /**
   * Clear current replay
   */
  const clearReplay = useCallback(() => {
    setReplay(null);
    setError(null);
  }, []);

  return {
    // State
    replay,
    replays,
    loading,
    error,

    // Actions
    saveReplay,
    loadReplay,
    loadGameReplays,
    clearReplay,
  };
}

/**
 * Hook for managing replay playback
 */
export function useReplayPlayback(replay: HandReplayData | null) {
  const [currentActionIndex, setCurrentActionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 4x

  const currentAction = replay?.actions[currentActionIndex];
  const hasNext = replay ? currentActionIndex < replay.actions.length - 1 : false;
  const hasPrevious = currentActionIndex > 0;

  const goToNext = useCallback(() => {
    if (hasNext) {
      setCurrentActionIndex((prev) => prev + 1);
    }
  }, [hasNext]);

  const goToPrevious = useCallback(() => {
    if (hasPrevious) {
      setCurrentActionIndex((prev) => prev - 1);
    }
  }, [hasPrevious]);

  const goToStart = useCallback(() => {
    setCurrentActionIndex(0);
  }, []);

  const goToEnd = useCallback(() => {
    if (replay) {
      setCurrentActionIndex(replay.actions.length - 1);
    }
  }, [replay]);

  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const changeSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
  }, []);

  // Auto-advance when playing
  const autoAdvance = useCallback(() => {
    if (isPlaying && hasNext) {
      setTimeout(() => {
        goToNext();
      }, 1000 / playbackSpeed);
    } else if (isPlaying && !hasNext) {
      setIsPlaying(false); // Stop at end
    }
  }, [isPlaying, hasNext, playbackSpeed, goToNext]);

  return {
    // State
    currentAction,
    currentActionIndex,
    isPlaying,
    playbackSpeed,
    hasNext,
    hasPrevious,

    // Controls
    goToNext,
    goToPrevious,
    goToStart,
    goToEnd,
    play,
    pause,
    togglePlayPause,
    changeSpeed,
    autoAdvance,
  };
}

/**
 * Example usage:
 *
 * ```tsx
 * function HandReplayComponent({ gameId }: { gameId: string }) {
 *   const { saveReplay, loadReplay, replay, loading } = useHandReplay(gameId);
 *   const playback = useReplayPlayback(replay);
 *
 *   // Save replay after hand ends
 *   const handleSave = async () => {
 *     const fileId = await saveReplay({
 *       handNumber: 1,
 *       players: [...],
 *       actions: [...],
 *     });
 *   };
 *
 *   // Load replay
 *   const handleLoad = async (fileId: string) => {
 *     await loadReplay(fileId);
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={() => handleLoad('0.0.123456')}>Load Replay</button>
 *       {replay && (
 *         <>
 *           <p>Action: {playback.currentAction?.action}</p>
 *           <button onClick={playback.goToPrevious}>Previous</button>
 *           <button onClick={playback.togglePlayPause}>
 *             {playback.isPlaying ? 'Pause' : 'Play'}
 *           </button>
 *           <button onClick={playback.goToNext}>Next</button>
 *         </>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
