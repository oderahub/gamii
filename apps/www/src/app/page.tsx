import React from 'react';

import { Hero } from '~/components';
import { LiveLobbySection } from './live-lobby-section';

const Home = () => {
  return (
    <div>
      {/* Hero Section */}
      <Hero />

      {/* Live Lobby Section */}
      <LiveLobbySection />
    </div>
  );
};

export default Home;
