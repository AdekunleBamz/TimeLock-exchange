/**
 * Get deployer private key from mnemonic
 */

const { generateWallet } = require("@stacks/wallet-sdk");
const { StacksMainnet } = require("@stacks/network");

async function main() {
  const mnemonic = "usage upon hawk topic waste mobile stairs daughter hobby weekend answer illness";
  
  console.log("Generating wallet from mnemonic...\n");
  
  const wallet = await generateWallet({
    secretKey: mnemonic,
    password: "password", // default password
  });
  
  const account = wallet.accounts[0];
  
  console.log("Account 0:");
  console.log("  STX Address:", account.stxAddress);
  console.log("  Private Key:", account.stxPrivateKey);
}

main().catch(console.error);
