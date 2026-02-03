# Smart Contract Documentation

This document provides comprehensive documentation for all smart contracts in the TimeLock Exchange protocol.

## Table of Contents

1. [Overview](#overview)
2. [Core Contracts](#core-contracts)
   - [TimeLock Exchange](#timelock-exchange)
   - [Position NFT](#position-nft)
   - [Fee Collector](#fee-collector)
3. [DeFi Contracts](#defi-contracts)
   - [Staking Rewards](#staking-rewards)
   - [Governance](#governance)
   - [Rewards Distributor](#rewards-distributor)
4. [Security Contracts](#security-contracts)
   - [Emergency Withdraw](#emergency-withdraw)
5. [Deployment Guide](#deployment-guide)
6. [Security Considerations](#security-considerations)

---

## Overview

The TimeLock Exchange protocol is a decentralized platform built on the Stacks blockchain that enables users to create time-locked STX positions with customizable lock durations, beneficiaries, and early withdrawal conditions.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│                     Stacks.js SDK                            │
├─────────────────┬───────────────┬───────────────────────────┤
│  TimeLock       │  Position     │  Fee Collector            │
│  Exchange       │  NFT          │                           │
├─────────────────┼───────────────┼───────────────────────────┤
│  Staking        │  Governance   │  Rewards                  │
│  Rewards        │               │  Distributor              │
├─────────────────┴───────────────┴───────────────────────────┤
│                Emergency Withdraw (Multi-sig Guardian)       │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Contracts

### TimeLock Exchange

**Contract:** `timelock-exchange.clar`

The main contract for creating and managing time-locked positions.

#### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `MIN-LOCK-PERIOD` | 144 blocks | ~1 day minimum lock |
| `MAX-LOCK-PERIOD` | 52560 blocks | ~1 year maximum lock |
| `MIN-DEPOSIT` | 1,000,000 µSTX | 1 STX minimum deposit |
| `EARLY-WITHDRAW-PENALTY` | 10% | Penalty for early withdrawal |

#### Error Codes

| Code | Name | Description |
|------|------|-------------|
| u100 | `ERR-NOT-AUTHORIZED` | Caller not authorized |
| u101 | `ERR-POSITION-NOT-FOUND` | Position doesn't exist |
| u102 | `ERR-POSITION-LOCKED` | Position still locked |
| u103 | `ERR-INVALID-AMOUNT` | Invalid deposit amount |
| u104 | `ERR-INVALID-LOCK-PERIOD` | Lock period out of range |
| u105 | `ERR-ALREADY-WITHDRAWN` | Position already withdrawn |

#### Functions

##### `create-position`
Creates a new time-locked position.

```clarity
(define-public (create-position 
    (amount uint) 
    (lock-period uint) 
    (beneficiary (optional principal)))
  ...)
```

**Parameters:**
- `amount`: Amount of µSTX to lock (minimum 1,000,000)
- `lock-period`: Number of blocks to lock (144 - 52560)
- `beneficiary`: Optional recipient of unlocked funds

**Returns:** `(response uint uint)` - Position ID on success

**Example:**
```clarity
(contract-call? .timelock-exchange create-position 
    u10000000 ;; 10 STX
    u4320     ;; ~30 days
    none)     ;; Self as beneficiary
```

##### `withdraw`
Withdraws a position after lock period.

```clarity
(define-public (withdraw (position-id uint))
```

**Requirements:**
- Caller must be owner or beneficiary
- Lock period must have ended
- Position must not be already withdrawn

##### `early-withdraw`
Emergency withdrawal with penalty.

```clarity
(define-public (early-withdraw (position-id uint))
```

**Penalty:** 10% of locked amount goes to fee collector

##### `extend-lock`
Extends the lock period of an active position.

```clarity
(define-public (extend-lock (position-id uint) (additional-blocks uint))
```

##### `add-to-position`
Adds more funds to an existing position.

```clarity
(define-public (add-to-position (position-id uint) (amount uint))
```

#### Read-Only Functions

```clarity
(define-read-only (get-position (position-id uint)) ...)
(define-read-only (get-user-positions (user principal)) ...)
(define-read-only (get-position-status (position-id uint)) ...)
(define-read-only (is-withdrawable (position-id uint)) ...)
(define-read-only (calculate-penalty (position-id uint)) ...)
```

---

### Position NFT

**Contract:** `position-nft.clar`

SIP-009 compliant NFT representing ownership of time-locked positions.

#### Features

- Fully compliant with SIP-009 NFT standard
- Transferable position ownership
- Metadata URI support
- Batch minting for efficiency

#### Functions

##### `mint`
Mints a new position NFT (called by timelock-exchange only).

```clarity
(define-public (mint (recipient principal) (position-id uint))
```

##### `transfer`
Transfers NFT ownership (SIP-009 compliant).

```clarity
(define-public (transfer 
    (token-id uint) 
    (sender principal) 
    (recipient principal))
```

##### `get-token-uri`
Returns metadata URI for a token.

```clarity
(define-read-only (get-token-uri (token-id uint))
  (ok (some (concat "https://api.timelock.exchange/metadata/" 
                    (int-to-ascii token-id)))))
```

---

### Fee Collector

**Contract:** `fee-collector.clar`

Manages protocol fees and distributions.

#### Fee Structure

| Fee Type | Rate | Description |
|----------|------|-------------|
| Deposit Fee | 0.1% | On position creation |
| Early Withdrawal | 10% | Penalty fee |
| Claim Fee | 0.5% | On reward claims |

#### Functions

##### `collect-fee`
Collects fees from protocol operations.

```clarity
(define-public (collect-fee (amount uint) (fee-type (string-ascii 20)))
```

##### `distribute-fees`
Distributes collected fees to stakeholders.

```clarity
(define-public (distribute-fees)
```

**Distribution:**
- 50% to staking rewards
- 30% to treasury
- 20% to development fund

##### `set-fee-rate`
Admin function to update fee rates.

```clarity
(define-public (set-fee-rate (fee-type (string-ascii 20)) (rate uint))
```

---

## DeFi Contracts

### Staking Rewards

**Contract:** `staking-rewards.clar`

Token staking with tiered rewards.

#### Tiers

| Tier | Min Stake | Multiplier | Benefits |
|------|-----------|------------|----------|
| Bronze | 1,000 STX | 1.0x | Base APR |
| Silver | 10,000 STX | 1.25x | + Daily rewards |
| Gold | 50,000 STX | 1.5x | + Priority support |
| Platinum | 100,000 STX | 2.0x | + Fee discounts |

#### Key Functions

```clarity
;; Stake tokens
(define-public (stake (amount uint)) ...)

;; Unstake with cooldown
(define-public (unstake (amount uint)) ...)

;; Claim accumulated rewards
(define-public (claim-rewards) ...)

;; Compound rewards into stake
(define-public (compound) ...)

;; Get user staking info
(define-read-only (get-staker-info (staker principal)) ...)

;; Calculate pending rewards
(define-read-only (get-pending-rewards (staker principal)) ...)
```

#### Reward Calculation

```
daily_reward = (staked_amount * apr * tier_multiplier) / 365
pending_rewards = daily_reward * days_since_last_claim
```

---

### Governance

**Contract:** `governance.clar`

On-chain governance with delegation.

#### Proposal Lifecycle

```
1. Creation (requires threshold voting power)
       ↓
2. Pending (1 day delay)
       ↓
3. Active (30 day voting period)
       ↓
4. Passed/Rejected (based on votes)
       ↓
5. Timelock (1 day delay for passed)
       ↓
6. Executed/Expired
```

#### Key Functions

```clarity
;; Create new proposal
(define-public (create-proposal 
    (title (string-ascii 100))
    (description (string-utf8 1000))
    (actions (list 10 {
        target: principal,
        function: (string-ascii 50),
        args: (list 10 (buff 256))
    })))

;; Vote on proposal
(define-public (vote 
    (proposal-id uint) 
    (support bool) 
    (reason (optional (string-utf8 500))))

;; Delegate voting power
(define-public (delegate (delegatee principal))

;; Execute passed proposal
(define-public (execute-proposal (proposal-id uint))
```

#### Governance Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Proposal Threshold | 10,000 STX | Min voting power to create |
| Quorum | 4% | Min participation required |
| Voting Period | 4,320 blocks | ~30 days |
| Timelock Delay | 144 blocks | ~1 day execution delay |

---

### Rewards Distributor

**Contract:** `rewards-distributor.clar`

Merkle-proof based reward distribution.

#### Features

- Gas-efficient merkle proof verification
- Multi-epoch reward distribution
- Batch claim support
- Expired reward recovery

#### Functions

```clarity
;; Create new reward epoch
(define-public (create-epoch 
    (merkle-root (buff 32))
    (total-amount uint)
    (token-type (string-ascii 32)))

;; Claim rewards with proof
(define-public (claim-rewards 
    (epoch-id uint)
    (amount uint)
    (proof (list 20 (buff 32))))

;; Batch claim from multiple epochs
(define-public (batch-claim 
    (claims (list 10 {
        epoch-id: uint,
        amount: uint,
        proof: (list 20 (buff 32))
    })))
```

#### Merkle Proof Generation (Off-chain)

```javascript
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

// Create leaves from reward data
const leaves = rewards.map(r => 
    keccak256(Buffer.concat([
        Buffer.from(r.address),
        Buffer.from(r.amount.toString()),
        Buffer.from(r.epochId.toString())
    ]))
);

// Build tree
const tree = new MerkleTree(leaves, keccak256, { sort: true });
const root = tree.getRoot();

// Generate proof for a claim
const proof = tree.getProof(leaf);
```

---

## Security Contracts

### Emergency Withdraw

**Contract:** `emergency-withdraw.clar`

Multi-sig guardian system for emergencies.

#### Guardian System

- 7 guardian addresses
- 3/7 threshold for emergency activation
- 24-hour cooldown between activations
- Automatic deactivation after 72 hours

#### Functions

```clarity
;; Vote to activate emergency mode
(define-public (vote-emergency)

;; Emergency withdrawal (during emergency mode)
(define-public (emergency-withdraw (position-id uint))

;; Batch emergency withdrawal
(define-public (batch-emergency-withdraw 
    (position-ids (list 50 uint)))

;; Deactivate emergency mode
(define-public (deactivate-emergency)
```

#### Guardian Management

```clarity
;; Add new guardian (owner only)
(define-public (add-guardian (guardian principal))

;; Remove guardian (owner only)  
(define-public (remove-guardian (guardian principal))

;; Check guardian status
(define-read-only (is-guardian (account principal))
```

---

## Deployment Guide

### Prerequisites

1. Install Clarinet: `brew install clarinet`
2. Configure wallet with sufficient STX
3. Set up environment variables

### Testnet Deployment

```bash
# Run tests first
clarinet test

# Deploy to testnet
clarinet deploy --network testnet
```

### Mainnet Deployment

```bash
# Verify all tests pass
clarinet test

# Deploy contracts in order:
# 1. fee-collector
# 2. position-nft
# 3. timelock-exchange
# 4. staking-rewards
# 5. governance
# 6. rewards-distributor
# 7. emergency-withdraw

clarinet deploy --network mainnet
```

### Post-Deployment

1. Verify contract on explorer
2. Initialize fee rates
3. Add guardians
4. Create initial staking rewards epoch
5. Set up governance parameters

---

## Security Considerations

### Audit Checklist

- [ ] Reentrancy protection on all state-changing functions
- [ ] Integer overflow/underflow checks
- [ ] Access control verification
- [ ] Lock period validation
- [ ] Beneficiary authorization
- [ ] Fee calculation accuracy
- [ ] Emergency mechanism testing

### Known Limitations

1. **Block Time Variability**: Lock periods are measured in blocks, not calendar time
2. **Gas Costs**: Batch operations have gas limits
3. **Merkle Proofs**: Maximum 20 levels (covers millions of claims)
4. **Guardian Keys**: Must be securely managed off-chain

### Incident Response

1. Guardian votes emergency activation
2. Emergency mode enables bypass of timelocks
3. Users can withdraw during emergency
4. Mode auto-expires after 72 hours
5. Post-incident review and fix deployment

---

## Contract Addresses

### Testnet

| Contract | Address |
|----------|---------|
| timelock-exchange | `ST...` |
| position-nft | `ST...` |
| fee-collector | `ST...` |
| staking-rewards | `ST...` |
| governance | `ST...` |
| rewards-distributor | `ST...` |
| emergency-withdraw | `ST...` |

### Mainnet

| Contract | Address |
|----------|---------|
| timelock-exchange | `SP...` |
| position-nft | `SP...` |
| fee-collector | `SP...` |
| staking-rewards | `SP...` |
| governance | `SP...` |
| rewards-distributor | `SP...` |
| emergency-withdraw | `SP...` |

---

## Changelog

### v1.0.0 (Initial Release)
- Core timelock functionality
- Position NFT minting
- Fee collection

### v1.1.0
- Added staking rewards
- Governance system
- Multi-sig emergency withdraw

### v1.2.0
- Merkle-based rewards distributor
- Batch operations
- Extended governance features
