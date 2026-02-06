/**
 * TimeLock Exchange - Hooks Exports
 * 
 * Central export file for all React hooks.
 * All hooks are designed to work with mainnet contracts:
 * - Deployer: SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT
 * 
 * Uses @stacks/connect for wallet authentication
 * Uses @stacks/transactions for blockchain interactions
 */

// ============================================================================
// Core Contract Hooks
// ============================================================================

// Position management
export { usePositions, usePosition } from './usePositions';

// Staking
export { useStaking } from './useStaking';
export { useStakingRewards } from './useStakingRewards';

// Governance
export { useGovernance } from './useGovernance';

// Vault
export { useVault } from './useVault';
export type { Vault, PendingWithdrawal, VaultStats, UseVaultReturn } from './useVault';

// Escrow
export { useEscrow } from './useEscrow';

// Batch operations
export { useBatchTransfer } from './useBatchTransfer';
export type { Recipient } from './useBatchTransfer';

// Fees
export { useFees } from './useFees';

// Price oracle
export { usePriceOracle } from './usePriceOracle';

// Emergency withdraw
export { useEmergencyWithdraw } from './useEmergencyWithdraw';
export type { EmergencyRequest, UseEmergencyWithdrawReturn } from './useEmergencyWithdraw';

// Position NFT
export { usePositionNFT } from './usePositionNFT';
export type { NFTMetadata, UsePositionNFTReturn } from './usePositionNFT';

// Timelock Token
export { useTimelockToken } from './useTimelockToken';
export type { TokenInfo, UseTimelockTokenReturn } from './useTimelockToken';

// Rewards distributor
export { useRewardsDistributor } from './useRewardsDistributor';
export type { UseRewardsDistributorReturn } from './useRewardsDistributor';

// ============================================================================
// Infrastructure Hooks
// ============================================================================

// Wallet & authentication
export { usePasskeys } from './usePasskeys';

// Contract status
export { useContractStatus } from './useContractStatus';

// Network status
export { 
  useNetworkStatus, 
  useBlockHeight, 
  useIsMainnet, 
  useNetworkName 
} from './useNetworkStatus';

// Transaction management
export { 
  useTransaction, 
  usePositionTransaction, 
  useStakingTransaction 
} from './useTransaction';

// ============================================================================
// Analytics & History Hooks
// ============================================================================

export { usePositionHistory } from './usePositionHistory';
export { usePortfolioAnalytics } from './usePortfolioAnalytics';

// ============================================================================
// Utility Hooks
// ============================================================================

// Async state management
export { useAsync } from './useAsync';

// Form handling
export { useForm } from './useForm';

// Local storage
export { useLocalStorage } from './useLocalStorage';

// Debounce
export { useDebounce } from './useDebounce';
export { usePrevious } from './usePrevious';

// UI utilities
export { useClickOutside } from './useClickOutside';
export { useClipboard } from './useClipboard';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export { useMediaQuery } from './useMediaQuery';
export { useToggle } from './useToggle';
export { useWindowSize } from './useWindowSize';

// WebSocket (for real-time updates)
export { useWebSocket } from './useWebSocket';
