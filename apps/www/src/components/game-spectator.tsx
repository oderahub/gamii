'use client';

/**
 * Game Spectator Mode
 *
 * Powered by Hedera Consensus Service (HCS)
 * - Watch games in real-time without joining
 * - See all player actions instantly
 * - Access to game chat
 */

import { useGameState, useGameEvents } from '~/lib/hooks/useHCS';
import { MessageType } from '~/lib/hedera/hcs';
import { Skeleton } from '~/components/ui/skeleton';
import { GameChat } from '~/components/game-chat';
import { cn } from '~/lib/utils';

interface GameSpectatorProps {
  gameId: string;
  className?: string;
}

export const GameSpectator = ({ gameId, className }: GameSpectatorProps) => {
  const { gameState, loading } = useGameState(gameId);
  const { events } = useGameEvents(gameId);

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Get recent actions
  const recentActions = events
    .filter((e) => e.type === MessageType.PLAYER_ACTION)
    .slice(-10)
    .reverse();

  return (
    <div className={cn('grid gap-6 lg:grid-cols-3', className)}>
      {/* Main Game View */}
      <div className="lg:col-span-2 space-y-6">
        {/* Spectator Banner */}
        <div className="bg-muted rounded-lg p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
            <div>
              <h3 className="font-semibold">Spectator Mode</h3>
              <p className="text-sm text-muted-foreground">
                Watching game in real-time via Hedera Consensus Service
              </p>
            </div>
          </div>
        </div>

        {/* Game State */}
        <div className="border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Game Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-semibold capitalize">{gameState.status}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Players</p>
              <p className="font-semibold">{gameState.players.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pot</p>
              <p className="font-semibold">{gameState.pot} ETH</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Player</p>
              <p className="font-semibold text-xs">
                {gameState.currentPlayer
                  ? `${gameState.currentPlayer.slice(0, 6)}...${gameState.currentPlayer.slice(-4)}`
                  : 'None'}
              </p>
            </div>
          </div>
        </div>

        {/* Community Cards */}
        {gameState.communityCards.length > 0 && (
          <div className="border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Community Cards</h3>
            <div className="flex gap-2">
              {gameState.communityCards.map((card, idx) => (
                <div
                  key={idx}
                  className="w-16 h-24 border-2 border-border rounded-lg flex items-center justify-center bg-muted"
                >
                  <span className="text-2xl">{card}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Actions */}
        <div className="border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Actions</h3>
          {recentActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No actions yet. Waiting for players...
            </p>
          ) : (
            <div className="space-y-2">
              {recentActions.map((action, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                >
                  <span className="text-muted-foreground">
                    {new Date(action.timestamp).toLocaleTimeString()}
                  </span>
                  <span>
                    {action.playerId?.slice(0, 6)}...{action.playerId?.slice(-4)}
                  </span>
                  <span className="font-semibold">{action.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="lg:col-span-1">
        <div className="sticky top-4 border border-border rounded-lg h-[600px] overflow-hidden">
          <GameChat gameId={gameId} />
        </div>
      </div>
    </div>
  );
}

/**
 * Spectator Button - Add to game pages
 */
export const SpectatorModeButton = ({ gameId }: { gameId: string }) => {
  return (
    <a
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
      href={`/game/${gameId}?spectator=true`}
    >
      <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      <span className="text-sm font-medium">Watch Live</span>
    </a>
  );
}
