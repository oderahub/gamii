'use client';

/**
 * Game Spectator Mode
 *
 * Powered by Hedera Consensus Service (HCS)
 * - Watch games in real-time without joining
 * - See all player actions instantly
 * - Access to game chat
 */
import { useGameEvents, useGameState } from '~/lib/hooks/useHCS';

import { MessageType } from '~/lib/hedera/hcs';
import { cn } from '~/lib/utils';

import { Skeleton } from '~/components/ui/skeleton';

import { Eye, TrendingUp } from 'lucide-react';

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
        <Skeleton className='h-48 w-full' />
        <Skeleton className='h-64 w-full' />
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
      <div className='space-y-6 lg:col-span-2'>
        {/* Spectator Banner */}
        <div className='rounded-lg border border-border bg-muted p-4'>
          <div className='flex items-center gap-3'>
            <div className='h-3 w-3 animate-pulse rounded-full bg-red-500' />
            <div className='flex-1'>
              <div className='flex items-center gap-2'>
                <Eye className='h-4 w-4 text-red-500' />
                <h3 className='font-semibold'>Spectator Mode</h3>
              </div>
              <p className='text-sm text-muted-foreground'>
                Watching game in real-time via Hedera Consensus Service
              </p>
            </div>
          </div>
        </div>

        {/* Game State */}
        <div className='rounded-lg border border-border p-6'>
          <div className='mb-4 flex items-center gap-2'>
            <TrendingUp className='h-5 w-5 text-purple-600' />
            <h3 className='text-lg font-semibold'>Game Status</h3>
          </div>
          <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
            <div className='rounded-lg bg-muted p-3'>
              <p className='text-xs text-muted-foreground'>Status</p>
              <p className='font-semibold capitalize'>{gameState.status}</p>
            </div>
            <div className='rounded-lg bg-muted p-3'>
              <p className='text-xs text-muted-foreground'>Players</p>
              <p className='text-lg font-semibold'>
                {gameState.players.length}
              </p>
            </div>
            <div className='rounded-lg bg-muted p-3'>
              <p className='text-xs text-muted-foreground'>Pot</p>
              <p className='text-lg font-semibold'>{gameState.pot} ETH</p>
            </div>
            <div className='rounded-lg bg-muted p-3'>
              <p className='text-xs text-muted-foreground'>Current</p>
              <p className='truncate text-xs font-semibold'>
                {gameState.currentPlayer
                  ? `${gameState.currentPlayer.slice(0, 6)}...${gameState.currentPlayer.slice(-4)}`
                  : 'None'}
              </p>
            </div>
          </div>
        </div>

        {/* Community Cards */}
        {gameState.communityCards.length > 0 ? (
          <div className='rounded-lg border border-border p-6'>
            <h3 className='mb-4 text-lg font-semibold'>Community Cards</h3>
            <div className='flex gap-2'>
              {gameState.communityCards.map((card) => (
                <div
                  key={`card-${card}`}
                  className='flex h-24 w-16 items-center justify-center rounded-lg border-2 border-border bg-muted'
                >
                  <span className='text-2xl font-bold'>{card}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Recent Actions */}
        <div className='rounded-lg border border-border p-6'>
          <h3 className='mb-4 text-lg font-semibold'>Recent Actions</h3>
          {recentActions.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              No actions yet. Waiting for players...
            </p>
          ) : (
            <div className='space-y-2'>
              {recentActions.map((action) => (
                <div
                  key={`action-${action.timestamp.toString()}-${action.playerId ?? 'unknown'}`}
                  className='flex items-center justify-between rounded bg-muted p-2 text-sm'
                >
                  <span className='text-muted-foreground'>
                    {new Date(action.timestamp).toLocaleTimeString()}
                  </span>
                  <span className='truncate text-xs'>
                    {action.playerId
                      ? `${action.playerId.slice(0, 6)}...${action.playerId.slice(-4)}`
                      : 'Unknown'}
                  </span>
                  <span className='font-semibold'>{action.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Sidebar - Floating Modal (No Sidebar) */}
      <div className='hidden lg:block'>
        {/* Spectators info card */}
        <div className='rounded-lg border border-border bg-muted p-4'>
          <div className='flex items-center gap-2'>
            <Eye className='h-4 w-4' />
            <span className='text-sm font-semibold'>
              {gameState.players.length + 1} Watching
            </span>
          </div>
          <p className='mt-2 text-xs text-muted-foreground'>
            Use the chat button in the bottom-left corner to participate
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Spectator Button - Add to game pages
 */
export const SpectatorModeButton = ({ gameId }: { gameId: string }) => {
  return (
    <a
      className='hover:bg-muted/80 inline-flex items-center gap-2 rounded-lg bg-muted px-4 py-2 transition-colors'
      href={`/game/${gameId}?spectator=true`}
    >
      <div className='h-2 w-2 animate-pulse rounded-full bg-red-500' />
      <span className='text-sm font-medium'>Watch Live</span>
    </a>
  );
};
