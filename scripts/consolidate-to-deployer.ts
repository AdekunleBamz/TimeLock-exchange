/**
 * Consolidate all STX from test wallets back to Deployer wallet
 * Deployer: SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT
 *
 * Run: npx tsx scripts/consolidate-to-deployer.ts
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
const API_URL = 'https://api.mainnet.hiro.so';
const DEPLOYER_ADDRESS = 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT';
const TX_FEE = 2_000; // 0.002 STX in microSTX
const DELAY_MS = 3_000; // 3 seconds between transactions

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getBalance(address: string): Promise<number> {
    const res = await fetch(`${API_URL}/v2/accounts/${address}?proof=0`);
    const data = (await res.json()) as { balance: string };
    return parseInt(data.balance, 16);
}

async function getNonce(address: string): Promise<bigint> {
    const nonceInfo = (await fetchNonce({
        address,
        network: STACKS_MAINNET,
    })) as any;
    const val =
        nonceInfo.lastExecutedTxNonce != null
            ? nonceInfo.lastExecutedTxNonce + 1
            : nonceInfo.possibleNextNonce ?? 0;
    return BigInt(val);
}

async function consolidate(): Promise<void> {
    if (!fs.existsSync(WALLETS_FILE)) {
        console.error('❌ .test-wallets.json not found');
        process.exit(1);
    }

    const wallets = JSON.parse(fs.readFileSync(WALLETS_FILE, 'utf-8')) as Array<{
        id: number;
        privateKey: string;
        address: string;
        label: string;
    }>;

    console.log('═══════════════════════════════════════════════════');
    console.log('  Consolidating ALL STX → Deployer Wallet');
    console.log(`  Deployer: ${DEPLOYER_ADDRESS}`);
    console.log('═══════════════════════════════════════════════════\n');

    // Check deployer starting balance
    const deployerBalBefore = await getBalance(DEPLOYER_ADDRESS);
    console.log(
        `📦 Deployer starting balance: ${(deployerBalBefore / 1_000_000).toFixed(6)} STX\n`
    );

    let totalSent = 0;
    let successCount = 0;
    let skipCount = 0;
    const results: Array<{
        wallet: number;
        address: string;
        sent: string;
        txId: string;
        status: string;
    }> = [];

    for (let i = 0; i < wallets.length; i++) {
        const w = wallets[i];
        const balance = await getBalance(w.address);
        const balSTX = balance / 1_000_000;

        // Skip if balance is too low to cover the fee
        if (balance <= TX_FEE) {
            console.log(
                `⏭️  W${w.id} (${w.label}): ${balSTX.toFixed(6)} STX — too low, skipping`
            );
            skipCount++;
            results.push({
                wallet: w.id,
                address: w.address,
                sent: '0',
                txId: '',
                status: 'skipped (low balance)',
            });
            continue;
        }

        // Send (balance - fee) to deployer
        const sendAmount = BigInt(balance) - BigInt(TX_FEE);
        const sendSTX = Number(sendAmount) / 1_000_000;

        console.log(
            `📤 W${w.id} (${w.label}): ${balSTX.toFixed(6)} STX → sending ${sendSTX.toFixed(6)} STX`
        );

        try {
            const nonce = await getNonce(w.address);

            const tx = await makeSTXTokenTransfer({
                recipient: DEPLOYER_ADDRESS,
                amount: sendAmount,
                senderKey: w.privateKey,
                network: STACKS_MAINNET,
                anchorMode: AnchorMode.Any,
                fee: BigInt(TX_FEE),
                nonce,
            } as any);

            const result = await broadcastTransaction({
                transaction: tx,
                network: STACKS_MAINNET,
            });

            let txId = '';
            if (typeof result === 'string') {
                txId = result;
            } else if (result && 'txid' in result) {
                txId = (result as any).txid;
            }

            if (txId) {
                console.log(`   ✅ TX: ${txId}`);
                totalSent += sendSTX;
                successCount++;
                results.push({
                    wallet: w.id,
                    address: w.address,
                    sent: sendSTX.toFixed(6),
                    txId,
                    status: 'broadcast',
                });
            } else {
                const errMsg = JSON.stringify(result);
                console.log(`   ❌ Failed: ${errMsg}`);
                results.push({
                    wallet: w.id,
                    address: w.address,
                    sent: '0',
                    txId: '',
                    status: `error: ${errMsg}`,
                });
            }
        } catch (err: any) {
            console.log(`   ❌ Error: ${err.message}`);
            results.push({
                wallet: w.id,
                address: w.address,
                sent: '0',
                txId: '',
                status: `error: ${err.message}`,
            });
        }

        // Rate limit between transactions
        if (i < wallets.length - 1) {
            await sleep(DELAY_MS);
        }
    }

    // Save results
    const resultsFile = '.consolidate-results.json';
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  CONSOLIDATION SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    console.log(`\n  Deployer:     ${DEPLOYER_ADDRESS}`);
    console.log(`  Before:       ${(deployerBalBefore / 1_000_000).toFixed(6)} STX`);
    console.log(`  Sent:         ${totalSent.toFixed(6)} STX (from ${successCount} wallets)`);
    console.log(`  Skipped:      ${skipCount} wallets (low balance)`);
    console.log(`  Fees paid:    ${((successCount * TX_FEE) / 1_000_000).toFixed(6)} STX`);
    console.log(`  Expected new: ~${((deployerBalBefore / 1_000_000) + totalSent).toFixed(6)} STX`);
    console.log(`\n  Results saved to ${resultsFile}`);
    console.log('═══════════════════════════════════════════════════\n');
}

consolidate().catch(console.error);
