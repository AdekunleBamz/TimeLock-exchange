/**
 * Environment Configuration
 * Centralized configuration based on environment variables
 */

export type NetworkType = 'devnet' | 'testnet' | 'mainnet';

interface ContractConfig {
  address: string;
  timelockExchange: string;
  positionNft: string;
  feeCollector: string;
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
  return 'devnet';
}

function getContractConfig(): ContractConfig {
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  
  return {
    address,
    timelockExchange: process.env.NEXT_PUBLIC_TIMELOCK_EXCHANGE_CONTRACT || `${address}.timelock-exchange`,
    positionNft: process.env.NEXT_PUBLIC_POSITION_NFT_CONTRACT || `${address}.position-nft`,
    feeCollector: process.env.NEXT_PUBLIC_FEE_COLLECTOR_CONTRACT || `${address}.fee-collector`,
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
