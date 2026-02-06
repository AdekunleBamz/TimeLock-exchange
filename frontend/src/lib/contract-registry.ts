/**
 * Contract Registry - Centralized Contract Address Management
 * 
 * This module provides a type-safe way to access deployed contract addresses
 * and build contract calls using @stacks/transactions.
 * 
 * All 13 contracts deployed to mainnet at:
 * Deployer: SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT
 */

import { 
  CONTRACTS, 
  MAINNET_CONTRACTS, 
  TESTNET_CONTRACTS,
  DEPLOYER_ADDRESS,
  ACTIVE_NETWORK,
  parseContractId,
  buildContractId,
} from './constants';

// ============================================================================
// Contract Name Enum
// ============================================================================

export enum ContractName {
  FeeCollector = 'feeCollector',
  PositionNft = 'positionNft',
  TimelockToken = 'timelockToken',
  BatchTransfer = 'batchTransfer',
  EmergencyWithdraw = 'emergencyWithdraw',
  Escrow = 'escrow',
  Governance = 'governance',
  PriceOracle = 'priceOracle',
  RewardsDistributor = 'rewardsDistributor',
  Staking = 'staking',
  StakingRewards = 'stakingRewards',
  TimelockExchange = 'timelockExchange',
  Vault = 'vault',
}

// ============================================================================
// Contract Info Type
// ============================================================================

export interface ContractInfo {
  fullId: string;
  address: string;
  name: string;
  deployedName: string;
  network: 'mainnet' | 'testnet' | 'devnet';
}

// ============================================================================
// Contract Registry Class
// ============================================================================

class ContractRegistry {
  private readonly contracts: typeof CONTRACTS;
  private readonly network: typeof ACTIVE_NETWORK;

  constructor() {
    this.contracts = CONTRACTS;
    this.network = ACTIVE_NETWORK;
  }

  /**
   * Get full contract info for a given contract name
   */
  get(contractName: ContractName): ContractInfo {
    const fullId = this.contracts[contractName];
    const { address, name } = parseContractId(fullId);
    
    return {
      fullId,
      address,
      name,
      deployedName: name,
      network: this.network,
    };
  }

  /**
   * Get just the full contract ID (address.name)
   */
  getId(contractName: ContractName): string {
    return this.contracts[contractName];
  }

  /**
   * Get the deployer address
   */
  getDeployer(): string {
    return this.network === 'mainnet' 
      ? DEPLOYER_ADDRESS 
      : 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  }

  /**
   * Get all contract addresses
   */
  getAll(): Record<ContractName, ContractInfo> {
    return Object.values(ContractName).reduce((acc, name) => {
      acc[name] = this.get(name);
      return acc;
    }, {} as Record<ContractName, ContractInfo>);
  }

  /**
   * Check if we're on mainnet
   */
  isMainnet(): boolean {
    return this.network === 'mainnet';
  }

  /**
   * Get network-specific explorer URL for a contract
   */
  getExplorerUrl(contractName: ContractName): string {
    const { fullId } = this.get(contractName);
    const baseUrl = this.isMainnet() 
      ? 'https://explorer.hiro.so'
      : 'https://explorer.hiro.so/?chain=testnet';
    return `${baseUrl}/txid/${fullId}`;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const contractRegistry = new ContractRegistry();

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Quick access to mainnet contract addresses
 */
export const mainnetContracts = {
  feeCollector: MAINNET_CONTRACTS.feeCollector,
  positionNft: MAINNET_CONTRACTS.positionNft,
  timelockToken: MAINNET_CONTRACTS.timelockToken,
  batchTransfer: MAINNET_CONTRACTS.batchTransfer,
  emergencyWithdraw: MAINNET_CONTRACTS.emergencyWithdraw,
  escrow: MAINNET_CONTRACTS.escrow,
  governance: MAINNET_CONTRACTS.governance,
  priceOracle: MAINNET_CONTRACTS.priceOracle,
  rewardsDistributor: MAINNET_CONTRACTS.rewardsDistributor,
  staking: MAINNET_CONTRACTS.staking,
  stakingRewards: MAINNET_CONTRACTS.stakingRewards,
  timelockExchange: MAINNET_CONTRACTS.timelockExchange,
  vault: MAINNET_CONTRACTS.vault,
};

/**
 * Quick access to testnet contract addresses
 */
export const testnetContracts = TESTNET_CONTRACTS;

// ============================================================================
// Helper Functions for @stacks/transactions
// ============================================================================

/**
 * Get contract parameters ready for callReadOnlyFunction or openContractCall
 */
export function getContractParams(contractName: ContractName): {
  contractAddress: string;
  contractName: string;
} {
  const info = contractRegistry.get(contractName);
  return {
    contractAddress: info.address,
    contractName: info.name,
  };
}

/**
 * Validate a contract address
 */
export function isValidContractAddress(address: string): boolean {
  // Mainnet addresses start with SP, testnet with ST
  return /^S[PT][A-Z0-9]{38,}$/.test(address);
}

/**
 * Check if a contract ID is from our deployment
 */
export function isOurContract(contractId: string): boolean {
  try {
    const { address } = parseContractId(contractId);
    return address === DEPLOYER_ADDRESS || 
           address === 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  } catch {
    return false;
  }
}

export default contractRegistry;
