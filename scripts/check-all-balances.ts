const API_URL = 'https://api.mainnet.hiro.so';

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

async function checkAll() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Checking ALL 14 Recipients');
  console.log('═══════════════════════════════════════════════════\n');

  let totalReceived = 0;
  let confirmed = 0;
  let pending = 0;

  for (let i = 0; i < RECIPIENTS.length; i++) {
    const r = await fetch(API_URL + '/v2/accounts/' + RECIPIENTS[i] + '?proof=0');
    const data = await r.json();
    const balance = parseInt(data.balance || '0', 16);
    const stx = balance / 1000000;
    
    if (stx > 0) {
      confirmed++;
      totalReceived += stx;
      console.log(`✅ ${String(i+1).padStart(2)}: ${stx.toFixed(4)} STX`);
    } else {
      pending++;
      console.log(`⏳ ${String(i+1).padStart(2)}: 0.0000 STX`);
    }
  }

  // Check funder
  const funder = 'SP3ZPHMYXF4440JQJZ2EF76YNESPECBQ7CMXJ6NJ8';
  const f = await fetch(API_URL + '/v2/accounts/' + funder + '?proof=0');
  const fdata = await f.json();
  const fbal = parseInt(fdata.balance || '0', 16);
  const fstx = Number(fbal) / 1000000;

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════');
  console.log(`\n📤 Funder (W1): ${fstx.toFixed(4)} STX`);
  console.log(`   Originally: 6.5 STX`);
  console.log(`   Sent: ${(6.5 - fstx).toFixed(4)} STX`);
  console.log(`\n📥 Recipients:`);
  console.log(`   Confirmed: ${confirmed}`);
  console.log(`   Pending:   ${pending}`);
  console.log(`   Total Received: ${Number(totalReceived) / 1000000} STX`);
  console.log('\n═══════════════════════════════════════════════════');
}

checkAll();
