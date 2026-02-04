# TimeLock Exchange API Documentation

## Overview

TimeLock Exchange provides a comprehensive REST API and WebSocket connections for interacting with the platform. This document covers all available endpoints, authentication, and usage examples.

## Base URLs

| Environment | REST API | WebSocket |
|------------|----------|-----------|
| Production | `https://api.timelock.exchange/v1` | `wss://api.timelock.exchange/ws` |
| Testnet | `https://testnet-api.timelock.exchange/v1` | `wss://testnet-api.timelock.exchange/ws` |
| Development | `http://localhost:3001/api` | `ws://localhost:3001/ws` |

## Authentication

### API Key Authentication

Include your API key in the request headers:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.timelock.exchange/v1/positions
```

### Wallet Signature Authentication

For write operations, authenticate using a signed message:

```typescript
const message = `TimeLock Exchange Authentication\nTimestamp: ${Date.now()}`;
const signature = await wallet.signMessage(message);

fetch('/api/v1/positions', {
  method: 'POST',
  headers: {
    'X-Wallet-Address': walletAddress,
    'X-Signature': signature,
    'X-Timestamp': timestamp,
  },
  body: JSON.stringify(data),
});
```

---

## REST API Endpoints

### Positions

#### List Positions

```http
GET /v1/positions
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | string | Filter by owner address |
| `status` | string | Filter by status: `active`, `unlocked`, `cancelled`, `withdrawn` |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `sort` | string | Sort field: `created_at`, `amount`, `unlock_height` |
| `order` | string | Sort order: `asc`, `desc` |

**Response:**

```json
{
  "success": true,
  "data": {
    "positions": [
      {
        "id": 1,
        "owner": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
        "amount": 1000000000,
        "unlockHeight": 150000,
        "createdAt": 140000,
        "status": "active",
        "beneficiary": null,
        "isVesting": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

#### Get Position by ID

```http
GET /v1/positions/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "owner": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    "amount": 1000000000,
    "unlockHeight": 150000,
    "createdAt": 140000,
    "status": "active",
    "beneficiary": null,
    "isVesting": false,
    "vestingSchedule": null,
    "transactions": [
      {
        "txId": "0x1234...",
        "type": "create",
        "timestamp": 1699000000000
      }
    ]
  }
}
```

#### Create Position (via API)

```http
POST /v1/positions
```

**Request Body:**

```json
{
  "amount": 1000000000,
  "unlockHeight": 150000,
  "beneficiary": null,
  "isVesting": false,
  "vestingSchedule": null
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "transactionId": "0x1234...",
    "positionId": 42,
    "status": "pending"
  }
}
```

---

### Portfolio

#### Get Portfolio Summary

```http
GET /v1/portfolio/:address
```

**Response:**

```json
{
  "success": true,
  "data": {
    "address": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    "summary": {
      "totalPositions": 15,
      "activePositions": 12,
      "totalValueLocked": 50000000000,
      "totalUnlocked": 10000000000,
      "nextUnlock": {
        "positionId": 5,
        "amount": 5000000000,
        "unlockHeight": 151000,
        "estimatedDate": "2024-01-15T00:00:00Z"
      }
    },
    "breakdown": {
      "locked": 40000000000,
      "vesting": 8000000000,
      "unlocked": 10000000000,
      "withdrawn": 2000000000
    },
    "performance": {
      "totalDeposited": 52000000000,
      "feesAccrued": 500000000,
      "netValue": 51500000000
    }
  }
}
```

#### Get Portfolio History

```http
GET /v1/portfolio/:address/history
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `period` | string | Time period: `24h`, `7d`, `30d`, `90d`, `1y`, `all` |
| `interval` | string | Data interval: `hour`, `day`, `week` |

**Response:**

```json
{
  "success": true,
  "data": {
    "history": [
      {
        "timestamp": 1699000000000,
        "totalValue": 48000000000,
        "lockedValue": 38000000000,
        "positionCount": 14
      }
    ]
  }
}
```

---

### Staking

#### Get Staking Info

```http
GET /v1/staking/:address
```

**Response:**

```json
{
  "success": true,
  "data": {
    "staker": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    "stakedAmount": 10000000000,
    "tier": 3,
    "tierName": "Silver",
    "multiplier": 125,
    "pendingRewards": 500000000,
    "lastClaimHeight": 148000,
    "cooldownEndHeight": null,
    "unstakePending": false
  }
}
```

#### Get Global Staking Stats

```http
GET /v1/staking/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalStaked": 500000000000000,
    "totalStakers": 12500,
    "rewardsDistributed": 25000000000000,
    "currentAPY": 12.5,
    "tierDistribution": {
      "bronze": 8000,
      "silver": 3000,
      "gold": 1200,
      "platinum": 250,
      "diamond": 50
    }
  }
}
```

---

### Governance

#### List Proposals

```http
GET /v1/governance/proposals
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter: `active`, `passed`, `rejected`, `executed`, `expired` |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response:**

```json
{
  "success": true,
  "data": {
    "proposals": [
      {
        "id": 1,
        "proposer": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
        "title": "Increase staking rewards multiplier",
        "description": "Proposal to increase rewards...",
        "proposalType": 1,
        "status": "active",
        "createdAt": 145000,
        "votingEndsAt": 155000,
        "votesFor": 100000000000,
        "votesAgainst": 25000000000,
        "votesAbstain": 5000000000,
        "quorumReached": true,
        "executionDelay": 1440
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45
    }
  }
}
```

#### Get Proposal Details

```http
GET /v1/governance/proposals/:id
```

#### Get Voting Power

```http
GET /v1/governance/voting-power/:address
```

**Response:**

```json
{
  "success": true,
  "data": {
    "address": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    "ownPower": 10000000000,
    "delegatedPower": 5000000000,
    "totalPower": 15000000000,
    "delegatedTo": null,
    "delegatedFrom": [
      {
        "address": "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9",
        "amount": 5000000000
      }
    ]
  }
}
```

---

### Transactions

#### Get Transaction Status

```http
GET /v1/transactions/:txId
```

**Response:**

```json
{
  "success": true,
  "data": {
    "txId": "0x1234...",
    "status": "success",
    "type": "create-position",
    "sender": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
    "blockHeight": 149500,
    "timestamp": 1699000000000,
    "fee": 2500,
    "result": {
      "positionId": 42
    }
  }
}
```

#### List User Transactions

```http
GET /v1/transactions
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | string | Filter by sender address |
| `type` | string | Filter by type |
| `status` | string | Filter: `pending`, `success`, `failed` |
| `page` | number | Page number |
| `limit` | number | Items per page |

---

### Contract Read Operations

#### Get Contract Info

```http
GET /v1/contracts/info
```

**Response:**

```json
{
  "success": true,
  "data": {
    "timelockExchange": {
      "address": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.timelock-exchange",
      "version": "1.0.0",
      "totalPositions": 15000,
      "totalValueLocked": 500000000000000
    },
    "stakingRewards": {
      "address": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.staking-rewards",
      "totalStaked": 500000000000000,
      "rewardRate": 100000
    },
    "governance": {
      "address": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7.governance",
      "totalProposals": 45,
      "activeProposals": 3
    }
  }
}
```

---

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('wss://api.timelock.exchange/ws');

ws.onopen = () => {
  // Subscribe to channels
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['positions', 'blocks'],
    address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7'
  }));
};
```

### Channels

#### positions
Real-time position updates

```json
{
  "type": "position_update",
  "data": {
    "positionId": 42,
    "action": "created",
    "owner": "SP2J6...",
    "amount": 1000000000,
    "txId": "0x1234..."
  }
}
```

#### blocks
New block notifications

```json
{
  "type": "new_block",
  "data": {
    "height": 149501,
    "hash": "0xabcd...",
    "txCount": 150,
    "timestamp": 1699000600000
  }
}
```

#### prices
Price feed updates

```json
{
  "type": "price_update",
  "data": {
    "symbol": "STX",
    "price": 0.85,
    "change24h": 2.5,
    "timestamp": 1699000000000
  }
}
```

#### governance
Governance events

```json
{
  "type": "governance_update",
  "data": {
    "event": "vote_cast",
    "proposalId": 5,
    "voter": "SP2J6...",
    "voteFor": true,
    "votePower": 5000000000
  }
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "POSITION_NOT_FOUND",
    "message": "Position with ID 999 not found",
    "details": {
      "positionId": 999
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

| Endpoint Type | Limit |
|--------------|-------|
| Read operations | 100 requests/minute |
| Write operations | 20 requests/minute |
| WebSocket messages | 50 messages/second |

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## SDKs

### JavaScript/TypeScript

```bash
npm install @timelock-exchange/sdk
```

```typescript
import { TimeLockClient } from '@timelock-exchange/sdk';

const client = new TimeLockClient({
  apiKey: 'your-api-key',
  network: 'mainnet'
});

// Get positions
const positions = await client.positions.list({
  address: 'SP2J6...',
  status: 'active'
});

// Create position
const tx = await client.positions.create({
  amount: 1000000000,
  unlockHeight: 150000
});
```

---

## Changelog

### v1.1.0 (2024-01-15)
- Added governance endpoints
- Added staking endpoints
- WebSocket price feed support

### v1.0.0 (2024-01-01)
- Initial API release
- Position management endpoints
- Portfolio endpoints
- Transaction endpoints
