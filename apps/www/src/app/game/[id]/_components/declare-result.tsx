import React from 'react';

import { errorHandler } from '~/lib/utils';
import { gameConfig, wagmiConfig } from '~/lib/viem';

import { DialogDescription, DialogTitle } from '@radix-ui/react-dialog';
import { waitForTransactionReceipt, readContract } from '@wagmi/core';
import { toast } from 'sonner';
import { useWriteContract } from 'wagmi';
import type { GameCompleteRequest, GameCompleteResponse } from '~/types';

import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
} from '~/components/ui/dialog';

interface DeclareResultProps {
  contractAddress: `0x${string}`;
  refresh: () => Promise<void>;
}

export const DeclareResult = ({
  contractAddress,
  refresh,
}: DeclareResultProps) => {
  const { writeContractAsync, isPending } = useWriteContract();
  const onDeclare = async () => {
    const id = toast.loading('Declaring Result...');
    try {
      // Step 1: Declare winner on-chain
      const hash = await writeContractAsync({
        ...gameConfig,
        address: contractAddress,
        functionName: 'declareWinner',
        args: [],
      });

      toast.loading('Waiting for confirmation...', { id });
      await waitForTransactionReceipt(wagmiConfig, { hash });

      // Step 2: Read winner and game data from contract
      const [winner, totalPlayers] = await Promise.all([
        readContract(wagmiConfig, {
          ...gameConfig,
          address: contractAddress,
          functionName: 'winner',
        }) as Promise<string>,
        readContract(wagmiConfig, {
          ...gameConfig,
          address: contractAddress,
          functionName: '_totalPlayers',
        }) as Promise<bigint>,
      ]);

      // Step 3: Mint winner NFT via API
      if (winner && winner !== '0x0000000000000000000000000000000000000000') {
        toast.loading('Minting winner NFT...', { id });

        try {
          const response = await fetch('/api/game/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gameAddress: contractAddress,
              winnerAddress: winner,
              gameData: {
                potSize: '0', // TODO: Read from contract
                winningHand: 'Unknown', // TODO: Parse from contract
                totalPlayers: Number(totalPlayers),
              },
            } satisfies GameCompleteRequest),
          });

          const nftData = (await response.json()) as GameCompleteResponse;

          if (nftData.success && nftData.nftSerial) {
            toast.success(
              `Winner declared! NFT #${String(nftData.nftSerial)} sent to winner 🏆`,
              { id, duration: 6000 }
            );
          } else {
            // Winner declared but NFT failed
            toast.success('Winner declared! (NFT minting failed)', { id });
            console.error('[NFT] Minting error:', nftData.error);
          }
        } catch (nftError) {
          // Winner declared successfully, NFT is bonus
          toast.success('Winner declared! (NFT minting skipped)', { id });
          console.error('[NFT] Error:', nftError);
        }
      } else {
        toast.success('Result Declared Successfully!', { id });
      }

      await refresh();
    } catch (error) {
      toast.error(errorHandler(error), { id });
    }
  };
  return (
    <div className='absolute bottom-12 left-12'>
      <Dialog>
        <DialogTrigger className='flex flex-row items-center gap-2 rounded-full border-2 border-[#70AF8A] bg-[#204D39] px-4 py-2 text-lg text-[#89d6a9]'>
          Declare Result
        </DialogTrigger>
        <DialogContent className='flex w-full max-w-xl flex-row items-center justify-center !rounded-3xl bg-[#204D39] py-8'>
          <DialogHeader>
            <DialogTitle className='text-xl font-medium'>
              Declare Game Result
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to declare the game result? Make sure all
              players have provided Pending Reveal Tokens in order to compute
              the Winner.
            </DialogDescription>
            <Button disabled={isPending} onClick={onDeclare}>
              Declare Result
            </Button>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
};
