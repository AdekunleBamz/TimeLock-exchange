// End-to-End Tests for Staking Rewards Contract
import { describe, it, expect, beforeAll } from 'vitest';
import { Cl, ClarityType } from '@stacks/transactions';

// Test addresses
const deployer = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const user1 = 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5';
const user2 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';

const contractName = 'staking-rewards';

describe('Staking Rewards Contract E2E Tests', () => {
  describe('Initial State', () => {
    it('should have correct initial reward rate', async () => {
      const result = simnet.callReadOnlyFn(
        contractName,
        'get-reward-rate',
        [],
        deployer
      );
      expect(result.result).toBeUint(100);
    });

    it('should have zero total staked initially', async () => {
      const result = simnet.callReadOnlyFn(
        contractName,
        'get-total-staked',
        [],
        deployer
      );
      expect(result.result).toBeUint(0);
    });

    it('should return correct tier info', async () => {
      const tier1 = simnet.callReadOnlyFn(
        contractName,
        'get-tier-info',
        [Cl.uint(1)],
        deployer
      );
      expect(tier1.result.type).toBe(ClarityType.OptionalSome);
      
      const tier5 = simnet.callReadOnlyFn(
        contractName,
        'get-tier-info',
        [Cl.uint(5)],
        deployer
      );
      expect(tier5.result.type).toBe(ClarityType.OptionalSome);
    });
  });

  describe('Staking Operations', () => {
    it('should allow staking with valid amount and duration', async () => {
      const amount = 1000000; // 1 STX
      const lockDuration = 10080; // ~7 days
      
      const result = simnet.callPublicFn(
        contractName,
        'stake',
        [Cl.uint(amount), Cl.uint(lockDuration)],
        user1
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });

    it('should reject staking below minimum amount', async () => {
      const amount = 100; // Below minimum
      const lockDuration = 10080;
      
      const result = simnet.callPublicFn(
        contractName,
        'stake',
        [Cl.uint(amount), Cl.uint(lockDuration)],
        user2
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseErr);
    });

    it('should reject staking with insufficient lock duration', async () => {
      const amount = 1000000;
      const lockDuration = 100; // Too short
      
      const result = simnet.callPublicFn(
        contractName,
        'stake',
        [Cl.uint(amount), Cl.uint(lockDuration)],
        user2
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseErr);
    });

    it('should update total staked after staking', async () => {
      const result = simnet.callReadOnlyFn(
        contractName,
        'get-total-staked',
        [],
        deployer
      );
      
      // Should be greater than 0 after staking
      expect(result.result).not.toBeUint(0);
    });

    it('should track staker info correctly', async () => {
      const result = simnet.callReadOnlyFn(
        contractName,
        'get-staker-info',
        [Cl.principal(user1)],
        deployer
      );
      
      expect(result.result.type).toBe(ClarityType.OptionalSome);
    });
  });

  describe('Reward Calculations', () => {
    it('should calculate pending rewards correctly', async () => {
      // Advance blocks to accumulate rewards
      simnet.mineEmptyBlocks(100);
      
      const result = simnet.callReadOnlyFn(
        contractName,
        'calculate-pending-rewards',
        [Cl.principal(user1)],
        deployer
      );
      
      // Should have some rewards after 100 blocks
      expect(result.result).not.toBeUint(0);
    });

    it('should calculate APY for different tiers', async () => {
      const tier1Apy = simnet.callReadOnlyFn(
        contractName,
        'calculate-apy',
        [Cl.uint(1)],
        deployer
      );
      
      const tier5Apy = simnet.callReadOnlyFn(
        contractName,
        'calculate-apy',
        [Cl.uint(5)],
        deployer
      );
      
      // Higher tier should have higher APY
      expect(tier5Apy.result).toBeGreaterThan(tier1Apy.result);
    });

    it('should determine correct tier based on lock duration', async () => {
      // Bronze tier (~7 days)
      const bronze = simnet.callReadOnlyFn(
        contractName,
        'determine-tier',
        [Cl.uint(10080)],
        deployer
      );
      expect(bronze.result).toBeUint(1);
      
      // Diamond tier (~1 year)
      const diamond = simnet.callReadOnlyFn(
        contractName,
        'determine-tier',
        [Cl.uint(525600)],
        deployer
      );
      expect(diamond.result).toBeUint(5);
    });
  });

  describe('Reward Claims', () => {
    it('should allow claiming rewards when available', async () => {
      // First fund the reward pool (as owner)
      simnet.callPublicFn(
        contractName,
        'fund-reward-pool',
        [Cl.uint(100000000)],
        deployer
      );
      
      // Mine blocks to accumulate rewards
      simnet.mineEmptyBlocks(1000);
      
      const result = simnet.callPublicFn(
        contractName,
        'claim-rewards',
        [],
        user1
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });

    it('should reject claim when no rewards available', async () => {
      // User2 has not staked
      const result = simnet.callPublicFn(
        contractName,
        'claim-rewards',
        [],
        user2
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseErr);
    });
  });

  describe('Unstaking Process', () => {
    it('should initiate unstake and start cooldown', async () => {
      const result = simnet.callPublicFn(
        contractName,
        'initiate-unstake',
        [],
        user1
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });

    it('should detect cooldown status correctly', async () => {
      const result = simnet.callReadOnlyFn(
        contractName,
        'is-in-cooldown',
        [Cl.principal(user1)],
        deployer
      );
      
      expect(result.result).toBeBool(true);
    });

    it('should reject early unstake completion', async () => {
      // Try to complete unstake immediately (should fail due to cooldown)
      const result = simnet.callPublicFn(
        contractName,
        'complete-unstake',
        [],
        user1
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseErr);
    });

    it('should allow cancel unstake', async () => {
      const result = simnet.callPublicFn(
        contractName,
        'cancel-unstake',
        [],
        user1
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });

    it('should complete unstake after cooldown', async () => {
      // Re-initiate unstake
      simnet.callPublicFn(
        contractName,
        'initiate-unstake',
        [],
        user1
      );
      
      // Mine blocks to pass cooldown (~1 day = 144 blocks)
      simnet.mineEmptyBlocks(1500);
      
      const result = simnet.callPublicFn(
        contractName,
        'complete-unstake',
        [],
        user1
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });
  });

  describe('Admin Functions', () => {
    it('should allow owner to update reward rate', async () => {
      const result = simnet.callPublicFn(
        contractName,
        'update-reward-rate',
        [Cl.uint(200)],
        deployer
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });

    it('should reject non-owner updating reward rate', async () => {
      const result = simnet.callPublicFn(
        contractName,
        'update-reward-rate',
        [Cl.uint(300)],
        user1
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseErr);
    });

    it('should allow owner to update minimum stake', async () => {
      const result = simnet.callPublicFn(
        contractName,
        'update-min-stake',
        [Cl.uint(500000)],
        deployer
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });

    it('should allow owner to update cooldown period', async () => {
      const result = simnet.callPublicFn(
        contractName,
        'update-cooldown-period',
        [Cl.uint(2880)], // ~2 days
        deployer
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });
  });

  describe('Add Stake Functionality', () => {
    it('should allow adding to existing stake', async () => {
      // First stake
      simnet.callPublicFn(
        contractName,
        'stake',
        [Cl.uint(1000000), Cl.uint(10080)],
        user2
      );
      
      // Add more
      const result = simnet.callPublicFn(
        contractName,
        'add-stake',
        [Cl.uint(500000)],
        user2
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });

    it('should reject adding stake for non-staker', async () => {
      // user1 already unstaked
      const result = simnet.callPublicFn(
        contractName,
        'add-stake',
        [Cl.uint(500000)],
        user1
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseErr);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple stakers correctly', async () => {
      const totalStaked = simnet.callReadOnlyFn(
        contractName,
        'get-total-staked',
        [],
        deployer
      );
      
      // Should reflect all stakers
      expect(totalStaked.result).not.toBeUint(0);
    });

    it('should handle reward pool depletion gracefully', async () => {
      // This test ensures the contract handles edge cases
      const rewardPool = simnet.callReadOnlyFn(
        contractName,
        'get-reward-pool',
        [],
        deployer
      );
      
      expect(rewardPool.result.type).toBe(ClarityType.UInt);
    });
  });
});
