'use client';

import { useWallet } from '@/lib/wallet-context';
import { ACTIVE_NETWORK, DEPLOYER_ADDRESS } from '@/lib/constants';

export function ConnectWallet() {
  const { isConnected, isLoading, stxAddress, network, connect, disconnect } = useWallet();

  const isMainnet = ACTIVE_NETWORK === 'mainnet';

  if (isConnected && stxAddress) {
    return (
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className={`${isMainnet ? 'bg-green-100 border-green-300' : 'bg-yellow-100 border-yellow-300'} border rounded-lg px-4 py-2`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 ${isMainnet ? 'bg-green-500' : 'bg-yellow-500'} rounded-full animate-pulse`}></div>
            <p className={`text-sm ${isMainnet ? 'text-green-800' : 'text-yellow-800'} font-medium`}>
              {stxAddress.slice(0, 6)}...{stxAddress.slice(-4)}
            </p>
            {isMainnet && (
              <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                MAINNET
              </span>
            )}
          </div>
          <p className={`text-xs ${isMainnet ? 'text-green-600' : 'text-yellow-600'} mt-1`}>
            {network} • {isMainnet ? 'Production' : 'Test Network'}
          </p>
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
    <div className="flex flex-col items-center gap-2 mb-8">
      {isMainnet && (
        <span className="bg-green-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
          🟢 MAINNET
        </span>
      )}
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
