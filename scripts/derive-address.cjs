/**
 * Derive address from private key
 */

const { getAddressFromPrivateKey } = require("@stacks/transactions");
const { STACKS_MAINNET } = require("@stacks/network");

const PRIVATE_KEY = "36d230b26febd3291768ada53aee49d8e395d3ef3c0b8598e4263b44338cf24a01";

const address = getAddressFromPrivateKey(PRIVATE_KEY, STACKS_MAINNET);
console.log("Private Key:", PRIVATE_KEY);
console.log("Expected: SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT");
console.log("Address:", address);
