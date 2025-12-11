'use client'

import { useState } from 'react'
import { AppConfig, UserSession, showConnect, UserData } from '@stacks/connect'
import { StacksMainnet } from '@stacks/network'

const appConfig = new AppConfig(['store_write', 'publish_data'])
const userSession = new UserSession({ appConfig })

export function ConnectWallet() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const connectWallet = async () => {
    setIsLoading(true)

    showConnect({
      appDetails: {
        name: 'TimeLock Exchange',
        icon: window.location.origin + '/logo.png',
      },
      redirectTo: '/',
      onFinish: () => {
        const userData = userSession.loadUserData()
        setUserData(userData)
        setIsLoading(false)
      },
      userSession,
    })
  }

  const disconnectWallet = () => {
    userSession.signUserOut()
    setUserData(null)
  }

  // Check if user is already connected on mount
  useState(() => {
    if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData())
    }
  })

  if (userData) {
    return (
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className="bg-green-100 border border-green-300 rounded-lg px-4 py-2">
          <p className="text-sm text-green-800">
            Connected: {userData.profile.stxAddress.mainnet.slice(0, 6)}...{userData.profile.stxAddress.mainnet.slice(-4)}
          </p>
        </div>
        <button
          onClick={disconnectWallet}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="flex justify-center mb-8">
      <button
        onClick={connectWallet}
        disabled={isLoading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
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
  )
}
