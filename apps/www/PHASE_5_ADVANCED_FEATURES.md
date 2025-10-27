# Phase 5: Advanced Features - Implementation Plan

This phase adds advanced features that showcase all 4 Hedera services and provide a complete, production-ready poker platform.

---

## Overview

**Goal:** Build advanced features that differentiate our hackathon submission

**Services Used:**
- HSCS (Smart Contracts) - Already integrated
- HTS (Token Service) - Already integrated
- HCS (Consensus Service) - Already integrated
- **HFS (File Service)** - NEW in Phase 5

**Timeline:** 2-3 days for full implementation

---

## Feature 1: Hand Replay System (HFS)

### Problem
Players want to review past hands to improve their game, but storing full game history on-chain is expensive.

### Solution
Use Hedera File Service (HFS) to store game replay data cheaply and permanently.

### Implementation

#### A. Create HFS Utilities

**File:** `src/lib/hedera/hfs.ts`

```typescript
import { FileCreateTransaction, FileAppendTransaction, FileContentsQuery } from '@hashgraph/sdk';
import { getHederaClient } from './client';

export async function createHandReplayFile(gameId: string, handData: any): Promise<string> {
  const client = getHederaClient();

  // Serialize hand data
  const contents = JSON.stringify({
    gameId,
    timestamp: Date.now(),
    players: handData.players,
    actions: handData.actions,
    communityCards: handData.communityCards,
    winner: handData.winner,
    pot: handData.pot,
  });

  // Create file on Hedera
  const transaction = new FileCreateTransaction()
    .setContents(contents)
    .setKeys([client.operatorPublicKey!])
    .setMaxTransactionFee(100);

  const receipt = await transaction.execute(client);
  const fileId = (await receipt.getReceipt(client)).fileId;

  return fileId!.toString();
}

export async function getHandReplay(fileId: string): Promise<any> {
  const client = getHederaClient();

  const query = new FileContentsQuery()
    .setFileId(fileId);

  const contents = await query.execute(client);
  return JSON.parse(contents.toString());
}

export async function appendHandAction(fileId: string, action: any): Promise<void> {
  const client = getHederaClient();

  const transaction = new FileAppendTransaction()
    .setFileId(fileId)
    .setContents(JSON.stringify(action))
    .setMaxTransactionFee(10);

  await transaction.execute(client);
}
```

#### B. Create React Hook

**File:** `src/hooks/useHandReplay.ts`

```typescript
import { useState } from 'react';
import { createHandReplayFile, getHandReplay } from '~/lib/hedera/hfs';

export function useHandReplay(gameId: string) {
  const [loading, setLoading] = useState(false);
  const [replay, setReplay] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const saveReplay = async (handData: any) => {
    setLoading(true);
    try {
      const fileId = await createHandReplayFile(gameId, handData);
      return fileId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save replay');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loadReplay = async (fileId: string) => {
    setLoading(true);
    try {
      const data = await getHandReplay(fileId);
      setReplay(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load replay');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { saveReplay, loadReplay, replay, loading, error };
}
```

#### C. Create Replay Viewer Component

**File:** `src/components/hand-replay-viewer.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useHandReplay } from '~/hooks/useHandReplay';
import { Button } from '~/components/ui/button';

export function HandReplayViewer({ fileId }: { fileId: string }) {
  const { loadReplay, replay, loading } = useHandReplay('');
  const [currentAction, setCurrentAction] = useState(0);

  useEffect(() => {
    loadReplay(fileId);
  }, [fileId]);

  if (loading) return <div>Loading replay...</div>;
  if (!replay) return <div>No replay data</div>;

  const actions = replay.actions || [];
  const current = actions[currentAction];

  return (
    <div className="border rounded-lg p-6 space-y-4">
      <h3 className="text-xl font-bold">Hand Replay</h3>

      {/* Game Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Game ID</p>
          <p className="font-mono">{replay.gameId}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Winner</p>
          <p>{replay.winner}</p>
        </div>
      </div>

      {/* Current Action */}
      <div className="bg-muted p-4 rounded">
        <p className="text-sm text-muted-foreground mb-2">
          Action {currentAction + 1} of {actions.length}
        </p>
        {current && (
          <p className="font-semibold">
            {current.player}: {current.action} {current.amount ? `$${current.amount}` : ''}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          onClick={() => setCurrentAction(Math.max(0, currentAction - 1))}
          disabled={currentAction === 0}
        >
          Previous
        </Button>
        <Button
          onClick={() => setCurrentAction(Math.min(actions.length - 1, currentAction + 1))}
          disabled={currentAction === actions.length - 1}
        >
          Next
        </Button>
        <Button onClick={() => setCurrentAction(0)}>
          Restart
        </Button>
      </div>
    </div>
  );
}
```

---

## Feature 2: Player Statistics Dashboard

### Problem
Players want to track their performance across multiple games.

### Solution
Use HCS to aggregate player statistics and display them in a dashboard.

### Implementation

#### A. Create Statistics Aggregator

**File:** `src/lib/hedera/stats.ts`

```typescript
import { submitHCSMessage, getTopicMessages, MessageType } from './hcs';

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  totalWinnings: number;
  totalLosses: number;
  biggestPot: number;
  winRate: number;
  favoriteAction: string;
}

export async function getPlayerStats(playerAddress: string): Promise<PlayerStats> {
  // Get all game events from HCS
  const topicId = process.env.NEXT_PUBLIC_GAME_EVENTS_TOPIC_ID!;
  const events = await getTopicMessages(topicId);

  // Filter events for this player
  const playerEvents = events.filter(e => e.playerId === playerAddress);

  // Aggregate statistics
  const stats: PlayerStats = {
    gamesPlayed: 0,
    gamesWon: 0,
    totalWinnings: 0,
    totalLosses: 0,
    biggestPot: 0,
    winRate: 0,
    favoriteAction: '',
  };

  const gameIds = new Set<string>();
  const actions: Record<string, number> = {};

  for (const event of playerEvents) {
    gameIds.add(event.gameId);

    if (event.type === MessageType.PLAYER_ACTION) {
      const action = event.data.action;
      actions[action] = (actions[action] || 0) + 1;
    }

    if (event.type === MessageType.GAME_ENDED && event.data.winner === playerAddress) {
      stats.gamesWon++;
      stats.totalWinnings += parseFloat(event.data.pot || '0');
      stats.biggestPot = Math.max(stats.biggestPot, parseFloat(event.data.pot || '0'));
    }
  }

  stats.gamesPlayed = gameIds.size;
  stats.winRate = stats.gamesPlayed > 0 ? (stats.gamesWon / stats.gamesPlayed) * 100 : 0;
  stats.favoriteAction = Object.entries(actions).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

  return stats;
}

export async function submitStatsUpdate(playerAddress: string, stats: Partial<PlayerStats>) {
  const topicId = process.env.NEXT_PUBLIC_GAME_EVENTS_TOPIC_ID!;

  await submitHCSMessage(topicId, {
    type: 'STATS_UPDATE',
    playerId: playerAddress,
    data: stats,
  });
}
```

#### B. Create Stats Dashboard Component

**File:** `src/components/player-stats-dashboard.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { getPlayerStats, type PlayerStats } from '~/lib/hedera/stats';
import { Skeleton } from '~/components/ui/skeleton';

export function PlayerStatsDashboard({ playerAddress }: { playerAddress: string }) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getPlayerStats(playerAddress);
        setStats(data);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [playerAddress]);

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!stats) return <div>No statistics available</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <StatCard label="Games Played" value={stats.gamesPlayed} />
      <StatCard label="Games Won" value={stats.gamesWon} />
      <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} />
      <StatCard label="Total Winnings" value={`${stats.totalWinnings.toFixed(2)} HBAR`} />
      <StatCard label="Biggest Pot" value={`${stats.biggestPot.toFixed(2)} HBAR`} />
      <StatCard label="Favorite Action" value={stats.favoriteAction} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border rounded-lg p-4">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
```

---

## Feature 3: Tournament System (HTS NFTs)

### Problem
Players want organized tournaments with entry fees and prizes.

### Solution
Use TOURNAMENT_TICKET NFTs for tournament entries and prize distribution.

### Implementation

#### A. Create Tournament Utilities

**File:** `src/lib/hedera/tournaments.ts`

```typescript
import { mintNFT, transferNFT, TOKENS } from './tokens';

export interface Tournament {
  id: string;
  name: string;
  buyIn: number;
  maxPlayers: number;
  startTime: number;
  prizePool: number;
  status: 'upcoming' | 'active' | 'completed';
}

export async function createTournament(
  name: string,
  buyIn: number,
  maxPlayers: number
): Promise<Tournament> {
  const tournament: Tournament = {
    id: `tournament-${Date.now()}`,
    name,
    buyIn,
    maxPlayers,
    startTime: Date.now() + 3600000, // 1 hour from now
    prizePool: 0,
    status: 'upcoming',
  };

  return tournament;
}

export async function purchaseTournamentTicket(
  accountId: string,
  tournamentId: string
): Promise<string> {
  // Mint NFT ticket
  const serialNumber = await mintNFT(
    TOKENS.TOURNAMENT_TICKET,
    accountId,
    JSON.stringify({
      tournamentId,
      purchaseDate: Date.now(),
    })
  );

  return serialNumber.toString();
}

export async function distributePrizes(
  tournamentId: string,
  winners: string[],
  prizeShares: number[]
) {
  // Mint achievement badges for winners
  for (let i = 0; i < winners.length; i++) {
    await mintNFT(
      TOKENS.ACHIEVEMENT_BADGE,
      winners[i],
      JSON.stringify({
        tournamentId,
        position: i + 1,
        prize: prizeShares[i],
        date: Date.now(),
      })
    );
  }
}
```

#### B. Create Tournament Lobby Component

**File:** `src/components/tournament-lobby.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { purchaseTournamentTicket } from '~/lib/hedera/tournaments';
import { useHashPack } from '~/hooks/useHashPack';
import { Button } from '~/components/ui/button';

export function TournamentLobby() {
  const { accountId, chipBalance } = useHashPack();
  const [tournaments, setTournaments] = useState([
    {
      id: 'tournament-1',
      name: 'Sunday Million',
      buyIn: 100,
      maxPlayers: 100,
      currentPlayers: 45,
      startTime: Date.now() + 3600000,
      prizePool: 4500,
      status: 'upcoming',
    },
  ]);

  const [purchasing, setPurchasing] = useState<string | null>(null);

  const handlePurchase = async (tournamentId: string) => {
    if (!accountId) return;

    setPurchasing(tournamentId);
    try {
      await purchaseTournamentTicket(accountId, tournamentId);
      alert('Tournament ticket purchased!');
    } catch (error) {
      console.error('Purchase failed:', error);
      alert('Failed to purchase ticket');
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Tournaments</h2>

      <div className="grid gap-4">
        {tournaments.map((tournament) => (
          <div key={tournament.id} className="border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold">{tournament.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {tournament.currentPlayers}/{tournament.maxPlayers} players
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{tournament.prizePool} CHIP</p>
                <p className="text-sm text-muted-foreground">Prize Pool</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div>
                <p className="text-muted-foreground">Buy-in</p>
                <p className="font-semibold">{tournament.buyIn} CHIP</p>
              </div>
              <div>
                <p className="text-muted-foreground">Start Time</p>
                <p className="font-semibold">
                  {new Date(tournament.startTime).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-semibold capitalize">{tournament.status}</p>
              </div>
            </div>

            <Button
              onClick={() => handlePurchase(tournament.id)}
              disabled={!accountId || purchasing === tournament.id}
              className="w-full"
            >
              {purchasing === tournament.id ? 'Purchasing...' : 'Purchase Ticket (NFT)'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Feature 4: Achievement/NFT Gallery

### Problem
Players want to showcase their tournament wins and achievements.

### Solution
Display ACHIEVEMENT_BADGE NFTs in a gallery with metadata.

### Implementation

**File:** `src/components/achievement-gallery.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { getAccountInfo } from '~/lib/hedera/hashpack';
import { TOKENS } from '~/lib/hedera/tokens';

interface Achievement {
  serialNumber: string;
  metadata: {
    tournamentId: string;
    position: number;
    prize: number;
    date: number;
  };
}

export function AchievementGallery({ accountId }: { accountId: string }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAchievements() {
      try {
        const info = await getAccountInfo(accountId);
        const nfts = info.tokens?.filter(
          (t: any) => t.token_id === TOKENS.ACHIEVEMENT_BADGE
        ) || [];

        // Parse metadata for each NFT
        const parsed = nfts.map((nft: any) => ({
          serialNumber: nft.serial_number,
          metadata: JSON.parse(atob(nft.metadata || '')),
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

  if (loading) return <div>Loading achievements...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Your Achievements</h2>

      {achievements.length === 0 ? (
        <p className="text-muted-foreground">
          No achievements yet. Win a tournament to earn badges!
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.serialNumber}
              className="border rounded-lg p-4 bg-gradient-to-br from-yellow-50 to-orange-50"
            >
              <div className="text-4xl mb-2">🏆</div>
              <h3 className="font-semibold mb-2">
                {achievement.metadata.position === 1 && '1st Place'}
                {achievement.metadata.position === 2 && '2nd Place'}
                {achievement.metadata.position === 3 && '3rd Place'}
              </h3>
              <p className="text-sm text-muted-foreground mb-1">
                Tournament #{achievement.metadata.tournamentId.slice(-6)}
              </p>
              <p className="text-sm font-semibold">
                Prize: {achievement.metadata.prize} CHIP
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(achievement.metadata.date).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Feature 5: Referral Rewards System

### Problem
Need to grow the player base through incentivized referrals.

### Solution
Reward referrers with POKER_CHIP tokens when new players join.

### Implementation

**File:** `src/lib/hedera/referrals.ts`

```typescript
import { transferPokerChips } from './tokens';

const REFERRAL_REWARD = 1000; // 10.00 CHIP (2 decimals)

export async function trackReferral(
  referrerAddress: string,
  newPlayerAddress: string
): Promise<void> {
  // Store referral relationship (could use HCS or database)
  await submitHCSMessage(
    process.env.NEXT_PUBLIC_GAME_EVENTS_TOPIC_ID!,
    {
      type: 'REFERRAL_TRACKED',
      referrer: referrerAddress,
      newPlayer: newPlayerAddress,
      timestamp: Date.now(),
    }
  );
}

export async function claimReferralReward(
  referrerAccountId: string
): Promise<string> {
  // Transfer POKER_CHIP tokens
  const txId = await transferPokerChips(
    process.env.HEDERA_ACCOUNT_ID!, // Treasury
    referrerAccountId,
    REFERRAL_REWARD
  );

  // Record reward claimed
  await submitHCSMessage(
    process.env.NEXT_PUBLIC_GAME_EVENTS_TOPIC_ID!,
    {
      type: 'REFERRAL_REWARD_CLAIMED',
      referrer: referrerAccountId,
      amount: REFERRAL_REWARD,
      timestamp: Date.now(),
    }
  );

  return txId;
}

export async function getReferralStats(referrerAddress: string) {
  const events = await getTopicMessages(
    process.env.NEXT_PUBLIC_GAME_EVENTS_TOPIC_ID!
  );

  const referrals = events.filter(
    e => e.type === 'REFERRAL_TRACKED' && e.data.referrer === referrerAddress
  );

  const rewards = events.filter(
    e => e.type === 'REFERRAL_REWARD_CLAIMED' && e.data.referrer === referrerAddress
  );

  return {
    totalReferrals: referrals.length,
    totalRewards: rewards.reduce((sum, r) => sum + r.data.amount, 0),
    pendingRewards: (referrals.length - rewards.length) * REFERRAL_REWARD,
  };
}
```

---

## Implementation Priority

### Week 1: Core Features
1. ✅ HFS Hand Replay System (Day 1-2)
2. ✅ Player Statistics Dashboard (Day 2-3)

### Week 2: NFT Features
3. ✅ Tournament System (Day 4-5)
4. ✅ Achievement Gallery (Day 5-6)
5. ✅ Referral Rewards (Day 6-7)

---

## Testing Checklist

- [ ] Create and save hand replay to HFS
- [ ] Load and view hand replay
- [ ] Verify player stats calculation
- [ ] Purchase tournament ticket (NFT)
- [ ] Mint achievement badge
- [ ] Display achievements in gallery
- [ ] Track referral link
- [ ] Claim referral reward

---

## Environment Variables Needed

Add to `.env.local`:

```bash
# HFS (Optional - uses same client)
NEXT_PUBLIC_HFS_ENABLED=true

# Referral rewards
NEXT_PUBLIC_REFERRAL_REWARD=1000
TREASURY_ACCOUNT_ID=0.0.6866966
```

---

## Deployment Notes

1. **HFS Files**: Stored permanently on Hedera (~$0.05 per file)
2. **Tournament NFTs**: Pre-mint tickets or mint on-demand
3. **Achievement Badges**: Mint only for winners (low cost)
4. **Referral Treasury**: Fund account with POKER_CHIP for rewards

---

## Success Metrics

**Hackathon Judge Impact:**
- ✅ Uses 4/4 Hedera services (HSCS, HTS, HCS, HFS)
- ✅ Complete player engagement loop
- ✅ Real-world economic model
- ✅ Scalable tournament system
- ✅ Viral growth mechanism (referrals)

**Technical Excellence:**
- Efficient data storage (HFS)
- Real-time statistics (HCS)
- Proper NFT usage (HTS)
- Clean architecture

---

**Ready to implement Phase 5!** Let's start with the HFS hand replay system.
