import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface PriceData {
  price: number;
  timestamp: Date;
  blockHeight: number;
  confidence: number;
  numReporters: number;
}

export interface TwapData {
  price: number;
  window: number;
  lastUpdate: Date;
}

export interface PriceChange {
  current: number;
  historical: number;
  changeBps: number;
  changePercent: number;
  isIncrease: boolean;
  period: string;
}

export interface PricePair {
  pair: string;
  baseAsset: string;
  quoteAsset: string;
  decimals: number;
  isActive: boolean;
}

export interface UsePriceOracleOptions {
  pairs?: string[];
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableTwap?: boolean;
  onPriceUpdate?: (pair: string, price: PriceData) => void;
  onError?: (error: Error) => void;
}

export interface UsePriceOracleReturn {
  // State
  isLoading: boolean;
  error: Error | null;
  
  // Data
  prices: Map<string, PriceData>;
  twapPrices: Map<string, TwapData>;
  priceChanges: Map<string, PriceChange>;
  availablePairs: PricePair[];
  
  // Computed
  getPrice: (pair: string) => number | null;
  getTwap: (pair: string) => number | null;
  getPriceChange: (pair: string) => PriceChange | null;
  isStale: (pair: string) => boolean;
  
  // Actions
  refresh: () => Promise<void>;
  subscribeToPrice: (pair: string) => void;
  unsubscribeFromPrice: (pair: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PAIRS = ['STX/USD', 'BTC/USD'];
const DEFAULT_OPTIONS: UsePriceOracleOptions = {
  pairs: DEFAULT_PAIRS,
  autoRefresh: true,
  refreshInterval: 60000, // 1 minute
  enableTwap: true
};

const PRICE_DECIMALS = 8;
const MAX_PRICE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// Helper Functions
// ============================================================================

function formatPrice(rawPrice: bigint, decimals: number = PRICE_DECIMALS): number {
  return Number(rawPrice) / Math.pow(10, decimals);
}

function isPriceStale(timestamp: Date, maxAgeMs: number = MAX_PRICE_AGE_MS): boolean {
  return Date.now() - timestamp.getTime() > maxAgeMs;
}

function calculatePriceChange(current: number, historical: number): PriceChange {
  const changeBps = Math.abs(((current - historical) / historical) * 10000);
  const changePercent = changeBps / 100;
  
  return {
    current,
    historical,
    changeBps: Math.round(changeBps),
    changePercent: Math.round(changePercent * 100) / 100,
    isIncrease: current > historical,
    period: '24h'
  };
}

// ============================================================================
// Main Hook
// ============================================================================

export function usePriceOracle(options: UsePriceOracleOptions = {}): UsePriceOracleReturn {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [prices, setPrices] = useState<Map<string, PriceData>>(new Map());
  const [twapPrices, setTwapPrices] = useState<Map<string, TwapData>>(new Map());
  const [priceChanges, setPriceChanges] = useState<Map<string, PriceChange>>(new Map());
  const [availablePairs, setAvailablePairs] = useState<PricePair[]>([]);
  const [subscribedPairs, setSubscribedPairs] = useState<Set<string>>(
    new Set(mergedOptions.pairs || [])
  );
  
  // Fetch price data from oracle
  const fetchPrices = useCallback(async () => {
    try {
      setError(null);
      
      const pairsToFetch = Array.from(subscribedPairs);
      
      // Simulated oracle data - replace with actual contract calls
      const mockPrices: Map<string, PriceData> = new Map();
      const mockTwap: Map<string, TwapData> = new Map();
      const mockChanges: Map<string, PriceChange> = new Map();
      
      for (const pair of pairsToFetch) {
        // Generate realistic-looking price data
        let basePrice: number;
        switch (pair) {
          case 'STX/USD':
            basePrice = 1.85 + (Math.random() - 0.5) * 0.1;
            break;
          case 'BTC/USD':
            basePrice = 67500 + (Math.random() - 0.5) * 1000;
            break;
          default:
            basePrice = 1;
        }
        
        const priceData: PriceData = {
          price: basePrice,
          timestamp: new Date(),
          blockHeight: 115000 + Math.floor(Math.random() * 100),
          confidence: 9500 + Math.floor(Math.random() * 500),
          numReporters: 3 + Math.floor(Math.random() * 4)
        };
        
        mockPrices.set(pair, priceData);
        
        // TWAP data
        const twapPrice = basePrice * (1 + (Math.random() - 0.5) * 0.02);
        mockTwap.set(pair, {
          price: twapPrice,
          window: 24,
          lastUpdate: new Date()
        });
        
        // 24h price change
        const historicalPrice = basePrice * (1 + (Math.random() - 0.5) * 0.1);
        mockChanges.set(pair, calculatePriceChange(basePrice, historicalPrice));
        
        // Trigger callback
        mergedOptions.onPriceUpdate?.(pair, priceData);
      }
      
      setPrices(mockPrices);
      setTwapPrices(mockTwap);
      setPriceChanges(mockChanges);
      
      // Available pairs
      setAvailablePairs([
        { pair: 'STX/USD', baseAsset: 'STX', quoteAsset: 'USD', decimals: 8, isActive: true },
        { pair: 'BTC/USD', baseAsset: 'BTC', quoteAsset: 'USD', decimals: 8, isActive: true },
        { pair: 'ETH/USD', baseAsset: 'ETH', quoteAsset: 'USD', decimals: 8, isActive: true },
        { pair: 'STX/BTC', baseAsset: 'STX', quoteAsset: 'BTC', decimals: 8, isActive: true }
      ]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch prices');
      setError(error);
      mergedOptions.onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [subscribedPairs, mergedOptions]);
  
  // Initial load and auto-refresh
  useEffect(() => {
    fetchPrices();
    
    if (mergedOptions.autoRefresh && mergedOptions.refreshInterval) {
      const interval = setInterval(fetchPrices, mergedOptions.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchPrices, mergedOptions.autoRefresh, mergedOptions.refreshInterval]);
  
  // Computed getters
  const getPrice = useCallback((pair: string): number | null => {
    const priceData = prices.get(pair);
    return priceData ? priceData.price : null;
  }, [prices]);
  
  const getTwap = useCallback((pair: string): number | null => {
    const twapData = twapPrices.get(pair);
    return twapData ? twapData.price : null;
  }, [twapPrices]);
  
  const getPriceChange = useCallback((pair: string): PriceChange | null => {
    return priceChanges.get(pair) || null;
  }, [priceChanges]);
  
  const isStale = useCallback((pair: string): boolean => {
    const priceData = prices.get(pair);
    if (!priceData) return true;
    return isPriceStale(priceData.timestamp);
  }, [prices]);
  
  // Subscription management
  const subscribeToPrice = useCallback((pair: string) => {
    setSubscribedPairs(prev => new Set(prev).add(pair));
  }, []);
  
  const unsubscribeFromPrice = useCallback((pair: string) => {
    setSubscribedPairs(prev => {
      const newSet = new Set(prev);
      newSet.delete(pair);
      return newSet;
    });
  }, []);
  
  const refresh = useCallback(async () => {
    await fetchPrices();
  }, [fetchPrices]);
  
  return {
    isLoading,
    error,
    prices,
    twapPrices,
    priceChanges,
    availablePairs,
    getPrice,
    getTwap,
    getPriceChange,
    isStale,
    refresh,
    subscribeToPrice,
    unsubscribeFromPrice
  };
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Hook for a single price pair
 */
export function usePrice(pair: string) {
  const { prices, twapPrices, priceChanges, isLoading, isStale, refresh } = usePriceOracle({
    pairs: [pair]
  });
  
  const priceData = prices.get(pair);
  const twapData = twapPrices.get(pair);
  const changeData = priceChanges.get(pair);
  
  return {
    price: priceData?.price || null,
    priceData,
    twap: twapData?.price || null,
    change: changeData,
    isLoading,
    isStale: isStale(pair),
    refresh
  };
}

/**
 * Hook for STX/USD price specifically
 */
export function useStxPrice() {
  return usePrice('STX/USD');
}

/**
 * Hook for BTC/USD price specifically
 */
export function useBtcPrice() {
  return usePrice('BTC/USD');
}

/**
 * Hook for converting values using oracle prices
 */
export function usePriceConverter() {
  const { getPrice } = usePriceOracle();
  
  const convert = useCallback((
    amount: number,
    fromAsset: string,
    toAsset: string
  ): number | null => {
    if (fromAsset === toAsset) return amount;
    
    // Direct pair lookup
    const directPair = `${fromAsset}/${toAsset}`;
    const directPrice = getPrice(directPair);
    if (directPrice !== null) {
      return amount * directPrice;
    }
    
    // Reverse pair lookup
    const reversePair = `${toAsset}/${fromAsset}`;
    const reversePrice = getPrice(reversePair);
    if (reversePrice !== null && reversePrice !== 0) {
      return amount / reversePrice;
    }
    
    // Cross through USD
    const fromUsdPair = `${fromAsset}/USD`;
    const toUsdPair = `${toAsset}/USD`;
    const fromUsdPrice = getPrice(fromUsdPair);
    const toUsdPrice = getPrice(toUsdPair);
    
    if (fromUsdPrice !== null && toUsdPrice !== null && toUsdPrice !== 0) {
      const usdValue = amount * fromUsdPrice;
      return usdValue / toUsdPrice;
    }
    
    return null;
  }, [getPrice]);
  
  const formatUsd = useCallback((amount: number, asset: string): string | null => {
    const usdValue = convert(amount, asset, 'USD');
    if (usdValue === null) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(usdValue);
  }, [convert]);
  
  return {
    convert,
    formatUsd
  };
}

/**
 * Hook for price alerts
 */
export function usePriceAlert(
  pair: string,
  threshold: number,
  type: 'above' | 'below',
  onTrigger: (price: number) => void
) {
  const { price } = usePrice(pair);
  const [hasTriggered, setHasTriggered] = useState(false);
  
  useEffect(() => {
    if (price === null || hasTriggered) return;
    
    const shouldTrigger = type === 'above' 
      ? price >= threshold 
      : price <= threshold;
    
    if (shouldTrigger) {
      setHasTriggered(true);
      onTrigger(price);
    }
  }, [price, threshold, type, hasTriggered, onTrigger]);
  
  const reset = useCallback(() => {
    setHasTriggered(false);
  }, []);
  
  return {
    price,
    hasTriggered,
    reset
  };
}

export default usePriceOracle;
