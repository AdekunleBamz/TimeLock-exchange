'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePriceOracle, useStxPrice, useBtcPrice, usePriceConverter } from '../hooks/usePriceOracle';

// ============================================================================
// Types
// ============================================================================

interface PriceDisplayProps {
  token: 'STX' | 'BTC' | 'USD';
  amount?: number;
  showChange?: boolean;
  showSparkline?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  format?: 'compact' | 'full' | 'scientific';
  className?: string;
}

interface PriceTickerProps {
  tokens?: Array<'STX' | 'BTC'>;
  autoScroll?: boolean;
  scrollSpeed?: number;
  className?: string;
}

interface PriceCardProps {
  token: 'STX' | 'BTC';
  showChart?: boolean;
  showStats?: boolean;
  className?: string;
}

interface PriceConverterWidgetProps {
  defaultFrom?: 'STX' | 'BTC' | 'USD';
  defaultTo?: 'STX' | 'BTC' | 'USD';
  className?: string;
}

interface PriceAlertBadgeProps {
  token: 'STX' | 'BTC';
  threshold: number;
  direction: 'above' | 'below';
  onTrigger?: (price: number) => void;
  className?: string;
}

interface SparklineData {
  prices: number[];
  timestamps: number[];
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatPrice(
  price: number,
  format: 'compact' | 'full' | 'scientific' = 'full',
  decimals: number = 2
): string {
  if (price === 0) return '$0.00';
  
  switch (format) {
    case 'compact':
      if (price >= 1_000_000_000) {
        return `$${(price / 1_000_000_000).toFixed(2)}B`;
      } else if (price >= 1_000_000) {
        return `$${(price / 1_000_000).toFixed(2)}M`;
      } else if (price >= 1_000) {
        return `$${(price / 1_000).toFixed(2)}K`;
      }
      return `$${price.toFixed(decimals)}`;
    
    case 'scientific':
      if (price < 0.01) {
        return `$${price.toExponential(2)}`;
      }
      return `$${price.toFixed(decimals)}`;
    
    case 'full':
    default:
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(price);
  }
}

function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function generateMockSparkline(basePrice: number, points: number = 24): SparklineData {
  const prices: number[] = [];
  const timestamps: number[] = [];
  const now = Date.now();
  
  let currentPrice = basePrice * 0.95;
  
  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.48) * (basePrice * 0.02);
    currentPrice = Math.max(currentPrice + change, basePrice * 0.8);
    currentPrice = Math.min(currentPrice, basePrice * 1.2);
    prices.push(currentPrice);
    timestamps.push(now - (points - i) * 3600000);
  }
  
  // Ensure last price is close to base price
  prices[prices.length - 1] = basePrice;
  
  return { prices, timestamps };
}

// ============================================================================
// Sparkline Component
// ============================================================================

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
  className?: string;
}

const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 100,
  height = 30,
  color = '#10B981',
  fillColor,
  strokeWidth = 1.5,
  className = '',
}) => {
  const path = useMemo(() => {
    if (data.length < 2) return '';
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });
    
    return `M${points.join(' L')}`;
  }, [data, width, height]);

  const areaPath = useMemo(() => {
    if (data.length < 2 || !fillColor) return '';
    return `${path} L${width},${height} L0,${height} Z`;
  }, [path, fillColor, width, height]);

  const isPositive = data.length >= 2 && data[data.length - 1] >= data[0];
  const actualColor = color || (isPositive ? '#10B981' : '#EF4444');
  const actualFillColor = fillColor || (isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)');

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
    >
      {areaPath && (
        <path
          d={areaPath}
          fill={actualFillColor}
        />
      )}
      <path
        d={path}
        fill="none"
        stroke={actualColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ============================================================================
// Price Display Component
// ============================================================================

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  token,
  amount = 1,
  showChange = true,
  showSparkline = false,
  size = 'md',
  format = 'full',
  className = '',
}) => {
  const { stxPrice, btcPrice, isLoading, error } = usePriceOracle();
  const [sparklineData, setSparklineData] = useState<number[]>([]);
  const [priceChange24h, setPriceChange24h] = useState(0);

  const price = useMemo(() => {
    if (token === 'USD') return 1;
    if (token === 'STX') return stxPrice || 0;
    if (token === 'BTC') return btcPrice || 0;
    return 0;
  }, [token, stxPrice, btcPrice]);

  const totalValue = price * amount;

  useEffect(() => {
    if (price > 0) {
      const data = generateMockSparkline(price);
      setSparklineData(data.prices);
      
      // Calculate mock 24h change
      const change = ((price - data.prices[0]) / data.prices[0]) * 100;
      setPriceChange24h(change);
    }
  }, [price]);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-3xl font-bold',
  };

  const changeColor = priceChange24h >= 0 ? 'text-green-500' : 'text-red-500';

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className={`h-6 bg-gray-200 dark:bg-gray-700 rounded w-24 ${sizeClasses[size]}`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-500 ${sizeClasses[size]} ${className}`}>
        Error loading price
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex flex-col">
        <div className={`font-medium ${sizeClasses[size]}`}>
          {formatPrice(totalValue, format)}
        </div>
        
        {showChange && priceChange24h !== 0 && (
          <div className={`text-xs ${changeColor}`}>
            {formatPercentage(priceChange24h)}
          </div>
        )}
      </div>
      
      {showSparkline && sparklineData.length > 0 && (
        <Sparkline
          data={sparklineData}
          width={size === 'xl' ? 120 : size === 'lg' ? 100 : 80}
          height={size === 'xl' ? 40 : size === 'lg' ? 30 : 24}
        />
      )}
    </div>
  );
};

// ============================================================================
// Price Ticker Component
// ============================================================================

export const PriceTicker: React.FC<PriceTickerProps> = ({
  tokens = ['STX', 'BTC'],
  autoScroll = true,
  scrollSpeed = 30,
  className = '',
}) => {
  const { stxPrice, btcPrice, isLoading } = usePriceOracle();
  const [stxChange] = useState(() => (Math.random() - 0.5) * 10);
  const [btcChange] = useState(() => (Math.random() - 0.5) * 5);

  const prices = {
    STX: { price: stxPrice || 0, change: stxChange, symbol: 'STX' },
    BTC: { price: btcPrice || 0, change: btcChange, symbol: 'BTC' },
  };

  if (isLoading) {
    return (
      <div className={`bg-gray-900 text-white py-2 ${className}`}>
        <div className="animate-pulse flex justify-center gap-8">
          <div className="h-4 bg-gray-700 rounded w-32" />
          <div className="h-4 bg-gray-700 rounded w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 text-white py-2 overflow-hidden ${className}`}>
      <div
        className={`flex gap-8 ${autoScroll ? 'animate-marquee' : 'justify-center'}`}
        style={autoScroll ? { animation: `marquee ${scrollSpeed}s linear infinite` } : {}}
      >
        {tokens.map((token) => {
          const { price, change, symbol } = prices[token];
          const changeColor = change >= 0 ? 'text-green-400' : 'text-red-400';
          
          return (
            <div key={token} className="flex items-center gap-2 whitespace-nowrap">
              <span className="font-semibold">{symbol}</span>
              <span>{formatPrice(price, 'full')}</span>
              <span className={changeColor}>{formatPercentage(change)}</span>
            </div>
          );
        })}
        
        {/* Duplicate for seamless scroll */}
        {autoScroll && tokens.map((token) => {
          const { price, change, symbol } = prices[token];
          const changeColor = change >= 0 ? 'text-green-400' : 'text-red-400';
          
          return (
            <div key={`${token}-dup`} className="flex items-center gap-2 whitespace-nowrap">
              <span className="font-semibold">{symbol}</span>
              <span>{formatPrice(price, 'full')}</span>
              <span className={changeColor}>{formatPercentage(change)}</span>
            </div>
          );
        })}
      </div>
      
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Price Card Component
// ============================================================================

export const PriceCard: React.FC<PriceCardProps> = ({
  token,
  showChart = true,
  showStats = true,
  className = '',
}) => {
  const { stxPrice, btcPrice, isLoading, error, lastUpdated } = usePriceOracle();
  const [sparklineData, setSparklineData] = useState<number[]>([]);
  const [stats, setStats] = useState({
    high24h: 0,
    low24h: 0,
    volume24h: 0,
    change24h: 0,
    marketCap: 0,
  });

  const price = token === 'STX' ? stxPrice : btcPrice;

  useEffect(() => {
    if (price && price > 0) {
      const data = generateMockSparkline(price, 48);
      setSparklineData(data.prices);
      
      const high = Math.max(...data.prices);
      const low = Math.min(...data.prices);
      const change = ((price - data.prices[0]) / data.prices[0]) * 100;
      
      setStats({
        high24h: high,
        low24h: low,
        volume24h: token === 'STX' ? 45_000_000 : 28_000_000_000,
        change24h: change,
        marketCap: token === 'STX' ? price * 1_450_000_000 : price * 19_500_000,
      });
    }
  }, [price, token]);

  const tokenInfo = {
    STX: {
      name: 'Stacks',
      icon: '⚡',
      color: 'purple',
    },
    BTC: {
      name: 'Bitcoin',
      icon: '₿',
      color: 'orange',
    },
  };

  const info = tokenInfo[token];
  const changeColor = stats.change24h >= 0 ? 'text-green-500' : 'text-red-500';
  const changeBg = stats.change24h >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30';

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          </div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg ${className}`}>
        <div className="text-red-500 text-center">
          <p>Error loading price data</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl
            ${info.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
            {info.icon}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{info.name}</h3>
            <p className="text-gray-500 text-sm">{token}</p>
          </div>
        </div>
        
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${changeBg} ${changeColor}`}>
          {formatPercentage(stats.change24h)}
        </span>
      </div>

      {/* Price */}
      <div className="mb-4">
        <p className="text-3xl font-bold">{formatPrice(price || 0)}</p>
        {lastUpdated && (
          <p className="text-xs text-gray-500 mt-1">
            Updated {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Chart */}
      {showChart && sparklineData.length > 0 && (
        <div className="mb-4 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <Sparkline
            data={sparklineData}
            width={280}
            height={80}
            strokeWidth={2}
          />
        </div>
      )}

      {/* Stats */}
      {showStats && (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-500">24h High</p>
            <p className="font-medium text-green-500">{formatPrice(stats.high24h)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">24h Low</p>
            <p className="font-medium text-red-500">{formatPrice(stats.low24h)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">24h Volume</p>
            <p className="font-medium">{formatPrice(stats.volume24h, 'compact')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Market Cap</p>
            <p className="font-medium">{formatPrice(stats.marketCap, 'compact')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Price Converter Widget
// ============================================================================

export const PriceConverterWidget: React.FC<PriceConverterWidgetProps> = ({
  defaultFrom = 'STX',
  defaultTo = 'USD',
  className = '',
}) => {
  const [fromToken, setFromToken] = useState<'STX' | 'BTC' | 'USD'>(defaultFrom);
  const [toToken, setToToken] = useState<'STX' | 'BTC' | 'USD'>(defaultTo);
  const [amount, setAmount] = useState<string>('1');
  
  const { stxPrice, btcPrice, isLoading } = usePriceOracle();

  const convert = useCallback((value: number, from: string, to: string): number => {
    const prices = {
      STX: stxPrice || 0,
      BTC: btcPrice || 0,
      USD: 1,
    };
    
    const fromUsd = value * prices[from as keyof typeof prices];
    return fromUsd / prices[to as keyof typeof prices];
  }, [stxPrice, btcPrice]);

  const convertedAmount = useMemo(() => {
    const value = parseFloat(amount) || 0;
    return convert(value, fromToken, toToken);
  }, [amount, fromToken, toToken, convert]);

  const handleSwap = () => {
    setFromToken(toToken);
    setToToken(fromToken);
  };

  const tokens = ['STX', 'BTC', 'USD'] as const;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Price Converter</h3>
      
      {/* From */}
      <div className="mb-4">
        <label className="block text-sm text-gray-500 mb-2">From</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
              bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="0.00"
            min="0"
            step="any"
          />
          <select
            value={fromToken}
            onChange={(e) => setFromToken(e.target.value as typeof fromToken)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
              bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {tokens.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center mb-4">
        <button
          onClick={handleSwap}
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 
            dark:hover:bg-gray-600 transition-colors"
          aria-label="Swap currencies"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* To */}
      <div className="mb-4">
        <label className="block text-sm text-gray-500 mb-2">To</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={isLoading ? 'Loading...' : convertedAmount.toFixed(6)}
            readOnly
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
              bg-gray-50 dark:bg-gray-900 cursor-not-allowed"
          />
          <select
            value={toToken}
            onChange={(e) => setToToken(e.target.value as typeof toToken)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
              bg-white dark:bg-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {tokens.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Exchange Rate */}
      <div className="text-center text-sm text-gray-500">
        1 {fromToken} = {convert(1, fromToken, toToken).toFixed(6)} {toToken}
      </div>
    </div>
  );
};

// ============================================================================
// Price Alert Badge
// ============================================================================

export const PriceAlertBadge: React.FC<PriceAlertBadgeProps> = ({
  token,
  threshold,
  direction,
  onTrigger,
  className = '',
}) => {
  const { stxPrice, btcPrice } = usePriceOracle();
  const [triggered, setTriggered] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const price = token === 'STX' ? stxPrice : btcPrice;

  useEffect(() => {
    if (!price || dismissed) return;

    const isTriggered = direction === 'above'
      ? price >= threshold
      : price <= threshold;

    if (isTriggered && !triggered) {
      setTriggered(true);
      onTrigger?.(price);
    } else if (!isTriggered) {
      setTriggered(false);
    }
  }, [price, threshold, direction, triggered, dismissed, onTrigger]);

  if (dismissed || !triggered) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg
      ${direction === 'above' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'} ${className}`}>
      <span className="text-lg">
        {direction === 'above' ? '📈' : '📉'}
      </span>
      <span className="text-sm font-medium">
        {token} is {direction} {formatPrice(threshold)}
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-auto p-1 hover:bg-black/10 rounded"
        aria-label="Dismiss alert"
      >
        ✕
      </button>
    </div>
  );
};

// ============================================================================
// Price Comparison Table
// ============================================================================

interface PriceComparisonTableProps {
  tokens?: Array<'STX' | 'BTC'>;
  className?: string;
}

export const PriceComparisonTable: React.FC<PriceComparisonTableProps> = ({
  tokens = ['STX', 'BTC'],
  className = '',
}) => {
  const { stxPrice, btcPrice, isLoading } = usePriceOracle();
  const [stats, setStats] = useState<Record<string, {
    price: number;
    change1h: number;
    change24h: number;
    change7d: number;
    volume: number;
  }>>({});

  useEffect(() => {
    const generateStats = (basePrice: number, token: string) => ({
      price: basePrice,
      change1h: (Math.random() - 0.5) * 2,
      change24h: (Math.random() - 0.5) * 10,
      change7d: (Math.random() - 0.5) * 20,
      volume: token === 'STX' ? 45_000_000 : 28_000_000_000,
    });

    if (stxPrice) {
      setStats((prev) => ({ ...prev, STX: generateStats(stxPrice, 'STX') }));
    }
    if (btcPrice) {
      setStats((prev) => ({ ...prev, BTC: generateStats(btcPrice, 'BTC') }));
    }
  }, [stxPrice, btcPrice]);

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden ${className}`}>
        <div className="animate-pulse p-6 space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  const renderChange = (value: number) => {
    const color = value >= 0 ? 'text-green-500' : 'text-red-500';
    return <span className={color}>{formatPercentage(value)}</span>;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden ${className}`}>
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Asset
            </th>
            <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Price
            </th>
            <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              1h
            </th>
            <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              24h
            </th>
            <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              7d
            </th>
            <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Volume (24h)
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {tokens.map((token) => {
            const tokenStats = stats[token];
            if (!tokenStats) return null;

            return (
              <tr key={token} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {token === 'STX' ? '⚡' : '₿'}
                    </span>
                    <div>
                      <p className="font-medium">{token === 'STX' ? 'Stacks' : 'Bitcoin'}</p>
                      <p className="text-sm text-gray-500">{token}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-medium">
                  {formatPrice(tokenStats.price)}
                </td>
                <td className="px-6 py-4 text-right">
                  {renderChange(tokenStats.change1h)}
                </td>
                <td className="px-6 py-4 text-right">
                  {renderChange(tokenStats.change24h)}
                </td>
                <td className="px-6 py-4 text-right">
                  {renderChange(tokenStats.change7d)}
                </td>
                <td className="px-6 py-4 text-right text-gray-500">
                  {formatPrice(tokenStats.volume, 'compact')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================================
// Live Price Counter
// ============================================================================

interface LivePriceCounterProps {
  token: 'STX' | 'BTC';
  updateInterval?: number;
  className?: string;
}

export const LivePriceCounter: React.FC<LivePriceCounterProps> = ({
  token,
  updateInterval = 5000,
  className = '',
}) => {
  const { stxPrice, btcPrice, refetch } = usePriceOracle();
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const price = token === 'STX' ? stxPrice : btcPrice;

  useEffect(() => {
    const interval = setInterval(() => {
      setIsUpdating(true);
      refetch?.();
      setTimeout(() => {
        setIsUpdating(false);
        setLastUpdate(Date.now());
      }, 500);
    }, updateInterval);

    return () => clearInterval(interval);
  }, [updateInterval, refetch]);

  const secondsAgo = Math.floor((Date.now() - lastUpdate) / 1000);

  return (
    <div className={`flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg ${className}`}>
      <div className={`relative ${isUpdating ? 'scale-105' : ''} transition-transform`}>
        <span className="text-4xl font-bold">{formatPrice(price || 0)}</span>
        {isUpdating && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
        )}
      </div>
      <div className="text-sm text-gray-500">
        <p>{token === 'STX' ? 'Stacks' : 'Bitcoin'}</p>
        <p className="text-xs">Updated {secondsAgo}s ago</p>
      </div>
    </div>
  );
};

// ============================================================================
// Exports
// ============================================================================

export default PriceDisplay;
