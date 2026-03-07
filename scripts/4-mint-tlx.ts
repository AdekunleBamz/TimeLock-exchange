/**
 * Step 4: Mint and Distribute TimeLock Token (TLX)
 * Uses deployer mnemonic from settings/Mainnet.toml
 */

import pkg from "@stacks/transactions";
import { STACKS_MAINNET } from "@stacks/network";
import * as fs from "fs";

const { makeContractCall, broadcastTransaction, fetchNonce, uintCV, principalCV, noneCV, PostConditionMode } = pkg;

const SETTINGS_FILE = "settings/Mainnet.toml";
const DEPLOYER = "SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT";
const DEPLOYER_KEY = "36d230b26febd3291768ada53aee49d8e395d3ef3c0b8598e4263b44338cf24a01";
const TIMELOCK_TOKEN = "timelock-token";
const DELAY_MS = 3000;

interface TestWallet { id: number; privateKey: string; address: string; label: string; }

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function getNonce(address: string): Promise<bigint> {
  try {
    const info = await fetchNonce({ address, network: STACKS_MAINNET }) as any;
    return info.lastExecutedTxNonce !== undefined ? BigInt(info.lastExecutedTxNonce) + 1n : BigInt(info.possibleNextNonce);
  } catch { return 0n; }
}

async function main() {
  const WALLETS_FILE = ".test-wallets.json";
  if (!fs.existsSync(WALLETS_FILE)) {
    console.error("Run step 1 first: npx ts-node scripts/1-generate-wallets.ts");
    process.exit(1);
  }

  const wallets: TestWallet[] = JSON.parse(fs.readFileSync(WALLETS_FILE, "utf-8"));

  console.log("====================================================");
  console.log("  Mint & Distribute TimeLock Token (TLX)");
  console.log("====================================================\n");

  console.log("Deployer:", DEPLOYER);
  console.log("Balance Check...\n");

  // Step 1: Initialize rewards pool
  console.log("Step 1: Initialize Rewards Pool (100M TLX)\n");
  const initNonce = await getNonce(DEPLOYER);
  console.log("Nonce:", initNonce);

  try {
    const initTx = await makeContractCall({
      contractAddress: DEPLOYER,
      contractName: TIMELOCK_TOKEN,
      functionName: "initialize-rewards-pool",
      functionArgs: [],
      senderKey: DEPLOYER_KEY,
      network: STACKS_MAINNET,
      fee: 2000n,
      nonce: initNonce,
      postConditionMode: PostConditionMode.Allow
    } as any);

    const result = await broadcastTransaction({ transaction: initTx, network: STACKS_MAINNET }) as any;

    if (typeof result === "string") {
      console.log("Initialized! TX:", result.slice(0, 24) + "\n");
    } else if (result?.txid) {
      console.log("Initialized! TX:", result.txid.slice(0, 24) + "\n");
    } else {
      console.log("Result:", JSON.stringify(result) + "\n");
    }
  } catch (e: any) {
    console.log("Error:", e.message + "\n");
  }

  // Wait for confirmation
  console.log("Waiting 5s for confirmation...\n");
  await sleep(5000);

  // Step 2: Transfer TLX to test wallets
  console.log("Step 2: Transfer TLX to Test Wallets\n");

  const testWallets = wallets.slice(1, 15);
  const TLX_AMOUNT = 10000n;

  for (let i = 0; i < testWallets.length; i++) {
    const w = testWallets[i];
    const nonce = await getNonce(DEPLOYER);

    console.log("[" + (i + 1) + "/" + testWallets.length + "] Transfer " + TLX_AMOUNT + " TLX -> " + w.address.slice(0, 12));

    const transferArgs = [
      uintCV(TLX_AMOUNT),
      principalCV(DEPLOYER),
      principalCV(w.address),
      noneCV()
    ];

    try {
      const tx = await makeContractCall({
        contractAddress: DEPLOYER,
        contractName: TIMELOCK_TOKEN,
        functionName: "transfer",
        functionArgs: transferArgs,
        senderKey: DEPLOYER_KEY,
        network: STACKS_MAINNET,
        fee: 2000n,
        nonce,
        postConditionMode: PostConditionMode.Allow
      } as any);

      const result = await broadcastTransaction({ transaction: tx, network: STACKS_MAINNET }) as any;

      if (typeof result === "string") {
        console.log("  TX:", result.slice(0, 20) + "\n");
      } else if (result?.txid) {
        console.log("  TX:", result.txid.slice(0, 20) + "\n");
      } else {
        console.log("  Failed:", JSON.stringify(result) + "\n");
      }
    } catch (e: any) {
      console.log("  Error:", e.message + "\n");
    }

    await sleep(DELAY_MS);
  }

  console.log("====================================================");
  console.log("  Done! TLX minted and distributed.");
  console.log("====================================================\n");
}

main().catch(console.error);
