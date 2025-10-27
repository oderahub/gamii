'use client';

/**
 * Real-Time Game Chat Component
 *
 * Powered by Hedera Consensus Service (HCS)
 * - Instant message delivery (1-second polling)
 * - Replaces traditional polling with HCS topics
 * - Persistent chat history on Hedera
 */

import { useState, useRef, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useGameChat } from '~/lib/hooks/useHCS';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Skeleton } from '~/components/ui/skeleton';
import { cn } from '~/lib/utils';

interface GameChatProps {
  gameId: string;
  className?: string;
}

export const GameChat = ({ gameId, className }: GameChatProps) => {
  const { address } = useAccount();
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, sending, loading } = useGameChat(gameId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !address) return;

    try {
      await sendMessage(
        address, // sender name (could be ENS or shortened address)
        address, // sender address
        message.trim()
      );
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOwnMessage = (msgAddress: string) => {
    return address && msgAddress.toLowerCase() === address.toLowerCase();
  };

  if (loading) {
    return (
      <div className={cn('flex flex-col gap-2 p-4', className)}>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="border-b border-border p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Game Chat</h3>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Live via HCS</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isOwn = isOwnMessage(msg.playerAddress ?? '');
              return (
                <div
                  key={`${msg.timestamp}-${idx}`}
                  className={cn(
                    'flex flex-col gap-1',
                    isOwn ? 'items-end' : 'items-start'
                  )}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatAddress(msg.data.senderAddress)}</span>
                    <span>•</span>
                    <span>{formatTime(msg.timestamp)}</span>
                  </div>
                  <div
                    className={cn(
                      'rounded-lg px-3 py-2 max-w-[80%] break-words',
                      isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    {msg.data.message}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form className="border-t border-border p-3" onSubmit={handleSend}>
        <div className="flex gap-2">
          <Input
            className="flex-1"
            disabled={sending || !address}
            maxLength={200}
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button
            disabled={!message.trim() || sending || !address}
            size="sm"
            type="submit"
          >
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
        {!address && (
          <p className="text-xs text-muted-foreground mt-2">
            Connect your wallet to chat
          </p>
        )}
      </form>
    </div>
  );
}
