'use client';

/**
 * Live Lobby Component
 *
 * Powered by Hedera Consensus Service (HCS)
 * - Real-time game updates (3-second polling)
 * - Shows active games with player counts
 * - Replaces contract event polling
 */

import { useLobbyState } from '~/lib/hooks/useHCS';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { cn } from '~/lib/utils';
import Link from 'next/link';

interface LiveLobbyProps {
  className?: string;
  onCreateGame?: () => void;
}

export const LiveLobby = ({ className, onCreateGame }: LiveLobbyProps) => {
  const { lobbyState, loading, error } = useLobbyState();

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-center py-8', className)}>
        <p className="text-destructive">Failed to load lobby</p>
        <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Live Games</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-sm text-muted-foreground">
              {lobbyState?.activeGames || 0} active games
            </p>
          </div>
        </div>
        <Button onClick={onCreateGame}>Create Game</Button>
      </div>

      {/* Games List */}
      {!lobbyState || lobbyState.games.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">No Active Games</h3>
          <p className="text-muted-foreground mb-4">
            Be the first to create a game!
          </p>
          <Button onClick={onCreateGame}>Create Game</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lobbyState.games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}

      {/* HCS Info */}
      <div className="text-xs text-muted-foreground text-center">
        Powered by Hedera Consensus Service • Updates every 3 seconds
      </div>
    </div>
  );
}

interface GameCardProps {
  game: {
    id: string;
    players: number;
    maxPlayers: number;
    buyIn: string;
    status: 'waiting' | 'active' | 'ended';
  };
}

const GameCard = ({ game }: GameCardProps) => {
  const statusColors = {
    waiting: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    active: 'bg-green-500/10 text-green-500 border-green-500/20',
    ended: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  };

  const statusLabels = {
    waiting: 'Waiting',
    active: 'In Progress',
    ended: 'Ended',
  };

  const isFull = game.players >= game.maxPlayers;
  const canJoin = game.status === 'waiting' && !isFull;

  return (
    <div className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-3">
        <div
          className={cn(
            'px-2 py-1 rounded-full text-xs font-medium border',
            statusColors[game.status]
          )}
        >
          {statusLabels[game.status]}
        </div>
        <div className="text-sm text-muted-foreground">
          Game #{game.id.slice(0, 6)}
        </div>
      </div>

      {/* Game Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Players</span>
          <span className="font-semibold">
            {game.players}/{game.maxPlayers}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Buy-in</span>
          <span className="font-semibold">{game.buyIn} ETH</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link className="flex-1" href={`/game/${game.id}`}>
          <Button
            className="w-full"
            disabled={game.status === 'ended'}
            variant={canJoin ? 'default' : 'secondary'}
          >
            {canJoin ? 'Join Game' : game.status === 'ended' ? 'View Results' : 'Join'}
          </Button>
        </Link>
        {game.status === 'active' && (
          <Link href={`/game/${game.id}/spectator`}>
            <Button size="sm" variant="outline">
              Watch
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
