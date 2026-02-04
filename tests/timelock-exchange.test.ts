
import { describe, expect, it, beforeEach } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const CONTRACT_NAME = "timelock-exchange";

describe("TimeLock Exchange Contract Tests", () => {
  describe("Basic Setup", () => {
    it("ensures simnet is well initialized", () => {
      expect(simnet.blockHeight).toBeDefined();
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

    it("should start with zero positions", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-position-count",
        [],
        deployer
      );
      expect(result).toBeUint(0);
    });

    it("should start with zero total locked value", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-total-locked-value",
        [],
        deployer
      );
      expect(result).toBeUint(0);
    });

    it("should not be paused initially", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "is-contract-paused",
        [],
        deployer
      );
      expect(result).toBeBool(false);
    });
  });

  describe("Position Creation", () => {
    it("should create a position with valid parameters", () => {
      const amount = 10_000_000; // 10 STX
      const duration = 86400 * 7; // 7 days

      const { result, events } = simnet.callPublicFn(
        CONTRACT_NAME,
        "create-position",
        [Cl.uint(amount), Cl.uint(duration)],
        wallet1
      );

      expect(result).toBeOk(Cl.uint(1)); // First position ID
      expect(events).toHaveLength(2); // STX transfer + print event
    });

    it("should reject position with amount below minimum", () => {
      const amount = 100_000; // 0.1 STX (below 1 STX minimum)
      const duration = 86400 * 7;

      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "create-position",
        [Cl.uint(amount), Cl.uint(duration)],
        wallet1
      );

      expect(result).toBeErr(Cl.uint(412)); // ERR_INVALID_AMOUNT
    });

    it("should reject position with duration below minimum", () => {
      const amount = 10_000_000;
      const duration = 3600; // 1 hour (below 1 day minimum)

      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "create-position",
        [Cl.uint(amount), Cl.uint(duration)],
        wallet1
      );

      expect(result).toBeErr(Cl.uint(413)); // ERR_INVALID_DURATION
    });

    it("should reject position with duration above maximum", () => {
      const amount = 10_000_000;
      const duration = 86400 * 400; // 400 days (above 365 day max)

      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "create-position",
        [Cl.uint(amount), Cl.uint(duration)],
        wallet1
      );

      expect(result).toBeErr(Cl.uint(413)); // ERR_INVALID_DURATION
    });

    it("should increment position counter", () => {
      const amount = 10_000_000;
      const duration = 86400 * 7;

      // Create first position
      simnet.callPublicFn(
        CONTRACT_NAME,
        "create-position",
        [Cl.uint(amount), Cl.uint(duration)],
        wallet1
      );

      const { result: count1 } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-position-count",
        [],
        deployer
      );
      expect(count1).toBeUint(1);

      // Create second position
      simnet.callPublicFn(
        CONTRACT_NAME,
        "create-position",
        [Cl.uint(amount), Cl.uint(duration)],
        wallet2
      );

      const { result: count2 } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-position-count",
        [],
        deployer
      );
      expect(count2).toBeUint(2);
    });

    it("should update total locked value", () => {
      const amount = 50_000_000; // 50 STX
      const duration = 86400 * 30;

      simnet.callPublicFn(
        CONTRACT_NAME,
        "create-position",
        [Cl.uint(amount), Cl.uint(duration)],
        wallet1
      );

      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-total-locked-value",
        [],
        deployer
      );
      expect(result).toBeUint(amount);
    });
  });

  describe("Position Retrieval", () => {
    it("should return position details", () => {
      const amount = 25_000_000;
      const duration = 86400 * 14;

      simnet.callPublicFn(
        CONTRACT_NAME,
        "create-position",
        [Cl.uint(amount), Cl.uint(duration)],
        wallet1
      );

      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-position",
        [Cl.uint(1)],
        deployer
      );

      expect(result.type).toBe(ClarityType.OptionalSome);
    });

    it("should return none for non-existent position", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-position",
        [Cl.uint(999)],
        deployer
      );

      expect(result.type).toBe(ClarityType.OptionalNone);
    });
  });

  describe("Emergency Controls", () => {
    it("should allow owner to pause contract", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pause-contract",
        [Cl.stringAscii("Security maintenance")],
        deployer
      );

      expect(result).toBeOk(Cl.bool(true));

      const { result: isPaused } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "is-contract-paused",
        [],
        deployer
      );
      expect(isPaused).toBeBool(true);
    });

    it("should prevent non-admin from pausing", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pause-contract",
        [Cl.stringAscii("Unauthorized pause")],
        wallet1
      );

      expect(result).toBeErr(Cl.uint(401)); // ERR_NOT_AUTHORIZED
    });

    it("should allow owner to unpause contract", () => {
      // First pause
      simnet.callPublicFn(
        CONTRACT_NAME,
        "pause-contract",
        [Cl.stringAscii("Test pause")],
        deployer
      );

      // Then unpause
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "unpause-contract",
        [],
        deployer
      );

      expect(result).toBeOk(Cl.bool(true));

      const { result: isPaused } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "is-contract-paused",
        [],
        deployer
      );
      expect(isPaused).toBeBool(false);
    });

    it("should block operations when paused", () => {
      // Pause contract
      simnet.callPublicFn(
        CONTRACT_NAME,
        "pause-contract",
        [Cl.stringAscii("Maintenance")],
        deployer
      );

      // Try to create position
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "create-position",
        [Cl.uint(10_000_000), Cl.uint(86400 * 7)],
        wallet1
      );

      expect(result).toBeErr(Cl.uint(414)); // ERR_CONTRACT_PAUSED
    });
  });

  describe("Passkey Registration", () => {
    it("should register a passkey", () => {
      const publicKey = new Uint8Array(33).fill(1);

      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "register-passkey",
        [Cl.buffer(publicKey)],
        wallet1
      );

      expect(result).toBeOk(Cl.uint(0)); // First passkey index
    });

    it("should track passkey count per user", () => {
      const publicKey1 = new Uint8Array(33).fill(1);
      const publicKey2 = new Uint8Array(33).fill(2);

      simnet.callPublicFn(
        CONTRACT_NAME,
        "register-passkey",
        [Cl.buffer(publicKey1)],
        wallet1
      );

      simnet.callPublicFn(
        CONTRACT_NAME,
        "register-passkey",
        [Cl.buffer(publicKey2)],
        wallet1
      );

      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-user-passkey-count",
        [Cl.principal(wallet1)],
        deployer
      );

      expect(result).toBeUint(2);
    });

    it("should limit passkeys to 5 per user", () => {
      // Register 5 passkeys
      for (let i = 0; i < 5; i++) {
        const publicKey = new Uint8Array(33).fill(i);
        simnet.callPublicFn(
          CONTRACT_NAME,
          "register-passkey",
          [Cl.buffer(publicKey)],
          wallet1
        );
      }

      // Try to register 6th passkey
      const publicKey6 = new Uint8Array(33).fill(6);
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "register-passkey",
        [Cl.buffer(publicKey6)],
        wallet1
      );

      expect(result).toBeErr(Cl.uint(409)); // ERR_ALREADY_EXISTS
    });
  });

  describe("Passkey Revocation", () => {
    it("should revoke a passkey", () => {
      const publicKey = new Uint8Array(33).fill(1);

      simnet.callPublicFn(
        CONTRACT_NAME,
        "register-passkey",
        [Cl.buffer(publicKey)],
        wallet1
      );

      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "revoke-passkey",
        [Cl.uint(0)],
        wallet1
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should check if user has active passkey", () => {
      const publicKey = new Uint8Array(33).fill(1);

      simnet.callPublicFn(
        CONTRACT_NAME,
        "register-passkey",
        [Cl.buffer(publicKey)],
        wallet1
      );

      const { result: hasActive } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "has-active-passkey",
        [Cl.principal(wallet1)],
        deployer
      );

      expect(hasActive).toBeBool(true);

      // Revoke it
      simnet.callPublicFn(
        CONTRACT_NAME,
        "revoke-passkey",
        [Cl.uint(0)],
        wallet1
      );

      const { result: hasActiveAfter } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "has-active-passkey",
        [Cl.principal(wallet1)],
        deployer
      );

      expect(hasActiveAfter).toBeBool(false);
    });
  });
});
