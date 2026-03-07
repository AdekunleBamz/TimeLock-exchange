/**
 * Step 3: Run test interactions on all 13 contracts
 * Run: npx ts-node scripts/3-interact.ts
 * Prereq: All wallets funded from step 2
 */

import {
  makeContractCall,
  broadcastTransaction,
  fetchNonce,
  fetchCallReadOnlyFunction,
  cvToValue,
  uintCV,
  principalCV,
  bufferCV,
  listCV,
  tupleCV,
  trueCV,
  falseCV,
  stringAsciiCV,
  AnchorMode,
  PostConditionMode,
  Pc,
  ClarityValue,
} from '@stacks/transactions';
import { STACKS_MAINNET } from '@stacks/network';
import * as fs from 'fs';

// ============================================================================
// Config
// ============================================================================

const WALLETS_FILE = '.test-wallets.json';
const RESULTS_FILE = '.interaction-results.json';
const API_URL = 'https://api.mainnet.hiro.so';
const DEPLOYER = 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT';
const DELAY_MS = 5_000; // 5 seconds between txs
const TX_FEE = 2_000n; // 0.002 STX

const CONTRACTS = {
  timelockExchange: 'timelock-exchange-v1',
  staking: 'staking-v1',
  stakingRewards: 'staking-rewards-v2',
  governance: 'governance-v1',
  vault: 'vault-v1',
  escrow: 'escrow-v1',
  batchTransfer: 'batch-transfer-v1',
  feeCollector: 'fee-collector-v11-1',
  positionNft: 'position-nft-v11-1',
  timelockToken: 'timelock-token-v11-1',
  priceOracle: 'price-oracle-v1',
  rewardsDistributor: 'rewards-distributor-v1',
  emergencyWithdraw: 'emergency-withdraw-v1',
};

interface TestWallet {
  id: number;
  privateKey: string;
  address: string;
  label: string;
}

interface TxResult {
  wallet: number;
  contract: string;
  function: string;
  txId: string;
  status: string;
  timestamp: string;
}

// ============================================================================
// Helpers
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkBalance(address: string): Promise<number> {
  const res = await fetch(`${API_URL}/v2/accounts/${address}?proof=0`);
  const data = await res.json() as { balance: string };
  return parseInt(data.balance, 16);
}

async function getNonce(address: string): Promise<bigint> {
  const info = await fetchNonce({ address, network: STACKS_MAINNET });
  return info.lastExecutedTxNonce !== undefined
    ? BigInt(info.lastExecutedTxNonce) + 1n
    : BigInt(info.possibleNextNonce);
}

async function readOnly(contractName: string, functionName: string, args: ClarityValue[] = []): Promise<any> {
  try {
    const result = await fetchCallReadOnlyFunction({
      contractAddress: DEPLOYER,
      contractName,
      functionName,
      functionArgs: args,
      network: STACKS_MAINNET,
      senderAddress: DEPLOYER,
    });
    return cvToValue(result);
  } catch (err: any) {
    return { error: err.message };
  }
}

async function sendContractCall(
  wallet: TestWallet,
  contractName: string,
  functionName: string,
  functionArgs: ClarityValue[],
  nonce: bigint,
  postConditionMode: PostConditionMode = PostConditionMode.Allow,
): Promise<{ txId: string; success: boolean }> {
  try {
    const tx = await makeContractCall({
      contractAddress: DEPLOYER,
      contractName,
      functionName,
      functionArgs,
      senderKey: wallet.privateKey,
      network: STACKS_MAINNET,
      anchorMode: AnchorMode.Any,
      fee: TX_FEE,
      nonce,
      postConditionMode,
    });

    const result = await broadcastTransaction({ transaction: tx, network: STACKS_MAINNET });

    if (typeof result === 'string') {
      return { txId: result, success: true };
    } else if (result && 'txid' in result) {
      return { txId: result.txid, success: true };
    } else {
      console.log(`      Broadcast response: ${JSON.stringify(result)}`);
      return { txId: '', success: false };
    }
  } catch (err: any) {
    console.log(`      Error: ${err.message}`);
    return { txId: '', success: false };
  }
}

// ============================================================================
// Contract Interactions (1 tx per wallet per contract)
// ============================================================================

// --- Read-only calls (no gas, no deposits) ---

async function testReadOnlyContracts(): Promise<TxResult[]> {
  const results: TxResult[] = [];
  console.log('\n📖 Read-Only Calls (free, no gas)\n');

  // fee-collector: get-total-collected
  const fees = await readOnly(CONTRACTS.feeCollector, 'get-total-collected');
  console.log(`  fee-collector get-total-collected: ${JSON.stringify(fees)}`);
  results.push({ wallet: 0, contract: 'fee-collector', function: 'get-total-collected', txId: 'read-only', status: `result: ${JSON.stringify(fees)}`, timestamp: new Date().toISOString() });

  await sleep(1000);

  // price-oracle: get-stx-price (may not exist, try)
  const price = await readOnly(CONTRACTS.priceOracle, 'get-pair-info', [stringAsciiCV('STX-USD')]);
  console.log(`  price-oracle get-pair-info: ${JSON.stringify(price)}`);
  results.push({ wallet: 0, contract: 'price-oracle', function: 'get-pair-info', txId: 'read-only', status: `result: ${JSON.stringify(price)}`, timestamp: new Date().toISOString() });

  await sleep(1000);

  // position-nft: get-last-token-id
  const lastId = await readOnly(CONTRACTS.positionNft, 'get-last-token-id');
  console.log(`  position-nft get-last-token-id: ${JSON.stringify(lastId)}`);
  results.push({ wallet: 0, contract: 'position-nft', function: 'get-last-token-id', txId: 'read-only', status: `result: ${JSON.stringify(lastId)}`, timestamp: new Date().toISOString() });

  await sleep(1000);

  // timelock-token: get-name, get-symbol
  const tokenName = await readOnly(CONTRACTS.timelockToken, 'get-name');
  const tokenSymbol = await readOnly(CONTRACTS.timelockToken, 'get-symbol');
  console.log(`  timelock-token: name=${JSON.stringify(tokenName)}, symbol=${JSON.stringify(tokenSymbol)}`);
  results.push({ wallet: 0, contract: 'timelock-token', function: 'get-name', txId: 'read-only', status: `name=${JSON.stringify(tokenName)}, symbol=${JSON.stringify(tokenSymbol)}`, timestamp: new Date().toISOString() });

  await sleep(1000);

  // timelock-exchange: get-position-count
  const posCount = await readOnly(CONTRACTS.timelockExchange, 'get-position-count');
  console.log(`  timelock-exchange get-position-count: ${JSON.stringify(posCount)}`);
  results.push({ wallet: 0, contract: 'timelock-exchange', function: 'get-position-count', txId: 'read-only', status: `result: ${JSON.stringify(posCount)}`, timestamp: new Date().toISOString() });

  return results;
}

// --- Write calls (gas + deposits) ---

async function interactTimelockExchange(wallet: TestWallet, nonce: bigint): Promise<TxResult> {
  // create-position: 0.1 STX deposit, 7 days lock (604800 seconds)
  const { txId, success } = await sendContractCall(
    wallet, CONTRACTS.timelockExchange, 'create-position',
    [uintCV(100_000), uintCV(604_800)], // 0.1 STX, 7 days
    nonce,
  );
  return {
    wallet: wallet.id, contract: 'timelock-exchange', function: 'create-position',
    txId, status: success ? 'broadcast' : 'failed', timestamp: new Date().toISOString(),
  };
}

async function interactStaking(wallet: TestWallet, nonce: bigint): Promise<TxResult> {
  // stake: 0.1 STX
  const { txId, success } = await sendContractCall(
    wallet, CONTRACTS.staking, 'stake',
    [uintCV(100_000)], // 0.1 STX
    nonce,
  );
  return {
    wallet: wallet.id, contract: 'staking', function: 'stake',
    txId, status: success ? 'broadcast' : 'failed', timestamp: new Date().toISOString(),
  };
}

async function interactStakingRewards(wallet: TestWallet, nonce: bigint): Promise<TxResult> {
  // stake: 0.1 STX
  const { txId, success } = await sendContractCall(
    wallet, CONTRACTS.stakingRewards, 'stake',
    [uintCV(100_000)], // 0.1 STX
    nonce,
  );
  return {
    wallet: wallet.id, contract: 'staking-rewards', function: 'stake',
    txId, status: success ? 'broadcast' : 'failed', timestamp: new Date().toISOString(),
  };
}

async function interactVault(wallet: TestWallet, nonce: bigint): Promise<TxResult> {
  // create-vault: 0.1 STX initial deposit
  const { txId, success } = await sendContractCall(
    wallet, CONTRACTS.vault, 'create-vault',
    [uintCV(100_000)], // 0.1 STX
    nonce,
  );
  return {
    wallet: wallet.id, contract: 'vault', function: 'create-vault',
    txId, status: success ? 'broadcast' : 'failed', timestamp: new Date().toISOString(),
  };
}

async function interactEscrow(wallet: TestWallet, nonce: bigint, recipientAddress: string): Promise<TxResult> {
  // create-escrow: 0.001 STX, recipient = next wallet, 86400 second expiry
  const { txId, success } = await sendContractCall(
    wallet, CONTRACTS.escrow, 'create-escrow',
    [
      principalCV(recipientAddress),
      uintCV(1_000),    // 0.001 STX
      uintCV(86_400),   // 1 day expiry
    ],
    nonce,
  );
  return {
    wallet: wallet.id, contract: 'escrow', function: 'create-escrow',
    txId, status: success ? 'broadcast' : 'failed', timestamp: new Date().toISOString(),
  };
}

async function interactBatchTransfer(wallet: TestWallet, nonce: bigint, recipientAddress: string): Promise<TxResult> {
  // batch-transfer: send 0.001 STX to one recipient
  const { txId, success } = await sendContractCall(
    wallet, CONTRACTS.batchTransfer, 'batch-transfer',
    [
      listCV([
        tupleCV({
          to: principalCV(recipientAddress),
          amount: uintCV(1_000), // 0.001 STX
        }),
      ]),
    ],
    nonce,
  );
  return {
    wallet: wallet.id, contract: 'batch-transfer', function: 'batch-transfer',
    txId, status: success ? 'broadcast' : 'failed', timestamp: new Date().toISOString(),
  };
}

async function interactGovernance(wallet: TestWallet, nonce: bigint): Promise<TxResult> {
  // vote on proposal 1 (if exists) - vote yes with weight 1
  const { txId, success } = await sendContractCall(
    wallet, CONTRACTS.governance, 'vote',
    [uintCV(1), trueCV()], // proposal 1, vote yes
    nonce,
  );
  return {
    wallet: wallet.id, contract: 'governance', function: 'vote',
    txId, status: success ? 'broadcast' : 'failed', timestamp: new Date().toISOString(),
  };
}

async function interactEmergencyWithdraw(wallet: TestWallet, nonce: bigint): Promise<TxResult> {
  // register-for-emergency (if function exists)
  const { txId, success } = await sendContractCall(
    wallet, CONTRACTS.emergencyWithdraw, 'register',
    [],
    nonce,
  );
  return {
    wallet: wallet.id, contract: 'emergency-withdraw', function: 'register',
    txId, status: success ? 'broadcast' : 'failed', timestamp: new Date().toISOString(),
  };
}

async function interactRewardsDistributor(wallet: TestWallet, nonce: bigint): Promise<TxResult> {
  // check-eligibility or register
  const { txId, success } = await sendContractCall(
    wallet, CONTRACTS.rewardsDistributor, 'register',
    [],
    nonce,
  );
  return {
    wallet: wallet.id, contract: 'rewards-distributor', function: 'register',
    txId, status: success ? 'broadcast' : 'failed', timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Main Runner
// ============================================================================

async function interact(): Promise<void> {
  if (!fs.existsSync(WALLETS_FILE)) {
    console.error('❌ Run step 1 first: npx ts-node scripts/1-generate-wallets.ts');
    process.exit(1);
  }

  const wallets: TestWallet[] = JSON.parse(fs.readFileSync(WALLETS_FILE, 'utf-8'));
  // Use wallets 2-15 for interactions (wallet 1 is funder)
  const testWallets = wallets.slice(1);
  const allResults: TxResult[] = [];

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  TimeLock Exchange - Contract Interaction Tests');
  console.log(`  Testing ${testWallets.length} wallets × 13 contracts`);
  console.log('═══════════════════════════════════════════════════════════');

  // --- Phase 1: Read-Only (free) ---
  const readResults = await testReadOnlyContracts();
  allResults.push(...readResults);

  // --- Phase 2: Balance check ---
  console.log('\n💰 Checking wallet balances...\n');
  for (const w of testWallets) {
    const bal = await checkBalance(w.address);
    console.log(`  Wallet ${String(w.id).padStart(2)}: ${(bal / 1_000_000).toFixed(4)} STX`);
    if (bal < 100_000) {
      console.log(`    ⚠️  Low balance, skipping write interactions for this wallet`);
    }
    await sleep(500);
  }

  // --- Phase 3: Write interactions (one wallet at a time) ---
  console.log('\n✍️  Write Interactions (5s delay between each tx)\n');

  for (let i = 0; i < testWallets.length; i++) {
    const wallet = testWallets[i];
    const balance = await checkBalance(wallet.address);

    if (balance < 100_000) {
      console.log(`\n  ⏭️  Skipping Wallet ${wallet.id} (insufficient balance)`);
      continue;
    }

    console.log(`\n  ── Wallet ${wallet.id} (${wallet.address.slice(0, 10)}...) ──`);

    // Get nonce once per wallet
    let nonce = await getNonce(wallet.address);

    // Pick next wallet as recipient for escrow/batch (wrap around)
    const nextWallet = testWallets[(i + 1) % testWallets.length];

    // 1. timelock-exchange: create-position
    console.log(`    [1/9] timelock-exchange create-position (0.1 STX, 7 days)`);
    const r1 = await interactTimelockExchange(wallet, nonce);
    allResults.push(r1);
    console.log(`          ${r1.status} ${r1.txId ? r1.txId.slice(0, 20) + '...' : ''}`);
    nonce++;
    await sleep(DELAY_MS);

    // 2. staking: stake
    console.log(`    [2/9] staking stake (0.1 STX)`);
    const r2 = await interactStaking(wallet, nonce);
    allResults.push(r2);
    console.log(`          ${r2.status} ${r2.txId ? r2.txId.slice(0, 20) + '...' : ''}`);
    nonce++;
    await sleep(DELAY_MS);

    // 3. staking-rewards: stake
    console.log(`    [3/9] staking-rewards stake (0.1 STX)`);
    const r3 = await interactStakingRewards(wallet, nonce);
    allResults.push(r3);
    console.log(`          ${r3.status} ${r3.txId ? r3.txId.slice(0, 20) + '...' : ''}`);
    nonce++;
    await sleep(DELAY_MS);

    // 4. vault: create-vault
    console.log(`    [4/9] vault create-vault (0.1 STX)`);
    const r4 = await interactVault(wallet, nonce);
    allResults.push(r4);
    console.log(`          ${r4.status} ${r4.txId ? r4.txId.slice(0, 20) + '...' : ''}`);
    nonce++;
    await sleep(DELAY_MS);

    // 5. escrow: create-escrow
    console.log(`    [5/9] escrow create-escrow (0.001 STX → wallet ${nextWallet.id})`);
    const r5 = await interactEscrow(wallet, nonce, nextWallet.address);
    allResults.push(r5);
    console.log(`          ${r5.status} ${r5.txId ? r5.txId.slice(0, 20) + '...' : ''}`);
    nonce++;
    await sleep(DELAY_MS);

    // 6. batch-transfer
    console.log(`    [6/9] batch-transfer (0.001 STX → wallet ${nextWallet.id})`);
    const r6 = await interactBatchTransfer(wallet, nonce, nextWallet.address);
    allResults.push(r6);
    console.log(`          ${r6.status} ${r6.txId ? r6.txId.slice(0, 20) + '...' : ''}`);
    nonce++;
    await sleep(DELAY_MS);

    // 7. governance: vote
    console.log(`    [7/9] governance vote (proposal 1)`);
    const r7 = await interactGovernance(wallet, nonce);
    allResults.push(r7);
    console.log(`          ${r7.status} ${r7.txId ? r7.txId.slice(0, 20) + '...' : ''}`);
    nonce++;
    await sleep(DELAY_MS);

    // 8. emergency-withdraw: register
    console.log(`    [8/9] emergency-withdraw register`);
    const r8 = await interactEmergencyWithdraw(wallet, nonce);
    allResults.push(r8);
    console.log(`          ${r8.status} ${r8.txId ? r8.txId.slice(0, 20) + '...' : ''}`);
    nonce++;
    await sleep(DELAY_MS);

    // 9. rewards-distributor: register
    console.log(`    [9/9] rewards-distributor register`);
    const r9 = await interactRewardsDistributor(wallet, nonce);
    allResults.push(r9);
    console.log(`          ${r9.status} ${r9.txId ? r9.txId.slice(0, 20) + '...' : ''}`);
    nonce++;

    // Extra delay between wallets
    if (i < testWallets.length - 1) {
      console.log(`\n    ⏳ Waiting 5s before next wallet...`);
      await sleep(DELAY_MS);
    }
  }

  // --- Save results ---
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(allResults, null, 2));

  // --- Summary ---
  const broadcast = allResults.filter(r => r.status === 'broadcast').length;
  const failed = allResults.filter(r => r.status === 'failed').length;
  const readOnlyCount = allResults.filter(r => r.txId === 'read-only').length;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Read-only calls:  ${readOnlyCount}`);
  console.log(`  Broadcast:        ${broadcast}`);
  console.log(`  Failed:           ${failed}`);
  console.log(`  Total:            ${allResults.length}`);
  console.log(`\n  Results saved to: ${RESULTS_FILE}`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

interact().catch(console.error);
