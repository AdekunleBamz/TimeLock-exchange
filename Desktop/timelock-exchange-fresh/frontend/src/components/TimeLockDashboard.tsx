'use client'

import { useState, useEffect } from 'react'
import { callReadOnlyFunction, cvToValue, standardPrincipalCV } from '@stacks/transactions'
import { StacksMainnet } from '@stacks/network'

const network = new StacksMainnet()

interface Position {
  id: number
  amount: number
  asset: string
  createdAt: number
  duration: number
  unlockTime: number
  isActive: boolean
  owner: string
}

export function TimeLockDashboard() {
  const [positions, setPositions] = useState<Position[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPosition, setNewPosition] = useState({
    amount: '',
    duration: '7', // days
    usePasskey: false
  })

  // Contract addresses from environment
  const contractAddresses = {
    timelockExchange: process.env.NEXT_PUBLIC_TIMELOCK_EXCHANGE_CONTRACT!,
    positionNft: process.env.NEXT_PUBLIC_POSITION_NFT_CONTRACT!,
    feeCollector: process.env.NEXT_PUBLIC_FEE_COLLECTOR_CONTRACT!
  }

  const loadPositions = async () => {
    setIsLoading(true)
    try {
      // Get total position count
      const countResult = await callReadOnlyFunction({
        contractAddress: contractAddresses.timelockExchange.split('.')[0],
        contractName: contractAddresses.timelockExchange.split('.')[1],
        functionName: 'get-position-count',
        functionArgs: [],
        network,
        senderAddress: contractAddresses.timelockExchange.split('.')[0]
      })

      const count = cvToValue(countResult).value
      console.log('Total positions:', count)

      // Load positions (simplified - in real app, load user's positions)
      setPositions([]) // Placeholder
    } catch (error) {
      console.error('Error loading positions:', error)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadPositions()
  }, [])

  const createPosition = async () => {
    if (!newPosition.amount || parseFloat(newPosition.amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setIsLoading(true)
    try {
      // Contract call would go here
      console.log('Creating position:', newPosition)
      alert('Position creation functionality would be implemented here')
    } catch (error) {
      console.error('Error creating position:', error)
      alert('Error creating position')
    }
    setIsLoading(false)
  }

  const registerPasskey = async () => {
    try {
      // WebAuthn passkey registration
      const publicKeyCredential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: 'TimeLock Exchange' },
          user: {
            id: new Uint8Array(16),
            name: 'user@timelock.exchange',
            displayName: 'TimeLock User'
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          timeout: 60000,
          attestation: 'direct'
        }
      }) as PublicKeyCredential

      console.log('Passkey registered:', publicKeyCredential)
      alert('Passkey registered successfully!')
    } catch (error) {
      console.error('Passkey registration failed:', error)
      alert('Passkey registration failed')
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Positions</h3>
          <p className="text-3xl font-bold text-blue-600">{positions.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">TVL Locked</h3>
          <p className="text-3xl font-bold text-green-600">0 STX</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Fees Collected</h3>
          <p className="text-3xl font-bold text-purple-600">0 STX</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-8 justify-center">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          {showCreateForm ? 'Cancel' : '🔒 Create TimeLock Position'}
        </button>

        <button
          onClick={registerPasskey}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          🔑 Register Passkey
        </button>

        <button
          onClick={loadPositions}
          disabled={isLoading}
          className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          {isLoading ? 'Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Create Position Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create TimeLock Position</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (STX)
              </label>
              <input
                type="number"
                value={newPosition.amount}
                onChange={(e) => setNewPosition({...newPosition, amount: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="100.00"
                min="0.01"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lock Duration (Days)
              </label>
              <select
                value={newPosition.duration}
                onChange={(e) => setNewPosition({...newPosition, duration: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7">7 Days</option>
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={newPosition.usePasskey}
                onChange={(e) => setNewPosition({...newPosition, usePasskey: e.target.checked})}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Use Passkey Authentication</span>
            </label>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={createPosition}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Position'}
            </button>

            <button
              onClick={() => setShowCreateForm(false)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Positions List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Your TimeLock Positions</h2>

        {positions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No positions found. Create your first TimeLock position!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {positions.map((position) => (
              <div key={position.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">Position #{position.id}</h3>
                    <p className="text-sm text-gray-600">
                      {position.amount} {position.asset} • {position.duration} days lock
                    </p>
                    <p className="text-xs text-gray-500">
                      Created: {new Date(position.createdAt * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      position.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {position.isActive ? 'Active' : 'Unlocked'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
