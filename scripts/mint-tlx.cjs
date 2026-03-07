#!/usr/bin/env node
/**
 * Mint TLX to Test Wallets
 */

const { makeContractCall, broadcastTransaction, fetchNonce, uintCV, principalCV, noneCV, PostConditionMode } = require("@stacks/transactions");
const { STACKS_MAINNET } = require("@stacks/network");
const { generateWallet } = require("@stacks/wallet-sdk");
const fs = require("fs");

const SETTINGS_FILE = "settings/Mainnet.toml";
const DEPLOYER = "SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT";
const TOKEN_CONTRACT = "timelock-token";
const DELAY_MS = 3000;

async function getDeployerWallet() {
  const content = fs.readFileSync(SETTINGS_FILE, "utf-8");
  const match = content.match(/mnemonic\s*=\s*"([^"]+)"/);
  if (!match) throw new Error("Mnemonic not found");

  const mnemonic = match[1];
  const wallet = await generateWallet({ secretKey: mnemonic });
  const account = wallet.accounts[0];

  return {
    privateKey: account.stxPrivateKey,
    address: account.stxAddress
  };
}

async function getNonce(address) {
  try {
    const info = await fetchNonce({ address, network: STACKS_MAINNET });
    // Use lastExecutedTxNonce if available, otherwise use possibleNextNonce
    if (info.lastExecutedTxNonce !== undefined && info.lastExecutedTxNonce !== null) {
      return BigInt(info.lastExecutedTxNonce) + 1n;
    }
    return BigInt(info.possibleNextNonce);
  } catch (e) {
    console.log("Nonce fetch error:", e.message);
    return 118n; // Fallback to known nonce
  }
}

async function sendTx(fn, args, nonce, fee = 2000n) {
  const wallet = await getDeployerWallet();

  const tx = await makeContractCall({
    contractAddress: DEPLOYER,
    contractName: TOKEN_CONTRACT,
    functionName: fn,
    functionArgs: args,
    senderKey: wallet.privateKey,
    network: STACKS_MAINNET,
    fee,
    nonce,
    postConditionMode: PostConditionMode.Allow
  });

  return await broadcastTransaction({ transaction: tx, network: STACKS_MAINNET });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const wallets = JSON.parse(fs.readFileSync(".test-wallets.json", "utf-8"));

  console.log("=".repeat(70));
  console.log("  Mint TLX to Test Wallets");
  console.log("=".repeat(70) + "\n");

  console.log("Deployer:", DEPLOYER);
  console.log("Contract:", TOKEN_CONTRACT + "\n");

  // Step 1: Initialize Rewards Pool
  console.log("Step 1: Initialize Rewards Pool (100M TLX)");
  const initNonce = await getNonce(DEPLOYER);
  console.log("Nonce:", initNonce);

  const initResult = await sendTx("initialize-rewards-pool", [], initNonce, 10000n);
  console.log("Result:", typeof initResult === "string" ? initResult.slice(0, 30) : JSON.stringify(initResult) + "\n");

  await sleep(8000);

  // Step 2: Transfer to each wallet
  console.log("Step 2: Transfer 10,000 TLX to each test wallet\n");

  const amount = 10000000000n;
  const testWallets = wallets.slice(1, 16);

  for (let i = 0; i < testWallets.length; i++) {
    const w = testWallets[i];
    const nonce = await getNonce(DEPLOYER);

    console.log(`[${i + 1}/${testWallets.length}] ${w.address.slice(0, 14)}...`);

    const result = await sendTx("transfer", [
      uintCV(amount),
      principalCV(DEPLOYER),
      principalCV(w.address),
      noneCV()
    ], nonce);

    console.log("  TX:", typeof result === "string" ? result.slice(0, 20) : "Error");
    await sleep(DELAY_MS);
  }

  console.log("\n" + "=".repeat(70));
  console.log("  Done! Check balances with: bash scripts/check-balances.sh");
  console.log("=".repeat(70) + "\n");
}

main().catch(console.error);
