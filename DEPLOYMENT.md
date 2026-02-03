# TimeLock Exchange - Deployment Guide

## Prerequisites

1. **Stacks CLI** - Install with `npm install -g @stacks/cli`
2. **Clarinet** - Install from https://github.com/hirosystems/clarinet
3. **Wallet** - A Stacks wallet with sufficient STX for deployment fees

## Contract Architecture

The TimeLock Exchange consists of three contracts deployed in order:

1. **fee-collector** - Fee collection and treasury management
2. **position-nft** - SIP-009 compliant NFT for position ownership
3. **timelock-exchange** - Main exchange logic with Clarity 4 features

## Deployment Steps

### 1. Testnet Deployment

```bash
# Check contracts compile correctly
clarinet check

# Run tests
clarinet test

# Deploy to testnet
clarinet deployment apply -p deployments/default.testnet-plan.yaml --testnet
```

### 2. Mainnet Deployment

```bash
# Verify everything passes
clarinet check
clarinet test

# Generate deployment plan (if needed)
clarinet deployment generate --mainnet

# Deploy to mainnet
clarinet deployment apply -p deployments/default.mainnet-plan.yaml --mainnet
```

## Post-Deployment Configuration

After deployment, configure the contracts:

### Set Treasury Address (fee-collector)

```clarity
(contract-call? .fee-collector set-treasury 'SP_TREASURY_ADDRESS)
```

### Add Admin (timelock-exchange)

```clarity
(contract-call? .timelock-exchange add-admin 'SP_ADMIN_ADDRESS)
```

## Estimated Costs

| Contract | Estimated STX Cost |
|----------|-------------------|
| fee-collector | ~0.015 STX |
| position-nft | ~0.035 STX |
| timelock-exchange | ~0.085 STX |
| **Total** | **~0.135 STX** |

## Clarity 4 Features Used

All contracts use Clarity 4 (epoch 3.3) features:

- `stacks-block-time` - Accurate timestamps
- `secp256r1-verify` - WebAuthn passkey verification
- `contract-hash?` - Contract integrity verification
- `restrict-assets?` - Asset protection
- `to-ascii?` - Dynamic NFT metadata

## Verification

After deployment, verify contracts:

```bash
# Check contract info
curl https://api.mainnet.hiro.so/v2/contracts/interface/SP.../fee-collector
curl https://api.mainnet.hiro.so/v2/contracts/interface/SP.../position-nft
curl https://api.mainnet.hiro.so/v2/contracts/interface/SP.../timelock-exchange
```

## Frontend Configuration

Update frontend environment variables:

```env
# .env.local
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_CONTRACT_ADDRESS=SP3FKNEZ86RG5RT7SZ5FBRGH85FZNG94ZH1MCGG6N
NEXT_PUBLIC_TIMELOCK_CONTRACT=timelock-exchange
NEXT_PUBLIC_NFT_CONTRACT=position-nft
NEXT_PUBLIC_FEE_CONTRACT=fee-collector
```

## Security Checklist

Before mainnet deployment:

- [ ] All tests passing
- [ ] Code review completed
- [ ] Admin addresses verified
- [ ] Treasury address verified
- [ ] Emergency pause tested
- [ ] Fee tiers verified
- [ ] Passkey system tested

## Support

For deployment support, contact the team or open an issue on GitHub.
