/**
 * Step 2: Distribute STX from Wallet 1 to wallets 2-15
 * Run: npx ts-node scripts/2-distribute.ts
 * Prereq: Wallet 1 funded with 6.5 STX
 */

import {
  makeSTXTokenTransfer,
  broadcastTransaction,
  fetchNonce,
  AnchorMode,
} from '@stacks/transactions';
import { STACKS_MAINNET } from '@stacks/network';
import * as fs from 'fs';

const WALLETS_FILE = '.test-wallets.json';
const RESULTS_FILE = '.distribute-results.json';
const API_URL = 'https://api.mainnet.hiro.so';

// Each wallet needs: 0.41 STX deposits + 0.011 gas = ~0.42 STX
// Send 0.44 STX each to have buffer (14 wallets × 0.44 = 6.16 STX)
const AMOUNT_PER_WALLET = 440_000; // 0.44 STX in microSTX
const TX_FEE = 2_000; // 0.002 STX fee for transfers
const DELAY_MS = 5_000; // 5 seconds between transactions

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkBalance(address: string): Promise<number> {
  const res = await fetch(`${API_URL}/v2/accounts/${address}?proof=0`);
  const data = await res.json() as { balance: string };
  return parseInt(data.balance, 16);
}

async function waitForConfirmation(txId: string, maxWait = 600_000): Promise<boolean> {
  const start = Date.now();
  console.log(`    ⏳ Waiting for confirmation...`);

  while (Date.now() - start < maxWait) {
    try {
      const res = await fetch(`${API_URL}/extended/v1/tx/${txId}`);
      const data = await res.json() as { tx_status: string };

      if (data.tx_status === 'success') {
        console.log(`    ✅ Confirmed!`);
        return true;
      }
      if (data.tx_status === 'abort_by_response' || data.tx_status === 'abort_by_post_condition') {
        console.log(`    ❌ Transaction failed: ${data.tx_status}`);
        return false;
      }
    } catch {
      // API error, keep waiting
    }
    await sleep(10_000); // Check every 10 seconds
  }

  console.log(`    ⚠️ Timeout waiting for confirmation`);
  return false;
}

async function distribute(): Promise<void> {
  // Load wallets
  if (!fs.existsSync(WALLETS_FILE)) {
    console.error('❌ Run step 1 first: npx ts-node scripts/1-generate-wallets.ts');
    process.exit(1);
  }

  const wallets = JSON.parse(fs.readFileSync(WALLETS_FILE, 'utf-8'));
  const funder = wallets[0];
  const recipients = wallets.slice(1);

  console.log(`\n💰 Distributing STX from Wallet 1 to ${recipients.length} wallets\n`);
  console.log(`  Funder: ${funder.address}`);

  // Check funder balance
  const balance = await checkBalance(funder.address);
  const balanceSTX = balance / 1_000_000;
  console.log(`  Balance: ${balanceSTX} STX`);

  const totalNeeded = (recipients.length * AMOUNT_PER_WALLET + recipients.length * TX_FEE) / 1_000_000;
  console.log(`  Need: ~${totalNeeded.toFixed(3)} STX`);

  if (balance < recipients.length * (AMOUNT_PER_WALLET + TX_FEE)) {
    console.error(`\n❌ Insufficient balance. Have ${balanceSTX} STX, need ~${totalNeeded} STX`);
    process.exit(1);
  }

  // Get starting nonce
  const nonceInfo = await fetchNonce({ address: funder.address, network: STACKS_MAINNET }) as any;
  let nonceVal = nonceInfo.lastExecutedTxNonce ?? nonceInfo.possibleNextNonce ?? 0;
  let nonce = BigInt(nonceVal) + 1n;

  console.log(`  Starting nonce: ${nonce}\n`);

  const results: Array<{ wallet: number; address: string; txId: string; status: string }> = [];

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    console.log(`  [${i + 1}/${recipients.length}] Sending 0.44 STX → ${recipient.address}`);

    try {
      const tx = await makeSTXTokenTransfer({
        recipient: recipient.address,
        amount: BigInt(AMOUNT_PER_WALLET),
        senderKey: funder.privateKey,
        network: STACKS_MAINNET,
        anchorMode: AnchorMode.Any,
        fee: BigInt(TX_FEE),
        nonce,
      } as any);

      const result = await broadcastTransaction({ transaction: tx, network: STACKS_MAINNET });

      if (typeof result === 'string') {
        // Success - txid returned
        console.log(`    ✅ TX: ${result}`);
        results.push({ wallet: recipient.id, address: recipient.address, txId: result, status: 'broadcast' });
      } else if (result && 'txid' in result) {
        console.log(`    ✅ TX: ${result.txid}`);
        results.push({ wallet: recipient.id, address: recipient.address, txId: result.txid, status: 'broadcast' });
      } else {
        const errMsg = JSON.stringify(result);
        console.log(`    ❌ Failed: ${errMsg}`);
        results.push({ wallet: recipient.id, address: recipient.address, txId: '', status: `error: ${errMsg}` });
      }

      nonce++;
    } catch (err: any) {
      console.log(`    ❌ Error: ${err.message}`);
      results.push({ wallet: recipient.id, address: recipient.address, txId: '', status: `error: ${err.message}` });
    }

    // Rate limit
    if (i < recipients.length - 1) {
      console.log(`    ⏳ Waiting ${DELAY_MS / 1000}s...`);
      await sleep(DELAY_MS);
    }
  }

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`\n📊 Results saved to ${RESULTS_FILE}`);

  const successful = results.filter(r => r.status === 'broadcast').length;
  console.log(`\n✅ Broadcast ${successful}/${recipients.length} transfers`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Wait ~10-15 min for all transfers to confirm`);
  console.log(`   2. Run: npx ts-node scripts/3-interact.ts`);
}

distribute().catch(console.error);
