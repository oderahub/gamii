'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { Coins, TrendingUp, Wallet } from 'lucide-react';

import { CreateGame } from '../create-game';
import { Logo } from '../logo';
import { ConnectButton } from './connect-button';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../ui/dialog';

import {
  TOKENS,
  formatPokerChips,
  EXCHANGE_RATE,
  MIN_PURCHASE,
  simulateBuyChips,
  getSimulatedChipBalance,
  updateSimulatedChipBalance,
} from '~/lib/hedera/tokens';
import { getRealTokenBalance } from '~/lib/hedera/hts-operations';
import type { BuyChipsRequest, BuyChipsResponse } from '~/types';

// Determine mode from token config at runtime
const IS_REAL_MODE = Boolean(TOKENS.POKER_CHIP);

const BuyChipsButton = () => {
  const { address } = useAccount();
  const [open, setOpen] = useState(false);
  const [hbarAmount, setHbarAmount] = useState('1');
  const [chipBalance, setChipBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  const chipAmount = parseFloat(hbarAmount || '0') * EXCHANGE_RATE;

  useEffect(() => {
    if (!address) return;

    // Fetch balance based on mode
    if (IS_REAL_MODE) {
      const tokenId = TOKENS.POKER_CHIP ?? '';
      // Production: Fetch real balance from Mirror Node
      void getRealTokenBalance(address, tokenId).then(setChipBalance);
    } else {
      // MVP: Use simulated balance
      setChipBalance(getSimulatedChipBalance(address));
    }
  }, [address, open]);

  const handleBuy = async () => {
    if (!address) return toast.error('Connect wallet');
    const amount = parseFloat(hbarAmount);
    if (isNaN(amount) || amount < MIN_PURCHASE)
      return toast.error(`Min: ${String(MIN_PURCHASE)} HBAR`);

    setLoading(true);
    const id = toast.loading('Processing...');

    try {
      if (IS_REAL_MODE) {
        // Production: Real HTS transaction
        toast.loading('Creating transaction...', { id });

        const response = await fetch('/api/hts/buy-chips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerAddress: address,
            hbarAmount: amount,
          } satisfies BuyChipsRequest),
        });

        const data = (await response.json()) as BuyChipsResponse;

        if (!data.success || !data.transactionBytes) {
          throw new Error(data.error ?? 'Failed to create transaction');
        }

        toast.loading('Sign transaction in your wallet...', { id });

        // TODO: Integrate HashPack/wallet signing
        // const signedTx = await signWithWallet(data.transactionBytes);
        // const txId = await submitSignedTransaction(signedTx);

        // For now, show what would happen
        toast.info(
          'Production mode: Would sign transaction with wallet. Enable HashPack integration.',
          { id, duration: 5000 }
        );

        // Fetch updated balance
        const tokenId = TOKENS.POKER_CHIP ?? '';
        const newBalance = await getRealTokenBalance(address, tokenId);
        setChipBalance(newBalance);
      } else {
        // MVP: Simulated transaction
        const result = await simulateBuyChips(address, amount);
        updateSimulatedChipBalance(address, Math.floor(result.chipAmount * 100));
        setChipBalance(getSimulatedChipBalance(address));
        toast.success(`Bought ${result.chipAmount.toFixed(2)} CHIP!`, { id });
      }

      setOpen(false);
      setHbarAmount('1');
    } catch (error) {
      console.error('[Buy Chips] Error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Transaction failed',
        { id }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 border-yellow-500/50 bg-yellow-500/10 text-yellow-600 hover:border-yellow-400 dark:text-yellow-400">
          <Coins className="h-4 w-4" />
          {address && chipBalance > 0 ? <span>{formatPokerChips(chipBalance)} CHIP</span> : 'Buy Chips'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]" aria-describedby="buy-chips-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Coins className="h-5 w-5 text-yellow-500" />Buy POKER_CHIP</DialogTitle>
          <DialogDescription id="buy-chips-description">
            MVP Demo - Hedera Token Service (HTS). Exchange HBAR for POKER_CHIP tokens.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded bg-blue-500/10 p-2 text-xs text-blue-600 dark:text-blue-400">
          <TrendingUp className="inline h-3 w-3" />
          {IS_REAL_MODE
            ? ' Production: Real HBAR will be deducted'
            : ' MVP Demo: Simulated balance (no real HBAR)'}
        </div>
        <div className="text-xs text-muted-foreground">Token: {TOKENS.POKER_CHIP}</div>
        <div className="rounded border-2 border-yellow-500/30 bg-yellow-500/5 p-3">
          <div className="text-xs text-muted-foreground">Balance</div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{formatPokerChips(chipBalance)} CHIP</div>
        </div>
        <div className="space-y-3">
          <div>
            <label htmlFor="hbar-amount" className="text-sm font-medium">Amount (HBAR)</label>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="hbar-amount" className="pl-10" type="number" step="0.1" min={MIN_PURCHASE.toString()} value={hbarAmount} onChange={(e) => setHbarAmount(e.target.value)} />
            </div>
          </div>
          <div className="rounded bg-muted p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Rate:</span><span>1 HBAR = {EXCHANGE_RATE} CHIP</span></div>
            <div className="flex justify-between border-t pt-1"><span>You Get:</span><span className="font-bold text-yellow-600 dark:text-yellow-400">{chipAmount.toFixed(2)} CHIP</span></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="bg-gradient-to-r from-yellow-500 to-amber-500" disabled={loading || !address} onClick={handleBuy}>
            {loading ? 'Processing...' : `Buy ${chipAmount.toFixed(2)} CHIP`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const Navbar = () => {
  return (
    <div className='absolute top-0 z-[2] h-[8dvh] w-full'>
      <div className='mx-auto flex h-full max-w-screen-xl items-center justify-between px-4'>
        <Link className='cursor-pointer transition-opacity hover:opacity-80' href='/'>
          <Logo />
        </Link>
        <div className='flex flex-row items-center gap-3'>
          <Link href='/game'>Games</Link>
          <BuyChipsButton />
          <CreateGame />
          <ConnectButton />
        </div>
      </div>
    </div>
  );
};
