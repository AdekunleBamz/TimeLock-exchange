'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  id?: string;
}

export interface UseWebSocketOptions {
  url: string;
  protocols?: string | string[];
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

export interface UseWebSocketReturn<T = unknown> {
  status: WebSocketStatus;
  lastMessage: WebSocketMessage<T> | null;
  messages: WebSocketMessage<T>[];
  send: (message: WebSocketMessage | string) => void;
  connect: () => void;
  disconnect: () => void;
  clearMessages: () => void;
  isConnected: boolean;
  reconnectCount: number;
}

// ============================================================================
// WebSocket Hook
// ============================================================================

export function useWebSocket<T = unknown>(
  options: UseWebSocketOptions
): UseWebSocketReturn<T> {
  const {
    url,
    protocols,
    autoConnect = true,
    reconnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    heartbeatInterval = 30000,
    onOpen,
    onClose,
    onError,
    onMessage,
  } = options;

  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage<T> | null>(null);
  const [messages, setMessages] = useState<WebSocketMessage<T>[]>([]);
  const [reconnectCount, setReconnectCount] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Clear timeouts
  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval <= 0) return;

    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'ping',
          payload: null,
          timestamp: Date.now(),
        }));
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Close existing connection
    if (socketRef.current) {
      socketRef.current.close();
    }

    setStatus('connecting');

    try {
      socketRef.current = protocols
        ? new WebSocket(url, protocols)
        : new WebSocket(url);

      socketRef.current.onopen = (event) => {
        if (!mountedRef.current) return;
        setStatus('connected');
        setReconnectCount(0);
        startHeartbeat();
        onOpen?.(event);
      };

      socketRef.current.onclose = (event) => {
        if (!mountedRef.current) return;
        setStatus('disconnected');
        clearTimeouts();

        onClose?.(event);

        // Auto-reconnect
        if (reconnect && reconnectCount < reconnectAttempts && !event.wasClean) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setReconnectCount((prev) => prev + 1);
              connect();
            }
          }, reconnectInterval * Math.pow(2, reconnectCount)); // Exponential backoff
        }
      };

      socketRef.current.onerror = (event) => {
        if (!mountedRef.current) return;
        setStatus('error');
        onError?.(event);
      };

      socketRef.current.onmessage = (event) => {
        if (!mountedRef.current) return;

        try {
          const data = JSON.parse(event.data);
          const message: WebSocketMessage<T> = {
            type: data.type || 'message',
            payload: data.payload ?? data,
            timestamp: data.timestamp || Date.now(),
            id: data.id,
          };

          // Ignore pong messages
          if (message.type === 'pong') return;

          setLastMessage(message);
          setMessages((prev) => [...prev.slice(-99), message]); // Keep last 100 messages
          onMessage?.(message);
        } catch {
          // Handle non-JSON messages
          const message: WebSocketMessage<T> = {
            type: 'raw',
            payload: event.data as T,
            timestamp: Date.now(),
          };
          setLastMessage(message);
          setMessages((prev) => [...prev.slice(-99), message]);
          onMessage?.(message);
        }
      };
    } catch (error) {
      setStatus('error');
      console.error('WebSocket connection error:', error);
    }
  }, [
    url,
    protocols,
    reconnect,
    reconnectAttempts,
    reconnectInterval,
    reconnectCount,
    onOpen,
    onClose,
    onError,
    onMessage,
    startHeartbeat,
    clearTimeouts,
  ]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    clearTimeouts();
    if (socketRef.current) {
      socketRef.current.close(1000, 'Client disconnecting');
      socketRef.current = null;
    }
    setStatus('disconnected');
  }, [clearTimeouts]);

  // Send message
  const send = useCallback((message: WebSocketMessage | string) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected');
      return;
    }

    const data = typeof message === 'string' ? message : JSON.stringify(message);
    socketRef.current.send(data);
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastMessage(null);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    mountedRef.current = true;

    if (autoConnect) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    status,
    lastMessage,
    messages,
    send,
    connect,
    disconnect,
    clearMessages,
    isConnected: status === 'connected',
    reconnectCount,
  };
}

// ============================================================================
// Specialized Hooks for TimeLock Exchange
// ============================================================================

// Position updates subscription
export interface PositionUpdate {
  positionId: number;
  owner: string;
  action: 'created' | 'cancelled' | 'withdrawn' | 'transferred' | 'vested';
  amount?: number;
  timestamp: number;
  blockHeight: number;
  txId: string;
}

export function usePositionUpdates(address?: string) {
  const [updates, setUpdates] = useState<PositionUpdate[]>([]);

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://api.timelock.exchange/ws';

  const { status, lastMessage, send, isConnected } = useWebSocket<PositionUpdate>({
    url: `${wsUrl}/positions`,
    autoConnect: !!address,
    onOpen: () => {
      if (address) {
        send({
          type: 'subscribe',
          payload: { address },
          timestamp: Date.now(),
        });
      }
    },
    onMessage: (message) => {
      if (message.type === 'position_update') {
        setUpdates((prev) => [message.payload, ...prev.slice(0, 49)]);
      }
    },
  });

  // Subscribe when address changes
  useEffect(() => {
    if (isConnected && address) {
      send({
        type: 'subscribe',
        payload: { address },
        timestamp: Date.now(),
      });
    }
  }, [address, isConnected, send]);

  return {
    updates,
    latestUpdate: updates[0] || null,
    status,
    lastMessage,
    isConnected,
  };
}

// Price feed subscription
export interface PriceFeed {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  timestamp: number;
}

export function usePriceFeed(symbols: string[] = ['STX', 'BTC']) {
  const [prices, setPrices] = useState<Record<string, PriceFeed>>({});

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://api.timelock.exchange/ws';

  const { status, send, isConnected } = useWebSocket<PriceFeed>({
    url: `${wsUrl}/prices`,
    autoConnect: symbols.length > 0,
    onOpen: () => {
      send({
        type: 'subscribe',
        payload: { symbols },
        timestamp: Date.now(),
      });
    },
    onMessage: (message) => {
      if (message.type === 'price_update') {
        const feed = message.payload;
        setPrices((prev) => ({
          ...prev,
          [feed.symbol]: feed,
        }));
      }
    },
  });

  // Resubscribe when symbols change
  useEffect(() => {
    if (isConnected && symbols.length > 0) {
      send({
        type: 'subscribe',
        payload: { symbols },
        timestamp: Date.now(),
      });
    }
  }, [symbols.join(','), isConnected, send]);

  return {
    prices,
    status,
    isConnected,
    getPrice: (symbol: string) => prices[symbol] || null,
  };
}

// Block height subscription
export interface BlockInfo {
  height: number;
  hash: string;
  timestamp: number;
  txCount: number;
}

export function useBlockUpdates() {
  const [currentBlock, setCurrentBlock] = useState<BlockInfo | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<BlockInfo[]>([]);

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://api.timelock.exchange/ws';

  const { status, isConnected } = useWebSocket<BlockInfo>({
    url: `${wsUrl}/blocks`,
    autoConnect: true,
    onMessage: (message) => {
      if (message.type === 'new_block') {
        const block = message.payload;
        setCurrentBlock(block);
        setRecentBlocks((prev) => [block, ...prev.slice(0, 9)]);
      }
    },
  });

  return {
    currentBlock,
    recentBlocks,
    status,
    isConnected,
    currentHeight: currentBlock?.height || 0,
  };
}

// Transaction notifications
export interface TransactionNotification {
  txId: string;
  type: 'pending' | 'success' | 'failed';
  function: string;
  sender: string;
  timestamp: number;
  blockHeight?: number;
  error?: string;
}

export function useTransactionNotifications(address?: string) {
  const [notifications, setNotifications] = useState<TransactionNotification[]>([]);
  const [pendingTxs, setPendingTxs] = useState<Set<string>>(new Set());

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://api.timelock.exchange/ws';

  const { status, send, isConnected } = useWebSocket<TransactionNotification>({
    url: `${wsUrl}/transactions`,
    autoConnect: !!address,
    onOpen: () => {
      if (address) {
        send({
          type: 'subscribe',
          payload: { address },
          timestamp: Date.now(),
        });
      }
    },
    onMessage: (message) => {
      if (message.type === 'tx_notification') {
        const notification = message.payload;
        
        setNotifications((prev) => [notification, ...prev.slice(0, 49)]);
        
        if (notification.type === 'pending') {
          setPendingTxs((prev) => new Set([...prev, notification.txId]));
        } else {
          setPendingTxs((prev) => {
            const next = new Set(prev);
            next.delete(notification.txId);
            return next;
          });
        }
      }
    },
  });

  useEffect(() => {
    if (isConnected && address) {
      send({
        type: 'subscribe',
        payload: { address },
        timestamp: Date.now(),
      });
    }
  }, [address, isConnected, send]);

  return {
    notifications,
    pendingTxs: Array.from(pendingTxs),
    hasPendingTxs: pendingTxs.size > 0,
    status,
    isConnected,
  };
}

// Governance updates
export interface GovernanceUpdate {
  type: 'proposal_created' | 'vote_cast' | 'proposal_executed' | 'proposal_ended';
  proposalId: number;
  data: {
    title?: string;
    voter?: string;
    voteFor?: boolean;
    votePower?: number;
    result?: 'passed' | 'rejected';
  };
  timestamp: number;
}

export function useGovernanceUpdates() {
  const [updates, setUpdates] = useState<GovernanceUpdate[]>([]);
  const [activeProposals, setActiveProposals] = useState<Set<number>>(new Set());

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://api.timelock.exchange/ws';

  const { status, isConnected } = useWebSocket<GovernanceUpdate>({
    url: `${wsUrl}/governance`,
    autoConnect: true,
    onMessage: (message) => {
      if (message.type === 'governance_update') {
        const update = message.payload;
        setUpdates((prev) => [update, ...prev.slice(0, 99)]);

        if (update.type === 'proposal_created') {
          setActiveProposals((prev) => new Set([...prev, update.proposalId]));
        } else if (update.type === 'proposal_ended' || update.type === 'proposal_executed') {
          setActiveProposals((prev) => {
            const next = new Set(prev);
            next.delete(update.proposalId);
            return next;
          });
        }
      }
    },
  });

  return {
    updates,
    activeProposals: Array.from(activeProposals),
    status,
    isConnected,
    latestUpdate: updates[0] || null,
  };
}

// Staking rewards updates
export interface StakingUpdate {
  type: 'staked' | 'unstaked' | 'rewards_claimed' | 'tier_changed';
  staker: string;
  amount?: number;
  newTier?: number;
  totalStaked?: number;
  timestamp: number;
}

export function useStakingUpdates(address?: string) {
  const [updates, setUpdates] = useState<StakingUpdate[]>([]);
  const [myStakeInfo, setMyStakeInfo] = useState<{
    staked: number;
    tier: number;
    pendingRewards: number;
  } | null>(null);

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://api.timelock.exchange/ws';

  const { status, send, isConnected } = useWebSocket<StakingUpdate>({
    url: `${wsUrl}/staking`,
    autoConnect: true,
    onOpen: () => {
      if (address) {
        send({
          type: 'subscribe',
          payload: { address },
          timestamp: Date.now(),
        });
      }
    },
    onMessage: (message) => {
      if (message.type === 'staking_update') {
        const update = message.payload;
        setUpdates((prev) => [update, ...prev.slice(0, 49)]);

        // Update personal stake info if applicable
        if (address && update.staker === address) {
          setMyStakeInfo((prev) => ({
            staked: update.totalStaked ?? prev?.staked ?? 0,
            tier: update.newTier ?? prev?.tier ?? 0,
            pendingRewards: prev?.pendingRewards ?? 0,
          }));
        }
      }
    },
  });

  useEffect(() => {
    if (isConnected && address) {
      send({
        type: 'subscribe',
        payload: { address },
        timestamp: Date.now(),
      });
    }
  }, [address, isConnected, send]);

  return {
    updates,
    myStakeInfo,
    status,
    isConnected,
    latestUpdate: updates[0] || null,
  };
}

export default useWebSocket;
