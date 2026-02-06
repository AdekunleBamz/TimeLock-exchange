/**
 * Post Conditions Utility
 * 
 * This module provides helper functions for creating post conditions
 * that protect users during contract interactions.
 * 
 * Post conditions ensure that transactions only affect funds as expected,
 * protecting users from malicious or buggy contracts.
 * 
 * Uses @stacks/transactions for post condition building
 */

import {
  makeStandardSTXPostCondition,
  makeContractSTXPostCondition,
  makeStandardFungiblePostCondition,
  makeContractFungiblePostCondition,
  makeStandardNonFungiblePostCondition,
  makeContractNonFungiblePostCondition,
  FungibleConditionCode,
  NonFungibleConditionCode,
  PostConditionMode,
  createAssetInfo,
  uintCV,
  ClarityValue,
} from '@stacks/transactions';
import { CONTRACTS, parseContractId, MICRO_STX, DEPLOYER_ADDRESS } from './constants';

// ============================================================================
// Types
// ============================================================================

export interface STXPostConditionParams {
  sender: string;
  amount: bigint;
  condition?: FungibleConditionCode;
}

export interface FTPostConditionParams {
  sender: string;
  amount: bigint;
  contractId: string;
  assetName: string;
  condition?: FungibleConditionCode;
}

export interface NFTPostConditionParams {
  sender: string;
  tokenId: number;
  contractId: string;
  assetName: string;
  condition?: NonFungibleConditionCode;
}

// ============================================================================
// STX Post Conditions
// ============================================================================

/**
 * Create a post condition that limits STX transfer from a user
 */
export function createSTXTransferCondition(
  params: STXPostConditionParams
) {
  const { sender, amount, condition = FungibleConditionCode.LessEqual } = params;
  return makeStandardSTXPostCondition(sender, condition, amount);
}

/**
 * Create a post condition for exact STX transfer
 */
export function createExactSTXCondition(sender: string, amount: bigint) {
  return makeStandardSTXPostCondition(sender, FungibleConditionCode.Equal, amount);
}

/**
 * Create a post condition for maximum STX transfer
 */
export function createMaxSTXCondition(sender: string, maxAmount: bigint) {
  return makeStandardSTXPostCondition(sender, FungibleConditionCode.LessEqual, maxAmount);
}

/**
 * Create a post condition that a contract must send STX
 */
export function createContractSTXCondition(
  contractId: string,
  amount: bigint,
  condition: FungibleConditionCode = FungibleConditionCode.GreaterEqual
) {
  const { address, name } = parseContractId(contractId);
  return makeContractSTXPostCondition(address, name, condition, amount);
}

// ============================================================================
// TLX Token Post Conditions
// ============================================================================

/**
 * Create a post condition for TLX token transfer
 */
export function createTLXTransferCondition(
  sender: string,
  amount: bigint,
  condition: FungibleConditionCode = FungibleConditionCode.LessEqual
) {
  const { address, name } = parseContractId(CONTRACTS.timelockToken);
  return makeStandardFungiblePostCondition(
    sender,
    condition,
    amount,
    createAssetInfo(address, name, 'timelock-token')
  );
}

/**
 * Create a post condition for exact TLX token transfer
 */
export function createExactTLXCondition(sender: string, amount: bigint) {
  return createTLXTransferCondition(sender, amount, FungibleConditionCode.Equal);
}

// ============================================================================
// Position NFT Post Conditions
// ============================================================================

/**
 * Create a post condition for position NFT transfer
 */
export function createPositionNFTCondition(
  sender: string,
  tokenId: number,
  condition: NonFungibleConditionCode = NonFungibleConditionCode.Sends
) {
  const { address, name } = parseContractId(CONTRACTS.positionNft);
  return makeStandardNonFungiblePostCondition(
    sender,
    condition,
    createAssetInfo(address, name, 'position-nft'),
    uintCV(tokenId)
  );
}

/**
 * Create a post condition that user sends an NFT
 */
export function createNFTSendCondition(
  sender: string,
  tokenId: number,
  contractId: string,
  assetName: string
) {
  const { address, name } = parseContractId(contractId);
  return makeStandardNonFungiblePostCondition(
    sender,
    NonFungibleConditionCode.Sends,
    createAssetInfo(address, name, assetName),
    uintCV(tokenId)
  );
}

/**
 * Create a post condition that user does NOT send an NFT
 */
export function createNFTNoSendCondition(
  sender: string,
  tokenId: number,
  contractId: string,
  assetName: string
) {
  const { address, name } = parseContractId(contractId);
  return makeStandardNonFungiblePostCondition(
    sender,
    NonFungibleConditionCode.DoesNotSend,
    createAssetInfo(address, name, assetName),
    uintCV(tokenId)
  );
}

// ============================================================================
// Contract-Specific Post Conditions
// ============================================================================

/**
 * Post conditions for creating a timelock position
 * Protects user from sending more STX than intended
 */
export function createPositionPostConditions(sender: string, stxAmount: bigint) {
  return [
    createMaxSTXCondition(sender, stxAmount),
  ];
}

/**
 * Post conditions for withdrawing from a position
 * Ensures user receives at least the expected STX
 */
export function withdrawPositionPostConditions(expectedAmount: bigint) {
  const { address, name } = parseContractId(CONTRACTS.timelockExchange);
  return [
    makeContractSTXPostCondition(
      address,
      name,
      FungibleConditionCode.GreaterEqual,
      expectedAmount
    ),
  ];
}

/**
 * Post conditions for staking TLX tokens
 */
export function stakePostConditions(sender: string, amount: bigint) {
  return [
    createTLXTransferCondition(sender, amount, FungibleConditionCode.Equal),
  ];
}

/**
 * Post conditions for unstaking TLX tokens
 */
export function unstakePostConditions(expectedAmount: bigint) {
  const { address, name } = parseContractId(CONTRACTS.staking);
  const tokenContract = parseContractId(CONTRACTS.timelockToken);
  return [
    makeContractFungiblePostCondition(
      address,
      name,
      FungibleConditionCode.GreaterEqual,
      expectedAmount,
      createAssetInfo(
        tokenContract.address,
        tokenContract.name,
        'timelock-token'
      )
    ),
  ];
}

/**
 * Post conditions for claiming staking rewards
 */
export function claimRewardsPostConditions(minExpected: bigint) {
  const { address, name } = parseContractId(CONTRACTS.stakingRewards);
  const tokenContract = parseContractId(CONTRACTS.timelockToken);
  return [
    makeContractFungiblePostCondition(
      address,
      name,
      FungibleConditionCode.GreaterEqual,
      minExpected,
      createAssetInfo(
        tokenContract.address,
        tokenContract.name,
        'timelock-token'
      )
    ),
  ];
}

/**
 * Post conditions for vault deposit
 */
export function vaultDepositPostConditions(sender: string, stxAmount: bigint) {
  return [
    createMaxSTXCondition(sender, stxAmount),
  ];
}

/**
 * Post conditions for vault withdrawal
 */
export function vaultWithdrawPostConditions(expectedAmount: bigint) {
  const { address, name } = parseContractId(CONTRACTS.vault);
  return [
    makeContractSTXPostCondition(
      address,
      name,
      FungibleConditionCode.GreaterEqual,
      expectedAmount
    ),
  ];
}

/**
 * Post conditions for escrow funding
 */
export function escrowFundPostConditions(sender: string, stxAmount: bigint, feeAmount: bigint) {
  return [
    createMaxSTXCondition(sender, stxAmount + feeAmount),
  ];
}

/**
 * Post conditions for escrow release
 */
export function escrowReleasePostConditions(expectedAmount: bigint) {
  const { address, name } = parseContractId(CONTRACTS.escrow);
  return [
    makeContractSTXPostCondition(
      address,
      name,
      FungibleConditionCode.GreaterEqual,
      expectedAmount
    ),
  ];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert STX to microSTX for post conditions
 */
export function stxToMicro(stx: number): bigint {
  return BigInt(Math.floor(stx * MICRO_STX));
}

/**
 * Add safety margin to an amount (default 1%)
 */
export function withSafetyMargin(amount: bigint, marginPercent: number = 1): bigint {
  return amount + (amount * BigInt(marginPercent)) / BigInt(100);
}

/**
 * Get recommended post condition mode
 * Always use Deny unless there's a specific reason not to
 */
export function getPostConditionMode(): PostConditionMode {
  return PostConditionMode.Deny;
}

// ============================================================================
// Exports
// ============================================================================

export {
  FungibleConditionCode,
  NonFungibleConditionCode,
  PostConditionMode,
};

export default {
  createSTXTransferCondition,
  createExactSTXCondition,
  createMaxSTXCondition,
  createContractSTXCondition,
  createTLXTransferCondition,
  createExactTLXCondition,
  createPositionNFTCondition,
  createNFTSendCondition,
  createNFTNoSendCondition,
  createPositionPostConditions,
  withdrawPositionPostConditions,
  stakePostConditions,
  unstakePostConditions,
  claimRewardsPostConditions,
  vaultDepositPostConditions,
  vaultWithdrawPostConditions,
  escrowFundPostConditions,
  escrowReleasePostConditions,
  stxToMicro,
  withSafetyMargin,
  getPostConditionMode,
};
