/**
 * Speed up pending transactions by replacing with higher fee (0.0022 STX)
 */

import pkg from '@stacks/transactions';
import { STACKS_MAINNET } from '@stacks/network';
import * as fs from 'fs';

const { makeSTXTokenTransfer, broadcastTransaction, fetchNonce, AnchorMode } = pkg;

const WALLETS_FILE = '.test-wallets.json';
const API_URL = 'https://api.mainnet.hiro.so';
const NEW_FEE = 2200n; // 0.0022 STX (higher than original 0.002 STX)
const AMOUNT_PER_WALLET = 440_000; // 0.44 STX

const PENDING_TX = [
  { txId: 'cbd3fa4a1f4fa501f162448fd30b7d14856b36241445a65f7b0d58c556d4c050', recipient: 'SP29JENQKG8YR2SSKV8CYPRZG5JZG3TZS7ZAJ96YG' },
  { txId: '4094268b32aa1cf10b0ad4f045c0f4deb9ed896fe9b66bbcd9f2c6d5493c660a', recipient: 'SP2N3R71J5V2Y0VERWRPVPZ66AYEVCCM2QWKJJW83' },
  { txId: 'df1e41dc7999952e89c465242e79a5f57f4f40263db2e53387865fee32508d79', recipient: 'SPC2Y3RABF2AZNB8Z1ZTG9MW9R14GNBC5XS747MB' },
  { txId: '73cb7f055656f4b30f1eab8096e863d1fda5bf3ff18ab9d258c1d409779571f7', recipient: 'SP9MDXYN9WPF675W4WPDMT844QT5TF003JDXTSMP' },
  { txId: '696afdd2d85d8d4a2c4184c4cdc1d30cca9e3a918ee1ec43a3955d922a3f3273', recipient: 'SP3QKMVF54VJNGWQ367XCQD6QCVY2H1QKWBTXTSM1' },
  { txId: '43df7416e624d2b6631736d4ee0209cef9137d06a9eb35d47f8ff98d3b8cd477', recipient: 'SP1FHQ64CXXN7EST3WQXDET3FC5PQWKXTPEMW88V4' },
  { txId: 'e68fb512f656a86d59b2fd9608978d34555f92fbf74e0b5b12e1b713dbaeccf7', recipient: 'SP1PNZJGV1VTTDER9JCW304QPQRQXB6KTS15BWEH9' },
  { txId: 'cdb5221e38dab0e7ae43607ae5da6317e3b58a15e42755b96665f9881a04b8e9', recipient: 'SP388XY3F996RS911S20616TV59B8HJ1ACK5DCC9E' },
  { txId: '32b6b3d9d1a36a8bd75146624ab3a1e8bd56d35bc853210e0d2f7d277a0d8cd4', recipient: 'SP3BZ4H10H4AA9SNC7768PQDTW9H75P6VX53RME0Q' },
  { txId: '4335c54307429348b82e7de7627e3e539f86bbeec1bde4697469d20716fc5ec3', recipient: 'SP1T2NRSGP1P4XRW7PABZJBQTX9GTMDPJS0A2G0RN' },
  { txId: '953489a870fe599af352ea5128ff7e02f0418410379bb086ea0fdcf8544ad007', recipient: 'SPZYJVHVBDZZQY5H0G0C1NCRD56WWFR0VW9KR1FB' },
  { txId: 'e4fec89b1d44caf3e697b32bb7059625b293ca1c5f360dc1997d60c01fd9162b', recipient: 'SP1WYFNCXXMZZ8X0Q1RX6V4HD6BBDH5JW7R1GDHFC' },
  { txId: '0495f99e71b7671ebf77bd9b80f047752eb426f4dfa7ca2c928a3c3421bac738', recipient: 'SP3B027HTCR24E2NC23SDRDCTDR2CTEMKSKEVB72K' },
  { txId: '779584d310d5981c5be1c36abf88c4b0cadce1aac27d6b5479c6627eb42da4cd', recipient: 'SP2X0FFAZSD56VV0PX7HVWC37N43N4H1QG7M867Z1' },
];

async function checkPending(txId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/extended/v1/tx/${txId}`);
    const data = await res.json() as any;
    return data.tx_status === 'pending' || !data.burn_block_time;
  } catch { return true; }
}

async function speedUp() {
  if (!fs.existsSync(WALLETS_FILE)) {
    console.error('❌ Wallets file not found');
    process.exit(1);
  }

  const wallets = JSON.parse(fs.readFileSync(WALLETS_FILE, 'utf-8'));
  const funder = wallets[0];

  console.log('═══════════════════════════════════════════════════');
  console.log('  Speed Up Pending Transactions (Fee: 0.0022 STX)');
  console.log('═══════════════════════════════════════════════════\n');

  // Check which are still pending
  const stillPending = [];
  console.log('🔍 Checking pending TXs...\n');
  
  for (const tx of PENDING_TX) {
    const isPending = await checkPending(tx.txId);
    console.log(`   ${isPending ? '⏳' : '✅'} ${tx.recipient.slice(0, 14)}...`);
    if (isPending) stillPending.push(tx);
  }

  if (stillPending.length === 0) {
    console.log('\n✅ All transactions confirmed!');
    return;
  }

  console.log(`\n⚡ ${stillPending.length} transactions still pending`);
  console.log('   Replacing with higher fee...\n');

  // Get next nonce
  const nonceInfo = await fetchNonce({ address: funder.address, network: STACKS_MAINNET }) as any;
  let nonceVal = nonceInfo.lastExecutedTxNonce ?? nonceInfo.possibleNextNonce ?? 0;
  let nonce = BigInt(nonceVal);

  // Check current funder balance
  const balRes = await fetch(`${API_URL}/v2/accounts/${funder.address}?proof=0`);
  const bal = await balRes.json() as any;
  const balance = parseInt(bal.balance || '0', 16);
  console.log(`   Funder balance: ${(balance / 1000000).toFixed(4)} STX\n`);

  // Speed up each pending transaction
  for (let i = 0; i < stillPending.length; i++) {
    const tx = stillPending[i];
    console.log(`   [${i + 1}/${stillPending.length}] Speed up → ${tx.recipient.slice(0, 12)}...`);
    
    try {
      const newTx = await makeSTXTokenTransfer({
        recipient: tx.recipient,
        amount: BigInt(AMOUNT_PER_WALLET),
        senderKey: funder.privateKey,
        network: STACKS_MAINNET,
        anchorMode: AnchorMode.Any,
        fee: NEW_FEE,
        nonce,
      } as any);

      const result = await broadcastTransaction({ transaction: newTx, network: STACKS_MAINNET });
      const resultAny = result as any;
      
      if (typeof result === 'string') {
        console.log(`      ✅ New TX: ${result.slice(0, 16)}...`);
      } else if (resultAny?.txid) {
        console.log(`      ✅ New TX: ${resultAny.txid.slice(0, 16)}...`);
      } else {
        console.log(`      ❌ Failed: ${JSON.stringify(result)}`);
      }
    } catch (err: any) {
      console.log(`      ❌ Error: ${err.message}`);
    }

    nonce++;
    
    if (i < stillPending.length - 1) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log('\n📋 Done! New transactions broadcast with higher fee.');
  console.log('   Wait ~5-10 minutes for confirmation.\n');
}

speedUp().catch(console.error);
