import {
    makeSTXTokenTransfer,
    broadcastTransaction,
    AnchorMode,
} from '@stacks/transactions';
import { STACKS_MAINNET } from '@stacks/network';
import * as fs from 'fs';

const API_URL = 'https://api.mainnet.hiro.so';
const DEPLOYER_ADDRESS = 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT';
// We use a high fee to guarantee it works now: 0.01 STX
const TX_FEE = 10_000n;
const DELAY_MS = 3_000;

const WALLET_IDS_TO_RESEND = [1, 2, 4, 5, 6, 7];

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getBalance(address: string): Promise<bigint> {
    const res = await fetch(`${API_URL}/v2/accounts/${address}?proof=0`);
    const data = (await res.json()) as { balance: string };
    return BigInt(parseInt(data.balance || '0', 16));
}

async function getCorrectNonce(address: string): Promise<bigint> {
    const res = await fetch(`${API_URL}/extended/v1/address/${address}/nonces`);
    const data = await res.json() as any;
    return BigInt(data.possible_next_nonce);
}

async function finalConsolidate() {
    const wallets = JSON.parse(
        fs.readFileSync('.test-wallets.json', 'utf-8')
    ) as Array<{ id: number; privateKey: string; address: string; label: string }>;

    const targetWallets = wallets.filter(w => WALLET_IDS_TO_RESEND.includes(w.id));

    console.log('═══════════════════════════════════════════════════');
    console.log('  FINAL CONSOLIDATION (0.01 STX Fee)');
    console.log(`  Target: ${DEPLOYER_ADDRESS}`);
    console.log('═══════════════════════════════════════════════════\n');

    const results: any[] = [];
    let totalSent = 0n;

    for (let i = 0; i < targetWallets.length; i++) {
        const w = targetWallets[i];
        const balance = await getBalance(w.address);

        console.log(`📤 W${w.id} (${w.label}):`);
        console.log(`   Balance: ${Number(balance) / 1000000} STX`);

        if (balance <= TX_FEE) {
            console.log(`   ⏭️ Balance too low, skipping\n`);
            continue;
        }

        const nonce = await getCorrectNonce(w.address);
        const sendAmount = balance - TX_FEE;

        console.log(`   Sending ${Number(sendAmount) / 1000000} STX with nonce ${nonce}`);

        try {
            const tx = await makeSTXTokenTransfer({
                recipient: DEPLOYER_ADDRESS,
                amount: sendAmount,
                senderKey: w.privateKey,
                network: STACKS_MAINNET,
                anchorMode: AnchorMode.Any,
                fee: TX_FEE,
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
            } else if (result && (result as any).error) {
                throw new Error((result as any).error + ' - ' + (result as any).reason);
            }

            if (txId) {
                console.log(`   ✅ New TX: ${txId}\n`);
                totalSent += sendAmount;
                results.push({ wallet: w.id, address: w.address, sent: Number(sendAmount) / 1000000, txId, status: 'broadcast', nonce: nonce.toString() });
            } else {
                console.log(`   ❌ Failed: ${JSON.stringify(result)}\n`);
            }
        } catch (err: any) {
            console.log(`   ❌ Error: ${err.message}\n`);
        }

        if (i < targetWallets.length - 1) {
            await sleep(DELAY_MS);
        }
    }

    fs.writeFileSync('.final-results.json', JSON.stringify(results, null, 2));

    console.log('═══════════════════════════════════════════════════');
    console.log(`  Total broadcasted: ${Number(totalSent) / 1000000} STX`);
    console.log('═══════════════════════════════════════════════════\n');
}

finalConsolidate().catch(console.error);
