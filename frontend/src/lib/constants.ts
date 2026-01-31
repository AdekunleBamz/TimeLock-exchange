/**
 * TimeLock Exchange - Network & Contract Constants
 */

// Network Configuration
export const NETWORK = {
  mainnet: {
    url: 'https://api.mainnet.hiro.so',
    explorer: 'https://explorer.hiro.so',
  },
  testnet: {
    url: 'https://api.testnet.hiro.so',
    explorer: 'https://explorer.hiro.so/?chain=testnet',
  },
  devnet: {
    url: 'http://localhost:3999',
    explorer: 'http://localhost:8000',
  },
} as const;

// Active network (change for deployment)
export const ACTIVE_NETWORK: keyof typeof NETWORK = 'testnet';

// Contract Addresses (update these after deployment)
export const CONTRACTS = {
  timelockExchange: process.env.NEXT_PUBLIC_TIMELOCK_EXCHANGE_CONTRACT || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.timelock-exchange',
  positionNft: process.env.NEXT_PUBLIC_POSITION_NFT_CONTRACT || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.position-nft',
  feeCollector: process.env.NEXT_PUBLIC_FEE_COLLECTOR_CONTRACT || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.fee-collector',
} as const;

// Helper to split contract ID into address and name
export function parseContractId(contractId: string): { address: string; name: string } {
  const [address, name] = contractId.split('.');
  return { address, name };
}

// App Details for Wallet Connection
export const APP_DETAILS = {
  name: 'TimeLock Exchange',
  icon: typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '/logo.png',
} as const;

// Lock Duration Options (in seconds)
export const LOCK_DURATIONS = {
  '7': 7 * 24 * 60 * 60,    // 7 days
  '30': 30 * 24 * 60 * 60,  // 30 days
  '90': 90 * 24 * 60 * 60,  // 90 days
  '180': 180 * 24 * 60 * 60, // 180 days
  '365': 365 * 24 * 60 * 60, // 1 year
} as const;

// Fee configuration (basis points)
export const FEE_BPS = 50; // 0.5%
