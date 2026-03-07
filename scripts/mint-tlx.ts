/**
 * Mint TLX to Test Wallets
 * Uses clarinet to read mnemonic from settings/Mainnet.toml
 */

import * as fs from "fs";
import { execSync } from "child_process";

const SETTINGS_FILE = "settings/Mainnet.toml";
const DEPLOYER = "SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT";
const TOKEN_CONTRACT = "timelock-token";

interface Wallet { id: number; privateKey: string; address: string; label: string; }

function getMnemonic(): string {
  const content = fs.readFileSync(SETTINGS_FILE, "utf-8");
  const match = content.match(/mnemonic\s*=\s*"([^"]+)"/);
  if (!match) throw new Error("Mnemonic not found");
  return match[1];
}

async function main() {
  const wallets: Wallet[] = JSON.parse(fs.readFileSync(".test-wallets.json", "utf-8"));

  console.log("=".repeat(70));
  console.log("  Mint TLX to Test Wallets");
  console.log("=".repeat(70) + "\n");

  console.log("Deployer:", DEPLOYER);
  console.log("Contract:", TOKEN_CONTRACT + "\n");

  const mnemonic = getMnemonic();
  console.log("Mnemonic loaded from settings/Mainnet.toml\n");

  // Step 1: Initialize Rewards Pool
  console.log("Step 1: Initialize Rewards Pool (100M TLX)");
  console.log("Run: clarinet contracts call fn initialize-rewards-pool --mainnet --mnemonic \"...\"");
  console.log("(Do this manually)\n");

  // Step 2: Transfer to each wallet
  console.log("Step 2: Transfer 10,000 TLX to each test wallet\n");

  const testWallets = wallets.slice(1, 15);
  const amount = 10000;

  for (let i = 0; i < testWallets.length; i++) {
    const w = testWallets[i];
    console.log(`[${i + 1}/${testWallets.length}] ${w.address}`);

    // Generate command
    const cmd = `clarinet contracts call \\` +
      `--contract-name ${TOKEN_CONTRACT} \\` +
      `--function-name transfer \\` +
      `--function-args "uint ${amount}000000, principal ${DEPLOYER}, principal ${w.address}, none" \\` +
      `--mainnet \\` +
      `--mnemonic "${mnemonic}" \\` +
      `--broadcast`;

    console.log(`  ${cmd}\n`);
  }

  console.log("=".repeat(70) + "\n");
  console.log("NOTE: Run these commands manually or use a different approach.\n");
}

main().catch(console.error);
