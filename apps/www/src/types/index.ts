export interface OverlayProps {
  contractAddress: `0x${string}`;
  refresh?: () => Promise<void>;
}

export interface Player {
  addr: string;
  publicKey: {
    x: bigint;
    y: bigint;
  };
}

// HTS (Hedera Token Service) Types
export interface BuyChipsRequest {
  playerAddress: string;
  hbarAmount: number;
}

export interface BuyChipsResponse {
  success: boolean;
  transactionBytes?: string;
  chipAmount?: number;
  message?: string;
  error?: string;
}

export interface GameCompleteRequest {
  gameAddress: string;
  winnerAddress: string;
  gameData: {
    potSize: string;
    winningHand?: string;
    totalPlayers: number;
  };
}

export interface GameCompleteResponse {
  success: boolean;
  nftSerial?: number;
  tokenId?: string;
  transactionId?: string;
  error?: string;
}

export interface TokenBalance {
  tokenId: string;
  balance: number;
  decimals: number;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Record<string, string | number>;
}
