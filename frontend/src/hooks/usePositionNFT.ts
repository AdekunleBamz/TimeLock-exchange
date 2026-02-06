/**
 * usePositionNFT - React hook for position NFT contract interactions
 * 
 * This hook provides functions for querying and transferring position NFTs,
 * which represent time-locked positions on the exchange.
 * Uses @stacks/connect for transaction signing and @stacks/transactions for building calls.
 * 
 * Contract: SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.position-nft-v11-1
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useWallet } from '@/lib/wallet-context';
import {
  callReadOnlyFunction,
  cvToValue,
  uintCV,
  principalCV,
  PostConditionMode,
  makeStandardNonFungiblePostCondition,
  NonFungibleConditionCode,
  createAssetInfo,
} from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import { getNetwork } from '@/lib/contracts';
import { CONTRACTS, parseContractId, getTxExplorerUrl, getAddressExplorerUrl } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export interface PositionNFT {
  tokenId: number;
  owner: string;
  positionId: number;
  mintedAt: number;
  tokenUri: string | null;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: NFTAttribute[];
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

export interface NFTCollection {
  name: string;
  symbol: string;
  totalSupply: number;
  baseUri: string;
}

export interface UsePositionNFTReturn {
  // State
  isLoading: boolean;
  isTransferring: boolean;
  error: string | null;
  
  // Data
  userNFTs: PositionNFT[];
  collection: NFTCollection | null;
  selectedNFT: PositionNFT | null;
  
  // Actions
  transfer: (tokenId: number, recipient: string) => Promise<string | null>;
  refresh: () => Promise<void>;
  
  // Queries
  getOwner: (tokenId: number) => Promise<string | null>;
  getTokenUri: (tokenId: number) => Promise<string | null>;
  getNFT: (tokenId: number) => Promise<PositionNFT | null>;
  selectNFT: (tokenId: number | null) => void;
  
  // Computed
  hasNFTs: boolean;
  nftCount: number;
}

// ============================================================================
// Constants - Using Mainnet Contract Address
// ============================================================================

const { address: CONTRACT_ADDRESS, name: CONTRACT_NAME } = parseContractId(CONTRACTS.positionNft);
const POSITION_NFT_CONTRACT = CONTRACTS.positionNft; // SP5K2RHMSBH4PAP4PGX77MCVNK1ZEED07CWX9TJT.position-nft-v11-1

// NFT asset identifier for post conditions
const NFT_ASSET_NAME = 'position-nft';

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePositionNFT(): UsePositionNFTReturn {
  const { stxAddress, isConnected } = useWallet();
  const [userNFTs, setUserNFTs] = useState<PositionNFT[]>([]);
  const [collection, setCollection] = useState<NFTCollection | null>(null);
  const [selectedNFT, setSelectedNFT] = useState<PositionNFT | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const network = useMemo(() => getNetwork(), []);

  // Computed values
  const hasNFTs = useMemo(() => userNFTs.length > 0, [userNFTs]);
  const nftCount = useMemo(() => userNFTs.length, [userNFTs]);

  // ============================================================================
  // Read Functions
  // ============================================================================

  const getOwner = useCallback(async (tokenId: number): Promise<string | null> => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-owner',
        functionArgs: [uintCV(tokenId)],
        network,
        senderAddress: CONTRACT_ADDRESS,
      });

      const data = cvToValue(result);
      return data?.value || null;
    } catch (err) {
      console.error('Failed to get NFT owner:', err);
      return null;
    }
  }, [network]);

  const getTokenUri = useCallback(async (tokenId: number): Promise<string | null> => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-token-uri',
        functionArgs: [uintCV(tokenId)],
        network,
        senderAddress: CONTRACT_ADDRESS,
      });

      const data = cvToValue(result);
      return data?.value || null;
    } catch (err) {
      console.error('Failed to get token URI:', err);
      return null;
    }
  }, [network]);

  const getNFT = useCallback(async (tokenId: number): Promise<PositionNFT | null> => {
    try {
      const [owner, tokenUri] = await Promise.all([
        getOwner(tokenId),
        getTokenUri(tokenId),
      ]);

      if (!owner) return null;

      // Try to get position info from the NFT
      const positionResult = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-nft-position',
        functionArgs: [uintCV(tokenId)],
        network,
        senderAddress: CONTRACT_ADDRESS,
      });

      const positionData = cvToValue(positionResult);

      return {
        tokenId,
        owner,
        positionId: positionData?.['position-id']?.value || tokenId,
        mintedAt: positionData?.['minted-at']?.value || 0,
        tokenUri,
      };
    } catch (err) {
      console.error('Failed to get NFT:', err);
      return null;
    }
  }, [network, getOwner, getTokenUri]);

  const getTotalSupply = useCallback(async (): Promise<number> => {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'get-last-token-id',
        functionArgs: [],
        network,
        senderAddress: CONTRACT_ADDRESS,
      });

      const data = cvToValue(result);
      return data?.value || 0;
    } catch (err) {
      console.error('Failed to get total supply:', err);
      return 0;
    }
  }, [network]);

  const fetchCollection = useCallback(async (): Promise<NFTCollection | null> => {
    try {
      const totalSupply = await getTotalSupply();

      return {
        name: 'TimeLock Position NFT',
        symbol: 'TLP',
        totalSupply,
        baseUri: '', // Would come from contract if available
      };
    } catch (err) {
      console.error('Failed to fetch collection info:', err);
      return null;
    }
  }, [getTotalSupply]);

  // ============================================================================
  // Refresh Data
  // ============================================================================

  const refresh = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch collection info
      const collectionData = await fetchCollection();
      setCollection(collectionData);

      // Fetch user's NFTs by scanning recent tokens
      if (stxAddress && collectionData) {
        const userTokens: PositionNFT[] = [];
        const totalSupply = collectionData.totalSupply;

        // Scan last 100 tokens or all if less
        const startId = Math.max(1, totalSupply - 99);
        for (let i = startId; i <= totalSupply; i++) {
          const owner = await getOwner(i);
          if (owner === stxAddress) {
            const nft = await getNFT(i);
            if (nft) {
              userTokens.push(nft);
            }
          }
        }

        setUserNFTs(userTokens);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch NFTs');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, stxAddress, fetchCollection, getOwner, getNFT]);

  // ============================================================================
  // Write Functions
  // ============================================================================

  /**
   * Transfer an NFT to another address
   */
  const transfer = useCallback(async (
    tokenId: number,
    recipient: string
  ): Promise<string | null> => {
    if (!isConnected || !stxAddress) {
      setError('Wallet not connected');
      return null;
    }

    // Validate recipient address
    if (!recipient.startsWith('SP') && !recipient.startsWith('ST')) {
      setError('Invalid recipient address');
      return null;
    }

    setIsTransferring(true);
    setError(null);

    // Create post condition to ensure NFT transfer
    const postConditions = [
      makeStandardNonFungiblePostCondition(
        stxAddress,
        NonFungibleConditionCode.Sends,
        createAssetInfo(CONTRACT_ADDRESS, CONTRACT_NAME, NFT_ASSET_NAME),
        uintCV(tokenId)
      ),
    ];

    return new Promise((resolve) => {
      openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'transfer',
        functionArgs: [
          uintCV(tokenId),
          principalCV(stxAddress),
          principalCV(recipient),
        ],
        postConditionMode: PostConditionMode.Deny,
        postConditions,
        onFinish: (data) => {
          setIsTransferring(false);
          refresh();
          resolve(data.txId);
        },
        onCancel: () => {
          setIsTransferring(false);
          setError('Transaction cancelled');
          resolve(null);
        },
      });
    });
  }, [isConnected, stxAddress, refresh]);

  /**
   * Select an NFT for detailed view
   */
  const selectNFT = useCallback((tokenId: number | null) => {
    if (tokenId === null) {
      setSelectedNFT(null);
      return;
    }

    const nft = userNFTs.find(n => n.tokenId === tokenId);
    setSelectedNFT(nft || null);
  }, [userNFTs]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Load data on mount if connected
  useEffect(() => {
    if (isConnected) {
      refresh();
    }
  }, [isConnected, refresh]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    isLoading,
    isTransferring,
    error,
    userNFTs,
    collection,
    selectedNFT,
    transfer,
    refresh,
    getOwner,
    getTokenUri,
    getNFT,
    selectNFT,
    hasNFTs,
    nftCount,
  };
}

export default usePositionNFT;
