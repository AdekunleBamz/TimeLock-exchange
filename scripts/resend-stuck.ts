/**
 * Resend stuck consolidation transactions with higher fee (0.0025 STX)
 * Replaces stuck nonces to unstick the transactions.
 *
 * Stuck wallets: W1, W2, W4, W5, W6, W7
 */

import {
    makeSTXTokenTransfer,
    broadcastTransaction,
    fetchNonce,
    AnchorMode,
} from '@stacks/transactions';
import { STACKS_MAINNET } from '@stacks/network';
import * as fs from 'fs';

const API_URL = 'https://api.mainnet.hiro.so';
const DEPLOYER_ADDRESS = 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT';
const TX_FEE = 2_500; // 0.0025 STX — higher fee to replace stuck txs
const DELAY_MS = 3_000;

const STUCK_WALLET_IDS = [1, 2, 4, 5, 6, 7];

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getBalance(address: string): Promise<number> {
    const res = await fetch(`${API_URL}/v2/accounts/${address}?proof=0`);
    const data = (await res.json()) as { balance: string };
    return parseInt(data.balance, 16);
}

async function getAccountNonce(address: string): Promise<{ lastExecuted: number; possible: number }> {
    const nonceInfo = (await fetchNonce({
        address,
        network: STACKS_MAINNET,
    })) as any;

    return {
        lastExecuted: nonceInfo.lastExecutedTxNonce ?? -1,
        possible: nonceInfo.possibleNextNonce ?? 0,
    };
}

async function resendStuck() {
    const wallets = JSON.parse(
        fs.readFileSync('.test-wallets.json', 'utf-8')
    ) as Array<{ id: number; privateKey: string; address: string; label: string }>;

    const stuckWallets = wallets.filter(w => STUCK_WALLET_IDS.includes(w.id));

    console.log('═══════════════════════════════════════════════════');
    console.log('  Resending Stuck Transactions (higher fee: 0.0025 STX)');
    console.log(`  Target: ${DEPLOYER_ADDRESS}`);
    console.log('═══════════════════════════════════════════════════\n');

    let totalSent = 0;
    let successCount = 0;
    const results: Array<{ wallet: number; address: string; sent: string; txId: string; status: string; nonce: string }> = [];

    for (let i = 0; i < stuckWallets.length; i++) {
        const w = stuckWallets[i];

        // Get balance & nonce info
        const balance = await getBalance(w.address);
        const balSTX = balance / 1_000_000;
        const nonceInfo = await getAccountNonce(w.address);

        console.log(`📤 W${w.id} (${w.label}):`);
        console.log(`   Balance: ${balSTX.toFixed(6)} STX`);
        console.log(`   Nonce — lastExecuted: ${nonceInfo.lastExecuted}, possibleNext: ${nonceInfo.possible}`);

        if (balance <= TX_FEE) {
            console.log(`   ⏭️ Balance too low, skipping\n`);
            results.push({ wallet: w.id, address: w.address, sent: '0', txId: '', status: 'skipped', nonce: '' });
            continue;
        }

        // Use the same nonce as the stuck transaction to replace it
        // The stuck tx used possibleNextNonce at the time, which is lastExecuted + 1
        // Since the tx is stuck (not executed), lastExecuted hasn't changed.
        // We need to use the nonce that the stuck tx used = lastExecuted + 1 = possible
        // But if lastExecuted is -1 (never had a tx), nonce should be 0
        const nonce = BigInt(nonceInfo.lastExecuted >= 0 ? nonceInfo.lastExecuted + 1 : 0);

        const sendAmount = BigInt(balance) - BigInt(TX_FEE);
        const sendSTX = Number(sendAmount) / 1_000_000;

        console.log(`   Sending ${sendSTX.toFixed(6)} STX with nonce ${nonce} (fee: 0.0025 STX)`);

        try {
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
                console.log(`   ✅ New TX: ${txId}\n`);
                totalSent += sendSTX;
                successCount++;
                results.push({ wallet: w.id, address: w.address, sent: sendSTX.toFixed(6), txId, status: 'broadcast', nonce: nonce.toString() });
            } else {
                const errMsg = JSON.stringify(result);
                console.log(`   ❌ Failed: ${errMsg}\n`);
                results.push({ wallet: w.id, address: w.address, sent: '0', txId: '', status: `error: ${errMsg}`, nonce: nonce.toString() });
            }
        } catch (err: any) {
            console.log(`   ❌ Error: ${err.message}\n`);
            results.push({ wallet: w.id, address: w.address, sent: '0', txId: '', status: `error: ${err.message}`, nonce: nonce.toString() });
        }

        if (i < stuckWallets.length - 1) {
            await sleep(DELAY_MS);
        }
    }

    // Save results
    fs.writeFileSync('.resend-results.json', JSON.stringify(results, null, 2));

    console.log('═══════════════════════════════════════════════════');
    console.log('  RESEND SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Broadcast: ${successCount}/${stuckWallets.length}`);
    console.log(`  Total sent: ${totalSent.toFixed(6)} STX`);
    console.log(`  Fee per tx: 0.0025 STX`);
    console.log(`  Results: .resend-results.json`);
    console.log('═══════════════════════════════════════════════════\n');
}

resendStuck().catch(console.error);
