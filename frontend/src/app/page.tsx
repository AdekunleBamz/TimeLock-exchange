'use client'

import { ConnectWallet } from '@/components/ConnectWallet'
import { TimeLockDashboard } from '@/components/TimeLockDashboard'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            TimeLock Exchange
          </h1>
          <p className="text-lg text-gray-600">
            Decentralized time-locked positions with passkey security
          </p>
        </header>

        <ConnectWallet />
        <TimeLockDashboard />
      </div>
    </main>
  )
}
