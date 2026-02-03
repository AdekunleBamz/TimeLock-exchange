import { NextRequest, NextResponse } from 'next/server';

// API Route: Get user portfolio
// GET /api/portfolio/[address]

interface PortfolioPosition {
  id: number;
  amount: number;
  unlockHeight: number;
  status: 'locked' | 'unlocked' | 'claimed';
  createdAt: number;
  estimatedValue: number;
}

interface PortfolioMetrics {
  totalLocked: number;
  totalUnlocked: number;
  totalClaimed: number;
  totalPositions: number;
  activePositions: number;
  averageLockDuration: number;
}

interface PortfolioResponse {
  success: boolean;
  data?: {
    address: string;
    positions: PortfolioPosition[];
    metrics: PortfolioMetrics;
    lastUpdated: string;
  };
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json<PortfolioResponse>(
        { success: false, error: 'Address is required' },
        { status: 400 }
      );
    }

    // Validate address format
    if (!address.startsWith('ST') && !address.startsWith('SP')) {
      return NextResponse.json<PortfolioResponse>(
        { success: false, error: 'Invalid Stacks address format' },
        { status: 400 }
      );
    }

    // Fetch portfolio data
    const portfolioData = await fetchPortfolio(address);

    return NextResponse.json<PortfolioResponse>({
      success: true,
      data: portfolioData,
    });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json<PortfolioResponse>(
      { success: false, error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}

async function fetchPortfolio(address: string) {
  // In production, this would fetch from the blockchain
  // For now, generate realistic mock data
  const currentBlockHeight = Math.floor(Date.now() / 600000);
  const positions: PortfolioPosition[] = [];

  const numPositions = Math.floor(Math.random() * 8) + 3;

  for (let i = 1; i <= numPositions; i++) {
    const unlockOffset = Math.floor(Math.random() * 200000) - 100000;
    const unlockHeight = currentBlockHeight + unlockOffset;
    const amount = Math.floor(Math.random() * 50000000) + 1000000;

    let status: PortfolioPosition['status'] = 'locked';
    if (unlockHeight <= currentBlockHeight) {
      status = Math.random() > 0.3 ? 'unlocked' : 'claimed';
    }

    positions.push({
      id: i,
      amount,
      unlockHeight,
      status,
      createdAt: Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000,
      estimatedValue: amount * (1 + (Math.random() * 0.1 - 0.05)),
    });
  }

  // Calculate metrics
  const lockedPositions = positions.filter(p => p.status === 'locked');
  const unlockedPositions = positions.filter(p => p.status === 'unlocked');
  const claimedPositions = positions.filter(p => p.status === 'claimed');

  const metrics: PortfolioMetrics = {
    totalLocked: lockedPositions.reduce((sum, p) => sum + p.amount, 0),
    totalUnlocked: unlockedPositions.reduce((sum, p) => sum + p.amount, 0),
    totalClaimed: claimedPositions.reduce((sum, p) => sum + p.amount, 0),
    totalPositions: positions.length,
    activePositions: lockedPositions.length + unlockedPositions.length,
    averageLockDuration: lockedPositions.length > 0
      ? lockedPositions.reduce((sum, p) => sum + (p.unlockHeight - currentBlockHeight), 0) / lockedPositions.length
      : 0,
  };

  return {
    address,
    positions,
    metrics,
    lastUpdated: new Date().toISOString(),
  };
}
