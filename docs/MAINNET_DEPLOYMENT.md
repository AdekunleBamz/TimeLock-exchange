# TimeLock Exchange - Mainnet Deployment Guide

## Overview

This document details the mainnet deployment of TimeLock Exchange on the Stacks blockchain. All contracts have been deployed, verified, and are ready for production use.

**Deployer Address:** `SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT`

## Deployed Contracts

| Contract | Mainnet Address | Purpose |
|----------|-----------------|---------|
| Fee Collector | `SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.fee-collector-v11-1` | Collects and manages protocol fees |
| Position NFT | `SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.position-nft-v11-1` | NFT representation of locked positions |
| TimeLock Token | `SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.timelock-token-v11-1` | Protocol governance token (TLX) |
| Batch Transfer | `SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.batch-transfer-v1` | Batch STX and token transfers |
| Emergency Withdraw | `SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.emergency-withdraw-v1` | Emergency withdrawal mechanism |
| Escrow | `SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.escrow-v1` | P2P escrow with milestone releases |
| Governance | `SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.governance-v1` | On-chain governance (proposals, voting) |
| Price Oracle | `SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.price-oracle-v1` | Price feed oracle |
| Rewards Distributor | `SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.rewards-distributor-v1` | Merkle-based rewards distribution |
| Staking | `SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.staking-v1` | Stake STX for rewards |
| Staking Rewards | `SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.staking-rewards-v2` | Staking rewards calculation |
| TimeLock Exchange | `SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.timelock-exchange-v1` | Core position management |
| Vault | `SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.vault-v1` | Multi-asset vault with withdrawal delays |

## Network Configuration

### Mainnet Settings

```typescript
// Network configuration
const MAINNET_CONFIG = {
  network: 'mainnet',
  chainId: 1,
  apiUrl: 'https://api.mainnet.hiro.so',
  explorerUrl: 'https://explorer.hiro.so',
  deployer: 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT',
};
```

### Required Dependencies

```bash
npm install @stacks/connect@^7.8.0 @stacks/transactions@^6.17.0 @stacks/network@^6.17.0
```

## Frontend Integration

### Environment Variables

Create a `.env.local` file in your frontend directory:

```env
# Network Configuration
NEXT_PUBLIC_NETWORK=mainnet

# Deployer Address (Mainnet)
NEXT_PUBLIC_DEPLOYER_ADDRESS=SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT

# Contract Addresses (Mainnet)
NEXT_PUBLIC_TIMELOCK_EXCHANGE=SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.timelock-exchange-v1
NEXT_PUBLIC_FEE_COLLECTOR=SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.fee-collector-v11-1
NEXT_PUBLIC_POSITION_NFT=SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.position-nft-v11-1
NEXT_PUBLIC_TIMELOCK_TOKEN=SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.timelock-token-v11-1
NEXT_PUBLIC_BATCH_TRANSFER=SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.batch-transfer-v1
NEXT_PUBLIC_EMERGENCY_WITHDRAW=SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.emergency-withdraw-v1
NEXT_PUBLIC_ESCROW=SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.escrow-v1
NEXT_PUBLIC_GOVERNANCE=SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.governance-v1
NEXT_PUBLIC_PRICE_ORACLE=SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.price-oracle-v1
NEXT_PUBLIC_REWARDS_DISTRIBUTOR=SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.rewards-distributor-v1
NEXT_PUBLIC_STAKING=SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.staking-v1
NEXT_PUBLIC_STAKING_REWARDS=SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.staking-rewards-v2
NEXT_PUBLIC_VAULT=SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.vault-v1

# API Configuration
NEXT_PUBLIC_HIRO_API_URL=https://api.mainnet.hiro.so
NEXT_PUBLIC_EXPLORER_URL=https://explorer.hiro.so
```

### Contract Connection Example

```typescript
import { openContractCall } from '@stacks/connect';
import { 
  uintCV, 
  PostConditionMode,
  makeStandardSTXPostCondition,
  FungibleConditionCode,
} from '@stacks/transactions';
import { StacksMainnet } from '@stacks/network';

const DEPLOYER = 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT';
const network = new StacksMainnet();

// Create a 30-day locked position with 100 STX
async function createPosition(amount: number, lockDays: number) {
  const amountMicroSTX = amount * 1_000_000;
  
  await openContractCall({
    contractAddress: DEPLOYER,
    contractName: 'timelock-exchange-v1',
    functionName: 'create-position',
    functionArgs: [
      uintCV(amountMicroSTX),
      uintCV(lockDays),
    ],
    postConditions: [
      makeStandardSTXPostCondition(
        userAddress,
        FungibleConditionCode.Equal,
        amountMicroSTX
      ),
    ],
    postConditionMode: PostConditionMode.Deny,
    network,
    onFinish: (data) => {
      console.log('Position created, tx:', data.txId);
      window.open(`https://explorer.hiro.so/txid/${data.txId}`, '_blank');
    },
    onCancel: () => {
      console.log('User cancelled transaction');
    },
  });
}
```

### Read Contract Data

```typescript
import { callReadOnlyFunction, cvToValue, uintCV } from '@stacks/transactions';
import { StacksMainnet } from '@stacks/network';

const DEPLOYER = 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT';
const network = new StacksMainnet();

// Get position details
async function getPosition(positionId: number) {
  const result = await callReadOnlyFunction({
    contractAddress: DEPLOYER,
    contractName: 'timelock-exchange-v1',
    functionName: 'get-position',
    functionArgs: [uintCV(positionId)],
    network,
    senderAddress: DEPLOYER,
  });
  
  return cvToValue(result);
}

// Get staking stats
async function getStakingStats(userAddress: string) {
  const result = await callReadOnlyFunction({
    contractAddress: DEPLOYER,
    contractName: 'staking-v1',
    functionName: 'get-stake-info',
    functionArgs: [principalCV(userAddress)],
    network,
    senderAddress: DEPLOYER,
  });
  
  return cvToValue(result);
}
```

## Contract Explorer Links

Quick links to view contracts on Hiro Explorer:

- [TimeLock Exchange](https://explorer.hiro.so/address/SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.timelock-exchange-v1)
- [Fee Collector](https://explorer.hiro.so/address/SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.fee-collector-v11-1)
- [Position NFT](https://explorer.hiro.so/address/SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.position-nft-v11-1)
- [Staking](https://explorer.hiro.so/address/SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.staking-v1)
- [Governance](https://explorer.hiro.so/address/SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.governance-v1)
- [Vault](https://explorer.hiro.so/address/SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.vault-v1)
- [Escrow](https://explorer.hiro.so/address/SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.escrow-v1)

## Security Considerations

### Post Conditions

Always use post conditions to protect users from unexpected token transfers:

```typescript
import {
  makeStandardSTXPostCondition,
  makeContractSTXPostCondition,
  FungibleConditionCode,
  PostConditionMode,
} from '@stacks/transactions';

// For deposits - user sends exact amount
const depositCondition = makeStandardSTXPostCondition(
  userAddress,
  FungibleConditionCode.Equal,
  amount
);

// For withdrawals - contract sends at least expected amount
const withdrawCondition = makeContractSTXPostCondition(
  DEPLOYER,
  'timelock-exchange-v1',
  FungibleConditionCode.GreaterEqual,
  expectedAmount
);
```

### Network Validation

Always verify the network before transactions:

```typescript
import { StacksMainnet, StacksTestnet } from '@stacks/network';

function getNetwork() {
  const isMainnet = process.env.NEXT_PUBLIC_NETWORK === 'mainnet';
  return isMainnet ? new StacksMainnet() : new StacksTestnet();
}

// Validate address prefix matches network
function validateAddress(address: string, network: 'mainnet' | 'testnet') {
  const expectedPrefix = network === 'mainnet' ? 'SP' : 'ST';
  if (!address.startsWith(expectedPrefix)) {
    throw new Error(`Invalid address for ${network}. Expected ${expectedPrefix} prefix.`);
  }
}
```

## Monitoring & Maintenance

### API Health Check

```typescript
async function checkNetworkHealth() {
  const response = await fetch('https://api.mainnet.hiro.so/v2/info');
  const data = await response.json();
  
  return {
    healthy: response.ok,
    blockHeight: data.stacks_tip_height,
    network: data.network_id === 1 ? 'mainnet' : 'testnet',
  };
}
```

### Transaction Monitoring

```typescript
async function monitorTransaction(txId: string) {
  const response = await fetch(
    `https://api.mainnet.hiro.so/extended/v1/tx/${txId}`
  );
  const data = await response.json();
  
  return {
    status: data.tx_status,
    blockHeight: data.block_height,
    confirmed: data.tx_status === 'success',
  };
}
```

## Deployment Verification

To verify the deployment, you can:

1. **Check contract source on Explorer:**
   - Visit the contract addresses above
   - Click "Contract" tab to view source code

2. **Call read-only functions:**
   ```bash
   # Using Stacks CLI
   stx call_read_only_function \
     SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT \
     timelock-exchange-v1 \
     get-contract-info \
     --network mainnet
   ```

3. **Verify via API:**
   ```bash
   curl https://api.mainnet.hiro.so/v2/contracts/interface/SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT/timelock-exchange-v1
   ```

## Support

- **Documentation:** [docs/](../docs/)
- **Security:** See [SECURITY_AUDIT.md](./SECURITY_AUDIT.md)
- **API Reference:** See [API.md](./API.md)
- **User Guide:** See [USER_GUIDE.md](./USER_GUIDE.md)
