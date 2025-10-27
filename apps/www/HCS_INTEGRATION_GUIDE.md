# HCS Integration Guide

This guide shows how to integrate Hedera Consensus Service (HCS) real-time updates into your existing Texas Hold'em components.

## Why HCS?

**Before (Contract Polling):**
- 4-second polling intervals
- High gas costs for reading events
- Delayed updates
- Poor user experience

**After (HCS):**
- 1-3 second updates (customizable)
- Fixed, predictable fees
- Instant consensus
- Real-time user experience

---

## Available Components

### 1. Game Chat (`<GameChat />`)

Real-time chat powered by HCS.

```tsx
import { GameChat } from '~/components/game-chat';

export function GamePage({ gameId }: { gameId: string }) {
  return (
    <div className="grid lg:grid-cols-3">
      {/* Game content */}
      <div className="lg:col-span-2">
        {/* Your game UI */}
      </div>

      {/* Chat sidebar */}
      <div className="lg:col-span-1">
        <GameChat gameId={gameId} />
      </div>
    </div>
  );
}
```

**Features:**
- Instant message delivery (1s polling)
- Persistent chat history on Hedera
- Auto-scrolling
- User-specific styling
- Connected wallet required

---

### 2. Live Lobby (`<LiveLobby />`)

Real-time game list powered by HCS.

```tsx
import { LiveLobby } from '~/components/live-lobby';

export function HomePage() {
  return (
    <LiveLobby
      onCreateGame={() => {
        // Handle game creation
      }}
    />
  );
}
```

**Features:**
- Live game updates (3s polling)
- Player counts
- Game status (waiting/active/ended)
- Join/Watch buttons
- Auto-refresh

---

### 3. Spectator Mode (`<GameSpectator />`)

Watch games in real-time without joining.

```tsx
import { GameSpectator } from '~/components/game-spectator';

export function SpectatorPage({ gameId }: { gameId: string }) {
  return <GameSpectator gameId={gameId} />;
}
```

**Features:**
- Real-time game state
- Recent actions feed
- Community cards display
- Integrated chat

---

## Available React Hooks

### `useGameEvents(gameId, enabled?)`

Subscribe to all game events.

```tsx
import { useGameEvents } from '~/lib/hooks/useHCS';

function MyGameComponent({ gameId }: { gameId: string }) {
  const { events, loading, error } = useGameEvents(gameId);

  return (
    <div>
      {events.map((event) => (
        <div key={event.timestamp}>{event.type}</div>
      ))}
    </div>
  );
}
```

**Returns:**
- `events` - Array of HCS messages
- `loading` - Initial loading state
- `error` - Error object if any

**Polling:** Every 2 seconds

---

### `useGameChat(gameId, enabled?)`

Subscribe to game chat + send messages.

```tsx
import { useGameChat } from '~/lib/hooks/useHCS';

function ChatComponent({ gameId }: { gameId: string }) {
  const { messages, sendMessage, sending } = useGameChat(gameId);

  const handleSend = async () => {
    await sendMessage('Player', '0x...', 'Hello!');
  };

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.timestamp}>{msg.data.message}</div>
      ))}
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
```

**Returns:**
- `messages` - Array of chat messages
- `sendMessage(sender, address, text)` - Function to send
- `sending` - Sending state
- `loading` - Initial loading state
- `error` - Error object if any

**Polling:** Every 1 second (instant feel)

---

### `useLobbyState(enabled?)`

Subscribe to global lobby updates.

```tsx
import { useLobbyState } from '~/lib/hooks/useHCS';

function LobbyComponent() {
  const { lobbyState, loading, error } = useLobbyState();

  return (
    <div>
      <p>Active Games: {lobbyState?.activeGames}</p>
      {lobbyState?.games.map((game) => (
        <div key={game.id}>{game.id}</div>
      ))}
    </div>
  );
}
```

**Returns:**
- `lobbyState` - Object with `activeGames` and `games` array
- `loading` - Initial loading state
- `error` - Error object if any

**Polling:** Every 3 seconds

---

### `useGameEventPublisher(gameId)`

Publish game events to HCS.

```tsx
import { useGameEventPublisher } from '~/lib/hooks/useHCS';
import { MessageType } from '~/lib/hedera/hcs';

function GameControlsComponent({ gameId }: { gameId: string }) {
  const { publishEvent, publishing } = useGameEventPublisher(gameId);

  const handlePlayerAction = async () => {
    await publishEvent(MessageType.PLAYER_ACTION, {
      action: 'raise',
      amount: '10',
    }, 'player-id');
  };

  return <button onClick={handlePlayerAction}>Raise</button>;
}
```

**Returns:**
- `publishEvent(type, data, playerId?)` - Function to publish
- `publishing` - Publishing state
- `error` - Error object if any

---

### `useGameState(gameId)`

Get simplified game state from events.

```tsx
import { useGameState } from '~/lib/hooks/useHCS';

function GameStatusComponent({ gameId }: { gameId: string }) {
  const { gameState, loading } = useGameState(gameId);

  return (
    <div>
      <p>Status: {gameState.status}</p>
      <p>Players: {gameState.players.length}</p>
      <p>Pot: {gameState.pot}</p>
    </div>
  );
}
```

**Returns:**
- `gameState` - Object with status, players, pot, etc.
- `loading` - Initial loading state
- `error` - Error object if any

---

## Migration Example: Replace Polling

### Before (Contract Polling)

```tsx
// OLD: Inefficient 4-second polling
useEffect(() => {
  const interval = setInterval(async () => {
    const events = await contract.queryFilter('PlayerAction');
    setActions(events);
  }, 4000); // 4 seconds!

  return () => clearInterval(interval);
}, [contract]);
```

### After (HCS)

```tsx
// NEW: Fast 2-second HCS polling
import { useGameEvents } from '~/lib/hooks/useHCS';

const { events } = useGameEvents(gameId); // Auto-updates every 2s
const actions = events.filter(e => e.type === MessageType.PLAYER_ACTION);
```

**Benefits:**
- 50% faster updates (2s vs 4s)
- No contract calls (lower cost)
- Persistent history on Hedera
- Better error handling

---

## Publishing Events

When game state changes, publish to HCS:

```tsx
import { submitGameEvent, MessageType } from '~/lib/hedera/hcs';

// When a player takes an action
await submitGameEvent(
  gameId,
  MessageType.PLAYER_ACTION,
  {
    action: 'raise',
    amount: '100',
  },
  playerId
);

// When game starts
await submitGameEvent(
  gameId,
  MessageType.GAME_STARTED,
  {
    startTime: Date.now(),
    players: ['0x...', '0x...'],
  }
);

// When cards are dealt
await submitGameEvent(
  gameId,
  MessageType.COMMUNITY_CARDS,
  {
    cards: [1, 2, 3, 4, 5],
  }
);
```

---

## Message Types

Available message types in `MessageType` enum:

- `GAME_CREATED` - New game created
- `GAME_STARTED` - Game began
- `PLAYER_JOINED` - Player joined
- `PLAYER_LEFT` - Player left
- `PLAYER_ACTION` - Player action (fold/call/raise)
- `HAND_DEALT` - Cards dealt
- `COMMUNITY_CARDS` - Community cards revealed
- `SHOWDOWN` - Final reveal
- `GAME_ENDED` - Game finished
- `CHAT_MESSAGE` - Chat message
- `LOBBY_UPDATE` - Lobby state update

---

## Best Practices

### 1. Enable/Disable Subscriptions

```tsx
// Only subscribe when needed
const { events } = useGameEvents(
  gameId,
  isGameActive // enabled flag
);
```

### 2. Error Handling

```tsx
const { events, error } = useGameEvents(gameId);

if (error) {
  return <div>Failed to load events: {error.message}</div>;
}
```

### 3. Loading States

```tsx
const { events, loading } = useGameEvents(gameId);

if (loading) {
  return <Skeleton />;
}
```

### 4. Optimize Polling

Adjust polling intervals based on importance:

```tsx
// In hcs.ts, modify the poller intervals:
// - Chat: 1s (instant feel)
// - Game events: 2s (fast updates)
// - Lobby: 3s (less critical)
```

---

## Testing HCS Integration

### 1. Check Topics on HashScan

- Game Events: https://hashscan.io/testnet/topic/0.0.7143266
- Game Chat: https://hashscan.io/testnet/topic/0.0.7143269
- Global Lobby: https://hashscan.io/testnet/topic/0.0.7143270

### 2. Test Message Submission

```bash
# In browser console:
import { submitChatMessage } from '~/lib/hedera/hcs';
await submitChatMessage('game-id', 'Test', '0x...', 'Hello!');
```

### 3. Monitor Updates

Watch the browser console for HCS messages:

```tsx
const { events } = useGameEvents(gameId);

useEffect(() => {
  console.log('New events:', events);
}, [events]);
```

---

## Troubleshooting

### Messages Not Appearing?

1. Check topic IDs in `.env.local`
2. Verify Hedera client configuration
3. Check Mirror Node API is accessible
4. Look for errors in browser console

### Slow Updates?

1. Adjust polling intervals in hooks
2. Check network latency
3. Verify Mirror Node performance

### High Costs?

HCS messages are cheap (~$0.0001 each), but:
1. Don't spam messages
2. Batch updates when possible
3. Use debouncing for frequent events

---

## Next Steps

1. Add `<GameChat />` to your game pages
2. Replace homepage with `<LiveLobby />`
3. Add spectator links with `<SpectatorModeButton />`
4. Replace contract polling with `useGameEvents()`
5. Publish game events with `submitGameEvent()`

---

**Questions?** Check the implementation in:
- `src/lib/hedera/hcs.ts` - Core HCS utilities
- `src/lib/hooks/useHCS.ts` - React hooks
- `src/components/game-chat.tsx` - Chat component
- `src/components/live-lobby.tsx` - Lobby component
