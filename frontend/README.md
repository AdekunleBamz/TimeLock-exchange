# TimeLock Exchange - Frontend

A Next.js 16 frontend for the TimeLock Exchange decentralized application, built with **@stacks/connect** and **@stacks/transactions** for seamless Stacks blockchain integration.

## 🚀 Mainnet Ready

This frontend is fully wired to interact with the **13 deployed contracts** on Stacks mainnet:

**Deployer:** `SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT`

## Tech Stack

- **Next.js 16** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **@stacks/connect ^7.8.0** - Wallet authentication
- **@stacks/transactions ^6.17.0** - Blockchain interactions
- **@stacks/network ^6.17.0** - Network configuration
- **Tailwind CSS** - Styling

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📦 @stacks/connect Integration

The `@stacks/connect` package handles wallet connections with Leather and Xverse wallets.

### Installation

```bash
npm install @stacks/connect @stacks/transactions @stacks/network
```

### Wallet Connection

```typescript
// src/hooks/useStacks.ts
import { showConnect, UserSession, AppConfig } from '@stacks/connect';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

// Connect to wallet
showConnect({
  appDetails: {
    name: 'TimeLock Exchange',
    icon: '/logo.png',
  },
  onFinish: () => {
    const userData = userSession.loadUserData();
    // For mainnet: userData.profile.stxAddress.mainnet
    console.log('Connected:', userData.profile.stxAddress.mainnet);
  },
  onCancel: () => console.log('Cancelled'),
  userSession,
});

// Check connection
if (userSession.isUserSignedIn()) {
  const userData = userSession.loadUserData();
  const mainnetAddress = userData.profile.stxAddress.mainnet;
}

// Disconnect
userSession.signUserOut();
```

### Using the Hook

```tsx
import { useStacksAuth } from '@/hooks/useStacks';

function ConnectButton() {
  const { connect, disconnect, isConnected, address, isMainnet } = useStacksAuth();

  return (
    <button onClick={isConnected ? disconnect : connect}>
      {isConnected ? `${address?.slice(0, 8)}... (${isMainnet ? 'Mainnet' : 'Testnet'})` : 'Connect'}
    </button>
  );
}
```

---

## 💰 @stacks/transactions Integration

The `@stacks/transactions` package is used for building, signing, and reading from smart contracts.

### Read-Only Calls

```typescript
import { callReadOnlyFunction, cvToValue, uintCV } from '@stacks/transactions';
import { StacksMainnet } from '@stacks/network';

// Query the mainnet timelock-exchange contract
const network = new StacksMainnet();

const result = await callReadOnlyFunction({
  contractAddress: 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT',
  contractName: 'timelock-exchange-v1',
  functionName: 'get-position-count',
  functionArgs: [],
  network,
  senderAddress: 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT',
});

const count = cvToValue(result);
```

### Contract Calls (Write Operations)

```typescript
import { openContractCall } from '@stacks/connect';
import {
  uintCV,
  PostConditionMode,
  makeStandardSTXPostCondition,
  FungibleConditionCode,
} from '@stacks/transactions';

openContractCall({
  contractAddress: 'SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT',
  contractName: 'timelock-exchange-v1',
  functionName: 'create-position',
  functionArgs: [
    uintCV(1000000),  // 1 STX
    uintCV(604800),   // 7 days
  ],
  postConditionMode: PostConditionMode.Deny,
  postConditions: [
    makeStandardSTXPostCondition(
      userAddress,
      FungibleConditionCode.LessEqual,
      BigInt(1000000)
    ),
  ],
  onFinish: (data) => console.log('TX:', data.txId),
  onCancel: () => console.log('Cancelled'),
});
```

---

## 🪝 Custom Hooks

All hooks are located in `src/hooks/` and are pre-configured for mainnet:

| Hook | Contract | Description |
|------|----------|-------------|
| `useStacks` | - | Core wallet auth and contract calls |
| `useStaking` | staking-v1 | Stake tokens, view positions |
| `useStakingRewards` | staking-rewards-v2 | Claim and compound rewards |
| `useVault` | vault-v1 | Secure multi-asset vaults |
| `useEscrow` | escrow-v1 | P2P trades with milestones |
| `useGovernance` | governance-v1 | Proposals and voting |
| `usePriceOracle` | price-oracle-v1 | Real-time prices |
| `useBatchTransfer` | batch-transfer-v1 | Bulk transfers |
| `useEmergencyWithdraw` | emergency-withdraw-v1 | Emergency fund access |
| `useRewardsDistributor` | rewards-distributor-v1 | Merkle proof rewards |
| `usePositionNFT` | position-nft-v11-1 | Position NFT management |
| `useTimelockToken` | timelock-token-v11-1 | TLX token operations |

### Example: Using the Staking Hook

```tsx
import { useStaking } from '@/hooks/useStaking';

function StakingPanel() {
  const {
    position,
    pendingRewards,
    stake,
    unstake,
    claimRewards,
    isLoading,
  } = useStaking();

  const handleStake = async () => {
    const txId = await stake(BigInt(1000000000)); // 1000 TLX
    console.log('Staking TX:', txId);
  };

  return (
    <div>
      <p>Staked: {position?.amount.toString()}</p>
      <p>Pending: {pendingRewards?.amount.toString()}</p>
      <button onClick={handleStake} disabled={isLoading}>
        Stake
      </button>
      <button onClick={claimRewards} disabled={isLoading}>
        Claim
      </button>
    </div>
  );
}
```

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Main dashboard
├── components/            # React components
│   ├── ConnectWallet.tsx  # Wallet connection UI
│   ├── StakingDashboard.tsx
│   ├── VaultDashboard.tsx
│   ├── EscrowDashboard.tsx
│   ├── GovernanceDashboard.tsx
│   └── ...
├── hooks/                 # Custom React hooks
│   ├── useStacks.ts      # Core @stacks/* integration
│   ├── useStaking.ts
│   ├── useVault.ts
│   └── ...
└── lib/                  # Utilities
    ├── constants.ts      # Contract addresses & config
    ├── config.ts         # Environment configuration
    ├── contracts.ts      # Contract helpers
    ├── contract-registry.ts # Centralized contract management
    └── wallet-context.tsx # Wallet provider
```

---

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available options. Key variables:

```env
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_CONTRACT_ADDRESS=SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT
```

### Switching Networks

Update `src/lib/constants.ts`:

```typescript
// For mainnet (default)
export const ACTIVE_NETWORK: 'mainnet' | 'testnet' | 'devnet' = 'mainnet';

// For testnet development
export const ACTIVE_NETWORK: 'mainnet' | 'testnet' | 'devnet' = 'testnet';
```

---

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [@stacks/connect Documentation](https://connect.stacks.js.org)
- [@stacks/transactions Documentation](https://stacks.js.org)
- [Stacks.js GitHub](https://github.com/hirosystems/stacks.js)
- [Stacks Explorer](https://explorer.hiro.so)
