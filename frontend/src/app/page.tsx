'use client'

import { ConnectWallet } from '@/components/ConnectWallet'
import { TimeLockDashboard } from '@/components/TimeLockDashboard'
import { TimeFiStats } from '@/components/TimeFiStats'
import { ACTIVE_NETWORK, DEPLOYER_ADDRESS } from '@/lib/constants'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-gray-900">
              TimeLock Exchange
            </h1>
            {ACTIVE_NETWORK === 'mainnet' && (
              <span className="px-2 py-1 text-xs font-bold bg-green-100 text-green-800 rounded-full border border-green-300">
                MAINNET
              </span>
            )}
          </div>
          <p className="text-lg text-gray-600">
            Decentralized time-locked positions with passkey security
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Deployed to: {DEPLOYER_ADDRESS.slice(0, 8)}...{DEPLOYER_ADDRESS.slice(-4)}
          </p>
        </header>

        <ConnectWallet />
        <TimeFiStats />
        <TimeLockDashboard />
      </div>
    </main>
  )
}
