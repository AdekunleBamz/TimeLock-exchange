# TimeLock Exchange User Guide

Welcome to TimeLock Exchange! This comprehensive guide will help you understand how to use our decentralized time-locked exchange platform on the Stacks blockchain.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Connecting Your Wallet](#connecting-your-wallet)
3. [Creating Time-Locked Positions](#creating-time-locked-positions)
4. [Managing Your Positions](#managing-your-positions)
5. [Staking and Rewards](#staking-and-rewards)
6. [Governance Participation](#governance-participation)
7. [Using Position NFTs](#using-position-nfts)
8. [Understanding Fees](#understanding-fees)
9. [Emergency Features](#emergency-features)
10. [Frequently Asked Questions](#frequently-asked-questions)

---

## Getting Started

### What is TimeLock Exchange?

TimeLock Exchange is a decentralized application (dApp) built on the Stacks blockchain that allows you to:

- **Lock tokens** for a specified period and earn rewards
- **Create tradeable NFTs** representing your locked positions
- **Stake tokens** to earn additional rewards and governance power
- **Participate in governance** to shape the protocol's future
- **Use price oracles** for accurate value calculations

### System Requirements

- **Supported Browsers**: Chrome, Firefox, Brave, Edge (latest versions)
- **Wallet**: Leather Wallet or Xverse Wallet
- **Network**: Stacks Mainnet or Testnet
- **STX Balance**: Minimum for transaction fees (~0.001 STX per transaction)

### Quick Start Checklist

- [ ] Install a compatible Stacks wallet
- [ ] Fund your wallet with STX
- [ ] Connect wallet to TimeLock Exchange
- [ ] Create your first position
- [ ] Explore staking and governance features

---

## Connecting Your Wallet

### Supported Wallets

| Wallet | Platform | Download |
|--------|----------|----------|
| Leather | Browser Extension | [leather.io](https://leather.io) |
| Xverse | Mobile & Browser | [xverse.app](https://xverse.app) |

### Connection Steps

1. **Click "Connect Wallet"** in the top-right corner of the app
2. **Select your wallet** from the available options
3. **Approve the connection** in your wallet popup
4. **Verify connection** - your address will appear in the header

### Connection Troubleshooting

**Wallet not detected?**
- Ensure the wallet extension is installed and enabled
- Refresh the page
- Try a different browser

**Transaction fails?**
- Check you have sufficient STX for fees
- Verify you're on the correct network (mainnet/testnet)
- Clear browser cache and reconnect

**Session expired?**
- Reconnect your wallet
- Check wallet timeout settings

---

## Creating Time-Locked Positions

### Understanding Lock Periods

Lock periods determine how long your tokens are locked and affect your rewards:

| Lock Period | Minimum | Maximum | Reward Multiplier |
|-------------|---------|---------|-------------------|
| Short-term | 7 days | 30 days | 1.0x |
| Medium-term | 31 days | 90 days | 1.25x |
| Long-term | 91 days | 365 days | 1.5x |
| Extended | 366 days | 730 days | 2.0x |

### Creating a Position

#### Step 1: Navigate to Create Position
Click the "Create Position" button on the dashboard or use the keyboard shortcut `Ctrl/Cmd + N`.

#### Step 2: Enter Position Details

```
┌─────────────────────────────────────┐
│       Create New Position           │
├─────────────────────────────────────┤
│ Amount: [        100 STX         ]  │
│ Lock Period: [    30 days    ▼   ]  │
│ Auto-compound: [x] Yes              │
│                                     │
│ Estimated Rewards: 5.2 STX          │
│ Unlock Date: March 6, 2024          │
│                                     │
│ [Cancel]           [Create Position]│
└─────────────────────────────────────┘
```

#### Step 3: Review Transaction
- Verify the amount and lock period
- Check estimated rewards
- Confirm unlock date

#### Step 4: Approve Transaction
- Sign the transaction in your wallet
- Wait for blockchain confirmation
- Position appears in your dashboard

### Position Creation Tips

- **Start small** to understand the system
- **Longer locks** earn more rewards
- **Consider gas costs** when creating small positions
- **Use auto-compound** to maximize returns

---

## Managing Your Positions

### Position Dashboard

Your position dashboard shows all your active and completed positions:

```
┌─────────────────────────────────────────────────────────────┐
│ Your Positions                                    Filter ▼   │
├──────────────────┬────────────┬───────────┬─────────────────┤
│ Position ID      │ Amount     │ Unlock    │ Status          │
├──────────────────┼────────────┼───────────┼─────────────────┤
│ #1234            │ 500 STX    │ 15 days   │ 🔒 Locked       │
│ #1235            │ 200 STX    │ Unlocked  │ ✅ Claimable    │
│ #1236            │ 1000 STX   │ 45 days   │ 🔒 Locked       │
└──────────────────┴────────────┴───────────┴─────────────────┘
```

### Position Actions

#### View Position Details
Click on any position to see:
- Original deposit amount
- Current value with rewards
- Lock/unlock dates
- Transaction history
- Position NFT details

#### Withdraw Position
When your position unlocks:
1. Click the "Withdraw" button
2. Choose partial or full withdrawal
3. Confirm the transaction
4. Tokens return to your wallet

#### Extend Lock Period
While position is active:
1. Click "Extend Lock"
2. Select new unlock date
3. Confirm transaction
4. Earn bonus rewards for extended commitment

### Position Filters

- **All**: View all positions
- **Active**: Currently locked positions
- **Claimable**: Unlocked, ready to withdraw
- **Completed**: Previously withdrawn positions

---

## Staking and Rewards

### Staking Overview

Staking your tokens provides:
- **Daily rewards** in platform tokens
- **Governance voting power**
- **Tier-based benefits**
- **Compounding options**

### Staking Tiers

| Tier | Required Stake | APY Boost | Benefits |
|------|---------------|-----------|----------|
| 🥉 Bronze | 100 STX | Base | Basic rewards |
| 🥈 Silver | 1,000 STX | +10% | Priority support |
| 🥇 Gold | 10,000 STX | +25% | Fee discounts |
| 💎 Platinum | 100,000 STX | +50% | Governance multiplier |

### How to Stake

1. **Navigate to Staking** tab
2. **Enter stake amount** 
3. **Choose lock period** (optional for bonus)
4. **Confirm transaction**
5. **Start earning rewards**

```
┌─────────────────────────────────────┐
│         Stake Your Tokens           │
├─────────────────────────────────────┤
│ Available: 1,500 STX                │
│                                     │
│ Stake Amount: [      500 STX     ]  │
│                                     │
│ Your Tier: Silver (10% boost)       │
│ Estimated APY: 12.5%                │
│ Daily Rewards: ~0.17 STX            │
│                                     │
│ [Stake]                             │
└─────────────────────────────────────┘
```

### Claiming Rewards

Rewards accumulate continuously and can be claimed anytime:

1. View pending rewards in dashboard
2. Click "Claim Rewards"
3. Choose: Claim to wallet OR Compound
4. Confirm transaction

### Compounding

Auto-compound automatically reinvests your rewards:
- Enable in Settings
- Runs daily at midnight UTC
- Maximizes compound interest effect
- Small gas fee applies

---

## Governance Participation

### Voting Power

Your voting power is determined by:
- **Staked tokens**: 1 token = 1 vote
- **Lock duration**: Longer locks = more power
- **Tier multiplier**: Higher tiers get voting bonuses

### Active Proposals

View and vote on active proposals:

```
┌─────────────────────────────────────────────────────────────┐
│ Proposal #42: Increase Staking Rewards                       │
├─────────────────────────────────────────────────────────────┤
│ Status: Active | Ends in: 3 days                            │
│                                                             │
│ Description:                                                │
│ Increase base staking APY from 10% to 12% for all tiers.    │
│                                                             │
│ Current Results:                                            │
│ For: ████████████████░░░░ 78%                              │
│ Against: ████░░░░░░░░░░░░░░ 22%                            │
│                                                             │
│ Your Vote: Not voted                                        │
│ Your Voting Power: 5,250 votes                              │
│                                                             │
│ [Vote For]  [Vote Against]  [Abstain]                       │
└─────────────────────────────────────────────────────────────┘
```

### How to Vote

1. **Review proposal** details and discussion
2. **Check voting power** snapshot
3. **Cast your vote** (For/Against/Abstain)
4. **Confirm transaction**
5. **View results** after voting period

### Delegation

Don't have time to vote? Delegate your voting power:

1. Go to Governance → Delegation
2. Enter delegate's address
3. Set delegation amount (partial or full)
4. Confirm delegation
5. Delegate votes on your behalf

**Revoking Delegation:**
- Revoke anytime
- Takes effect immediately
- Your voting power returns

### Creating Proposals

Requirements to create a proposal:
- Minimum 10,000 voting power
- Proposal fee: 100 STX (refunded if passed)
- Clear description and parameters

---

## Using Position NFTs

### What are Position NFTs?

Each locked position mints an NFT that:
- **Represents ownership** of the position
- **Can be transferred** to other wallets
- **Can be traded** on NFT marketplaces
- **Maintains all rights** to underlying tokens

### NFT Metadata

Your position NFT includes:
```json
{
  "name": "TimeLock Position #1234",
  "description": "500 STX locked until March 2024",
  "attributes": [
    { "trait_type": "Amount", "value": "500 STX" },
    { "trait_type": "Unlock Date", "value": "2024-03-06" },
    { "trait_type": "Created", "value": "2024-01-06" },
    { "trait_type": "Rewards Earned", "value": "25.5 STX" }
  ]
}
```

### Transferring Position NFTs

1. Go to Position → NFT Details
2. Click "Transfer"
3. Enter recipient address
4. Confirm transfer

⚠️ **Warning**: Transferring the NFT transfers all rights to the position, including locked tokens and earned rewards.

### Trading Position NFTs

Position NFTs can be listed on compatible NFT marketplaces:
- Gamma.io
- STX NFT
- Other Stacks NFT platforms

---

## Understanding Fees

### Fee Structure

| Action | Fee | Recipient |
|--------|-----|-----------|
| Create Position | 0.5% | Protocol treasury |
| Withdraw Position | 0.25% | Protocol treasury |
| Claim Rewards | 0% | N/A |
| Stake | 0% | N/A |
| Unstake | 0.1% | Protocol treasury |
| Transfer NFT | 0% | N/A |

### Fee Discounts

Reduce your fees with tier benefits:

| Tier | Discount |
|------|----------|
| Bronze | 0% |
| Silver | 5% |
| Gold | 15% |
| Platinum | 30% |

### Network Fees

In addition to protocol fees, standard Stacks network fees apply:
- Typical transaction: ~0.001 STX
- Complex transactions: ~0.01 STX
- Fees vary with network congestion

---

## Emergency Features

### Emergency Withdrawal

In case of critical issues, emergency withdrawal allows immediate access:

1. Go to Settings → Emergency
2. Click "Emergency Withdraw"
3. Acknowledge the penalty
4. Confirm transaction
5. Receive tokens immediately

**Emergency Withdrawal Penalty:**
- Forfeits all pending rewards
- 5% of principal as penalty fee
- No NFT minting/transfer

### When to Use Emergency Withdrawal

- Smart contract vulnerability discovered
- Personal emergency requiring immediate funds
- Protocol migration announced

⚠️ **Use only as a last resort** - you lose significant value.

### Paused Operations

During protocol pauses:
- New positions cannot be created
- Existing positions remain safe
- Withdrawals may be delayed
- Check announcements for updates

---

## Frequently Asked Questions

### General Questions

**Q: Is my principal safe during the lock period?**
A: Yes, your tokens are secured by smart contracts. Only you (or the NFT holder) can withdraw after unlock.

**Q: What happens if I lose access to my wallet?**
A: Recover your wallet using your seed phrase. Position NFTs can be recovered with wallet recovery.

**Q: Can I create multiple positions?**
A: Yes, there's no limit to the number of positions you can create.

### Rewards Questions

**Q: How are rewards calculated?**
A: Rewards = Base APY × Lock Multiplier × Tier Bonus, distributed proportionally.

**Q: When do rewards accrue?**
A: Rewards accrue per block (~10 minutes) and are claimable anytime.

**Q: What happens to unclaimed rewards?**
A: Rewards remain available indefinitely until claimed.

### Technical Questions

**Q: Which network is TimeLock Exchange on?**
A: We operate on Stacks mainnet, with a testnet version for testing.

**Q: Are the smart contracts audited?**
A: Yes, our contracts are audited by [Auditor Name]. View reports in our docs.

**Q: How do I report a bug?**
A: Submit issues on our GitHub or email security@timelock-exchange.com.

### NFT Questions

**Q: Can I sell my position NFT?**
A: Yes, list on any compatible Stacks NFT marketplace.

**Q: What happens when I transfer the NFT?**
A: The recipient gains all rights to the position, including withdrawal rights.

**Q: Can I get my NFT back after transferring?**
A: Only if the recipient transfers it back to you.

---

## Support Resources

### Community

- **Discord**: [discord.gg/timelock](#)
- **Twitter**: [@TimeLockExchange](#)
- **Telegram**: [t.me/timelock](#)

### Documentation

- **Developer Docs**: [docs.timelock-exchange.com](#)
- **API Reference**: [api.timelock-exchange.com](#)
- **Smart Contracts**: [GitHub Repository](#)

### Help Desk

- **Email**: support@timelock-exchange.com
- **Response Time**: Within 24 hours
- **Live Chat**: Available Mon-Fri 9am-5pm UTC

---

## Glossary

| Term | Definition |
|------|------------|
| **APY** | Annual Percentage Yield - yearly return on investment |
| **Compound** | Reinvesting rewards to earn rewards on rewards |
| **Delegation** | Assigning voting power to another address |
| **Lock Period** | Duration tokens are locked and inaccessible |
| **Position** | A single locked token deposit |
| **Principal** | Original amount deposited |
| **Slash** | Penalty for protocol violations |
| **Stake** | Locking tokens to earn rewards and governance power |
| **TWAP** | Time-Weighted Average Price |
| **Unlock Date** | When locked tokens become withdrawable |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01 | Initial release |
| 1.1.0 | 2024-02 | Added governance features |
| 1.2.0 | 2024-03 | NFT marketplace integration |

---

*Last Updated: 2024*
*Need help? Contact support@timelock-exchange.com*
