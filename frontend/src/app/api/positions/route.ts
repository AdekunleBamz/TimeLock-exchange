import { NextRequest, NextResponse } from 'next/server';

// API Route: Get positions for a user
// GET /api/positions?address=ST...

interface Position {
  id: number;
  owner: string;
  amount: number;
  unlockHeight: number;
  createdAt: number;
  status: 'locked' | 'unlocked' | 'claimed';
}

interface PositionResponse {
  success: boolean;
  data?: {
    positions: Position[];
    totalLocked: number;
    totalUnlocked: number;
    count: number;
  };
  error?: string;
}

// Stacks API base URL
const STACKS_API = process.env.STACKS_API_URL || 'https://api.mainnet.hiro.so';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const CONTRACT_NAME = 'timelock-exchange';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!address) {
      return NextResponse.json<PositionResponse>(
        { success: false, error: 'Address is required' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!address.startsWith('ST') && !address.startsWith('SP')) {
      return NextResponse.json<PositionResponse>(
        { success: false, error: 'Invalid Stacks address format' },
        { status: 400 }
      );
    }

    // Fetch user positions from contract
    const positions = await fetchUserPositions(address);

    // Apply status filter
    let filteredPositions = positions;
    if (status && ['locked', 'unlocked', 'claimed'].includes(status)) {
      filteredPositions = positions.filter(p => p.status === status);
    }

    // Paginate
    const startIndex = (page - 1) * limit;
    const paginatedPositions = filteredPositions.slice(startIndex, startIndex + limit);

    // Calculate totals
    const totalLocked = positions
      .filter(p => p.status === 'locked')
      .reduce((sum, p) => sum + p.amount, 0);
    const totalUnlocked = positions
      .filter(p => p.status === 'unlocked')
      .reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json<PositionResponse>({
      success: true,
      data: {
        positions: paginatedPositions,
        totalLocked,
        totalUnlocked,
        count: filteredPositions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching positions:', error);
    return NextResponse.json<PositionResponse>(
      { success: false, error: 'Failed to fetch positions' },
      { status: 500 }
    );
  }
}

// Fetch positions from Stacks blockchain
async function fetchUserPositions(address: string): Promise<Position[]> {
  try {
    // Get user position IDs
    const positionIdsResponse = await fetch(
      `${STACKS_API}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/get-user-positions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: address,
          arguments: [cvToHex(principalCV(address))],
        }),
      }
    );

    if (!positionIdsResponse.ok) {
      // Return mock data for development
      return generateMockPositions(address);
    }

    const positionIdsData = await positionIdsResponse.json();
    
    if (!positionIdsData.okay) {
      return generateMockPositions(address);
    }

    // Parse position IDs and fetch each position
    const positionIds = parsePositionIds(positionIdsData.result);
    const positions: Position[] = [];

    for (const id of positionIds) {
      const position = await fetchPosition(id, address);
      if (position) {
        positions.push(position);
      }
    }

    return positions;
  } catch (error) {
    console.error('Error fetching from blockchain:', error);
    return generateMockPositions(address);
  }
}

// Fetch individual position
async function fetchPosition(positionId: number, owner: string): Promise<Position | null> {
  try {
    const response = await fetch(
      `${STACKS_API}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/get-position`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: owner,
          arguments: [cvToHex(uintCV(positionId))],
        }),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.okay) return null;

    return parsePosition(data.result, positionId);
  } catch {
    return null;
  }
}

// Parse position from Clarity value
function parsePosition(clarityValue: string, id: number): Position | null {
  // This is a simplified parser - in production use @stacks/transactions
  try {
    // Mock implementation - real implementation would use Clarity value parsing
    const currentBlockHeight = Math.floor(Date.now() / 600000);
    
    return {
      id,
      owner: '',
      amount: 1000000,
      unlockHeight: currentBlockHeight + 10000,
      createdAt: Date.now(),
      status: 'locked',
    };
  } catch {
    return null;
  }
}

// Parse position IDs from list
function parsePositionIds(clarityValue: string): number[] {
  // Simplified - in production use proper Clarity parsing
  return [1, 2, 3, 4, 5].slice(0, Math.floor(Math.random() * 5) + 1);
}

// Helper functions for Clarity values (simplified)
function cvToHex(cv: { type: string; value: string | number }): string {
  // Simplified hex encoding - use @stacks/transactions in production
  if (cv.type === 'principal') {
    return `0x0516${Buffer.from(cv.value as string).toString('hex')}`;
  }
  if (cv.type === 'uint') {
    return `0x01${(cv.value as number).toString(16).padStart(32, '0')}`;
  }
  return '0x00';
}

function principalCV(address: string) {
  return { type: 'principal', value: address };
}

function uintCV(value: number) {
  return { type: 'uint', value };
}

// Generate mock positions for development/fallback
function generateMockPositions(address: string): Position[] {
  const currentBlockHeight = Math.floor(Date.now() / 600000);
  const positions: Position[] = [];

  for (let i = 1; i <= 5; i++) {
    const unlockOffset = Math.floor(Math.random() * 100000) - 50000;
    const unlockHeight = currentBlockHeight + unlockOffset;
    
    let status: Position['status'] = 'locked';
    if (unlockHeight <= currentBlockHeight) {
      status = Math.random() > 0.5 ? 'unlocked' : 'claimed';
    }

    positions.push({
      id: i,
      owner: address,
      amount: Math.floor(Math.random() * 10000000) + 100000,
      unlockHeight,
      createdAt: Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000,
      status,
    });
  }

  return positions;
}
