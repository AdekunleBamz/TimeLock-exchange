/**
 * Check STX and TLX Balances for All Wallets
 */

import * as fs from "fs";

const DEPLOYER = "SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT";
const TOKEN_CONTRACT = "timelock-token";
const TOKEN_ADDRESS = "SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT";

interface Wallet { id: number; privateKey: string; address: string; label: string; }

async function getStxBalance(address: string): Promise<string> {
  try {
    const res = await fetch(`https://api.mainnet.hiro.so/v2/accounts/${address}?proof=0`);
    const data = await res.json();
    const stx = parseInt(data.balance || "0", 16) / 1000000;
    return stx.toFixed(6) + " STX";
  } catch (e) { return "Error"; }
}

async function getTokenBalance(address: string): Promise<string> {
  try {
    // Use the accounts endpoint with include_balances
    const res = await fetch(`https://api.mainnet.hiro.so/v2/accounts/${address}?include_balances=true`);
    const data = await res.json();

    // Parse the fungible tokens from balance_proof or try direct contract call
    const ft_balances = data.ft_balances || {};

    if (ft_balances && ft_balances[`${TOKEN_ADDRESS}.${TOKEN_CONTRACT}`]) {
      const balance = parseInt(ft_balances[`${TOKEN_ADDRESS}.${TOKEN_CONTRACT}`].balance || "0", 10) / 1000000;
      return balance.toFixed(6) + " TLX";
    }

    // Fallback: try direct contract call
    return await getTokenBalanceDirect(address);
  } catch (e) { return "Error"; }
}

async function getTokenBalanceDirect(address: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.mainnet.hiro.so/v2/contracts/call-read/SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT/${TOKEN_CONTRACT}/get-balance?sender=${address}&proof=0`,
      { method: "POST", body: JSON.stringify({ arguments: [`\\"${address}\\"`] }) }
    );
    const data = await res.json();
    if (data.result && data.result.ok) {
      const balance = parseInt(data.result.value, 16) / 1000000;
      return balance.toFixed(6) + " TLX";
    }
    return "0.000000 TLX";
  } catch (e) { return "Error"; }
}

async function main() {
  const wallets: Wallet[] = JSON.parse(fs.readFileSync(".test-wallets.json", "utf-8"));

  console.log("=".repeat(75));
  console.log("  Wallet Balances (STX & TLX)");
  console.log("=".repeat(75) + "\n");

  console.log("#  Address                  STX Balance      TLX Balance");
  console.log("-".repeat(75));

  // Deployer
  const dStx = await getStxBalance(DEPLOYER);
  const dTlx = await getTokenBalance(DEPLOYER);
  console.log(`D  ${DEPLOYER}  ${dStx.padEnd(15)}  ${dTlx}`);

  // Test wallets
  for (const w of wallets.slice(1, 15)) {
    const stx = await getStxBalance(w.address);
    const tlx = await getTokenBalance(w.address);
    console.log(`${w.id.toString().padEnd(2)}  ${w.address}  ${stx.padEnd(15)}  ${tlx}`);
  }

  console.log("\n" + "=".repeat(75) + "\n");
}

main().catch(console.error);
