'use client';

/**
 * Achievement/NFT Gallery
 *
 * Powered by Hedera Token Service (HTS)
 * - Display ACHIEVEMENT_BADGE NFTs
 * - Show tournament wins and rankings
 * - Trophy showcase
 */

import { useState, useEffect } from 'react';
import { getAccountInfo } from '~/lib/hedera/hashpack';
import { TOKENS } from '~/lib/hedera/tokens';
import { Skeleton } from '~/components/ui/skeleton';
import { cn } from '~/lib/utils';
import { Trophy, Medal, Award, Star } from 'lucide-react';

interface Achievement {
  tokenId: string;
  serialNumber: string;
  metadata: {
    tournamentId?: string;
    tournamentName?: string;
    position: number;
    prize: number;
    date: number;
  };
}

interface AchievementGalleryProps {
  accountId: string;
  className?: string;
}

export const AchievementGallery = ({
  accountId,
  className,
}: AchievementGalleryProps) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 1 | 2 | 3>('all');

  useEffect(() => {
    async function loadAchievements() {
      try {
        const info = await getAccountInfo(accountId);

        // Filter for ACHIEVEMENT_BADGE NFTs
        const nfts = info.tokens.filter(
          (t: any) => t.token_id === TOKENS.ACHIEVEMENT_BADGE
        ) || [];

        // Parse metadata
        const parsed: Achievement[] = nfts.map((nft: any) => {
          try {
            const metadata = nft.metadata
              ? JSON.parse(atob(nft.metadata))
              : {
                  position: 1,
                  prize: 0,
                  date: Date.now(),
                };

            return {
              tokenId: nft.token_id,
              serialNumber: nft.serial_number,
              metadata,
            };
          } catch {
            return {
              tokenId: nft.token_id,
              serialNumber: nft.serial_number,
              metadata: {
                position: 1,
                prize: 0,
                date: Date.now(),
              },
            };
          }
        });

        setAchievements(parsed);
      } catch (error) {
        console.error('Failed to load achievements:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAchievements();
  }, [accountId]);

  const filteredAchievements =
    filter === 'all'
      ? achievements
      : achievements.filter((a) => a.metadata.position === filter);

  const stats = {
    total: achievements.length,
    first: achievements.filter((a) => a.metadata.position === 1).length,
    second: achievements.filter((a) => a.metadata.position === 2).length,
    third: achievements.filter((a) => a.metadata.position === 3).length,
    totalPrizes: achievements.reduce((sum, a) => sum + a.metadata.prize, 0),
  };

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Achievement Gallery</h1>
          <p className="text-muted-foreground">
            Your tournament wins and badges
          </p>
        </div>
        <Trophy className="h-12 w-12 text-primary opacity-20" />
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard
          icon={<Award className="h-5 w-5" />}
          label="Total Badges"
          value={stats.total}
        />
        <StatsCard gold label="🥇 1st Place" value={stats.first} />
        <StatsCard silver label="🥈 2nd Place" value={stats.second} />
        <StatsCard bronze label="🥉 3rd Place" value={stats.third} />
        <StatsCard
          icon={<Star className="h-5 w-5" />}
          label="Total Prizes"
          value={`${stats.totalPrizes.toFixed(0)} CHIP`}
        />
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <FilterButton
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          All ({achievements.length})
        </FilterButton>
        <FilterButton
          active={filter === 1}
          onClick={() => setFilter(1)}
        >
          🥇 1st ({stats.first})
        </FilterButton>
        <FilterButton
          active={filter === 2}
          onClick={() => setFilter(2)}
        >
          🥈 2nd ({stats.second})
        </FilterButton>
        <FilterButton
          active={filter === 3}
          onClick={() => setFilter(3)}
        >
          🥉 3rd ({stats.third})
        </FilterButton>
      </div>

      {/* Achievement Grid */}
      {filteredAchievements.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">
            {filter === 'all'
              ? 'No Achievements Yet'
              : `No ${filter}${getOrdinalSuffix(filter)} Place Wins`}
          </h3>
          <p className="text-sm text-muted-foreground">
            {filter === 'all'
              ? 'Win tournaments to earn achievement badges!'
              : 'Keep playing to earn this achievement!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAchievements.map((achievement) => (
            <AchievementCard
              key={achievement.serialNumber}
              achievement={achievement}
            />
          ))}
        </div>
      )}

      {/* HTS Badge */}
      <div className="text-center text-sm text-muted-foreground">
        <p>NFT Badges powered by Hedera Token Service</p>
        <a
          className="underline hover:text-primary"
          href={`https://hashscan.io/testnet/token/${TOKENS.ACHIEVEMENT_BADGE}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          View Collection on HashScan
        </a>
      </div>
    </div>
  );
}

const AchievementCard = ({ achievement }: { achievement: Achievement }) => {
  const { position, tournamentName, prize, date } = achievement.metadata;

  const colors = {
    1: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
    2: 'from-gray-400/20 to-gray-500/10 border-gray-400/30',
    3: 'from-orange-600/20 to-orange-700/10 border-orange-600/30',
  };

  const icons = {
    1: <Trophy className="h-12 w-12 text-yellow-500" />,
    2: <Medal className="h-12 w-12 text-gray-400" />,
    3: <Award className="h-12 w-12 text-orange-600" />,
  };

  return (
    <div
      className={cn(
        'border rounded-lg p-6 bg-gradient-to-br transition-transform hover:scale-105',
        colors[position as keyof typeof colors] || colors[1]
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          {icons[position as keyof typeof icons] || icons[1]}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">
            {position === 1 && '🥇'}
            {position === 2 && '🥈'}
            {position === 3 && '🥉'}
            {position > 3 && `${position}th`}
          </p>
          <p className="text-xs text-muted-foreground">Place</p>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-sm text-muted-foreground">Tournament</p>
          <p className="font-semibold truncate">
            {tournamentName || `Tournament #${achievement.serialNumber}`}
          </p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Prize Won</p>
          <p className="text-xl font-bold">{prize.toFixed(0)} CHIP</p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Date</p>
          <p className="text-sm">{new Date(date).toLocaleDateString()}</p>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">NFT Serial</p>
          <p className="text-xs font-mono">#{achievement.serialNumber}</p>
        </div>
      </div>

      <a
        className="block mt-4 text-xs text-center underline hover:text-primary"
        href={`https://hashscan.io/testnet/token/${achievement.tokenId}/${achievement.serialNumber}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        View on HashScan
      </a>
    </div>
  );
}

const StatsCard = ({
  label,
  value,
  icon,
  gold,
  silver,
  bronze,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  gold?: boolean;
  silver?: boolean;
  bronze?: boolean;
}) => {
  return (
    <div
      className={cn(
        'border rounded-lg p-4',
        gold && 'bg-yellow-500/10 border-yellow-500/30',
        silver && 'bg-gray-400/10 border-gray-400/30',
        bronze && 'bg-orange-600/10 border-orange-600/30'
      )}
    >
      {icon ? <div className="text-muted-foreground mb-2">{icon}</div> : null}
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

const FilterButton = ({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      className={cn(
        'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted hover:bg-muted/80'
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  const suffix = s[(v - 20) % 10] || s[v] || s[0] || 'th';
  return n + suffix;
}

/**
 * Compact achievement showcase for player profiles
 */
export const AchievementShowcase = ({ accountId }: { accountId: string }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAchievements() {
      try {
        const info = await getAccountInfo(accountId);
        const nfts = info.tokens.filter(
          (t: any) => t.token_id === TOKENS.ACHIEVEMENT_BADGE
        ) || [];

        const parsed = nfts.map((nft: any) => ({
          tokenId: nft.token_id,
          serialNumber: nft.serial_number,
          metadata: JSON.parse(atob(nft.metadata || '{}')),
        }));

        setAchievements(parsed);
      } catch (error) {
        console.error('Failed to load achievements:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAchievements();
  }, [accountId]);

  if (loading) {
    return <Skeleton className="h-16 w-full" />;
  }

  const firstPlace = achievements.filter((a) => a.metadata.position === 1).length;
  const secondPlace = achievements.filter((a) => a.metadata.position === 2).length;
  const thirdPlace = achievements.filter((a) => a.metadata.position === 3).length;

  return (
    <div className="flex items-center gap-4 border rounded-lg p-4">
      <Trophy className="h-8 w-8 text-primary" />
      <div className="flex-1">
        <p className="text-sm text-muted-foreground mb-1">Achievements</p>
        <div className="flex items-center gap-3">
          {firstPlace > 0 && <span className="text-sm">🥇 {firstPlace}</span>}
          {secondPlace > 0 && <span className="text-sm">🥈 {secondPlace}</span>}
          {thirdPlace > 0 && <span className="text-sm">🥉 {thirdPlace}</span>}
          {achievements.length === 0 && (
            <span className="text-sm text-muted-foreground">No wins yet</span>
          )}
        </div>
      </div>
      <p className="text-2xl font-bold">{achievements.length}</p>
    </div>
  );
}
