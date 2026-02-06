/**
 * TimeLock Exchange - Network & Contract Constants
 * 
 * This module provides network configuration and contract addresses for
 * interacting with the Stacks blockchain using @stacks/connect and @stacks/transactions.
 * 
 * @stacks/connect - Wallet authentication and transaction signing
 * @stacks/transactions - Building and broadcasting transactions
 */

// ============================================================================
// Network Configuration
// ============================================================================

export const NETWORK = {
  mainnet: {
    url: 'https://api.mainnet.hiro.so',
    explorer: 'https://explorer.hiro.so',
    chainId: 1,
  },
  testnet: {
    url: 'https://api.testnet.hiro.so',
    explorer: 'https://explorer.hiro.so/?chain=testnet',
    chainId: 2147483648,
  },
  devnet: {
    url: 'http://localhost:3999',
    explorer: 'http://localhost:8000',
    chainId: 2147483648,
  },
} as const;

// Active network - Set to mainnet for production deployment
export const ACTIVE_NETWORK: keyof typeof NETWORK = 'mainnet';

// ============================================================================
// Deployer Address
// ============================================================================

export const DEPLOYER_ADDRESS = 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT';

// ============================================================================
// Mainnet Contract Addresses (Deployed)
// ============================================================================

/**
 * All 13 deployed contracts on Stacks mainnet
 * Deployer: SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT
 */
export const MAINNET_CONTRACTS = {
  // Core contracts (batch 0)
  feeCollector: `${DEPLOYER_ADDRESS}.fee-collector-v11-1`,
  positionNft: `${DEPLOYER_ADDRESS}.position-nft-v11-1`,
  timelockToken: `${DEPLOYER_ADDRESS}.timelock-token-v11-1`,
  
  // Utility contracts (batch 1)
  batchTransfer: `${DEPLOYER_ADDRESS}.batch-transfer-v1`,
  emergencyWithdraw: `${DEPLOYER_ADDRESS}.emergency-withdraw-v1`,
  escrow: `${DEPLOYER_ADDRESS}.escrow-v1`,
  governance: `${DEPLOYER_ADDRESS}.governance-v1`,
  
  // Trading contracts (batch 2)
  priceOracle: `${DEPLOYER_ADDRESS}.price-oracle-v1`,
  rewardsDistributor: `${DEPLOYER_ADDRESS}.rewards-distributor-v1`,
  staking: `${DEPLOYER_ADDRESS}.staking-v1`,
  
  // Rewards (retry after fix)
  stakingRewards: `${DEPLOYER_ADDRESS}.staking-rewards-v2`,
  
  // Exchange contracts (batch 3)
  timelockExchange: `${DEPLOYER_ADDRESS}.timelock-exchange-v1`,
  vault: `${DEPLOYER_ADDRESS}.vault-v1`,
} as const;

// ============================================================================
// Testnet Contract Addresses (For development/testing)
// ============================================================================

const TESTNET_DEPLOYER = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

export const TESTNET_CONTRACTS = {
  feeCollector: `${TESTNET_DEPLOYER}.fee-collector`,
  positionNft: `${TESTNET_DEPLOYER}.position-nft`,
  timelockToken: `${TESTNET_DEPLOYER}.timelock-token`,
  batchTransfer: `${TESTNET_DEPLOYER}.batch-transfer`,
  emergencyWithdraw: `${TESTNET_DEPLOYER}.emergency-withdraw`,
  escrow: `${TESTNET_DEPLOYER}.escrow`,
  governance: `${TESTNET_DEPLOYER}.governance`,
  priceOracle: `${TESTNET_DEPLOYER}.price-oracle`,
  rewardsDistributor: `${TESTNET_DEPLOYER}.rewards-distributor`,
  staking: `${TESTNET_DEPLOYER}.staking`,
  stakingRewards: `${TESTNET_DEPLOYER}.staking-rewards`,
  timelockExchange: `${TESTNET_DEPLOYER}.timelock-exchange`,
  vault: `${TESTNET_DEPLOYER}.vault`,
} as const;

// ============================================================================
// Active Contracts (Based on ACTIVE_NETWORK)
// ============================================================================

/**
 * Get the appropriate contract addresses based on the active network
 * Uses environment variables when available, otherwise defaults to mainnet
 */
export const CONTRACTS = {
  // Core contracts
  timelockExchange: process.env.NEXT_PUBLIC_TIMELOCK_EXCHANGE_CONTRACT || 
    (ACTIVE_NETWORK === 'mainnet' ? MAINNET_CONTRACTS.timelockExchange : TESTNET_CONTRACTS.timelockExchange),
  positionNft: process.env.NEXT_PUBLIC_POSITION_NFT_CONTRACT || 
    (ACTIVE_NETWORK === 'mainnet' ? MAINNET_CONTRACTS.positionNft : TESTNET_CONTRACTS.positionNft),
  feeCollector: process.env.NEXT_PUBLIC_FEE_COLLECTOR_CONTRACT || 
    (ACTIVE_NETWORK === 'mainnet' ? MAINNET_CONTRACTS.feeCollector : TESTNET_CONTRACTS.feeCollector),
  
  // Additional contracts
  timelockToken: process.env.NEXT_PUBLIC_TIMELOCK_TOKEN_CONTRACT ||
    (ACTIVE_NETWORK === 'mainnet' ? MAINNET_CONTRACTS.timelockToken : TESTNET_CONTRACTS.timelockToken),
  batchTransfer: process.env.NEXT_PUBLIC_BATCH_TRANSFER_CONTRACT ||
    (ACTIVE_NETWORK === 'mainnet' ? MAINNET_CONTRACTS.batchTransfer : TESTNET_CONTRACTS.batchTransfer),
  emergencyWithdraw: process.env.NEXT_PUBLIC_EMERGENCY_WITHDRAW_CONTRACT ||
    (ACTIVE_NETWORK === 'mainnet' ? MAINNET_CONTRACTS.emergencyWithdraw : TESTNET_CONTRACTS.emergencyWithdraw),
  escrow: process.env.NEXT_PUBLIC_ESCROW_CONTRACT ||
    (ACTIVE_NETWORK === 'mainnet' ? MAINNET_CONTRACTS.escrow : TESTNET_CONTRACTS.escrow),
  governance: process.env.NEXT_PUBLIC_GOVERNANCE_CONTRACT ||
    (ACTIVE_NETWORK === 'mainnet' ? MAINNET_CONTRACTS.governance : TESTNET_CONTRACTS.governance),
  priceOracle: process.env.NEXT_PUBLIC_PRICE_ORACLE_CONTRACT ||
    (ACTIVE_NETWORK === 'mainnet' ? MAINNET_CONTRACTS.priceOracle : TESTNET_CONTRACTS.priceOracle),
  rewardsDistributor: process.env.NEXT_PUBLIC_REWARDS_DISTRIBUTOR_CONTRACT ||
    (ACTIVE_NETWORK === 'mainnet' ? MAINNET_CONTRACTS.rewardsDistributor : TESTNET_CONTRACTS.rewardsDistributor),
  staking: process.env.NEXT_PUBLIC_STAKING_CONTRACT ||
    (ACTIVE_NETWORK === 'mainnet' ? MAINNET_CONTRACTS.staking : TESTNET_CONTRACTS.staking),
  stakingRewards: process.env.NEXT_PUBLIC_STAKING_REWARDS_CONTRACT ||
    (ACTIVE_NETWORK === 'mainnet' ? MAINNET_CONTRACTS.stakingRewards : TESTNET_CONTRACTS.stakingRewards),
  vault: process.env.NEXT_PUBLIC_VAULT_CONTRACT ||
    (ACTIVE_NETWORK === 'mainnet' ? MAINNET_CONTRACTS.vault : TESTNET_CONTRACTS.vault),
} as const;

// ============================================================================
// Contract Type
// ============================================================================

export type ContractName = keyof typeof CONTRACTS;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse a contract ID into address and name components
 * @example parseContractId('SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.vault-v1')
 * // Returns: { address: 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT', name: 'vault-v1' }
 */
export function parseContractId(contractId: string): { address: string; name: string } {
  const [address, ...nameParts] = contractId.split('.');
  const name = nameParts.join('.'); // Handle edge case of . in contract name
  if (!address || !name) {
    throw new Error(`Invalid contract ID format: ${contractId}`);
  }
  return { address, name };
}

/**
 * Build a full contract ID from address and name
 */
export function buildContractId(address: string, name: string): string {
  return `${address}.${name}`;
}

/**
 * Get the explorer URL for a contract
 */
export function getContractExplorerUrl(contractId: string): string {
  const { address, name } = parseContractId(contractId);
  return `${NETWORK[ACTIVE_NETWORK].explorer}/txid/${address}.${name}`;
}

/**
 * Get the explorer URL for a transaction
 */
export function getTxExplorerUrl(txId: string): string {
  return `${NETWORK[ACTIVE_NETWORK].explorer}/txid/${txId}`;
}

/**
 * Get the explorer URL for an address
 */
export function getAddressExplorerUrl(address: string): string {
  return `${NETWORK[ACTIVE_NETWORK].explorer}/address/${address}`;
}

// ============================================================================
// App Details for @stacks/connect Wallet Connection
// ============================================================================

export const APP_DETAILS = {
  name: 'TimeLock Exchange',
  icon: typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '/logo.png',
} as const;

// ============================================================================
// Lock Duration Options (in seconds)
// ============================================================================

export const LOCK_DURATIONS = {
  '7': 7 * 24 * 60 * 60,    // 7 days
  '30': 30 * 24 * 60 * 60,  // 30 days
  '90': 90 * 24 * 60 * 60,  // 90 days
  '180': 180 * 24 * 60 * 60, // 180 days
  '365': 365 * 24 * 60 * 60, // 1 year
} as const;

export const LOCK_DURATION_LABELS: Record<keyof typeof LOCK_DURATIONS, string> = {
  '7': '7 Days',
  '30': '30 Days',
  '90': '90 Days',
  '180': '180 Days',
  '365': '1 Year',
};

// ============================================================================
// Fee Configuration
// ============================================================================

export const FEE_BPS = 50; // 0.5% in basis points
export const MICRO_STX = 1_000_000; // 1 STX = 1,000,000 microSTX

// ============================================================================
// Stacks Block Time (for estimations)
// ============================================================================

export const BLOCKS_PER_DAY = 144; // ~10 minute block time
export const BLOCKS_PER_YEAR = 52560; // 144 * 365

// ============================================================================
// Contract Function Names (for type safety with @stacks/transactions)
// ============================================================================

export const CONTRACT_FUNCTIONS = {
  timelockExchange: {
    createPosition: 'create-position',
    withdraw: 'withdraw',
    earlyWithdraw: 'early-withdraw',
    getPosition: 'get-position',
    getPositionCount: 'get-position-count',
  },
  positionNft: {
    getOwner: 'get-owner',
    getTokenUri: 'get-token-uri',
    transfer: 'transfer',
  },
  feeCollector: {
    collectFee: 'collect-fee',
    withdrawFees: 'withdraw-fees',
    getTotalCollected: 'get-total-collected',
  },
  staking: {
    stake: 'stake',
    unstake: 'unstake',
    claimRewards: 'claim-rewards',
    getStake: 'get-stake',
  },
  vault: {
    createVault: 'create-vault',
    deposit: 'deposit',
    requestWithdrawal: 'request-withdrawal',
    executeWithdrawal: 'execute-withdrawal',
    getVault: 'get-vault',
  },
  governance: {
    propose: 'propose',
    vote: 'vote',
    execute: 'execute',
    getProposal: 'get-proposal',
  },
  escrow: {
    createEscrow: 'create-escrow',
    fundEscrow: 'fund-escrow',
    releaseFunds: 'release-funds',
    initiateDispute: 'initiate-dispute',
  },
  priceOracle: {
    getPrice: 'get-price',
    updatePrice: 'update-price',
  },
  batchTransfer: {
    batchTransfer: 'batch-transfer',
    getBatch: 'get-batch',
  },
} as const;
