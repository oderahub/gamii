'use client';

import { useEffect, useRef, useState } from 'react';

import { useGameChat } from '~/lib/hooks/useHCS';

import { cn } from '~/lib/utils';

import { useAccount } from 'wagmi';

import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Skeleton } from '~/components/ui/skeleton';

import { ChevronDown, ChevronUp, MessageCircle, X } from 'lucide-react';

interface ChatModalProps {
  gameId: string;
}

export const ChatModal = ({ gameId }: ChatModalProps) => {
  const { address } = useAccount();
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
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
      await sendMessage(address, address, message.trim());
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

  // Unread count
  const unreadCount = messages.length;

  return (
    <>
      {/* Floating Button - Bottom Left */}
      {!isOpen ? (
        <button
          className='group fixed bottom-6 left-6 z-40 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-xl'
          title='Open Chat'
          type='button'
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle size={24} />
          {unreadCount > 0 && (
            <span className='absolute -right-2 -top-2 flex h-6 w-6 animate-pulse items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white'>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className='absolute left-16 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100'>
            Game Chat
          </span>
        </button>
      ) : null}

      {/* Chat Modal - Left Side */}
      {isOpen ? (
        <div className='fixed bottom-6 left-6 z-50 flex w-96 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl duration-300 animate-in slide-in-from-bottom-4 dark:border-slate-700 dark:bg-slate-900'>
          {/* Header */}
          <div className='flex items-center justify-between bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 text-white'>
            <div className='flex items-center gap-2'>
              <h3 className='text-sm font-semibold'>Game Chat</h3>
              <div className='flex items-center gap-1'>
                <div className='h-2 w-2 animate-pulse rounded-full bg-green-300' />
                <span className='text-xs opacity-90'>Live</span>
              </div>
            </div>
            <div className='flex gap-1'>
              <button
                className='rounded p-1 transition hover:bg-white/20'
                type='button'
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? (
                  <ChevronUp size={18} />
                ) : (
                  <ChevronDown size={18} />
                )}
              </button>
              <button
                className='rounded p-1 transition hover:bg-white/20'
                type='button'
                onClick={() => {
                  setIsOpen(false);
                  setIsMinimized(false);
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Content - Only show if not minimized */}
          {!isMinimized ? (
            <>
              {/* Messages Container */}
              <ScrollArea
                ref={scrollRef}
                className='h-80 flex-1 border-b border-slate-200 p-4 dark:border-slate-700'
              >
                {loading ? (
                  <div className='space-y-3'>
                    <Skeleton className='h-8 w-3/4' />
                    <Skeleton className='h-8 w-1/2' />
                    <Skeleton className='h-8 w-2/3' />
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {messages.length === 0 ? (
                      <div className='py-8 text-center text-xs text-slate-500 dark:text-slate-400'>
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
                            <div className='flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400'>
                              <span className='font-medium'>
                                {formatAddress(msg.data.senderAddress)}
                              </span>
                              <span>•</span>
                              <span>{formatTime(msg.timestamp)}</span>
                            </div>
                            <div
                              className={cn(
                                'max-w-xs break-words rounded-lg px-3 py-2 text-sm',
                                isOwn
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                              )}
                            >
                              {msg.data.message}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <form
                className='bg-slate-50 p-3 dark:bg-slate-800'
                onSubmit={handleSend}
              >
                <div className='flex gap-2'>
                  <Input
                    className='h-9 flex-1 text-sm'
                    disabled={sending || !address}
                    maxLength={200}
                    value={message}
                    placeholder={
                      address ? 'Type message...' : 'Connect wallet...'
                    }
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <Button
                    className='h-9 bg-purple-600 hover:bg-purple-700'
                    disabled={!message.trim() || sending || !address}
                    size='sm'
                    type='submit'
                  >
                    {sending ? '...' : 'Send'}
                  </Button>
                </div>
              </form>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
};
