'use client';

import React, { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { connectHashPack, getHashPackDownloadUrl } from '~/lib/hedera/hashpack';
import { isMetaMaskInstalled, switchToHederaNetwork, getMetaMaskDownloadUrl } from '~/lib/hedera/metamask';

export const ConnectButton = () => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConnectingHashPack, setIsConnectingHashPack] = useState(false);

  const handleMetaMaskConnect = async () => {
    if (!isMetaMaskInstalled()) {
      window.open(getMetaMaskDownloadUrl(), '_blank');
      return;
    }

    try {
      // First, switch to Hedera network
      await switchToHederaNetwork();

      // Then connect
      const injectedConnector = connectors.find((c) => c.id === 'injected');
      if (injectedConnector) {
        connect({ connector: injectedConnector });
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error('MetaMask connection failed:', error);
      // Show error to user - using console for now (could use toast in production)
      console.warn('Failed to connect to MetaMask. Please try again.');
    }
  };

  const handleHashPackConnect = async () => {
    setIsConnectingHashPack(true);
    try {
      await connectHashPack();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('HashPack connection failed:', error);

      // If HashConnect fails to initialize, it likely means HashPack isn't installed
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('HashConnect') || errorMessage.includes('not installed')) {
        // Open download page
        window.open(getHashPackDownloadUrl(), '_blank');
      } else {
        // Show error to user - using console for now (could use toast in production)
        console.warn('Failed to connect to HashPack. Please try again.');
      }
    } finally {
      setIsConnectingHashPack(false);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => disconnect()}
      >
        {formatAddress(address)}
      </Button>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Connect Wallet</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            Choose a wallet to connect to Hedera Testnet
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <Button
            className="w-full justify-start gap-3 h-16"
            variant="outline"
            onClick={handleMetaMaskConnect}
          >
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold">
              M
            </div>
            <div className="flex flex-col items-start">
              <span className="font-semibold">MetaMask</span>
              <span className="text-xs text-muted-foreground">
                {isMetaMaskInstalled()
                  ? 'EVM-compatible wallet for Hedera'
                  : 'Download MetaMask'}
              </span>
            </div>
          </Button>

          <Button
            className="w-full justify-start gap-3 h-16"
            disabled={isConnectingHashPack}
            variant="outline"
            onClick={handleHashPackConnect}
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center text-white font-bold">
              H
            </div>
            <div className="flex flex-col items-start">
              <span className="font-semibold">HashPack</span>
              <span className="text-xs text-muted-foreground">
                Native Hedera wallet
              </span>
            </div>
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-2">
            By connecting, you agree to the Terms of Service
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};