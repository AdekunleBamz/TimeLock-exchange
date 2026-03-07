/**
 * Check transaction status on Stacks mainnet
 */

const API_URL = 'https://api.mainnet.hiro.so';

const TX_IDS = [
  'cbd3fa4a1f4fa501f162448fd30b7d14856b36241445a65f7b0d58c556d4c050',
  '4094268b32aa1cf10b0ad4f045c0f4deb9ed896fe9b66bbcd9f2c6d5493c660a',
  'df1e41dc7999952e89c465242e79a5f57f4f40263db2e53387865fee32508d79',
  '73cb7f055656f4b30f1eab8096e863d1fda5bf3ff18ab9d258c1d409779571f7',
  '696afdd2d85d8d4a2c4184c4cdc1d30cca9e3a918ee1ec43a3955d922a3f3273',
  '43df7416e624d2b6631736d4ee0209cef9137d06a9eb35d47f8ff98d3b8cd477',
  'e68fb512f656a86d59b2fd9608978d34555f92fbf74e0b5b12e1b713dbaeccf7',
  'cdb5221e38dab0e7ae43607ae5da6317e3b58a15e42755b96665f9881a04b8e9',
  '32b6b3d9d1a36a8bd75146624ab3a1e8bd56d35bc853210e0d2f7d277a0d8cd4',
  '4335c54307429348b82e7de7627e3e539f86bbeec1bde4697469d20716fc5ec3',
  '953489a870fe599af352ea5128ff7e02f0418410379bb086ea0fdcf8544ad007',
  'e4fec89b1d44caf3e697b32bb7059625b293ca1c5f360dc1997d60c01fd9162b',
  '0495f99e71b7671ebf77bd9b80f047752eb426f4dfa7ca2c928a3c3421bac738',
  '779584d310d5981c5be1c36abf88c4b0cadce1aac27d6b5479c6627eb42da4cd',
];

const RECIPIENTS = [
  'SP29JENQKG8YR2SSKV8CYPRZG5JZG3TZS7ZAJ96YG',
  'SP2N3R71J5V2Y0VERWRPVPZ66AYEVCCM2QWKJJW83',
  'SPC2Y3RABF2AZNB8Z1ZTG9MW9R14GNBC5XS747MB',
  'SP9MDXYN9WPF675W4WPDMT844QT5TF003JDXTSMP',
  'SP3QKMVF54VJNGWQ367XCQD6QCVY2H1QKWBTXTSM1',
  'SP1FHQ64CXXN7EST3WQXDET3FC5PQWKXTPEMW88V4',
  'SP1PNZJGV1VTTDER9JCW304QPQRQXB6KTS15BWEH9',
  'SP388XY3F996RS911S20616TV59B8HJ1ACK5DCC9E',
  'SP3BZ4H10H4AA9SNC7768PQDTW9H75P6VX53RME0Q',
  'SP1T2NRSGP1P4XRW7PABZJBQTX9GTMDPJS0A2G0RN',
  'SPZYJVHVBDZZQY5H0G0C1NCRD56WWFR0VW9KR1FB',
  'SP1WYFNCXXMZZ8X0Q1RX6V4HD6BBDH5JW7R1GDHFC',
  'SP3B027HTCR24E2NC23SDRDCTDR2CTEMKSKEVB72K',
  'SP2X0FFAZSD56VV0PX7HVWC37N43N4H1QG7M867Z1',
];

async function checkTx(txId: string, recipient: string): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/extended/v1/tx/${txId}`);
    const data = await res.json() as any;
    
    let status = 'UNKNOWN';
    if (data.tx_status === 'success') status = '✅ CONFIRMED';
    else if (data.tx_status === 'abort_by_response' || data.tx_status === 'abort_by_post_condition') status = '❌ FAILED';
    else if (data.tx_status === 'pending') status = '⏳ PENDING';
    else if (data.burn_block_time) status = '✅ CONFIRMED';
    else status = '⏳ IN MEMPOOL';
    
    console.log(`${status} | ${recipient.slice(0, 12)}... | ${txId.slice(0, 16)}...`);
    
    // Check balance
    const balRes = await fetch(`${API_URL}/v2/accounts/${recipient}?proof=0`);
    const bal = await balRes.json() as any;
    const balSTX = parseInt(bal.balance || '0', 16) / 1_000_000;
    console.log(`         Balance: ${balSTX.toFixed(4)} STX\n`);
  } catch (err) {
    console.log(`❓ ERROR checking ${txId}: ${err}`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Transaction Status Check');
  console.log('═══════════════════════════════════════════════════\n');
  
  for (let i = 0; i < TX_IDS.length; i++) {
    await checkTx(TX_IDS[i], RECIPIENTS[i]);
  }
  
  console.log('═══════════════════════════════════════════════════');
}

main().catch(console.error);
