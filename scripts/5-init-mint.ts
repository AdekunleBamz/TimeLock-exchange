/**
 * Initialize Rewards Pool & Mint TLX to Test Wallets
 * Uses the newly deployed timelock-token contract
 */

import pkg from "@stacks/transactions";
import { STACKS_MAINNET } from "@stacks/network";
import * as fs from "fs";

const { makeContractCall, broadcastTransaction, fetchNonce, uintCV, principalCV, noneCV, PostConditionMode } = pkg;

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

async function sendCall(fn: string, args: any[], nonce: bigint): Promise<any> {
  const tx = await makeContractCall({
    contractAddress: DEPLOYER,
    contractName: TIMELOCK_TOKEN,
    functionName: fn,
    functionArgs: args,
    senderKey: DEPLOYER_KEY,
    network: STACKS_MAINNET,
    fee: 2000n,
    nonce,
    postConditionMode: PostConditionMode.Allow
  } as any);

  return await broadcastTransaction({ transaction: tx, network: STACKS_MAINNET });
}

async function main() {
  const WALLETS_FILE = ".test-wallets.json";
  if (!fs.existsSync(WALLETS_FILE)) {
    console.error("Run step 1 first: npx ts-node scripts/1-generate-wallets.ts");
    process.exit(1);
  }

  const wallets: TestWallet[] = JSON.parse(fs.readFileSync(WALLETS_FILE, "utf-8"));

  console.log("====================================================");
  console.log("  Initialize TLX & Mint to Wallets");
  console.log("====================================================\n");

  console.log("Deployer:", DEPLOYER);
  console.log("Contract:", TIMELOCK_TOKEN + "\n");

  // Step 1: Initialize rewards pool (100M TLX to deployer)
  console.log("Step 1: Initialize Rewards Pool (100M TLX)\n");

  const initNonce = await getNonce(DEPLOYER);
  console.log("Nonce:", initNonce);

  const initResult = await sendCall("initialize-rewards-pool", [], initNonce) as any;

  if (typeof initResult === "string") {
    console.log("✅ Initialized! TX:", initResult.slice(0, 24) + "\n");
  } else if (initResult?.txid) {
    console.log("✅ Initialized! TX:", initResult.txid.slice(0, 24) + "\n");
  } else {
    console.log("Result:", JSON.stringify(initResult) + "\n");
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

    const result = await sendCall("transfer", [
      uintCV(TLX_AMOUNT),
      principalCV(DEPLOYER),
      principalCV(w.address),
      noneCV()
    ], nonce) as any;

    if (typeof result === "string") {
      console.log("  TX:", result.slice(0, 20) + "\n");
    } else if (result?.txid) {
      console.log("  TX:", result.txid.slice(0, 20) + "\n");
    } else {
      console.log("  Failed:", JSON.stringify(result) + "\n");
    }

    await sleep(DELAY_MS);
  }

  console.log("====================================================");
  console.log("  Done! TLX initialized and distributed.");
  console.log("====================================================\n");
}

main().catch(console.error);
