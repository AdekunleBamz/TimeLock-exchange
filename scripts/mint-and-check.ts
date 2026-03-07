/**
 * Mint TLX to Test Wallets & Check Balances
 * Uses deployer from settings/Mainnet.toml
 */

import pkg from "@stacks/transactions";
import { STACKS_MAINNET } from "@stacks/network";
import * as fs from "fs";

const { makeContractCall, broadcastTransaction, fetchNonce, uintCV, principalCV, noneCV, PostConditionMode } = pkg;

const DEPLOYER = "SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT";
const TOKEN_CONTRACT = "timelock-token";
const TLX_DECIMALS = 1000000n; // 6 decimals
const DELAY_MS = 2000;

interface Wallet { id: number; privateKey: string; address: string; label: string; }

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function getNonce(address: string): Promise<bigint> {
  try {
    const info = await fetchNonce({ address, network: STACKS_MAINNET }) as any;
    return info.lastExecutedTxNonce !== undefined ? BigInt(info.lastExecutedTxNonce) + 1n : BigInt(info.possibleNextNonce);
  } catch { return 0n; }
}

async function sendTx(fn: string, args: any[], nonce: bigint, fee: bigint = 2000n): Promise<any> {
  const tx = await makeContractCall({
    contractAddress: DEPLOYER,
    contractName: TOKEN_CONTRACT,
    functionName: fn,
    functionArgs: args,
    senderKey: process.env.DEPLOYER_KEY || "",
    network: STACKS_MAINNET,
    fee,
    nonce,
    postConditionMode: PostConditionMode.Allow
  } as any);
  return await broadcastTransaction({ transaction: tx, network: STACKS_MAINNET });
}

async function getStxBalance(address: string): Promise<string> {
  try {
    const res = await fetch(`https://api.mainnet.hiro.so/v2/accounts/${address}?proof=0`);
    const data = await res.json();
    const stx = parseInt(data.balance || "0", 16) / 1000000;
    return stx.toFixed(6) + " STX";
  } catch { return "Error"; }
}

async function getTokenBalance(address: string): Promise<string> {
  try {
    const res = await fetch(`https://api.mainnet.hiro.so/v2/contracts/data_url/SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT/${TOKEN_CONTRACT}/${address}`);
    const data = await res.json();
    const balance = parseInt(data.balance || "0", 10) / Number(TLX_DECIMALS);
    return balance.toFixed(6) + " TLX";
  } catch { return "Error"; }
}

async function main() {
  const wallets: Wallet[] = JSON.parse(fs.readFileSync(".test-wallets.json", "utf-8"));

  console.log("=" .repeat(70));
  console.log("  Mint TLX & Check Balances");
  console.log("=".repeat(70) + "\n");

  console.log("Deployer:", DEPLOYER);
  console.log("Contract:", TOKEN_CONTRACT + "\n");

  // Step 1: Initialize Rewards Pool (100M TLX)
  console.log("Step 1: Initialize Rewards Pool (100,000,000 TLX)");
  const initNonce = await getNonce(DEPLOYER);
  console.log("Nonce:", initNonce);

  const initResult = await sendTx("initialize-rewards-pool", [], initNonce, 5000n) as any;
  console.log("Result:", typeof initResult === "string" ? initResult.slice(0, 24) : JSON.stringify(initResult) + "\n");

  await sleep(5000);

  // Step 2: Mint to Test Wallets
  console.log("Step 2: Mint TLX to Test Wallets (10,000 TLX each)\n");

  const amount = 10000n * TLX_DECIMALS;
  const testWallets = wallets.slice(1, 15);

  for (let i = 0; i < testWallets.length; i++) {
    const w = testWallets[i];
    const nonce = await getNonce(DEPLOYER);

    console.log(`[${i + 1}/${testWallets.length}] ${w.address.slice(0, 14)}...`);

    const result = await sendTx("transfer", [
      uintCV(amount),
      principalCV(DEPLOYER),
      principalCV(w.address),
      noneCV()
    ], nonce) as any;

    console.log("  TX:", typeof result === "string" ? result.slice(0, 20) : "Error");
    await sleep(DELAY_MS);
  }

  console.log("\n" + "=".repeat(70));
  console.log("  Wallet Balances");
  console.log("=".repeat(70) + "\n");

  console.log("#  Address                  STX Balance      TLX Balance");
  console.log("-".repeat(70));

  // Check deployer balance
  const deployerStx = await getStxBalance(DEPLOYER);
  const deployerTlx = await getTokenBalance(DEPLOYER);
  console.log(`0  ${DEPLOYER}  ${deployerStx.padEnd(15)}  ${deployerTlx}`);

  // Check all test wallets
  for (const w of testWallets) {
    const stx = await getStxBalance(w.address);
    const tlx = await getTokenBalance(w.address);
    console.log(`${w.id.toString().padEnd(2)}  ${w.address}  ${stx.padEnd(15)}  ${tlx}`);
  }

  console.log("\n" + "=".repeat(70) + "\n");
}

main().catch(console.error);
