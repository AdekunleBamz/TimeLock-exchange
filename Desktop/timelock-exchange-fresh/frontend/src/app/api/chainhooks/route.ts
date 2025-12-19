import { NextRequest, NextResponse } from 'next/server';
import { ChainhooksClient, ChainhookDefinition, CHAINHOOKS_BASE_URL } from '@hirosystems/chainhooks-client';

const client = new ChainhooksClient({
  baseUrl: CHAINHOOKS_BASE_URL.mainnet,
  apiKey: process.env.CHAINHOOKS_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const chainhook: ChainhookDefinition = {
      name: 'Timelock Exchange Event Monitor',
      chain: 'stacks',
      network: 'mainnet',
      filters: {
        predicate: {
          kind: 'print_event',
          contract_identifier: process.env.NEXT_PUBLIC_TIMELOCK_EXCHANGE_CONTRACT,
        },
      },
      options: {},
      action: {
        type: 'http_post',
        url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/webhook`,
      },
    };

    const result = await client.registerChainhook(chainhook);
    return NextResponse.json({ success: true, uuid: result.uuid });
  } catch (error) {
    console.error('Failed to register chainhook:', error);
    return NextResponse.json({ error: 'Failed to register chainhook' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const chainhooks = await client.getChainhooks();
    return NextResponse.json(chainhooks);
  } catch (error) {
    console.error('Failed to get chainhooks:', error);
    return NextResponse.json({ error: 'Failed to get chainhooks' }, { status: 500 });
  }
}
