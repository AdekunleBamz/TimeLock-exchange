#!/bin/bash
# Check STX Balances

DEPLOYER="SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT"

hex_to_stx() {
    local hex=$1
    local dec=$(printf "%d" "$hex" 2>/dev/null)
    echo $(echo "scale=6; $dec / 1000000" | bc)
}

echo "==========================================================================="
echo "  Wallet STX Balances"
echo "==========================================================================="
echo ""
echo "#  Address                  STX Balance"
echo "---------------------------------------------------------------------------"

# Get wallets
WALLETS=$(cat .test-wallets.json | grep -o '"address": "[^"]*"' | cut -d'"' -f4)

# Deployer
STX_HEX=$(curl -s "https://api.mainnet.hiro.so/v2/accounts/$DEPLOYER?proof=0" | grep -o '"balance":"[^"]*"' | cut -d'"' -f4)
STX_DEC=$(hex_to_stx "$STX_HEX")
echo "D  $DEPLOYER  $STX_DEC STX"

# Test wallets
ID=2
for addr in $WALLETS; do
    if [ "$addr" != "$DEPLOYER" ]; then
        STX_HEX=$(curl -s "https://api.mainnet.hiro.so/v2/accounts/$addr?proof=0" | grep -o '"balance":"[^"]*"' | cut -d'"' -f4)
        STX_DEC=$(hex_to_stx "$STX_HEX")
        echo "$ID  $addr  $STX_DEC STX"
        ID=$((ID + 1))
    fi
done

echo ""
echo "==========================================================================="
