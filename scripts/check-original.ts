import * as fs from 'fs';

const API_URL = 'https://api.mainnet.hiro.so';

async function checkOriginals() {
    console.log('Checking original consolidation transactions...');
    let results;
    try {
        results = JSON.parse(fs.readFileSync('.consolidate-results.json', 'utf-8'));
    } catch (e) {
        console.error('Could not read .consolidate-results.json', e);
        return;
    }

    for (const r of results) {
        if (!r.txId) continue;

        try {
            const res = await fetch(`${API_URL}/extended/v1/tx/0x${r.txId}`);
            const data = await res.json() as any;

            console.log(`\nWallet ${r.wallet} (${r.address}):`);
            console.log(`  Original TX ID: ${r.txId}`);
            if (data.error) {
                console.log(`  Status: ERROR (${data.error}) - NOT FOUND in mempool`);
            } else {
                console.log(`  Status: ${data.tx_status}`);
            }

        } catch (err: any) {
            console.log(`  Error: ${err.message}`);
        }
    }
}

checkOriginals().catch(console.error);
