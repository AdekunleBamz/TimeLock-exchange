/**
 * Step 1: Generate 15 test wallets
 * Run: npx ts-node scripts/1-generate-wallets.ts
 * Output: .test-wallets.json (gitignored)
 */

import { randomPrivateKey, privateKeyToHex, getAddressFromPrivateKey } from '@stacks/transactions';
import { STACKS_MAINNET } from '@stacks/network';
import * as fs from 'fs';

const WALLET_COUNT = 15;
const OUTPUT_FILE = '.test-wallets.json';

interface TestWallet {
  id: number;
  privateKey: string;
  address: string;
  label: string;
}

function generate(): void {
  console.log(`\n🔑 Generating ${WALLET_COUNT} test wallets...\n`);

  const wallets: TestWallet[] = [];

  for (let i = 0; i < WALLET_COUNT; i++) {
    const privKey = randomPrivateKey();
    const privateKey = privateKeyToHex(privKey);
    const address = getAddressFromPrivateKey(privKey, STACKS_MAINNET);

    wallets.push({
      id: i + 1,
      privateKey,
      address,
      label: i === 0 ? 'FUNDER (deposit 6.5 STX here)' : `test-wallet-${i + 1}`,
    });

    console.log(`  Wallet ${String(i + 1).padStart(2)}: ${address}${i === 0 ? '  ← FUND THIS ONE WITH 6.5 STX' : ''}`);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(wallets, null, 2));
  console.log(`\n✅ Saved to ${OUTPUT_FILE}`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Send 6.5 STX to Wallet 1: ${wallets[0].address}`);
  console.log(`   2. Wait for confirmation (~10 min)`);
  console.log(`   3. Run: npx ts-node scripts/2-distribute.ts`);
}

generate();
