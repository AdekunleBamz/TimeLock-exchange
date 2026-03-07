/**
 * Deploy TimeLock Token Contract - Fixed Version
 */

import pkg from "@stacks/transactions";
import { STACKS_MAINNET } from "@stacks/network";
import * as fs from "fs";

const { makeContractDeploy, broadcastTransaction, fetchNonce, PostConditionMode } = pkg;

const DEPLOYER = "SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT";
const DEPLOYER_KEY = "36d230b26febd3291768ada53aee49d8e395d3ef3c0b8598e4263b44338cf24a01";
const CONTRACT_PATH = "contracts/timelock-token.clar";
const CONTRACT_NAME = "timelock-token";

async function main() {
  console.log("====================================================");
  console.log("  Deploy TimeLock Token - FIXED");
  console.log("====================================================\n");

  // Read contract source
  const contractSource = fs.readFileSync(CONTRACT_PATH, "utf-8");
  console.log("Contract:", CONTRACT_NAME);
  console.log("Size:", contractSource.length, "bytes\n");

  // Using nonce 118 (117 last nonce + 1)
  const nonce = 118n;
  console.log("Using nonce:", nonce);

  console.log("\nBuilding transaction (fee: 0.015 STX)...\n");

  try {
    const tx = await makeContractDeploy({
      contractName: CONTRACT_NAME,
      codeBody: contractSource,
      senderKey: DEPLOYER_KEY,
      network: STACKS_MAINNET,
      fee: 15000n,  // 0.015 STX - higher fee
      nonce,
      postConditionMode: PostConditionMode.Allow
    });

    console.log("Transaction built. Broadcasting...\n");

    const result = await broadcastTransaction({ transaction: tx, network: STACKS_MAINNET }) as any;

    if (typeof result === "string") {
      console.log("✅ SUCCESS!");
      console.log("TX ID:", result);
      console.log("\nhttps://explorer.hiro.so/txid/" + result);
    } else if (result?.txid) {
      console.log("✅ SUCCESS!");
      console.log("TX ID:", result.txid);
      console.log("\nhttps://explorer.hiro.so/txid/" + result.txid);
    } else {
      console.log("❌ FAILED:", JSON.stringify(result, null, 2));
    }
  } catch (e: any) {
    console.log("❌ ERROR:", e.message);
  }

  console.log("\n====================================================\n");
}

main().catch(console.error);
