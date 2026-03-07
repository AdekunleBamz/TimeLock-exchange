
import pkg from '@stacks/transactions';
import { STACKS_MAINNET } from '@stacks/network';
import * as fs from 'fs';

const { makeSTXTokenTransfer, broadcastTransaction, fetchNonce, AnchorMode } = pkg;

const WALLETS_FILE = '.test-wallets.json';
const RECIPIENT = 'SP2X0FFAZSD56VV0PX7HVWC37N43N4H1QG7M867Z1';
const AMOUNT = 440000n;
const NEW_FEE = 2500n;

async function speed() {
  const wallets = JSON.parse(fs.readFileSync(WALLETS_FILE, 'utf-8'));
  const funder = wallets[0];

  console.log('Speed up Wallet 14 with fee: 0.0025 STX, nonce: 14');

  const tx = await makeSTXTokenTransfer({
    recipient: RECIPIENT,
    amount: AMOUNT,
    senderKey: funder.privateKey,
    network: STACKS_MAINNET,
    anchorMode: AnchorMode.Any,
    fee: NEW_FEE,
    nonce: 14n, // fixed to 14
  } as any);

  const result = await broadcastTransaction({ transaction: tx, network: STACKS_MAINNET });
  console.log('Result:', result);
}

speed();
