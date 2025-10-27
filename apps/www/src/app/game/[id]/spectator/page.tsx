'use client';

import React from 'react';
import { isAddress, zeroAddress } from 'viem';
import { GameSpectator } from '~/components/game-spectator';
import { Button } from '~/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface SpectatorPageProps {
  params: {
    id: `0x${string}`;
  };
}

const SpectatorPage = ({ params }: SpectatorPageProps) => {
  const contractAddress = isAddress(params.id) ? params.id : zeroAddress;

  return (
    <main className="container mx-auto py-8 px-4 min-h-screen">
      {/* Back Button */}
      <div className="mb-6">
        <Link href="/game">
          <Button className="gap-2" size="sm" variant="ghost">
            <ArrowLeft className="h-4 w-4" />
            Back to Lobby
          </Button>
        </Link>
      </div>

      {/* Spectator View */}
      <GameSpectator gameId={contractAddress} />
    </main>
  );
};

export default SpectatorPage;
