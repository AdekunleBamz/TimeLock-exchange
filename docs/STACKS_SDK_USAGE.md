# Stacks SDK Usage Guide

This document provides comprehensive documentation for using `@stacks/connect` and `@stacks/transactions` in the TimeLock Exchange frontend.

## Table of Contents

1. [Installation](#installation)
2. [@stacks/connect - Wallet Integration](#stacksconnect---wallet-integration)
3. [@stacks/transactions - Blockchain Interactions](#stackstransactions---blockchain-interactions)
4. [Network Configuration](#network-configuration)
5. [Post Conditions (Security)](#post-conditions-security)
6. [Clarity Value Types](#clarity-value-types)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

---

## Installation

```bash
npm install @stacks/connect @stacks/transactions @stacks/network
```

### Package Versions

```json
{
  "@stacks/connect": "^7.8.0",
  "@stacks/transactions": "^6.17.0",
  "@stacks/network": "^6.17.0"
}
```

---

## @stacks/connect - Wallet Integration

The `@stacks/connect` package provides wallet connection functionality for Leather and Xverse wallets.

### Basic Setup

```typescript
import { AppConfig, UserSession, showConnect } from '@stacks/connect';

// Configure app permissions
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

// App details shown in wallet
const APP_DETAILS = {
  name: 'TimeLock Exchange',
  icon: '/logo.png',
};
```

### Connecting a Wallet

```typescript
function connectWallet() {
  showConnect({
    appDetails: APP_DETAILS,
    redirectTo: '/',
    onFinish: () => {
      // User successfully connected
      const userData = userSession.loadUserData();
      console.log('Mainnet address:', userData.profile.stxAddress.mainnet);
      console.log('Testnet address:', userData.profile.stxAddress.testnet);
    },
    onCancel: () => {
      console.log('User cancelled connection');
    },
    userSession,
  });
}
```

### Checking Connection Status

```typescript
function isConnected(): boolean {
  return userSession.isUserSignedIn();
}

function getAddress(): string | null {
  if (!userSession.isUserSignedIn()) return null;
  
  const userData = userSession.loadUserData();
  // Use mainnet address for production
  return userData.profile.stxAddress.mainnet;
}
```

### Disconnecting

```typescript
function disconnect() {
  userSession.signUserOut();
}
```

### Signing Messages

```typescript
import { showSignMessage } from '@stacks/connect';

async function signMessage(message: string): Promise<string | null> {
  return new Promise((resolve) => {
    showSignMessage({
      message,
      onFinish: (data) => {
        console.log('Signature:', data.signature);
        console.log('Public Key:', data.publicKey);
        resolve(data.signature);
      },
      onCancel: () => {
        resolve(null);
      },
    });
  });
}
```

---

## @stacks/transactions - Blockchain Interactions

The `@stacks/transactions` package is used for building transactions and making contract calls.

### Read-Only Contract Calls

```typescript
import { callReadOnlyFunction, cvToValue, uintCV, principalCV } from '@stacks/transactions';
import { StacksMainnet } from '@stacks/network';

const network = new StacksMainnet();

// Simple read call
async function getPositionCount(): Promise<number> {
  const result = await callReadOnlyFunction({
    contractAddress: 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT',
    contractName: 'timelock-exchange-v1',
    functionName: 'get-position-count',
    functionArgs: [],
    network,
    senderAddress: 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT',
  });

  const data = cvToValue(result);
  return data.value;
}

// Read call with arguments
async function getPosition(positionId: number) {
  const result = await callReadOnlyFunction({
    contractAddress: 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT',
    contractName: 'timelock-exchange-v1',
    functionName: 'get-position',
    functionArgs: [uintCV(positionId)],
    network,
    senderAddress: 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT',
  });

  return cvToValue(result);
}

// Read call with principal argument
async function getBalance(address: string) {
  const result = await callReadOnlyFunction({
    contractAddress: 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT',
    contractName: 'timelock-token-v11-1',
    functionName: 'get-balance',
    functionArgs: [principalCV(address)],
    network,
    senderAddress: 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT',
  });

  return cvToValue(result);
}
```

### Contract Write Calls

```typescript
import { openContractCall } from '@stacks/connect';
import {
  uintCV,
  principalCV,
  PostConditionMode,
  makeStandardSTXPostCondition,
  FungibleConditionCode,
} from '@stacks/transactions';

// Create a position
async function createPosition(amount: number, duration: number): Promise<string | null> {
  return new Promise((resolve) => {
    openContractCall({
      contractAddress: 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT',
      contractName: 'timelock-exchange-v1',
      functionName: 'create-position',
      functionArgs: [
        uintCV(amount * 1_000_000), // Convert to microSTX
        uintCV(duration),
      ],
      postConditionMode: PostConditionMode.Deny,
      postConditions: [
        makeStandardSTXPostCondition(
          userAddress,
          FungibleConditionCode.LessEqual,
          BigInt(amount * 1_000_000)
        ),
      ],
      onFinish: (data) => {
        console.log('Transaction ID:', data.txId);
        resolve(data.txId);
      },
      onCancel: () => {
        console.log('User cancelled');
        resolve(null);
      },
    });
  });
}

// Transfer tokens
async function transferToken(recipient: string, amount: bigint): Promise<string | null> {
  return new Promise((resolve) => {
    openContractCall({
      contractAddress: 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT',
      contractName: 'timelock-token-v11-1',
      functionName: 'transfer',
      functionArgs: [
        uintCV(Number(amount)),
        principalCV(userAddress),
        principalCV(recipient),
      ],
      postConditionMode: PostConditionMode.Deny,
      postConditions: [
        makeStandardFungiblePostCondition(
          userAddress,
          FungibleConditionCode.Equal,
          amount,
          createAssetInfo(
            'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT',
            'timelock-token-v11-1',
            'timelock-token'
          )
        ),
      ],
      onFinish: (data) => resolve(data.txId),
      onCancel: () => resolve(null),
    });
  });
}
```

### STX Transfers

```typescript
import { openSTXTransfer } from '@stacks/connect';

async function sendSTX(recipient: string, amount: number, memo?: string) {
  openSTXTransfer({
    recipient,
    amount: BigInt(amount * 1_000_000), // microSTX
    memo: memo || '',
    onFinish: (data) => {
      console.log('TX:', data.txId);
    },
    onCancel: () => {
      console.log('Cancelled');
    },
  });
}
```

---

## Network Configuration

### Available Networks

```typescript
import { StacksMainnet, StacksTestnet, StacksDevnet } from '@stacks/network';

// For mainnet production
const mainnet = new StacksMainnet();

// For testnet development
const testnet = new StacksTestnet();

// For local development with Clarinet
const devnet = new StacksDevnet();
```

### Dynamic Network Selection

```typescript
import { StacksMainnet, StacksTestnet, StacksDevnet, StacksNetwork } from '@stacks/network';

type NetworkType = 'mainnet' | 'testnet' | 'devnet';

function getNetwork(networkType: NetworkType = 'mainnet'): StacksNetwork {
  switch (networkType) {
    case 'mainnet':
      return new StacksMainnet();
    case 'testnet':
      return new StacksTestnet();
    case 'devnet':
    default:
      return new StacksDevnet();
  }
}
```

### Custom Network URLs

```typescript
const customMainnet = new StacksMainnet({
  url: 'https://api.mainnet.hiro.so',
});

const customTestnet = new StacksTestnet({
  url: 'https://api.testnet.hiro.so',
});
```

---

## Post Conditions (Security)

Post conditions protect users by ensuring transactions only affect funds as expected.

### STX Post Conditions

```typescript
import {
  makeStandardSTXPostCondition,
  makeContractSTXPostCondition,
  FungibleConditionCode,
} from '@stacks/transactions';

// User can send at most 1 STX
const maxStxCondition = makeStandardSTXPostCondition(
  userAddress,
  FungibleConditionCode.LessEqual,
  BigInt(1_000_000)
);

// User must send exactly 0.5 STX
const exactStxCondition = makeStandardSTXPostCondition(
  userAddress,
  FungibleConditionCode.Equal,
  BigInt(500_000)
);

// Contract must send at least 1 STX
const contractCondition = makeContractSTXPostCondition(
  'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT',
  'vault-v1',
  FungibleConditionCode.GreaterEqual,
  BigInt(1_000_000)
);
```

### Fungible Token Post Conditions

```typescript
import {
  makeStandardFungiblePostCondition,
  FungibleConditionCode,
  createAssetInfo,
} from '@stacks/transactions';

const tokenCondition = makeStandardFungiblePostCondition(
  userAddress,
  FungibleConditionCode.Equal,
  BigInt(100_000_000), // 100 tokens
  createAssetInfo(
    'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT',
    'timelock-token-v11-1',
    'timelock-token'
  )
);
```

### NFT Post Conditions

```typescript
import {
  makeStandardNonFungiblePostCondition,
  NonFungibleConditionCode,
  createAssetInfo,
  uintCV,
} from '@stacks/transactions';

const nftCondition = makeStandardNonFungiblePostCondition(
  userAddress,
  NonFungibleConditionCode.Sends,
  createAssetInfo(
    'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT',
    'position-nft-v11-1',
    'position-nft'
  ),
  uintCV(1) // Token ID
);
```

### Condition Codes

```typescript
// Fungible (STX and tokens)
FungibleConditionCode.Equal          // Must be exactly this amount
FungibleConditionCode.Greater        // Must be greater than
FungibleConditionCode.GreaterEqual   // Must be greater than or equal
FungibleConditionCode.Less           // Must be less than
FungibleConditionCode.LessEqual      // Must be less than or equal

// Non-Fungible (NFTs)
NonFungibleConditionCode.Sends       // Must send the NFT
NonFungibleConditionCode.DoesNotSend // Must NOT send the NFT
```

---

## Clarity Value Types

### Creating Clarity Values

```typescript
import {
  uintCV,           // Unsigned integers (u128)
  intCV,            // Signed integers (i128)
  principalCV,      // Stacks addresses
  bufferCV,         // Raw bytes
  stringAsciiCV,    // ASCII strings
  stringUtf8CV,     // UTF-8 strings
  boolCV,           // Booleans
  noneCV,           // Optional none
  someCV,           // Optional some
  listCV,           // Lists
  tupleCV,          // Tuples/records
  responseOkCV,     // (ok value)
  responseErrCV,    // (err value)
} from '@stacks/transactions';

// Examples
const amount = uintCV(1000000);
const negAmount = intCV(-500);
const user = principalCV('SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT');
const hash = bufferCV(new Uint8Array(32));
const name = stringAsciiCV('TimeLock');
const description = stringUtf8CV('A decentralized exchange 🚀');
const active = boolCV(true);
const empty = noneCV();
const wrapped = someCV(uintCV(100));
const items = listCV([uintCV(1), uintCV(2), uintCV(3)]);
const record = tupleCV({
  amount: uintCV(100),
  owner: principalCV('SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT'),
  active: boolCV(true),
});
```

### Converting Clarity Values to JavaScript

```typescript
import { cvToValue, cvToJSON, cvToHex } from '@stacks/transactions';

const result = await callReadOnlyFunction({...});

// Convert to JavaScript value
const jsValue = cvToValue(result);

// Convert to JSON
const jsonValue = cvToJSON(result);

// Convert to hex string
const hexValue = cvToHex(result);
```

---

## Error Handling

### Handling Contract Call Errors

```typescript
async function safeContractCall() {
  try {
    const result = await callReadOnlyFunction({
      contractAddress: 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT',
      contractName: 'timelock-exchange-v1',
      functionName: 'get-position',
      functionArgs: [uintCV(999999)], // Non-existent position
      network,
      senderAddress: 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT',
    });

    const data = cvToValue(result);
    
    // Check for Clarity error responses
    if (data === null || data === undefined) {
      throw new Error('Position not found');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Contract call failed:', error.message);
    }
    throw error;
  }
}
```

### Handling Transaction Errors

```typescript
openContractCall({
  ...options,
  onFinish: (data) => {
    console.log('TX submitted:', data.txId);
    // Note: This only means the transaction was submitted,
    // not that it succeeded. You need to poll for status.
  },
  onCancel: () => {
    // User cancelled in wallet
    console.log('User cancelled transaction');
  },
});

// To check transaction status, poll the API:
async function checkTxStatus(txId: string) {
  const response = await fetch(
    `https://api.mainnet.hiro.so/extended/v1/tx/${txId}`
  );
  const data = await response.json();
  return data.tx_status; // 'pending', 'success', 'abort_by_response', etc.
}
```

---

## Best Practices

### 1. Always Use Post Conditions

```typescript
// ❌ Don't do this - no protection
openContractCall({
  ...options,
  postConditionMode: PostConditionMode.Allow,
});

// ✅ Do this - protect user funds
openContractCall({
  ...options,
  postConditionMode: PostConditionMode.Deny,
  postConditions: [
    makeStandardSTXPostCondition(
      userAddress,
      FungibleConditionCode.LessEqual,
      expectedAmount
    ),
  ],
});
```

### 2. Validate Addresses

```typescript
function isValidStacksAddress(address: string): boolean {
  // Mainnet addresses start with SP, testnet with ST
  return /^S[PT][A-Z0-9]{38,}$/.test(address);
}
```

### 3. Handle Network Errors

```typescript
async function robustContractCall() {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callReadOnlyFunction({...});
    } catch (error) {
      lastError = error as Error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }

  throw lastError;
}
```

### 4. Use React Query for Caching

```typescript
import { useQuery } from '@tanstack/react-query';

function usePosition(positionId: number) {
  return useQuery({
    queryKey: ['position', positionId],
    queryFn: () => getPosition(positionId),
    staleTime: 30000, // 30 seconds
    retry: 3,
  });
}
```

### 5. Format Amounts Correctly

```typescript
const MICRO_STX = 1_000_000;

// Convert STX to microSTX for contract calls
function toMicroSTX(stx: number): bigint {
  return BigInt(Math.floor(stx * MICRO_STX));
}

// Convert microSTX to STX for display
function fromMicroSTX(microStx: bigint): number {
  return Number(microStx) / MICRO_STX;
}
```

---

## Deployed Contract Reference

All contracts deployed at: `SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT`

| Contract | Name | Description |
|----------|------|-------------|
| fee-collector-v11-1 | Fee Collector | Collect and distribute fees |
| position-nft-v11-1 | Position NFT | SIP-009 NFT for positions |
| timelock-token-v11-1 | TLX Token | Platform utility token |
| batch-transfer-v1 | Batch Transfer | Bulk transfers |
| emergency-withdraw-v1 | Emergency Withdraw | Emergency fund access |
| escrow-v1 | Escrow | P2P escrow service |
| governance-v1 | Governance | DAO voting |
| price-oracle-v1 | Price Oracle | Price feeds |
| rewards-distributor-v1 | Rewards Distributor | Merkle rewards |
| staking-v1 | Staking | Token staking |
| staking-rewards-v2 | Staking Rewards | Reward distribution |
| timelock-exchange-v1 | TimeLock Exchange | Main exchange |
| vault-v1 | Vault | Secure vaults |
