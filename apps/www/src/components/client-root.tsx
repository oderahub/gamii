'use client';

import React from 'react';
import { Navbar } from '~/components';
import { Web3Provider } from '~/providers';
import { Toaster } from '~/components/ui/sonner';
import { AgeVerificationModal } from '~/components/age-verification';
import { ThemeProvider } from '../providers/theme-provider';

export const ClientRoot = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <Web3Provider>
        <AgeVerificationModal />
        <Navbar />
        {children}
        <Toaster />
      </Web3Provider>
    </ThemeProvider>
  );
};