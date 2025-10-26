import { useEffect, useRef } from 'react';

import { useShuffle } from '~/lib/hooks';
import { getRevealKeys } from '~/lib/shuffle';
import { gameConfig, wagmiConfig } from '~/lib/viem';

import { waitForTransactionReceipt } from '@wagmi/core';
import { toast } from 'sonner';
import { type Hex, hexToBigInt } from 'viem';
import { useAccount, useWriteContract } from 'wagmi';

interface AutoRevealCommunityProps {
  contractAddress: `0x${string}`;
  pendingCommunityCards: number[];
  deck: Hex[][];
  refresh: () => Promise<void>;
}

/**
 * Automatically submits reveal tokens for community cards.
 * Community cards should be PUBLIC in poker - visible to all players immediately.
 * This component auto-submits reveal tokens so community cards become visible as soon as possible.
 */
export const AutoRevealCommunity = ({
  contractAddress,
  pendingCommunityCards,
  deck,
  refresh,
}: AutoRevealCommunityProps) => {
  const { writeContractAsync } = useWriteContract();
  const { address } = useAccount();
  const { getKey } = useShuffle();
  const isSubmittingRef = useRef(false);
  const lastSubmittedRef = useRef<string>('');

  // Create stable cardKey for dependency tracking
  const cardKey = pendingCommunityCards.length > 0
    ? [...pendingCommunityCards].sort((a, b) => a - b).join(',')
    : '';

  useEffect(() => {
    const submitRevealTokens = async () => {
      // Guard: Check if already submitting
      if (isSubmittingRef.current) {
        console.log('[AutoReveal] Already submitting, skipping...');
        return;
      }

      // Guard: Check if we have pending community cards
      if (pendingCommunityCards.length === 0) return;

      // Guard: Check if wallet connected
      if (!address) return;

      // Guard: Check if already submitted this set of cards
      if (lastSubmittedRef.current === cardKey) {
        console.log('[AutoReveal] Already submitted these cards, skipping...');
        return;
      }

      // Guard: Check if we have deck data
      if (deck.length === 0) {
        console.log('[AutoReveal] Deck not ready, skipping...');
        return;
      }

      // Show info toast explaining what's about to happen
      const infoToastId = toast.info(
        'Revealing community cards...',
        {
          description: 'Please approve the wallet transaction to reveal the flop/turn/river.',
          duration: 10000,
        }
      );

      try {
        isSubmittingRef.current = true;
        console.log('[AutoReveal] Submitting reveal tokens for community cards:', pendingCommunityCards);

        const cards: [Hex, Hex, Hex, Hex][] = [];
        for (const i of pendingCommunityCards) {
          if (!deck[i]) {
            console.error('[AutoReveal] Card not found in deck:', i);
            toast.dismiss(infoToastId);
            return;
          }
          cards.push(deck[i] as [Hex, Hex, Hex, Hex]);
        }

        const key = await getKey(address);
        const tokens = await getRevealKeys(cards, key.sk);

        const revealTokens = tokens.revealKeys.map((t) => ({
          player: address,
          token: {
            x: hexToBigInt(t.card[0]),
            y: hexToBigInt(t.card[1]),
          },
        }));

        // Dismiss info toast and show loading
        toast.dismiss(infoToastId);
        const loadingToastId = toast.loading('Waiting for transaction confirmation...');

        const hash = await writeContractAsync({
          ...gameConfig,
          address: contractAddress,
          functionName: 'addMultipleRevealTokens',
          args: [pendingCommunityCards, revealTokens],
        });

        await waitForTransactionReceipt(wagmiConfig, { hash });

        // Mark as submitted BEFORE refresh to prevent race condition
        lastSubmittedRef.current = cardKey;

        console.log('[AutoReveal] Community cards revealed successfully');

        toast.success('Community cards revealed!', {
          id: loadingToastId,
          description: 'Cards will be visible once all players submit their tokens.',
        });

        await refresh();
      } catch (error) {
        console.error('[AutoReveal] Failed to submit reveal tokens:', error);
        toast.dismiss(infoToastId);
        toast.error('Failed to reveal community cards', {
          description: error instanceof Error ? error.message : 'Please try refreshing the page',
        });
        // Reset to allow retry on next effect run
        isSubmittingRef.current = false;
      } finally {
        isSubmittingRef.current = false;
      }
    };

    void submitRevealTokens();
    // Only depend on data values that actually change, not function references.
    // getKey, refresh, writeContractAsync are used but omitted to prevent re-triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally omitting function deps to prevent duplicate transactions
  }, [address, contractAddress, cardKey]);

  return null; // This is a headless component
};
