'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LiveLobby } from '~/components/live-lobby';

export const LiveLobbySection = () => {
  const router = useRouter();

  const handleCreateGame = () => {
    router.push('/game/new');
  };

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <LiveLobby onCreateGame={handleCreateGame} />
    </section>
  );
}
