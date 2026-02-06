/**
 * Environment Configuration
 * Centralized configuration based on environment variables
 * 
 * Uses @stacks/connect for wallet authentication
 * Uses @stacks/transactions for blockchain interactions
 */

import { DEPLOYER_ADDRESS, MAINNET_CONTRACTS, TESTNET_CONTRACTS } from './constants';

export type NetworkType = 'devnet' | 'testnet' | 'mainnet';

// ============================================================================
// Extended Contract Configuration for All 13 Deployed Contracts
// ============================================================================

interface ContractConfig {
  // Deployer address
  address: string;
  
  // Core contracts (batch 0)
  feeCollector: string;
  positionNft: string;
  timelockToken: string;
  
  // Utility contracts (batch 1)
  batchTransfer: string;
  emergencyWithdraw: string;
  escrow: string;
  governance: string;
  
  // Trading contracts (batch 2)
  priceOracle: string;
  rewardsDistributor: string;
  staking: string;
  
  // Rewards (staking-rewards-v2)
  stakingRewards: string;
  
  // Exchange contracts (batch 3)
  timelockExchange: string;
  vault: string;
}

interface ApiConfig {
  stacksApiUrl: string;
  explorerUrl: string;
  baseUrl: string;
}

interface FeatureFlags {
  enablePasskeys: boolean;
  enableEarlyWithdrawal: boolean;
  enableAdminPanel: boolean;
  enableStaking: boolean;
  enableGovernance: boolean;
  enableEscrow: boolean;
  enableVault: boolean;
  enableBatchTransfer: boolean;
}

interface AppConfig {
  network: NetworkType;
  contracts: ContractConfig;
  api: ApiConfig;
  features: FeatureFlags;
  isDevelopment: boolean;
  isProduction: boolean;
}

function getNetwork(): NetworkType {
  const network = process.env.NEXT_PUBLIC_NETWORK as NetworkType;
  if (['devnet', 'testnet', 'mainnet'].includes(network)) {
    return network;
  }
  // Default to mainnet for production deployment
  return 'mainnet';
}

function getContractConfig(): ContractConfig {
  const network = getNetwork();
  const isMainnet = network === 'mainnet';
  
  // Use mainnet deployer for mainnet, testnet deployer for others
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 
    (isMainnet ? DEPLOYER_ADDRESS : 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM');
  
  // Select contract set based on network
  const contracts = isMainnet ? MAINNET_CONTRACTS : TESTNET_CONTRACTS;
  
  return {
    address,
    
    // Core contracts (batch 0)
    feeCollector: process.env.NEXT_PUBLIC_FEE_COLLECTOR_CONTRACT || contracts.feeCollector,
    positionNft: process.env.NEXT_PUBLIC_POSITION_NFT_CONTRACT || contracts.positionNft,
    timelockToken: process.env.NEXT_PUBLIC_TIMELOCK_TOKEN_CONTRACT || contracts.timelockToken,
    
    // Utility contracts (batch 1)
    batchTransfer: process.env.NEXT_PUBLIC_BATCH_TRANSFER_CONTRACT || contracts.batchTransfer,
    emergencyWithdraw: process.env.NEXT_PUBLIC_EMERGENCY_WITHDRAW_CONTRACT || contracts.emergencyWithdraw,
    escrow: process.env.NEXT_PUBLIC_ESCROW_CONTRACT || contracts.escrow,
    governance: process.env.NEXT_PUBLIC_GOVERNANCE_CONTRACT || contracts.governance,
    
    // Trading contracts (batch 2)
    priceOracle: process.env.NEXT_PUBLIC_PRICE_ORACLE_CONTRACT || contracts.priceOracle,
    rewardsDistributor: process.env.NEXT_PUBLIC_REWARDS_DISTRIBUTOR_CONTRACT || contracts.rewardsDistributor,
    staking: process.env.NEXT_PUBLIC_STAKING_CONTRACT || contracts.staking,
    
    // Rewards (staking-rewards-v2)
    stakingRewards: process.env.NEXT_PUBLIC_STAKING_REWARDS_CONTRACT || contracts.stakingRewards,
    
    // Exchange contracts (batch 3)
    timelockExchange: process.env.NEXT_PUBLIC_TIMELOCK_EXCHANGE_CONTRACT || contracts.timelockExchange,
    vault: process.env.NEXT_PUBLIC_VAULT_CONTRACT || contracts.vault,
  };
}

function getApiConfig(): ApiConfig {
  const network = getNetwork();
  
  const defaults: Record<NetworkType, Partial<ApiConfig>> = {
    devnet: {
      stacksApiUrl: 'http://localhost:3999',
      explorerUrl: 'http://localhost:8000',
    },
    testnet: {
      stacksApiUrl: 'https://api.testnet.hiro.so',
      explorerUrl: 'https://explorer.hiro.so/?chain=testnet',
    },
    mainnet: {
      stacksApiUrl: 'https://api.mainnet.hiro.so',
      explorerUrl: 'https://explorer.hiro.so',
    },
  };

  return {
    stacksApiUrl: process.env.NEXT_PUBLIC_STACKS_API_URL || defaults[network].stacksApiUrl!,
    explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL || defaults[network].explorerUrl!,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  };
}

function getFeatureFlags(): FeatureFlags {
  return {
    enablePasskeys: process.env.NEXT_PUBLIC_ENABLE_PASSKEYS !== 'false',
    enableEarlyWithdrawal: process.env.NEXT_PUBLIC_ENABLE_EARLY_WITHDRAWAL !== 'false',
    enableAdminPanel: process.env.NEXT_PUBLIC_ENABLE_ADMIN_PANEL === 'true',
    enableStaking: process.env.NEXT_PUBLIC_ENABLE_STAKING !== 'false',
    enableGovernance: process.env.NEXT_PUBLIC_ENABLE_GOVERNANCE !== 'false',
    enableEscrow: process.env.NEXT_PUBLIC_ENABLE_ESCROW !== 'false',
    enableVault: process.env.NEXT_PUBLIC_ENABLE_VAULT !== 'false',
    enableBatchTransfer: process.env.NEXT_PUBLIC_ENABLE_BATCH_TRANSFER !== 'false',
  };
}

export function getConfig(): AppConfig {
  const network = getNetwork();
  
  return {
    network,
    contracts: getContractConfig(),
    api: getApiConfig(),
    features: getFeatureFlags(),
    isDevelopment: network === 'devnet',
    isProduction: network === 'mainnet',
  };
}

// Export singleton config
export const config = getConfig();

// Helper to get explorer transaction URL
export function getExplorerTxUrl(txId: string): string {
  const { api, network } = config;
  const chainParam = network === 'testnet' ? '?chain=testnet' : '';
  return `${api.explorerUrl}/txid/${txId}${chainParam}`;
}

// Helper to get explorer address URL
export function getExplorerAddressUrl(address: string): string {
  const { api, network } = config;
  const chainParam = network === 'testnet' ? '?chain=testnet' : '';
  return `${api.explorerUrl}/address/${address}${chainParam}`;
}

// Helper to get explorer contract URL
export function getExplorerContractUrl(contractId: string): string {
  const { api, network } = config;
  const chainParam = network === 'testnet' ? '?chain=testnet' : '';
  return `${api.explorerUrl}/txid/${contractId}${chainParam}`;
}

// Parse contract identifier
export function parseContractId(fullId: string): { address: string; name: string } {
  const [address, name] = fullId.split('.');
  return { address, name };
}

export default config;
