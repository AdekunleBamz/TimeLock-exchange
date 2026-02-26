# TimeLock Exchange

A decentralized timelock exchange built on the Stacks blockchain, featuring position NFTs for time-locked assets, passkey authentication, and demonstration of Clarity 4 smart contract features.

> **Built with [`@stacks/connect`](https://connect.stacks.js.org) and [`@stacks/transactions`](https://stacks.js.org)** - The official Stacks.js SDKs for wallet integration and blockchain interactions.

## 🏗️ Project Structure

```
timelock-exchange/
├── contracts/               # Clarity smart contracts
│   ├── timelock-exchange.clar   # Main exchange contract
│   ├── position-nft.clar        # SIP-009 NFT for positions
│   ├── fee-collector.clar       # Fee collection contract
│   ├── staking-rewards.clar     # Staking rewards distribution
│   ├── governance.clar          # DAO governance system
│   ├── emergency-withdraw.clar  # Emergency withdrawal system
│   ├── rewards-distributor.clar # Merkle proof rewards
│   └── liquidity-pool.clar      # AMM liquidity pools
├── frontend/               # Next.js frontend
│   └── src/
│       ├── app/            # Next.js app router
│       ├── components/     # React components
│       ├── hooks/          # Custom React hooks
│       │   └── useStacks.ts    # @stacks/connect & @stacks/transactions hooks
│       └── lib/            # Utilities & helpers
│           ├── constants.ts    # Network & contract config
│           ├── types.ts        # TypeScript types
│           ├── contracts.ts    # Contract interaction helpers
│           └── wallet-context.tsx  # Wallet state management
├── tests/                  # Clarity contract tests
├── deployments/            # Deployment configs
└── settings/               # Network settings
```

## ✨ Features

### Smart Contracts (Clarity 4)
- **Time-locked Positions** - Lock STX for a specified duration
- **Position NFTs** - Receive an NFT representing your locked position
- **Passkey Authentication** - WebAuthn support via `secp256r1-verify`
- **Bot Verification** - Verify trading bots via `contract-hash?`
- **Block Timestamps** - Use `stacks-block-time` for time-based logic
- **Staking Rewards** - Earn rewards for staking positions
- **Governance** - On-chain DAO voting for protocol upgrades
- **Liquidity Pools** - AMM-style token swaps

### Frontend
- **Wallet Connection** - Connect with Leather/Xverse via `@stacks/connect`
- **Contract Interactions** - Read/write calls via `@stacks/transactions`
- **React Hooks** - Custom hooks for Stacks SDK (`useStacks.ts`)
- **Real-time Stats** - View positions, fees, and NFT counts
- **Responsive UI** - Built with Tailwind CSS

---

## 📦 Stacks.js SDK Integration

This project extensively uses **@stacks/connect** and **@stacks/transactions** for all blockchain interactions.

### Installation

```bash
npm install @stacks/connect @stacks/transactions @stacks/network
```

### Package Versions (frontend/package.json)

```json
{
  "dependencies": {
    "@stacks/connect": "^7.8.0",
    "@stacks/network": "^6.17.0",
    "@stacks/transactions": "^6.17.0"
  }
}
```

---

## 🔐 @stacks/connect - Wallet Authentication

The `@stacks/connect` package handles wallet connections, user sessions, and transaction signing with Leather/Xverse wallets.

### Key Files
- [`frontend/src/lib/wallet-context.tsx`](frontend/src/lib/wallet-context.tsx) - Wallet context provider
- [`frontend/src/hooks/useStacks.ts`](frontend/src/hooks/useStacks.ts) - React hooks for wallet auth
- [`frontend/src/components/ConnectWallet.tsx`](frontend/src/components/ConnectWallet.tsx) - UI component

### Authentication Flow

```typescript
// frontend/src/lib/wallet-context.tsx
import { AppConfig, UserSession, showConnect, UserData } from '@stacks/connect';

// 1. Configure app permissions
const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });

// 2. Show wallet connection modal
showConnect({
  appDetails: { 
    name: 'TimeLock Exchange', 
    icon: '/logo.png' 
  },
  redirectTo: '/',
  onFinish: () => {
    // User connected successfully
    const userData = userSession.loadUserData();
    console.log('Connected:', userData.profile.stxAddress.mainnet);
  },
  onCancel: () => {
    // User cancelled connection
  },
  userSession,
});

// 3. Check connection status
if (userSession.isUserSignedIn()) {
  const userData = userSession.loadUserData();
  const address = userData.profile.stxAddress.mainnet; // or .testnet
}

// 4. Sign out
userSession.signUserOut();
```

### React Hook Usage

```typescript
// Using the custom useStacksAuth hook
import { useStacksAuth } from '@/hooks/useStacks';

function ConnectButton() {
  const { connect, disconnect, isConnected, address } = useStacksAuth();

  if (isConnected) {
    return (
      <div>
        <span>{address?.slice(0, 8)}...{address?.slice(-4)}</span>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    );
  }

  return <button onClick={connect}>Connect Wallet</button>;
}
```

### Sign Messages

```typescript
import { showSignMessage } from '@stacks/connect';

showSignMessage({
  message: 'Sign this message to verify your identity',
  onFinish: (data) => {
    console.log('Signature:', data.signature);
    console.log('Public Key:', data.publicKey);
  },
  onCancel: () => {
    console.log('User cancelled signing');
  },
});
```

---

## 💰 @stacks/transactions - Blockchain Interactions

The `@stacks/transactions` package is used for building transactions, making read-only calls, and working with Clarity values.

### Key Files
- [`frontend/src/lib/contracts.ts`](frontend/src/lib/contracts.ts) - Contract interaction utilities
- [`frontend/src/hooks/useStacks.ts`](frontend/src/hooks/useStacks.ts) - React hooks for contract calls

### Read-Only Contract Calls

```typescript
// frontend/src/lib/contracts.ts
import { 
  callReadOnlyFunction, 
  cvToValue, 
  uintCV,
  principalCV,
} from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';

// Get position count
const network = new StacksTestnet();
const result = await callReadOnlyFunction({
  contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  contractName: 'timelock-exchange',
  functionName: 'get-position-count',
  functionArgs: [],
  network,
  senderAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
});

const count = cvToValue(result); // { value: 42 }

// Get specific position
const position = await callReadOnlyFunction({
  contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  contractName: 'timelock-exchange',
  functionName: 'get-position',
  functionArgs: [uintCV(1)], // Position ID 1
  network,
  senderAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
});
```

### Contract Write Calls (with Wallet Signing)

```typescript
import { openContractCall } from '@stacks/connect';
import { 
  uintCV, 
  PostConditionMode,
  makeStandardSTXPostCondition,
  FungibleConditionCode,
} from '@stacks/transactions';

// Create a new timelock position
openContractCall({
  contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  contractName: 'timelock-exchange',
  functionName: 'create-position',
  functionArgs: [
    uintCV(1000000),   // amount: 1 STX in microSTX
    uintCV(604800),    // lock duration: 7 days in seconds
  ],
  // Post conditions protect users from losing unexpected funds
  postConditionMode: PostConditionMode.Deny,
  postConditions: [
    makeStandardSTXPostCondition(
      senderAddress,
      FungibleConditionCode.LessEqual,
      BigInt(1000000)  // Max 1 STX
    ),
  ],
  onFinish: (data) => {
    console.log('Transaction submitted:', data.txId);
    // View on explorer: https://explorer.stacks.co/txid/0x...
  },
  onCancel: () => {
    console.log('User cancelled transaction');
  },
});
```

### React Hook for Contract Calls

```typescript
// Using the custom hooks from useStacks.ts
import { useContractCall, useReadContract, cv, postConditions } from '@/hooks/useStacks';

function CreatePositionForm() {
  const { execute, isLoading, txId } = useContractCall();
  const { address } = useStacksAuth();

  const handleSubmit = async (amount: number, duration: number) => {
    const result = await execute({
      contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
      contractName: 'timelock-exchange',
      functionName: 'create-position',
      functionArgs: [cv.uint(amount * 1_000_000), cv.uint(duration)],
      postConditionMode: postConditions.Mode.Deny,
      postConditions: [
        postConditions.stxTransfer(
          address!,
          postConditions.FungibleCode.LessEqual,
          BigInt(amount * 1_000_000)
        ),
      ],
    });

    if (result) {
      console.log('TX submitted:', result);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(1, 604800); }}>
      <button disabled={isLoading}>
        {isLoading ? 'Signing...' : 'Create Position'}
      </button>
      {txId && <p>Transaction: {txId}</p>}
    </form>
  );
}
```

### Domain-Specific Hook

```typescript
// useTimelockExchange - pre-built hook for this app
import { useTimelockExchange } from '@/hooks/useStacks';

function Dashboard() {
  const { 
    createPosition, 
    getPosition, 
    withdrawPosition,
    positionCount, 
    totalLocked,
    refetch,
  } = useTimelockExchange();

  // Create a position (1 STX for 7 days)
  const handleCreate = () => createPosition(1, 604800);

  // Get position details
  const handleGetPosition = async () => {
    const position = await getPosition(1);
    console.log(position);
  };

  return (
    <div>
      <p>Total Positions: {positionCount}</p>
      <p>Total Locked: {totalLocked} STX</p>
      <button onClick={handleCreate}>Create Position</button>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### Clarity Value Types

```typescript
import {
  uintCV,           // Unsigned integers
  intCV,            // Signed integers  
  principalCV,      // Stacks addresses
  bufferCV,         // Raw bytes
  stringAsciiCV,    // ASCII strings
  stringUtf8CV,     // UTF-8 strings
  boolCV,           // Booleans
  noneCV,           // Optional none
  someCV,           // Optional some
  listCV,           // Lists
  tupleCV,          // Tuples/records
  cvToValue,        // Convert CV to JS value
  cvToJSON,         // Convert CV to JSON
} from '@stacks/transactions';

// Examples
const amount = uintCV(1000000);                          // u1000000
const user = principalCV('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM');
const hash = bufferCV(new Uint8Array(32));               // 0x...
const name = stringAsciiCV('TimeLock');                  // "TimeLock"
const active = boolCV(true);                             // true
const empty = noneCV();                                  // none
const wrapped = someCV(uintCV(100));                     // (some u100)
const items = listCV([uintCV(1), uintCV(2), uintCV(3)]); // (list u1 u2 u3)
const record = tupleCV({                                 // { amount: u100, owner: ST1... }
  amount: uintCV(100),
  owner: principalCV('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'),
});
```

### Post Conditions (Security)

Post conditions protect users by ensuring transactions can only affect funds as expected:

```typescript
import {
  makeStandardSTXPostCondition,
  makeContractSTXPostCondition,
  makeStandardFungiblePostCondition,
  makeStandardNonFungiblePostCondition,
  FungibleConditionCode,
  NonFungibleConditionCode,
  PostConditionMode,
  createAssetInfo,
} from '@stacks/transactions';

// STX transfer limit
const stxCondition = makeStandardSTXPostCondition(
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  FungibleConditionCode.LessEqual,
  BigInt(1000000) // Max 1 STX
);

// Fungible token transfer
const ftCondition = makeStandardFungiblePostCondition(
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  FungibleConditionCode.Equal,
  BigInt(100),
  createAssetInfo(
    'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    'my-token',
    'my-token'
  )
);

// NFT transfer
const nftCondition = makeStandardNonFungiblePostCondition(
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  NonFungibleConditionCode.Sends,
  createAssetInfo(
    'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    'position-nft',
    'position-nft'
  ),
  uintCV(1) // Token ID
);
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Clarinet (for smart contract development)
- A Stacks wallet ([Leather](https://leather.io) or [Xverse](https://xverse.app))

### Smart Contract Development

```bash
# Install dependencies
npm install

# Check contracts
clarinet check

# Run tests
clarinet test

# Launch local devnet
clarinet devnet start
```

### Frontend Development

```bash
# Navigate to frontend
cd frontend

# Install dependencies (includes @stacks/connect and @stacks/transactions)
npm install

# Create .env.local with contract addresses
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

##  Configuration

### Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_TIMELOCK_EXCHANGE_CONTRACT=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.timelock-exchange
NEXT_PUBLIC_POSITION_NFT_CONTRACT=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.position-nft
NEXT_PUBLIC_FEE_COLLECTOR_CONTRACT=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.fee-collector
```

### Network Configuration

Edit `frontend/src/lib/constants.ts` to change the active network:

```typescript
// Available networks: 'mainnet' | 'testnet' | 'devnet'
export const ACTIVE_NETWORK: 'mainnet' | 'testnet' | 'devnet' = 'testnet';

// App details for wallet connection
export const APP_DETAILS = {
  name: 'TimeLock Exchange',
  icon: typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '/logo.png',
};
```

---

## 📁 Key Source Files

### Stacks SDK Integration

| File | Description |
|------|-------------|
| [`frontend/src/hooks/useStacks.ts`](frontend/src/hooks/useStacks.ts) | React hooks for `@stacks/connect` and `@stacks/transactions` |
| [`frontend/src/lib/wallet-context.tsx`](frontend/src/lib/wallet-context.tsx) | Wallet context provider with `UserSession` |
| [`frontend/src/lib/contracts.ts`](frontend/src/lib/contracts.ts) | Contract interaction utilities |
| [`frontend/src/lib/constants.ts`](frontend/src/lib/constants.ts) | Network and contract configuration |
| [`frontend/src/components/ConnectWallet.tsx`](frontend/src/components/ConnectWallet.tsx) | Wallet connection UI component |

## 📝 Clarity 4 Functions Demo

This project demonstrates all 5 new Clarity 4 functions:

| Function | Purpose | Used In |
|----------|---------|---------|
| `stacks-block-time` | Get current block timestamp | Unlock time calculations |
| `secp256r1-verify` | Verify WebAuthn/passkey signatures | Passkey authentication |
| `contract-hash?` | Get the hash of a deployed contract | Bot verification |
| `restrict-assets?` | Restrict asset transfers in contract | Security enforcement |
| `to-ascii?` | Convert uint to ASCII string | Display formatting |

---

## 🧪 Testing

```bash
# Run all tests
clarinet test

# Run specific test
clarinet test tests/timelock-exchange.test.ts

# Check contract syntax
clarinet check
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Resources

### Stacks.js Documentation
- [@stacks/connect Documentation](https://connect.stacks.js.org) - Wallet integration
- [@stacks/transactions Documentation](https://stacks.js.org) - Transaction building
- [Stacks.js GitHub Repository](https://github.com/hirosystems/stacks.js)
- [Stacks.js API Reference](https://stacks.js.org/modules)

### Stacks Ecosystem
- [Stacks Documentation](https://docs.stacks.co)
- [Clarity Language Reference](https://docs.stacks.co/clarity)
- [Stacks Explorer](https://explorer.stacks.co)
- [Leather Wallet](https://leather.io)
- [Xverse Wallet](https://xverse.app)

## Contributing
