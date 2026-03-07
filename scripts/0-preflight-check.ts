/**
 * Pre-flight Safety Check
 * Run this BEFORE running the main test scripts
 * Validates contracts, functions, and balances to prevent failed transactions
 */

import { fetchCallReadOnlyFunction, cvToValue, cvToJSON } from '@stacks/transactions';
import { STACKS_MAINNET } from '@stacks/network';
import * as fs from 'fs';

const API_URL = 'https://api.mainnet.hiro.so';
const DEPLOYER = 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT';

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

interface ContractInfo {
  name: string;
  exists: boolean;
  functions: string[];
  error?: string;
}

async function getContractInfo(contractName: string): Promise<ContractInfo> {
  try {
    // Try to call a basic read-only function to check if contract exists
    const result = await fetchCallReadOnlyFunction({
      contractAddress: DEPLOYER,
      contractName,
      functionName: 'get-name',
      functionArgs: [],
      network: STACKS_MAINNET,
      senderAddress: DEPLOYER,
    });

    return {
      name: contractName,
      exists: true,
      functions: ['get-name (working)'],
    };
  } catch (err: any) {
    // Try to get contract info from API
    try {
      const res = await fetch(`${API_URL}/v2/contracts/interface/${DEPLOYER}/${contractName}`);
      if (res.ok) {
        const iface = await res.json();
        const functions = iface.functions?.map((f: any) => f.name) || [];
        return { name: contractName, exists: true, functions };
      }
    } catch {}

    return {
      name: contractName,
      exists: false,
      functions: [],
      error: err.message,
    };
  }
}

async function checkWalletBalance(address: string): Promise<number> {
  try {
    const res = await fetch(`${API_URL}/v2/accounts/${address}?proof=0`);
    const data = await res.json() as { balance: string };
    return parseInt(data.balance, 16);
  } catch {
    return 0;
  }
}

async function validateContractFunction(
  contractName: string,
  functionName: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Test with a dummy call - this won't execute but validates the function exists
    await fetchCallReadOnlyFunction({
      contractAddress: DEPLOYER,
      contractName,
      functionName,
      functionArgs: [],
      network: STACKS_MAINNET,
      senderAddress: DEPLOYER,
    });
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

async function runPreflightCheck(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PRE-FLIGHT SAFETY CHECK');
  console.log('═══════════════════════════════════════════════════════════\n');

  let allValid = true;

  // 1. Check DEPLOYER address
  console.log('📍 Deployer Address Validation');
  console.log(`   Configured: ${DEPLOYER}`);
  const deployerBalance = await checkWalletBalance(DEPLOYER);
  console.log(`   Balance: ${(deployerBalance / 1_000_000).toFixed(2)} STX`);
  console.log(`   Status: ${deployerBalance > 0 ? '✅ Has STX' : '⚠️  Zero balance'}\n`);

  // 2. Check all contracts
  console.log('📄 Contract Deployment Status\n');
  const contractResults: ContractInfo[] = [];

  for (const [key, name] of Object.entries(CONTRACTS)) {
    process.stdout.write(`   Checking ${name}... `);
    const info = await getContractInfo(name);
    contractResults.push(info);

    if (info.exists) {
      console.log(`✅`);
    } else {
      console.log(`❌ ${info.error || 'Not found'}`);
      allValid = false;
    }
  }

  // 3. Validate key functions exist
  console.log('\n🔍 Function Availability Check\n');

  const functionsToCheck = [
    { contract: 'timelock-exchange-v1', fn: 'create-position' },
    { contract: 'staking-v1', fn: 'stake' },
    { contract: 'staking-rewards-v2', fn: 'stake' },
    { contract: 'vault-v1', fn: 'create-vault' },
    { contract: 'escrow-v1', fn: 'create-escrow' },
    { contract: 'batch-transfer-v1', fn: 'batch-transfer' },
    { contract: 'governance-v1', fn: 'vote' },
    { contract: 'emergency-withdraw-v1', fn: 'register' },
    { contract: 'rewards-distributor-v1', fn: 'register' },
  ];

  for (const { contract, fn } of functionsToCheck) {
    process.stdout.write(`   ${contract}::${fn}... `);
    const result = await validateContractFunction(contract, fn);
    if (result.valid) {
      console.log(`✅`);
    } else {
      console.log(`❌ ${result.error}`);
      allValid = false;
    }
  }

  // 4. Check wallet file if exists
  console.log('\n👛 Wallet File Check\n');
  const WALLETS_FILE = '.test-wallets.json';

  if (fs.existsSync(WALLETS_FILE)) {
    const wallets = JSON.parse(fs.readFileSync(WALLETS_FILE, 'utf-8'));
    console.log(`   Found ${wallets.length} wallets in ${WALLETS_FILE}\n`);

    for (let i = 0; i < Math.min(5, wallets.length); i++) {
      const w = wallets[i];
      const bal = await checkWalletBalance(w.address);
      const status = bal >= 100_000 ? '✅' : '❌';
      console.log(`   ${status} Wallet ${w.id}: ${w.address.slice(0, 12)}... (${(bal / 1_000_000).toFixed(4)} STX)`);
    }

    if (wallets.length > 5) {
      console.log(`   ... and ${wallets.length - 5} more wallets`);
    }
  } else {
    console.log(`   ⚠️  ${WALLETS_FILE} not found. Run script 1 first.`);
  }

  // 5. Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  PRE-FLIGHT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');

  if (allValid) {
    console.log('\n✅ All checks passed! Safe to proceed.\n');
    console.log('   Next steps:');
    console.log('   1. npx ts-node scripts/1-generate-wallets.ts');
    console.log('   2. npx ts-node scripts/2-distribute.ts');
    console.log('   3. npx ts-node scripts/3-interact.ts');
  } else {
    console.log('\n❌ Some checks failed. Review above and fix before proceeding.\n');
    console.log('   Common issues:');
    console.log('   - Contracts not deployed yet');
    console.log('   - Wrong contract names in script');
    console.log('   - Insufficient wallet balances');
  }

  console.log('═══════════════════════════════════════════════════════════\n');

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    deployer: { address: DEPLOYER, balance: deployerBalance },
    contracts: contractResults,
    allValid,
  };
  fs.writeFileSync('.preflight-report.json', JSON.stringify(report, null, 2));
  console.log(`📄 Report saved to .preflight-report.json`);
}

runPreflightCheck().catch(console.error);
