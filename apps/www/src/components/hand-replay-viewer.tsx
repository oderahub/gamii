'use client';

/**
 * Hand Replay Viewer
 *
 * Powered by Hedera File Service (HFS)
 * - Watch past hands step by step
 * - Analyze player actions
 * - Learn from gameplay
 */

import { useState, useEffect } from 'react';
import { useHandReplay, useReplayPlayback } from '~/hooks/useHandReplay';
import { Skeleton } from '~/components/ui/skeleton';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface HandReplayViewerProps {
  fileId: string;
  className?: string;
}

export const HandReplayViewer = ({ fileId, className }: HandReplayViewerProps) => {
  const { loadReplay, replay, loading, error } = useHandReplay();
  const playback = useReplayPlayback(replay);

  useEffect(() => {
    loadReplay(fileId);
  }, [fileId, loadReplay]);

  // Auto-advance when playing
  useEffect(() => {
    if (playback.isPlaying && playback.hasNext) {
      const timeout = setTimeout(() => {
        playback.goToNext();
      }, 1000 / playback.playbackSpeed);

      return () => clearTimeout(timeout);
    } else if (playback.isPlaying && !playback.hasNext) {
      playback.pause();
    }
  }, [playback]);

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('border border-red-500 rounded-lg p-6', className)}>
        <p className="text-red-500">Failed to load replay: {error}</p>
      </div>
    );
  }

  if (!replay) {
    return (
      <div className={cn('border rounded-lg p-6', className)}>
        <p className="text-muted-foreground">No replay data</p>
      </div>
    );
  }

  const currentAction = playback.currentAction;
  const progress = ((playback.currentActionIndex + 1) / replay.actions.length) * 100;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Hand Replay #{replay.handNumber}</h2>
          <p className="text-sm text-muted-foreground">
            Game ID: {replay.gameId.slice(0, 8)}...
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total Pot</p>
          <p className="text-2xl font-bold">{replay.pot} HBAR</p>
        </div>
      </div>

      {/* Game Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard label="Players" value={replay.players.length.toString()} />
        <InfoCard label="Winner" value={`${replay.winner.slice(0, 6)}...`} />
        <InfoCard label="Rake" value={`${replay.rake} HBAR`} />
        <InfoCard
          label="Date"
          value={new Date(replay.timestamp).toLocaleDateString()}
        />
      </div>

      {/* Current Action Display */}
      <div className="border rounded-lg p-6 bg-muted/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Action {playback.currentActionIndex + 1} of {replay.actions.length}
            </p>
            <p className="text-lg font-semibold capitalize">
              {currentAction?.round || 'Pre-flop'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Player</p>
            <p className="font-mono text-sm">
              {currentAction?.player.slice(0, 8)}...
            </p>
          </div>
        </div>

        {currentAction ? <div className="bg-background rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                'px-4 py-2 rounded-lg font-semibold',
                currentAction.action === 'fold' && 'bg-red-500 text-white',
                currentAction.action === 'call' && 'bg-blue-500 text-white',
                currentAction.action === 'raise' && 'bg-green-500 text-white',
                currentAction.action === 'check' && 'bg-gray-500 text-white',
                currentAction.action === 'all-in' && 'bg-purple-500 text-white'
              )}>
                {currentAction.action.toUpperCase()}
              </div>
              {currentAction.amount !== undefined && (
                <p className="text-2xl font-bold">{currentAction.amount} HBAR</p>
              )}
            </div>
          </div> : null}

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Community Cards */}
      {replay.communityCards.length > 0 && (
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Community Cards</h3>
          <div className="flex gap-2">
            {replay.communityCards.map((card, idx) => (
              <div
                key={idx}
                className="w-16 h-24 border-2 border-border rounded-lg flex items-center justify-center bg-white text-black font-bold text-2xl"
              >
                {card}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Playback Controls */}
      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Button
            disabled={!playback.hasPrevious}
            size="icon"
            variant="outline"
            onClick={playback.goToStart}
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            disabled={!playback.hasPrevious}
            size="icon"
            variant="outline"
            onClick={playback.goToPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            className="px-8"
            size="lg"
            onClick={playback.togglePlayPause}
          >
            {playback.isPlaying ? (
              <Pause className="h-5 w-5 mr-2" />
            ) : (
              <Play className="h-5 w-5 mr-2" />
            )}
            {playback.isPlaying ? 'Pause' : 'Play'}
          </Button>

          <Button
            disabled={!playback.hasNext}
            size="icon"
            variant="outline"
            onClick={playback.goToNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            disabled={!playback.hasNext}
            size="icon"
            variant="outline"
            onClick={playback.goToEnd}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">Speed:</span>
          {[0.5, 1, 2, 4].map((speed) => (
            <Button
              key={speed}
              size="sm"
              variant={playback.playbackSpeed === speed ? 'default' : 'outline'}
              onClick={() => playback.changeSpeed(speed)}
            >
              {speed}x
            </Button>
          ))}
        </div>
      </div>

      {/* Action History */}
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Action History</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {replay.actions.map((action, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-center justify-between p-2 rounded transition-colors',
                idx === playback.currentActionIndex && 'bg-primary/10 border border-primary',
                idx < playback.currentActionIndex && 'opacity-50'
              )}
            >
              <span className="text-sm text-muted-foreground">
                {new Date(action.timestamp).toLocaleTimeString()}
              </span>
              <span className="text-sm font-mono">
                {action.player.slice(0, 8)}...
              </span>
              <span className="text-sm font-semibold capitalize">{action.action}</span>
              {action.amount !== undefined && (
                <span className="text-sm">{action.amount} HBAR</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* HFS Badge */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>Stored on Hedera File Service</span>
        <a
          className="underline hover:text-primary"
          href={`https://hashscan.io/testnet/file/${fileId}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          View on HashScan
        </a>
      </div>
    </div>
  );
}

const InfoCard = ({ label, value }: { label: string; value: string }) => {
  return (
    <div className="border rounded-lg p-4">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

/**
 * Replay List Component - Shows all replays for a game
 */
export const HandReplayList = ({ gameId, fileIds }: { gameId: string; fileIds: string[] }) => {
  const { loadGameReplays, replays, loading } = useHandReplay(gameId);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  useEffect(() => {
    loadGameReplays(fileIds);
  }, [fileIds, loadGameReplays]);

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (selectedFileId) {
    return (
      <div>
        <Button
          className="mb-4"
          variant="outline"
          onClick={() => setSelectedFileId(null)}
        >
          ← Back to List
        </Button>
        <HandReplayViewer fileId={selectedFileId} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Game Replays</h2>

      {replays.length === 0 ? (
        <p className="text-muted-foreground">No replays available</p>
      ) : (
        <div className="grid gap-4">
          {replays.map((replay, idx) => (
            <div
              key={idx}
              className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => setSelectedFileId(fileIds[idx] || null)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Hand #{replay.handNumber}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(replay.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{replay.pot} HBAR</p>
                  <p className="text-sm text-muted-foreground">
                    {replay.actions.length} actions
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
