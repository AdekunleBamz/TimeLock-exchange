'use client';

import { useWallet } from '@/lib/wallet-context';

export function ConnectWallet() {
  const { isConnected, isLoading, stxAddress, network, connect, disconnect } = useWallet();

  if (isConnected && stxAddress) {
    return (
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className="bg-green-100 border border-green-300 rounded-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-green-800 font-medium">
              {stxAddress.slice(0, 6)}...{stxAddress.slice(-4)}
            </p>
          </div>
          <p className="text-xs text-green-600 mt-1">{network}</p>
        </div>
        <button
          onClick={disconnect}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-center mb-8">
      <button
        onClick={connect}
        disabled={isLoading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-lg hover:shadow-xl"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Connecting...
          </>
        ) : (
          <>
            🔐 Connect Wallet
          </>
        )}
      </button>
    </div>
  );
}
