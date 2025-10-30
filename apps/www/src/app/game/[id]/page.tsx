'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { useGameEvents } from '~/lib/hooks/useHCS';

import { getCurrentRound } from '~/lib/helpers';
import { truncate } from '~/lib/utils';
import { gameConfig } from '~/lib/viem';

import MotionNumber from 'motion-number';
import { type Hex, isAddress, toHex, zeroAddress } from 'viem';
import { useAccount, useReadContracts } from 'wagmi';

import { GameOverlay } from '~/components/overlays';
import { Button } from '~/components/ui/button';

import { GameStatistics, PlaceBet, PlayerCards, Results } from './_components';
import { AutoRevealCommunity } from './_components/auto-reveal-community';
import { AutoRevealPlayer } from './_components/auto-reveal-player';
import { ChooseCards } from './_components/choose-cards';
import { CommunityCards } from './_components/community-cards';
import { DeclareResult } from './_components/declare-result';
import { ChatModal } from '~/components/game-chat';

import { RefreshCcw } from 'lucide-react';

// Define types for contract responses
interface PlayerData {
  addr: string;
  folded: boolean;
}

const GamePage = ({ params }: { params: { id: `0x${string}` } }) => {
  const contractAddress = isAddress(params.id) ? params.id : zeroAddress;

  const { address } = useAccount();
  const [shouldRefetch, setShouldRefetch] = useState(false);

  // HCS real-time game events - listen for state changes
  const { events: hcsEvents } = useGameEvents(contractAddress);

  // Trigger refetch when HCS events arrive
  useEffect(() => {
    if (hcsEvents.length > 0) {
      setShouldRefetch(true);
      // Reset flag after refetch completes
      const timer = setTimeout(() => setShouldRefetch(false), 100);
      return () => clearTimeout(timer);
    }
  }, [hcsEvents]);

  const { data: res, refetch } = useReadContracts({
    query: {
      // OPTIMIZED: Only poll every 30 seconds as fallback
      // HCS events will trigger immediate updates
      refetchInterval: 30000,
      gcTime: 0, // No caching
      staleTime: 0, // Always fresh
    },
    contracts: [
      {
        ...gameConfig,
        address: contractAddress,
        functionName: '_currentRound',
      },
      {
        ...gameConfig,
        address: contractAddress,
        functionName: 'getPotAmount',
      },
      {
        ...gameConfig,
        address: contractAddress,
        functionName: '_highestBet',
      },
      {
        ...gameConfig,
        address: contractAddress,
        functionName: 'winner',
      },
      {
        ...gameConfig,
        address: contractAddress,
        functionName: 'nextPlayer',
      },
      {
        ...gameConfig,
        address: contractAddress,
        functionName: '_totalPlayers',
      },
      {
        ...gameConfig,
        address: contractAddress,
        functionName: 'winner',
      },
      {
        ...gameConfig,
        address: contractAddress,
        functionName: 'getCommunityCards',
      },
      {
        ...gameConfig,
        address: contractAddress,
        functionName: 'getPlayerCards',
        args: [address ?? zeroAddress],
      },
      {
        ...gameConfig,
        address: contractAddress,
        functionName: 'getDeck',
      },
      {
        ...gameConfig,
        address: contractAddress,
        functionName: 'getPendingPlayerRevealTokens',
        args: [address ?? zeroAddress],
      },
      {
        ...gameConfig,
        address: contractAddress,
        functionName: 'getPendingCommunityRevealTokens',
        args: [address ?? zeroAddress],
      },
    ],
  });

  // Trigger refetch when HCS events signal state change
  useEffect(() => {
    if (shouldRefetch) {
      void refetch();
    }
  }, [shouldRefetch, refetch]);

  const data = useMemo(() => {
    // Helper to safely convert to number, handling objects and undefined
    const safeToNumber = (value: unknown): number => {
      if (value === null || value === undefined) return 0;
      if (typeof value === 'bigint') return Number(value);
      if (typeof value === 'number') return value;
      return 0;
    };

    const currentRound = getCurrentRound(safeToNumber(res?.[0]?.result));
    const potAmount = safeToNumber(res?.[1]?.result);
    const highestBet = safeToNumber(res?.[2]?.result);
    const winnerData = res?.[3]?.result as
      | readonly [string, bigint]
      | undefined;
    const winnerAddress = (winnerData?.[0] ?? zeroAddress) as `0x${string}`;
    const nextPlayerData = res?.[4]?.result as PlayerData | undefined;
    const nextTurn =
      nextPlayerData?.addr === address
        ? 'Me'
        : truncate(nextPlayerData?.addr ?? '', 8);
    const playerCount = safeToNumber(res?.[5]?.result);
    const gameEndedData = res?.[6]?.result as
      | readonly [string, bigint]
      | undefined;
    const gameEnded = gameEndedData?.[0] !== zeroAddress;
    const communityCardsRaw = (res?.[7]?.result as number[] | undefined) ?? [];
    const communityCards = communityCardsRaw.map((c) => c);
    const playerCardsRaw = (res?.[8]?.result as number[] | undefined) ?? [];
    const playerCards = playerCardsRaw.map((c) => c);
    const deckRaw = (res?.[9]?.result as bigint[][] | undefined) ?? [];
    const deck: Hex[][] = deckRaw.map((c) =>
      c.map((i) => toHex(i, { size: 32 }))
    );
    const pendingPlayerCardsRaw =
      (res?.[10]?.result as number[] | undefined) ?? [];
    const pendingPlayerCards = pendingPlayerCardsRaw
      .filter((c) => c !== 0)
      .map((c) => c);

    const pendingCommunityCardsRaw =
      (res?.[11]?.result as number[] | undefined) ?? [];
    const pendingCommunityCards = pendingCommunityCardsRaw
      .filter((c) => c !== 0)
      .map((c) => c);

    return {
      currentRound,
      potAmount,
      highestBet,
      winnerAddress,
      nextTurn,
      playerCount,
      gameEnded,
      communityCards,
      playerCards,
      deck,
      pendingPlayerCards,
      pendingCommunityCards,
    };
  }, [address, res]);

  const refresh = async () => {
    await refetch();
  };

  return (
    <>
      {/* GameOverlay handles modals */}
      <GameOverlay contractAddress={contractAddress} refresh={refresh} />

      {/* Pot Display - Top Center */}
      <div className='pointer-events-none absolute right-1/2 top-24 z-10 mx-auto flex w-fit translate-x-1/2 flex-col gap-2'>
        <div className='text-center font-poker text-3xl font-medium text-neutral-200'>
          {data.currentRound}
        </div>
        <MotionNumber
          className='rounded-full border-2 border-[#70AF8A] bg-[#204D39] px-8 py-4 text-5xl'
          format={{ style: 'currency', currency: 'USD' }}
          value={data.potAmount}
        />
      </div>

      {/* Game Stats - Top Right */}
      <div className='pointer-events-none absolute right-12 top-24 z-10'>
        <GameStatistics
          highestBid={data.highestBet}
          nextTurn={data.nextTurn}
          winner={data.winnerAddress}
        />
      </div>

      {/* Refresh Button - Bottom Right */}
      <div className='pointer-events-auto absolute bottom-12 right-12 z-[45]'>
        <Button
          className='flex h-10 w-10 flex-row items-center justify-center gap-2 rounded-full border-2 border-[#70AF8A] bg-[#204D39] !p-0 px-4 py-2 text-lg text-[#89d6a9]'
          onClick={refresh}
        >
          <RefreshCcw className='text-lg text-[#89d6a9]' />
        </Button>
      </div>

      {/* Bottom Controls - Center */}
      <div className='pointer-events-auto absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-4'>
        <DeclareResult contractAddress={contractAddress} refresh={refresh} />
        <PlaceBet
          contractAddress={contractAddress}
          highestBet={data.highestBet}
          isMyTurn={data.nextTurn === 'Me'}
          refresh={refresh}
        />
      </div>

      {/* Results - Center Modal */}
      {data.gameEnded ? (
        <Results
          contractAddress={contractAddress}
          totalPlayers={data.playerCount}
        />
      ) : null}

      {/* Hidden Components (off-screen, don't render visually) */}
      <div className='hidden'>
        <PlayerCards
          cards={data.playerCards}
          contractAddress={contractAddress}
          deck={data.deck}
        />
        <CommunityCards
          cards={data.communityCards}
          contractAddress={contractAddress}
        />
        <AutoRevealCommunity
          contractAddress={contractAddress}
          deck={data.deck}
          pendingCommunityCards={data.pendingCommunityCards}
          refresh={refresh}
        />
        <AutoRevealPlayer
          contractAddress={contractAddress}
          deck={data.deck}
          pendingPlayerCards={data.pendingPlayerCards}
          refresh={refresh}
        />
        {data.currentRound === 'End' && !data.gameEnded ? (
          <ChooseCards
            cards={data.communityCards}
            contractAddress={contractAddress}
            refresh={refresh}
          />
        ) : null}
      </div>

      {/* Game Chat - Bottom Left */}
      <ChatModal gameId={contractAddress} />
    </>
  );
};

export default GamePage;
