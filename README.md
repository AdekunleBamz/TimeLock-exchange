# TimeLock Exchange

A decentralized timelock exchange built on the Stacks blockchain, featuring position NFTs for time-locked assets, passkey authentication, and demonstration of Clarity 4 smart contract features.

## 🏗️ Project Structure

```
timelock-exchange/
├── contracts/               # Clarity smart contracts
│   ├── timelock-exchange.clar   # Main exchange contract
│   ├── position-nft.clar        # SIP-009 NFT for positions
│   └── fee-collector.clar       # Fee collection contract
├── frontend/               # Next.js frontend
│   └── src/
│       ├── app/            # Next.js app router
│       ├── components/     # React components
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

### Frontend
- **Wallet Connection** - Connect with Leather/Xverse via `@stacks/connect`
- **Contract Interactions** - Read/write calls via `@stacks/transactions`
- **Real-time Stats** - View positions, fees, and NFT counts
- **Responsive UI** - Built with Tailwind CSS

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Clarinet (for smart contract development)
- A Stacks wallet (Leather or Xverse)

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

# Install dependencies
npm install

# Create .env.local with contract addresses
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 📦 Dependencies

### Frontend
- `@stacks/connect` - Wallet authentication & user sessions
- `@stacks/transactions` - Building & signing transactions
- `@stacks/network` - Network configuration
- `next` - React framework
- `tailwindcss` - Styling

### Usage of @stacks/connect

```typescript
import { showConnect, UserSession, AppConfig } from '@stacks/connect';

// Configure app
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

// Connect wallet
showConnect({
  appDetails: { name: 'TimeLock Exchange', icon: '/logo.png' },
  onFinish: () => {
    const userData = userSession.loadUserData();
    console.log('Connected:', userData.profile.stxAddress);
  },
  userSession,
});
```

### Usage of @stacks/transactions

```typescript
import { 
  callReadOnlyFunction, 
  openContractCall,
  uintCV, 
  cvToValue,
  makeStandardSTXPostCondition,
  FungibleConditionCode,
  PostConditionMode,
} from '@stacks/transactions';

// Read-only call
const result = await callReadOnlyFunction({
  contractAddress: 'ST1...',
  contractName: 'timelock-exchange',
  functionName: 'get-position-count',
  functionArgs: [],
  network,
  senderAddress: 'ST1...',
});
console.log('Count:', cvToValue(result));

// Write call with post conditions
openContractCall({
  contractAddress: 'ST1...',
  contractName: 'timelock-exchange',
  functionName: 'create-position',
  functionArgs: [uintCV(1000000), uintCV(604800)], // 1 STX, 7 days
  postConditionMode: PostConditionMode.Deny,
  postConditions: [
    makeStandardSTXPostCondition(
      senderAddress,
      FungibleConditionCode.LessEqual,
      BigInt(1000000)
    ),
  ],
  onFinish: (data) => console.log('TX:', data.txId),
});
```

## 🔧 Configuration

### Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_TIMELOCK_EXCHANGE_CONTRACT=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.timelock-exchange
NEXT_PUBLIC_POSITION_NFT_CONTRACT=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.position-nft
NEXT_PUBLIC_FEE_COLLECTOR_CONTRACT=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.fee-collector
```

### Network Configuration

Edit `frontend/src/lib/constants.ts` to change the active network:

```typescript
export const ACTIVE_NETWORK: 'mainnet' | 'testnet' | 'devnet' = 'testnet';
```

## 📝 Clarity 4 Functions Demo

This project demonstrates all 5 new Clarity 4 functions:

| Function | Purpose |
|----------|---------|
| `stacks-block-time` | Get current block timestamp |
| `secp256r1-verify` | Verify WebAuthn/passkey signatures |
| `contract-hash?` | Get the hash of a deployed contract |
| `restrict-assets?` | Restrict asset transfers in contract |
| `to-ascii?` | Convert uint to ASCII string |

## 🧪 Testing

```bash
# Run all tests
clarinet test

# Run specific test
clarinet test tests/timelock-exchange.test.ts

# Check contract syntax
clarinet check
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Links

- [Stacks Documentation](https://docs.stacks.co)
- [Clarity Language Reference](https://docs.stacks.co/clarity)
- [@stacks/connect Docs](https://connect.stacks.js.org)
- [@stacks/transactions Docs](https://stacks.js.org)
