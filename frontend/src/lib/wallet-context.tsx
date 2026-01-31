'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AppConfig, UserSession, showConnect, UserData } from '@stacks/connect';
import { APP_DETAILS, ACTIVE_NETWORK } from './constants';

// Configure app permissions
const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });

// Wallet context type
interface WalletContextType {
  isConnected: boolean;
  isLoading: boolean;
  userData: UserData | null;
  stxAddress: string | null;
  network: typeof ACTIVE_NETWORK;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Provider component
export function WalletProvider({ children }: { children: ReactNode }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Check if already signed in on mount
  useEffect(() => {
    setMounted(true);
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
  }, []);

  // Get STX address based on active network
  const stxAddress = userData
    ? ACTIVE_NETWORK === 'mainnet'
      ? userData.profile.stxAddress.mainnet
      : userData.profile.stxAddress.testnet
    : null;

  // Connect wallet
  const connect = useCallback(async () => {
    setIsLoading(true);
    
    showConnect({
      appDetails: APP_DETAILS,
      redirectTo: '/',
      onFinish: () => {
        const data = userSession.loadUserData();
        setUserData(data);
        setIsLoading(false);
      },
      onCancel: () => {
        setIsLoading(false);
      },
      userSession,
    });
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    userSession.signUserOut();
    setUserData(null);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <WalletContext.Provider
        value={{
          isConnected: false,
          isLoading: false,
          userData: null,
          stxAddress: null,
          network: ACTIVE_NETWORK,
          connect: async () => {},
          disconnect: () => {},
        }}
      >
        {children}
      </WalletContext.Provider>
    );
  }

  return (
    <WalletContext.Provider
      value={{
        isConnected: !!userData,
        isLoading,
        userData,
        stxAddress,
        network: ACTIVE_NETWORK,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// Hook to use wallet context
export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
