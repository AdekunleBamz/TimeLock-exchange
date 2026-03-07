/**
 * Check the status of all consolidation transactions
 */

import * as fs from 'fs';

const API_URL = 'https://api.mainnet.hiro.so';

interface Result {
    wallet: number;
    address: string;
    sent: string;
    txId: string;
    status: string;
}

async function checkStatus() {
    const results: Result[] = JSON.parse(
        fs.readFileSync('.consolidate-results.json', 'utf-8')
    );

    console.log('═══════════════════════════════════════════════════');
    console.log('  Checking Consolidation TX Status');
    console.log('═══════════════════════════════════════════════════\n');

    let success = 0;
    let pending = 0;
    let failed = 0;
    const stuck: Result[] = [];

    for (const r of results) {
        if (!r.txId) {
            console.log(`⏭️  W${r.wallet}: skipped (no tx)`);
            continue;
        }

        try {
            const res = await fetch(`${API_URL}/extended/v1/tx/0x${r.txId}`);
            const data = (await res.json()) as any;

            const txStatus = data.tx_status || 'unknown';
            const label = `W${r.wallet} (${r.sent} STX)`;

            if (txStatus === 'success') {
                console.log(`✅ ${label}: ${txStatus}`);
                success++;
            } else if (txStatus === 'pending') {
                console.log(`⏳ ${label}: ${txStatus} — TX: ${r.txId}`);
                pending++;
                stuck.push(r);
            } else if (txStatus === 'abort_by_response' || txStatus === 'abort_by_post_condition') {
                console.log(`❌ ${label}: ${txStatus}`);
                failed++;
                stuck.push(r);
            } else {
                console.log(`❓ ${label}: ${txStatus} — TX: ${r.txId}`);
                pending++;
                stuck.push(r);
            }
        } catch (err: any) {
            console.log(`❓ W${r.wallet}: error checking — ${err.message}`);
            stuck.push(r);
        }
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log(`  ✅ Success: ${success}  |  ⏳ Pending/Stuck: ${pending}  |  ❌ Failed: ${failed}`);
    console.log('═══════════════════════════════════════════════════');

    if (stuck.length > 0) {
        console.log('\n📋 Stuck/Pending wallets that need resend:');
        for (const s of stuck) {
            // Get the nonce used
            const res = await fetch(`${API_URL}/extended/v1/tx/0x${s.txId}`);
            const data = (await res.json()) as any;
            console.log(`   W${s.wallet} | Address: ${s.address} | Nonce: ${data.nonce ?? 'unknown'} | Status: ${data.tx_status ?? 'unknown'}`);
        }
    }

    // Also check current balances of all wallets
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  Current Balances (remaining in test wallets)');
    console.log('═══════════════════════════════════════════════════\n');

    const wallets = JSON.parse(fs.readFileSync('.test-wallets.json', 'utf-8')) as any[];
    let totalRemaining = 0;
    for (const w of wallets) {
        const res = await fetch(`${API_URL}/v2/accounts/${w.address}?proof=0`);
        const data = (await res.json()) as { balance: string };
        const bal = parseInt(data.balance, 16) / 1_000_000;
        totalRemaining += bal;
        if (bal > 0) {
            console.log(`   W${w.id}: ${bal.toFixed(6)} STX  ← still has funds`);
        } else {
            console.log(`   W${w.id}: 0.000000 STX  ✅`);
        }
    }

    // Check deployer
    const dRes = await fetch(`${API_URL}/v2/accounts/SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT?proof=0`);
    const dData = (await dRes.json()) as { balance: string };
    const dBal = parseInt(dData.balance, 16) / 1_000_000;

    console.log(`\n   Deployer: ${dBal.toFixed(6)} STX`);
    console.log(`   Still in test wallets: ${totalRemaining.toFixed(6)} STX`);
}

checkStatus().catch(console.error);
