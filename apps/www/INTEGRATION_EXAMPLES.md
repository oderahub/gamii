# Integration Examples - Copy & Paste Ready

This file contains ready-to-use code examples for integrating Hedera features into your Texas Hold'em application.

## 1. Homepage with Live Lobby

**File:** `src/app/page.tsx`

```tsx
'use client';

import { LiveLobby } from '~/components/live-lobby';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Texas Hold'em ZK Poker</h1>
        <p className="text-muted-foreground">
          Powered by Hedera - Real-time updates via HCS
        </p>
      </div>

      <LiveLobby
        onCreateGame={() => {
          router.push('/game/new');
        }}
      />
    </main>
  );
}
```

---

## 2. Game Page with Chat

**File:** `src/app/game/[id]/page.tsx`

```tsx
'use client';

import { GameChat } from '~/components/game-chat';
import { useGameState, useGameEvents } from '~/lib/hooks/useHCS';
import { useSearchParams } from 'next/navigation';

export default function GamePage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const isSpectator = searchParams.get('spectator') === 'true';

  const { gameState, loading } = useGameState(params.id);
  const { events } = useGameEvents(params.id);

  if (loading) {
    return <div>Loading game...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Game Area */}
        <div className="lg:col-span-2">
          <div className="border rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Game {params.id}</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold capitalize">{gameState.status}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pot</p>
                <p className="font-semibold">{gameState.pot} HBAR</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Players</p>
                <p className="font-semibold">{gameState.players.length}</p>
              </div>
            </div>

            {/* Your existing game UI components */}
            {/* <GameBoard gameState={gameState} /> */}
            {/* <PlayerActions gameId={params.id} /> */}
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="lg:col-span-1">
          <GameChat gameId={params.id} />
        </div>
      </div>
    </div>
  );
}
```

---

## 3. Game Actions with HCS Publishing

**File:** `src/app/game/[id]/_components/place-bet.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useGameEventPublisher } from '~/lib/hooks/useHCS';
import { MessageType } from '~/lib/hedera/hcs';
import { useAccount } from 'wagmi';

interface PlaceBetProps {
  gameId: string;
}

export function PlaceBet({ gameId }: PlaceBetProps) {
  const [amount, setAmount] = useState('');
  const { address } = useAccount();
  const { publishEvent, publishing } = useGameEventPublisher(gameId);

  const handleBet = async (action: 'fold' | 'call' | 'raise') => {
    if (!address) return;

    try {
      // 1. Execute blockchain transaction
      // await contract.placeBet(action, amount);

      // 2. Publish to HCS for real-time updates
      await publishEvent(
        MessageType.PLAYER_ACTION,
        {
          action,
          amount: action === 'raise' ? amount : '0',
          timestamp: Date.now(),
        },
        address
      );

      // Reset form
      setAmount('');
    } catch (error) {
      console.error('Failed to place bet:', error);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h3 className="font-semibold">Place Your Bet</h3>

      <div className="flex gap-2">
        <button
          onClick={() => handleBet('fold')}
          disabled={publishing}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          Fold
        </button>

        <button
          onClick={() => handleBet('call')}
          disabled={publishing}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Call
        </button>

        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="px-3 py-2 border rounded w-24"
          />
          <button
            onClick={() => handleBet('raise')}
            disabled={publishing || !amount}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Raise
          </button>
        </div>
      </div>

      {publishing && (
        <p className="text-sm text-muted-foreground">
          Publishing action to Hedera...
        </p>
      )}
    </div>
  );
}
```

---

## 4. HashPack Wallet Hook

**File:** `src/hooks/useHashPack.ts`

```tsx
'use client';

import { useState, useEffect } from 'react';
import {
  connectHashPack,
  disconnectHashPack,
  getAccountInfo,
  isHashPackInstalled,
  listenHashPackEvents
} from '~/lib/hedera/hashpack';
import { getTokenBalance, TOKENS } from '~/lib/hedera/tokens';

export function useHashPack() {
  const [connected, setConnected] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [evmAddress, setEvmAddress] = useState<string | null>(null);
  const [chipBalance, setChipBalance] = useState(0);
  const [hashconnect, setHashconnect] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!isHashPackInstalled()) {
        throw new Error('HashPack wallet is not installed');
      }

      const { accountId, hashconnect } = await connectHashPack();
      const info = await getAccountInfo(accountId);
      const balance = await getTokenBalance(accountId, TOKENS.POKER_CHIP);

      setAccountId(accountId);
      setEvmAddress(info.evmAddress);
      setChipBalance(balance);
      setHashconnect(hashconnect);
      setConnected(true);

      // Listen for events
      listenHashPackEvents(hashconnect, {
        onDisconnected: () => {
          setConnected(false);
          setAccountId(null);
          setEvmAddress(null);
          setChipBalance(0);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      console.error('HashPack connection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (hashconnect) {
      await disconnectHashPack(hashconnect);
      setConnected(false);
      setAccountId(null);
      setEvmAddress(null);
      setChipBalance(0);
      setHashconnect(null);
    }
  };

  const refreshBalance = async () => {
    if (!accountId) return;
    const balance = await getTokenBalance(accountId, TOKENS.POKER_CHIP);
    setChipBalance(balance);
  };

  return {
    connected,
    accountId,
    evmAddress,
    chipBalance,
    loading,
    error,
    connect,
    disconnect,
    refreshBalance,
  };
}
```

---

## 5. Navbar with HashPack

**File:** `src/components/navbar/index.tsx`

```tsx
'use client';

import { useHashPack } from '~/hooks/useHashPack';
import { formatPokerChips } from '~/lib/hedera/tokens';

export function Navbar() {
  const {
    connected,
    accountId,
    chipBalance,
    loading,
    error,
    connect,
    disconnect
  } = useHashPack();

  return (
    <nav className="border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold">Texas Hold'em ZK</h1>
          <div className="flex gap-4">
            <a href="/" className="hover:text-primary">Home</a>
            <a href="/games" className="hover:text-primary">Games</a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {connected && accountId ? (
            <>
              <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                <span className="text-sm font-semibold">
                  {formatPokerChips(chipBalance)} CHIP
                </span>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                <span className="text-xs">
                  {accountId.slice(0, 8)}...{accountId.slice(-6)}
                </span>
              </div>

              <button
                onClick={disconnect}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={connect}
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Connect HashPack'}
            </button>
          )}

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>
      </div>
    </nav>
  );
}
```

---

## 6. Spectator Route

**File:** `src/app/game/[id]/spectator/page.tsx`

```tsx
import { GameSpectator } from '~/components/game-spectator';

export default function SpectatorPage({ params }: { params: { id: string } }) {
  return (
    <main className="container mx-auto py-8">
      <GameSpectator gameId={params.id} />
    </main>
  );
}
```

---

## 7. Lobby Update API Route

**File:** `src/app/api/lobby/update/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { submitLobbyUpdate } from '~/lib/hedera/hcs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { games } = body;

    // Publish lobby update to HCS
    const messageId = await submitLobbyUpdate({
      activeGames: games.length,
      games: games.map((game: any) => ({
        id: game.id,
        players: game.players.length,
        status: game.status,
      })),
    });

    return NextResponse.json({
      success: true,
      messageId,
    });
  } catch (error) {
    console.error('Failed to update lobby:', error);
    return NextResponse.json(
      { error: 'Failed to update lobby' },
      { status: 500 }
    );
  }
}
```

---

## 8. Game Creation with HCS

**File:** `src/app/game/new/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameEventPublisher } from '~/lib/hooks/useHCS';
import { MessageType } from '~/lib/hedera/hcs';
import { useAccount } from 'wagmi';

export default function NewGamePage() {
  const router = useRouter();
  const { address } = useAccount();
  const [buyIn, setBuyIn] = useState('10');
  const [maxPlayers, setMaxPlayers] = useState('6');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!address) return;

    setCreating(true);
    try {
      // 1. Create game contract
      // const gameAddress = await factory.createGame(...);

      // 2. Publish to HCS for lobby updates
      const gameId = 'game-' + Date.now(); // Replace with actual game address

      await submitGameEvent(
        gameId,
        MessageType.GAME_CREATED,
        {
          creator: address,
          buyIn,
          maxPlayers: parseInt(maxPlayers),
          timestamp: Date.now(),
        }
      );

      // 3. Also publish to lobby
      await submitLobbyUpdate({
        activeGames: 1,
        games: [{
          id: gameId,
          players: 1,
          status: 'waiting',
        }],
      });

      // 4. Redirect to game
      router.push(`/game/${gameId}`);
    } catch (error) {
      console.error('Failed to create game:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-md">
      <h1 className="text-2xl font-bold mb-6">Create New Game</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Buy-in (HBAR)</label>
          <input
            type="number"
            value={buyIn}
            onChange={(e) => setBuyIn(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Max Players</label>
          <select
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="2">2 Players</option>
            <option value="4">4 Players</option>
            <option value="6">6 Players</option>
            <option value="8">8 Players</option>
          </select>
        </div>

        <button
          onClick={handleCreate}
          disabled={creating || !address}
          className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Create Game'}
        </button>
      </div>
    </div>
  );
}
```

---

## Quick Integration Steps

1. **Install HashConnect** (if not done):
   ```bash
   pnpm add @hashgraph/hashconnect
   ```

2. **Copy the hook**:
   - Copy `useHashPack.ts` to `src/hooks/`

3. **Update your pages**:
   - Homepage: Use `LiveLobby` component
   - Game page: Add `GameChat` component
   - Game actions: Use `useGameEventPublisher` hook

4. **Test**:
   ```bash
   pnpm dev
   # Open http://localhost:3000
   # Connect HashPack
   # Create a game
   # Test chat
   ```

---

**Next:** See `FINAL_INTEGRATION_CHECKLIST.md` for step-by-step integration guide.
