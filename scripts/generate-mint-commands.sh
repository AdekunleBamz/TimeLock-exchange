#!/bin/bash
# Generate mint commands for all test wallets

DEPLOYER="SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT"
MNEMONIC="usage upon hawk topic waste mobile stairs daughter hobby weekend answer illness"

echo "#======================================================"
echo "#  Mint TLX Commands"
echo "#======================================================"
echo ""
echo "# Step 1: Initialize Rewards Pool"
echo "clarinet contracts call \\"
echo "  --contract-name timelock-token \\"
echo "  --function-name initialize-rewards-pool \\"
echo "  --mainnet \\"
echo "  --mnemonic \"$MNEMONIC\" \\"
echo "  --broadcast"
echo ""
echo "# Step 2: Transfer to each wallet"
echo ""

# Get wallets
WALLETS=$(cat .test-wallets.json | grep -o '"address": "[^"]*"' | cut -d'"' -f4)

ID=1
for addr in $WALLETS; do
    if [ "$addr" != "$DEPLOYER" ]; then
        echo "# Wallet $ID: $addr"
        echo "clarinet contracts call \\"
        echo "  --contract-name timelock-token \\"
        echo "  --function-name transfer \\"
        echo "  --function-args \"uint 10000000000, principal $DEPLOYER, principal $addr, none\" \\"
        echo "  --mainnet \\"
        echo "  --mnemonic \"$MNEMONIC\" \\"
        echo "  --broadcast"
        echo ""
        ID=$((ID + 1))
    fi
done

echo "#======================================================"
