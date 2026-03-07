import * as fs from 'fs';

const API_URL = 'https://api.mainnet.hiro.so';

async function checkStatus() {
    console.log('Checking status of the resent transactions...');
    let results;
    try {
        results = JSON.parse(fs.readFileSync('.resend-results.json', 'utf-8'));
    } catch (e) {
        console.error('Could not read .resend-results.json', e);
        return;
    }

    for (const r of results) {
        if (!r.txId) continue;

        try {
            const res = await fetch(`${API_URL}/extended/v1/tx/0x${r.txId}`);
            const data = await res.json() as any;

            console.log(`\nWallet ${r.wallet} (${r.address}):`);
            console.log(`  TX ID: ${r.txId}`);
            if (data.error) {
                console.log(`  TX Status: ERROR (${data.error}) - possibly dropped from mempool`);
            } else {
                console.log(`  TX Status: ${data.tx_status}`);
            }

            // Check account details directly
            const accInfo = await fetch(`${API_URL}/v2/accounts/${r.address}?proof=0`);
            const accData = await accInfo.json() as any;
            console.log(`  Balance: ${parseInt(accData.balance || '0', 16) / 1000000} STX`);
            console.log(`  Nonce: ${accData.nonce}`);

        } catch (err: any) {
            console.log(`  Error checking data: ${err.message}`);
        }
    }
}

checkStatus().catch(console.error);
