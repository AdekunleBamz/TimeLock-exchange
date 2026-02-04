// End-to-End Tests for Governance Contract
import { describe, it, expect, beforeAll } from 'vitest';
import { Cl, ClarityType } from '@stacks/transactions';

// Test addresses
const deployer = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const user1 = 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5';
const user2 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
const user3 = 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC';

const contractName = 'governance';

describe('Governance Contract E2E Tests', () => {
  describe('Initial State', () => {
    it('should return correct governance parameters', async () => {
      const result = simnet.callReadOnlyFn(
        contractName,
        'get-governance-params',
        [],
        deployer
      );
      
      expect(result.result.type).toBe(ClarityType.Tuple);
    });

    it('should have zero total voting power initially', async () => {
      const params = simnet.callReadOnlyFn(
        contractName,
        'get-governance-params',
        [],
        deployer
      );
      
      expect(params.result.data['total-voting-power']).toBeUint(0);
    });
  });

  describe('Voting Power Registration', () => {
    it('should allow registering voting power', async () => {
      const result = simnet.callPublicFn(
        contractName,
        'register-voting-power',
        [Cl.uint(100000000)], // 100 STX
        user1
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });

    it('should track voting power correctly', async () => {
      const power = simnet.callReadOnlyFn(
        contractName,
        'get-voting-power',
        [Cl.principal(user1)],
        deployer
      );
      
      expect(power.result.data.power).toBeUint(100000000);
    });

    it('should update total voting power', async () => {
      const params = simnet.callReadOnlyFn(
        contractName,
        'get-governance-params',
        [],
        deployer
      );
      
      expect(params.result.data['total-voting-power']).not.toBeUint(0);
    });

    it('should allow removing voting power', async () => {
      const result = simnet.callPublicFn(
        contractName,
        'remove-voting-power',
        [Cl.uint(50000000)], // Remove 50 STX worth
        user1
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });
  });

  describe('Delegation', () => {
    it('should allow delegating voting power', async () => {
      // Register power for user2
      simnet.callPublicFn(
        contractName,
        'register-voting-power',
        [Cl.uint(50000000)],
        user2
      );
      
      const result = simnet.callPublicFn(
        contractName,
        'delegate',
        [Cl.principal(user1)], // Delegate to user1
        user2
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });

    it('should track delegated power correctly', async () => {
      const power = simnet.callReadOnlyFn(
        contractName,
        'get-voting-power',
        [Cl.principal(user1)],
        deployer
      );
      
      // User1 should have their own power + delegated power
      expect(power.result.data['delegated-power']).not.toBeUint(0);
    });

    it('should calculate effective voting power with delegation', async () => {
      const effectivePower = simnet.callReadOnlyFn(
        contractName,
        'get-effective-voting-power',
        [Cl.principal(user1)],
        deployer
      );
      
      // Should include both own and delegated power
      expect(effectivePower.result).not.toBeUint(0);
    });

    it('should allow undelegating', async () => {
      const result = simnet.callPublicFn(
        contractName,
        'undelegate',
        [],
        user2
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });
  });

  describe('Proposal Creation', () => {
    it('should allow creating proposal with sufficient voting power', async () => {
      const result = simnet.callPublicFn(
        contractName,
        'create-proposal',
        [
          Cl.stringAscii('Test Proposal'),
          Cl.stringUtf8('This is a test proposal for governance'),
          Cl.uint(1), // TYPE_PARAMETER_CHANGE
          Cl.none(), // No target contract
          Cl.none(), // No call data
        ],
        user1
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });

    it('should reject proposal without sufficient voting power', async () => {
      // user3 has no voting power
      const result = simnet.callPublicFn(
        contractName,
        'create-proposal',
        [
          Cl.stringAscii('Invalid Proposal'),
          Cl.stringUtf8('Should fail'),
          Cl.uint(1),
          Cl.none(),
          Cl.none(),
        ],
        user3
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseErr);
    });

    it('should track proposal correctly', async () => {
      const proposal = simnet.callReadOnlyFn(
        contractName,
        'get-proposal',
        [Cl.uint(1)],
        deployer
      );
      
      expect(proposal.result.type).toBe(ClarityType.OptionalSome);
    });

    it('should return correct proposal state', async () => {
      const state = simnet.callReadOnlyFn(
        contractName,
        'get-proposal-state',
        [Cl.uint(1)],
        deployer
      );
      
      // Should be PENDING (0) or ACTIVE (1) depending on block height
      expect(state.result).toBeLessThanOrEqual(Cl.uint(1));
    });
  });

  describe('Voting', () => {
    it('should allow voting FOR a proposal', async () => {
      // Mine a block to make proposal active
      simnet.mineEmptyBlocks(2);
      
      const result = simnet.callPublicFn(
        contractName,
        'cast-vote',
        [Cl.uint(1), Cl.uint(1)], // proposal 1, vote FOR
        user1
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });

    it('should prevent double voting', async () => {
      const result = simnet.callPublicFn(
        contractName,
        'cast-vote',
        [Cl.uint(1), Cl.uint(1)],
        user1
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseErr);
    });

    it('should allow voting AGAINST a proposal', async () => {
      // Register voting power for user2 if not done
      simnet.callPublicFn(
        contractName,
        'register-voting-power',
        [Cl.uint(30000000)],
        user2
      );
      
      const result = simnet.callPublicFn(
        contractName,
        'cast-vote',
        [Cl.uint(1), Cl.uint(0)], // vote AGAINST
        user2
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });

    it('should track if user has voted', async () => {
      const hasVoted = simnet.callReadOnlyFn(
        contractName,
        'has-voted',
        [Cl.uint(1), Cl.principal(user1)],
        deployer
      );
      
      expect(hasVoted.result).toBeBool(true);
    });

    it('should track vote correctly', async () => {
      const vote = simnet.callReadOnlyFn(
        contractName,
        'get-vote',
        [Cl.uint(1), Cl.principal(user1)],
        deployer
      );
      
      expect(vote.result.type).toBe(ClarityType.OptionalSome);
      expect(vote.result.value.data.support).toBeUint(1);
    });

    it('should update proposal vote counts', async () => {
      const proposal = simnet.callReadOnlyFn(
        contractName,
        'get-proposal',
        [Cl.uint(1)],
        deployer
      );
      
      expect(proposal.result.value.data['for-votes']).not.toBeUint(0);
    });
  });

  describe('Proposal Results', () => {
    it('should return correct proposal results', async () => {
      const results = simnet.callReadOnlyFn(
        contractName,
        'get-proposal-results',
        [Cl.uint(1)],
        deployer
      );
      
      expect(results.result.type).toBe(ClarityType.ResponseOk);
    });

    it('should indicate quorum status', async () => {
      const results = simnet.callReadOnlyFn(
        contractName,
        'get-proposal-results',
        [Cl.uint(1)],
        deployer
      );
      
      expect(results.result.value.data['quorum-reached']).toBeDefined();
    });
  });

  describe('Proposal Lifecycle', () => {
    it('should reject voting after voting period ends', async () => {
      // Mine blocks to end voting period (~7 days)
      simnet.mineEmptyBlocks(10100);
      
      // Register voting power for user3
      simnet.callPublicFn(
        contractName,
        'register-voting-power',
        [Cl.uint(10000000)],
        user3
      );
      
      const result = simnet.callPublicFn(
        contractName,
        'cast-vote',
        [Cl.uint(1), Cl.uint(1)],
        user3
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseErr);
    });

    it('should allow queuing successful proposal', async () => {
      const state = simnet.callReadOnlyFn(
        contractName,
        'get-proposal-state',
        [Cl.uint(1)],
        deployer
      );
      
      // If proposal succeeded, try to queue
      if (state.result.value === 3) { // STATE_SUCCEEDED
        const result = simnet.callPublicFn(
          contractName,
          'queue-proposal',
          [Cl.uint(1)],
          deployer
        );
        
        expect(result.result.type).toBe(ClarityType.ResponseOk);
      }
    });

    it('should allow canceling proposal by proposer', async () => {
      // Create a new proposal to cancel
      simnet.callPublicFn(
        contractName,
        'create-proposal',
        [
          Cl.stringAscii('Cancellable Proposal'),
          Cl.stringUtf8('This will be cancelled'),
          Cl.uint(1),
          Cl.none(),
          Cl.none(),
        ],
        user1
      );
      
      const result = simnet.callPublicFn(
        contractName,
        'cancel-proposal',
        [Cl.uint(2)],
        user1
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });

    it('should reject cancel by non-proposer', async () => {
      // Create another proposal
      simnet.callPublicFn(
        contractName,
        'create-proposal',
        [
          Cl.stringAscii('Another Proposal'),
          Cl.stringUtf8('Test'),
          Cl.uint(1),
          Cl.none(),
          Cl.none(),
        ],
        user1
      );
      
      const result = simnet.callPublicFn(
        contractName,
        'cancel-proposal',
        [Cl.uint(3)],
        user2 // Not the proposer
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseErr);
    });
  });

  describe('Admin Functions', () => {
    it('should allow owner to update voting period', async () => {
      const result = simnet.callPublicFn(
        contractName,
        'set-voting-period',
        [Cl.uint(20160)], // ~14 days
        deployer
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });

    it('should reject invalid voting period', async () => {
      const result = simnet.callPublicFn(
        contractName,
        'set-voting-period',
        [Cl.uint(100)], // Too short
        deployer
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseErr);
    });

    it('should allow owner to update quorum', async () => {
      const result = simnet.callPublicFn(
        contractName,
        'set-quorum',
        [Cl.uint(5)], // 5%
        deployer
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });

    it('should reject non-owner admin actions', async () => {
      const result = simnet.callPublicFn(
        contractName,
        'set-voting-period',
        [Cl.uint(15000)],
        user1
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseErr);
    });

    it('should allow owner to update proposal threshold', async () => {
      const result = simnet.callPublicFn(
        contractName,
        'set-proposal-threshold',
        [Cl.uint(50000000)], // 50 STX
        deployer
      );
      
      expect(result.result.type).toBe(ClarityType.ResponseOk);
    });
  });
});
