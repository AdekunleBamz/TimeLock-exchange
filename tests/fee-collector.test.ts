
import { describe, expect, it } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

const CONTRACT_NAME = "fee-collector";

describe("Fee Collector Contract Tests", () => {
  describe("Basic Setup", () => {
    it("ensures simnet is well initialized", () => {
      expect(simnet.blockHeight).toBeDefined();
    });

    it("should start with zero total fees", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-total-fees",
        [],
        deployer
      );
      expect(result).toBeUint(0);
    });

    it("should return current block time", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-current-time",
        [],
        deployer
      );
      expect(result.type).toBe(ClarityType.UInt);
    });
  });

  describe("Fee Tier Calculation", () => {
    const SECONDS_PER_DAY = 86400;

    it("should calculate tier 1 fee (7 days)", () => {
      const amount = 100_000_000; // 100 STX
      const duration = 7 * SECONDS_PER_DAY;

      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "calculate-fee",
        [Cl.uint(amount), Cl.uint(duration)],
        deployer
      );

      expect(result.type).toBe(ClarityType.ResponseOk);
      // Tier 1: 1% fee = 1,000,000 microSTX
    });

    it("should calculate tier 2 fee (30 days)", () => {
      const amount = 100_000_000;
      const duration = 30 * SECONDS_PER_DAY;

      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "calculate-fee",
        [Cl.uint(amount), Cl.uint(duration)],
        deployer
      );

      expect(result.type).toBe(ClarityType.ResponseOk);
      // Tier 2: 0.75% fee = 750,000 microSTX
    });

    it("should calculate tier 3 fee (90 days)", () => {
      const amount = 100_000_000;
      const duration = 90 * SECONDS_PER_DAY;

      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "calculate-fee",
        [Cl.uint(amount), Cl.uint(duration)],
        deployer
      );

      expect(result.type).toBe(ClarityType.ResponseOk);
      // Tier 3: 0.5% fee
    });

    it("should calculate tier 4 fee (180 days)", () => {
      const amount = 100_000_000;
      const duration = 180 * SECONDS_PER_DAY;

      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "calculate-fee",
        [Cl.uint(amount), Cl.uint(duration)],
        deployer
      );

      expect(result.type).toBe(ClarityType.ResponseOk);
      // Tier 4: 0.25% fee
    });

    it("should calculate tier 5 fee (365 days)", () => {
      const amount = 100_000_000;
      const duration = 365 * SECONDS_PER_DAY;

      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "calculate-fee",
        [Cl.uint(amount), Cl.uint(duration)],
        deployer
      );

      expect(result.type).toBe(ClarityType.ResponseOk);
      // Tier 5: 0.1% fee = 100,000 microSTX
    });

    it("should return correct tier number", () => {
      const SECONDS_PER_DAY = 86400;

      // Test tier 1
      const { result: tier1 } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-tier-number",
        [Cl.uint(7)],
        deployer
      );
      expect(tier1).toBeUint(1);

      // Test tier 3
      const { result: tier3 } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-tier-number",
        [Cl.uint(60)],
        deployer
      );
      expect(tier3).toBeUint(3);

      // Test tier 5
      const { result: tier5 } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-tier-number",
        [Cl.uint(200)],
        deployer
      );
      expect(tier5).toBeUint(5);
    });
  });

  describe("Fee Collection", () => {
    it("should collect fee and update totals", () => {
      const amount = 50_000_000; // 50 STX
      const duration = 30 * 86400; // 30 days

      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "collect-fee",
        [Cl.uint(amount), Cl.uint(duration)],
        deployer
      );

      expect(result.type).toBe(ClarityType.ResponseOk);

      // Check total fees increased
      const { result: totalFees } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-total-fees",
        [],
        deployer
      );
      expect(totalFees.type).toBe(ClarityType.UInt);
    });

    it("should track fees per tier", () => {
      // Collect fee for tier 1
      simnet.callPublicFn(
        CONTRACT_NAME,
        "collect-fee",
        [Cl.uint(100_000_000), Cl.uint(7 * 86400)],
        deployer
      );

      const { result: tier1Fees } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-tier-fees",
        [Cl.uint(1)],
        deployer
      );
      expect(tier1Fees.type).toBe(ClarityType.UInt);
    });

    it("should return fee statistics", () => {
      // Collect some fees first
      simnet.callPublicFn(
        CONTRACT_NAME,
        "collect-fee",
        [Cl.uint(100_000_000), Cl.uint(30 * 86400)],
        deployer
      );

      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-fee-stats",
        [],
        deployer
      );

      expect(result.type).toBe(ClarityType.Tuple);
    });
  });

  describe("Treasury Management", () => {
    it("should return current treasury address", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-treasury",
        [],
        deployer
      );
      expect(result.type).toBe(ClarityType.PrincipalStandard);
    });

    it("should allow owner to update treasury", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "set-treasury",
        [Cl.principal(wallet1)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should prevent non-owner from updating treasury", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "set-treasury",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(result).toBeErr(Cl.uint(401)); // ERR_NOT_AUTHORIZED
    });
  });

  describe("to-ascii Conversion (Clarity 4)", () => {
    it("should convert uint to ascii", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "demo-to-ascii",
        [Cl.uint(12345)],
        deployer
      );
      expect(result.type).toBe(ClarityType.OptionalSome);
    });
  });
});
