import { NextRequest, NextResponse } from 'next/server';

// API Route: Get position history for a user
// GET /api/positions/history?address=ST...

interface HistoryEvent {
  id: string;
  positionId: number;
  eventType: 'created' | 'extended' | 'topped-up' | 'claimed' | 'transferred' | 'emergency-claimed';
  timestamp: number;
  blockHeight: number;
  txId: string;
  details: {
    amount?: number;
    previousAmount?: number;
    newAmount?: number;
    previousUnlockHeight?: number;
    newUnlockHeight?: number;
    from?: string;
    to?: string;
    feesPaid?: number;
    penaltyPaid?: number;
  };
}

interface HistoryResponse {
  success: boolean;
  data?: {
    events: HistoryEvent[];
    totalCount: number;
    page: number;
    pageSize: number;
  };
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const eventType = searchParams.get('eventType');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    if (!address) {
      return NextResponse.json<HistoryResponse>(
        { success: false, error: 'Address is required' },
        { status: 400 }
      );
    }

    // Validate address
    if (!address.startsWith('ST') && !address.startsWith('SP')) {
      return NextResponse.json<HistoryResponse>(
        { success: false, error: 'Invalid Stacks address format' },
        { status: 400 }
      );
    }

    // Fetch history
    let events = await fetchPositionHistory(address);

    // Filter by event type if specified
    if (eventType) {
      events = events.filter(e => e.eventType === eventType);
    }

    // Paginate
    const startIndex = (page - 1) * pageSize;
    const paginatedEvents = events.slice(startIndex, startIndex + pageSize);

    return NextResponse.json<HistoryResponse>({
      success: true,
      data: {
        events: paginatedEvents,
        totalCount: events.length,
        page,
        pageSize,
      },
    });
  } catch (error) {
    console.error('Error fetching position history:', error);
    return NextResponse.json<HistoryResponse>(
      { success: false, error: 'Failed to fetch position history' },
      { status: 500 }
    );
  }
}

async function fetchPositionHistory(address: string): Promise<HistoryEvent[]> {
  // In production, this would fetch from blockchain indexer or database
  // Generate mock data for development
  const events: HistoryEvent[] = [];
  const eventTypes: HistoryEvent['eventType'][] = [
    'created',
    'extended',
    'topped-up',
    'claimed',
    'transferred',
    'emergency-claimed',
  ];

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const currentBlockHeight = Math.floor(now / 600000);

  for (let i = 0; i < 50; i++) {
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const daysAgo = Math.floor(Math.random() * 60);
    const timestamp = now - daysAgo * dayMs;
    const blockHeight = currentBlockHeight - daysAgo * 144;
    const positionId = Math.floor(Math.random() * 10) + 1;
    const amount = Math.floor(Math.random() * 10000000) + 100000;

    const event: HistoryEvent = {
      id: `event-${i}-${Date.now()}`,
      positionId,
      eventType,
      timestamp,
      blockHeight,
      txId: `0x${generateRandomHex(64)}`,
      details: {},
    };

    // Add type-specific details
    switch (eventType) {
      case 'created':
        event.details.amount = amount;
        break;
      case 'claimed':
      case 'emergency-claimed':
        event.details.amount = amount;
        event.details.feesPaid = Math.floor(amount * 0.01);
        if (eventType === 'emergency-claimed') {
          event.details.penaltyPaid = Math.floor(amount * 0.05);
        }
        break;
      case 'extended':
        event.details.previousUnlockHeight = blockHeight + 1000;
        event.details.newUnlockHeight = blockHeight + 10000;
        break;
      case 'topped-up':
        event.details.previousAmount = amount;
        event.details.newAmount = amount + Math.floor(Math.random() * 5000000);
        break;
      case 'transferred':
        event.details.amount = amount;
        event.details.from = address;
        event.details.to = `ST${generateRandomHex(38).toUpperCase()}`;
        break;
    }

    events.push(event);
  }

  // Sort by timestamp descending
  return events.sort((a, b) => b.timestamp - a.timestamp);
}

function generateRandomHex(length: number): string {
  let result = '';
  const characters = '0123456789abcdef';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
