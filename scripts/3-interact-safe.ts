/**
 * Step 3: SAFE Contract Interaction Tests
 * Run: npx ts-node scripts/3-interact-safe.ts
 * 
 * Rules:
 * - Each wallet runs 1 transaction at a time
 * - 3-5 second delay between transactions
 * - Sequential: W2 → W3 → W4... → W14 → W2...
 */

import pkg from '@stacks/transactions';
import { STACKS_MAINNET } from '@stacks/network';
import * as fs from 'fs';

const { makeContractCall, broadcastTransaction, fetchNonce, uintCV, principalCV, listCV, tupleCV, stringAsciiCV, falseCV, PostConditionMode } = pkg;

const WALLETS_FILE = '.test-wallets.json';
const API_URL = 'https://api.mainnet.hiro.so';
const DEPLOYER = 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT';
const DELAY_MS = 4000;

// Correct contract names from preflight check
const CONTRACTS = {
  timelockExchange: 'timelock-exchange-v1',
  staking: 'staking-v1',
  stakingRewards: 'staking-rewards-v2',
  vault: 'vault-v1',
  escrow: 'escrow-v1',
  batchTransfer: 'batch-transfer-v1',
};

interface TestWallet { id: number; privateKey: string; address: string; label: string; }
interface TxResult { wallet: number; contract: string; function: string; txId: string; status: string; timestamp: string; error?: string; }

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function checkBalance(address: string): Promise<number> {
  try {
    const res = await fetch(`${API_URL}/v2/accounts/${address}?proof=0`);
    const data = await res.json() as { balance: string };
    return parseInt(data.balance || '0', 16);
  } catch { return 0; }
}

async function getNonce(address: string): Promise<bigint> {
  try {
    const info = await fetchNonce({ address, network: STACKS_MAINNET }) as any;
    return info.lastExecutedTxNonce !== undefined ? BigInt(info.lastExecutedTxNonce) + 1n : BigInt(info.possibleNextNonce);
  } catch { return 0n; }
}

async function send(wallet: TestWallet, contract: string, fn: string, args: any[], nonce: bigint): Promise<{ txId: string; success: boolean; status: string; error?: string }> {
  try {
    const tx = await makeContractCall({ contractAddress: DEPLOYER, contractName: contract, functionName: fn, functionArgs: args, senderKey: wallet.privateKey, network: STACKS_MAINNET, fee: 2000n, nonce, postConditionMode: PostConditionMode.Allow } as any);
    const r = await broadcastTransaction({ transaction: tx, network: STACKS_MAINNET });
    if (typeof r === 'string') return { txId: r, success: true, status: 'success' };
    if (r && 'txid' in r) return { txId: (r as any).txid, success: true, status: 'success' };
    return { txId: '', success: false, status: 'failed', error: JSON.stringify(r) };
  } catch (e: any) { return { txId: '', success: false, status: 'failed', error: e.message }; }
}

async function main() {
  if (!fs.existsSync(WALLETS_FILE)) {
    console.error('❌ Run step 1 first: npx ts-node scripts/1-generate-wallets.ts');
    process.exit(1);
  }
  
  const wallets: TestWallet[] = JSON.parse(fs.readFileSync(WALLETS_FILE, 'utf-8'));
  const testWallets = wallets.slice(1, 15); // Wallets 2-14 (13 wallets)
  const results: TxResult[] = [];

  console.log('═══════════════════════════════════════════════════');
  console.log('  TimeLock Exchange - SAFE Contract Tests');
  console.log('═══════════════════════════════════════════════════');
  console.log(`\n   Wallets: ${testWallets.length}`);
  console.log(`   Delay between TXs: ${DELAY_MS}ms\n`);

  // Phase 1: Check balances
  console.log('💰 Phase 1: Wallet Balances\n');
  const balances = new Map<number, number>();
  for (const w of testWallets) {
    const bal = await checkBalance(w.address);
    balances.set(w.id, bal);
    const ok = bal >= 50000 ? '✅' : '❌';
    console.log(`   ${ok} Wallet ${String(w.id).padStart(2)}: ${(bal / 1000000).toFixed(4)} STX`);
    await sleep(300);
  }

  // Phase 2: Write interactions - sequential by wallet
  console.log('\n✍️  Phase 2: Write Interactions\n');
  console.log('   Each wallet runs 1 transaction, then passes to next wallet\n');
  
  const MIN_BAL = 50000; // 0.05 STX minimum
  const walletsWithFunds = testWallets.filter(w => (balances.get(w.id) || 0) >= MIN_BAL);
  
  if (walletsWithFunds.length === 0) {
    console.log('❌ No wallets have sufficient balance for testing');
    process.exit(1);
  }

  console.log(`   Using ${walletsWithFunds.length} wallets with sufficient funds\n`);

  // Test cases: each wallet does 1 TX per round
  const testCases = [
    { contract: 'timelock-exchange-v1', fn: 'create-position', getArgs: (w: TestWallet) => [uintCV(50000), uintCV(86400)], desc: 'create-position (0.05 STX, 1 day)' },
    { contract: 'staking-v1', fn: 'stake', getArgs: (w: TestWallet) => [uintCV(50000), uintCV(0), falseCV(), principalCV(w.address)], desc: 'stake (0.05 STX)' },
    { contract: 'staking-rewards-v2', fn: 'stake', getArgs: (w: TestWallet) => [uintCV(50000), uintCV(10080)], desc: 'staking-rewards::stake (0.05 STX, 7 days)' },
    { contract: 'vault-v1', fn: 'create-vault', getArgs: (w: TestWallet) => [uintCV(1000), uintCV(144)], desc: 'vault::create-vault' },
    { contract: 'escrow-v1', fn: 'create-escrow', getArgs: (w: TestWallet, next: TestWallet) => [principalCV(next.address), uintCV(1000), uintCV(20160), stringAsciiCV('Test')], desc: 'escrow::create-escrow' },
    { contract: 'batch-transfer-v1', fn: 'batch-stx-transfer', getArgs: (w: TestWallet, next: TestWallet) => [listCV([tupleCV({ recipient: principalCV(next.address), amount: uintCV(1000) })])], desc: 'batch-transfer' },
  ];

  let round = 0;
  
  while (round < testCases.length) {
    const test = testCases[round];
    const w = walletsWithFunds[round % walletsWithFunds.length];
    const nextW = walletsWithFunds[(round + 1) % walletsWithFunds.length];
    
    const args = test.getArgs(w, nextW);
    
    console.log(`   [${round + 1}/${testCases.length}] Wallet ${String(w.id).padStart(2)} → ${test.contract}::${test.fn}`);
    
    const nonce = await getNonce(w.address);
    const result = await send(w, test.contract, test.fn, args, nonce);
    
    if (result.success) {
      console.log(`      ✅ ${result.txId.slice(0, 24)}...`);
    } else {
      console.log(`      ❌ ${result.error?.slice(0, 60) || result.status}`);
    }
    
    results.push({ wallet: w.id, contract: test.contract, function: test.fn, ...result, timestamp: new Date().toISOString() });
    
    round++;
    
    if (round < testCases.length) {
      console.log(`      ⏳ ${DELAY_MS}ms delay...\n`);
      await sleep(DELAY_MS);
    }
  }

  // Save results
  fs.writeFileSync('.interaction-results.json', JSON.stringify(results, null, 2));
  
  const broadcast = results.filter(r => r.status === 'success' && r.txId !== 'read-only').length;
  const failed = results.filter(r => r.status === 'failed').length;

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════');
  console.log(`   Broadcast: ${broadcast}`);
  console.log(`   Failed:    ${failed}`);
  console.log(`   Total:     ${results.length}`);
  console.log('\n   Results: .interaction-results.json');
  console.log('═══════════════════════════════════════════════════\n');
}

main().catch(console.error);
