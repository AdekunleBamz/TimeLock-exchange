/**
 * Utility to get deployer wallet from mnemonic in settings/Mainnet.toml
 * Uses @stacks/wallet-sdk which is already installed
 */

import { generateWallet, decryptWallet } from "@stacks/wallet-sdk";
import { STACKS_MAINNET } from "@stacks/network";
import * as fs from "fs";

const SETTINGS_FILE = "settings/Mainnet.toml";

async function getDeployerWallet() {
  // Read mnemonic from settings
  const content = fs.readFileSync(SETTINGS_FILE, "utf-8");
  const match = content.match(/mnemonic\s*=\s*"([^"]+)"/);
  
  if (!match) {
    throw new Error("Mnemonic not found in settings/Mainnet.toml");
  }
  
  const mnemonic = match[1];
  console.log("Mnemonic found:", mnemonic.split(" ").slice(0, 3).join(" ") + " ...\n");
  
  // Generate wallet from mnemonic
  const wallet = await generateWallet({
    secretKey: mnemonic,
    network: STACKS_MAINNET,
  });
  
  const accounts = wallet.accounts;
  if (accounts.length === 0) {
    throw new Error("No accounts found in wallet");
  }
  
  const account = accounts[0];
  const address = account.stxAddress;
  const privateKey = account.stxPrivateKey;
  
  return {
    mnemonic,
    address,
    privateKey,
    wallet
  };
}

// Run if called directly
if (require.main === module) {
  getDeployerWallet()
    .then(w => {
      console.log("Deployer Address:", w.address);
      console.log("Private Key:", w.privateKey.slice(0, 10) + "...");
    })
    .catch(console.error);
}

export { getDeployerWallet };
