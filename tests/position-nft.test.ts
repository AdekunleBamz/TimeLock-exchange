
import { describe, expect, it } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const CONTRACT_NAME = "position-nft";

describe("Position NFT Contract Tests", () => {
  describe("Basic Setup", () => {
    it("ensures simnet is well initialized", () => {
      expect(simnet.blockHeight).toBeDefined();
    });

    it("should start with zero tokens", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-last-token-id",
        [],
        deployer
      );
      expect(result).toBeOk(Cl.uint(0));
    });
  });

  describe("NFT Minting", () => {
    it("should mint a basic NFT", () => {
      const { result, events } = simnet.callPublicFn(
        CONTRACT_NAME,
        "mint",
        [Cl.principal(wallet1)],
        deployer
      );

      expect(result).toBeOk(Cl.uint(1));
      expect(events).toHaveLength(1); // NFT mint event
    });

    it("should increment token ID on each mint", () => {
      simnet.callPublicFn(
        CONTRACT_NAME,
        "mint",
        [Cl.principal(wallet1)],
        deployer
      );

      simnet.callPublicFn(
        CONTRACT_NAME,
        "mint",
        [Cl.principal(wallet2)],
        deployer
      );

      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-last-token-id",
        [],
        deployer
      );
      expect(result).toBeOk(Cl.uint(2));
    });

    it("should mint with full metadata", () => {
      const amount = 50_000_000; // 50 STX
      const assetType = "STX";
      const lockDuration = 30 * 86400; // 30 days
      const unlockTime = Math.floor(Date.now() / 1000) + lockDuration;
      const tier = 2;

      const { result, events } = simnet.callPublicFn(
        CONTRACT_NAME,
        "mint-with-metadata",
        [
          Cl.principal(wallet1),
          Cl.uint(amount),
          Cl.stringAscii(assetType),
          Cl.uint(lockDuration),
          Cl.uint(unlockTime),
          Cl.uint(tier)
        ],
        deployer
      );

      expect(result).toBeOk(Cl.uint(1));
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe("NFT Ownership", () => {
    it("should return correct owner", () => {
      simnet.callPublicFn(
        CONTRACT_NAME,
        "mint",
        [Cl.principal(wallet1)],
        deployer
      );

      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-owner",
        [Cl.uint(1)],
        deployer
      );

      expect(result).toBeOk(Cl.some(Cl.principal(wallet1)));
    });

    it("should return none for non-existent token", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-owner",
        [Cl.uint(999)],
        deployer
      );

      expect(result).toBeOk(Cl.none());
    });
  });

  describe("NFT Transfers", () => {
    it("should allow owner to transfer", () => {
      // Mint to wallet1
      simnet.callPublicFn(
        CONTRACT_NAME,
        "mint-with-metadata",
        [
          Cl.principal(wallet1),
          Cl.uint(10_000_000),
          Cl.stringAscii("STX"),
          Cl.uint(86400),
          Cl.uint(Math.floor(Date.now() / 1000) + 86400),
          Cl.uint(1)
        ],
        deployer
      );

      // Transfer from wallet1 to wallet2
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "transfer",
        [Cl.uint(1), Cl.principal(wallet1), Cl.principal(wallet2)],
        wallet1
      );

      expect(result).toBeOk(Cl.bool(true));

      // Verify new owner
      const { result: ownerResult } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-owner",
        [Cl.uint(1)],
        deployer
      );
      expect(ownerResult).toBeOk(Cl.some(Cl.principal(wallet2)));
    });

    it("should reject transfer from non-owner", () => {
      simnet.callPublicFn(
        CONTRACT_NAME,
        "mint",
        [Cl.principal(wallet1)],
        deployer
      );

      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "transfer",
        [Cl.uint(1), Cl.principal(wallet1), Cl.principal(wallet2)],
        wallet2 // wallet2 is not the owner
      );

      expect(result).toBeErr(Cl.uint(401)); // ERR_NOT_AUTHORIZED
    });

    it("should track transfer count in metadata", () => {
      simnet.callPublicFn(
        CONTRACT_NAME,
        "mint-with-metadata",
        [
          Cl.principal(wallet1),
          Cl.uint(10_000_000),
          Cl.stringAscii("STX"),
          Cl.uint(86400),
          Cl.uint(Math.floor(Date.now() / 1000) + 86400),
          Cl.uint(1)
        ],
        deployer
      );

      // Get initial metadata
      const { result: initialMeta } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-position-metadata",
        [Cl.uint(1)],
        deployer
      );
      expect(initialMeta.type).toBe(ClarityType.OptionalSome);

      // Transfer
      simnet.callPublicFn(
        CONTRACT_NAME,
        "transfer",
        [Cl.uint(1), Cl.principal(wallet1), Cl.principal(wallet2)],
        wallet1
      );

      // Check transfer count incremented
      const { result: afterMeta } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-position-metadata",
        [Cl.uint(1)],
        deployer
      );
      expect(afterMeta.type).toBe(ClarityType.OptionalSome);
    });
  });

  describe("NFT Burning", () => {
    it("should allow owner to burn", () => {
      simnet.callPublicFn(
        CONTRACT_NAME,
        "mint",
        [Cl.principal(wallet1)],
        deployer
      );

      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "burn",
        [Cl.uint(1)],
        wallet1
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject burn from non-owner", () => {
      simnet.callPublicFn(
        CONTRACT_NAME,
        "mint",
        [Cl.principal(wallet1)],
        deployer
      );

      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "burn",
        [Cl.uint(1)],
        wallet2
      );

      expect(result).toBeErr(Cl.uint(401)); // ERR_NOT_AUTHORIZED
    });
  });

  describe("Metadata Functions", () => {
    it("should return full position info", () => {
      simnet.callPublicFn(
        CONTRACT_NAME,
        "mint-with-metadata",
        [
          Cl.principal(wallet1),
          Cl.uint(100_000_000),
          Cl.stringAscii("STX"),
          Cl.uint(30 * 86400),
          Cl.uint(Math.floor(Date.now() / 1000) + 30 * 86400),
          Cl.uint(3)
        ],
        deployer
      );

      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-full-position-info",
        [Cl.uint(1)],
        deployer
      );

      expect(result.type).toBe(ClarityType.OptionalSome);
    });

    it("should check if position is unlockable", () => {
      simnet.callPublicFn(
        CONTRACT_NAME,
        "mint-with-metadata",
        [
          Cl.principal(wallet1),
          Cl.uint(10_000_000),
          Cl.stringAscii("STX"),
          Cl.uint(86400),
          Cl.uint(Math.floor(Date.now() / 1000) + 86400),
          Cl.uint(1)
        ],
        deployer
      );

      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "is-position-unlockable",
        [Cl.uint(1)],
        deployer
      );

      expect(result).toBeBool(false); // Not yet unlockable
    });

    it("should return time until unlock", () => {
      simnet.callPublicFn(
        CONTRACT_NAME,
        "mint-with-metadata",
        [
          Cl.principal(wallet1),
          Cl.uint(10_000_000),
          Cl.stringAscii("STX"),
          Cl.uint(86400),
          Cl.uint(Math.floor(Date.now() / 1000) + 86400),
          Cl.uint(1)
        ],
        deployer
      );

      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-time-until-unlock",
        [Cl.uint(1)],
        deployer
      );

      expect(result.type).toBe(ClarityType.UInt);
    });
  });

  describe("Token URI", () => {
    it("should return token URI", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-token-uri",
        [Cl.uint(1)],
        deployer
      );

      expect(result).toBeOk(Cl.some(Cl.stringAscii("https://timelock-exchange.com/metadata/")));
    });

    it("should allow admin to update URI", () => {
      const newUri = "https://new-uri.com/metadata/";
      
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "set-token-uri",
        [Cl.stringAscii(newUri)],
        deployer
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject URI update from non-admin", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "set-token-uri",
        [Cl.stringAscii("https://malicious.com/")],
        wallet1
      );

      expect(result).toBeErr(Cl.uint(401));
    });
  });
});
