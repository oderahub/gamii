/**
 * Hedera File Service (HFS) Integration
 *
 * Used for storing hand replay data permanently and cheaply.
 * Each game hand can be stored as a file on Hedera for ~$0.05.
 */

import {
  FileCreateTransaction,
  FileAppendTransaction,
  FileContentsQuery,
  FileId,
  Hbar,
} from '@hashgraph/sdk';
import { createHederaClient } from './client';

/**
 * Hand replay data structure
 */
export interface HandReplayData {
  gameId: string;
  handNumber: number;
  timestamp: number;
  players: {
    address: string;
    position: number;
    startingChips: number;
    cards?: number[]; // Hidden until showdown
  }[];
  actions: {
    player: string;
    action: 'fold' | 'call' | 'raise' | 'check' | 'all-in';
    amount?: number;
    timestamp: number;
    round: 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';
  }[];
  communityCards: number[];
  winner: string;
  pot: number;
  rake: number;
}

/**
 * Create a new hand replay file on Hedera File Service
 *
 * @param gameId - Unique game identifier
 * @param handData - Complete hand replay data
 * @returns File ID (0.0.x format)
 */
export async function createHandReplayFile(
  gameId: string,
  handData: Partial<HandReplayData>
): Promise<string> {
  try {
    const client = createHederaClient();

    // Serialize hand data to JSON
    const replayData: HandReplayData = {
      gameId,
      handNumber: handData.handNumber || 1,
      timestamp: Date.now(),
      players: handData.players || [],
      actions: handData.actions || [],
      communityCards: handData.communityCards || [],
      winner: handData.winner || '',
      pot: handData.pot || 0,
      rake: handData.rake || 0,
    };

    const contents = JSON.stringify(replayData, null, 2);
    const contentsBuffer = Buffer.from(contents, 'utf-8');

    // Create file on Hedera
    const transaction = new FileCreateTransaction()
      .setContents(contentsBuffer)
      .setKeys([client.operatorPublicKey!])
      .setMaxTransactionFee(new Hbar(2));

    const response = await transaction.execute(client);
    const receipt = await response.getReceipt(client);
    const fileId = receipt.fileId;

    if (!fileId) {
      throw new Error('Failed to create file - no file ID returned');
    }

    console.log(`✅ Hand replay file created: ${fileId.toString()}`);
    console.log(`   View on HashScan: https://hashscan.io/testnet/file/${fileId.toString()}`);

    return fileId.toString();
  } catch (error) {
    console.error('Failed to create hand replay file:', error);
    throw error;
  }
}

/**
 * Retrieve hand replay data from HFS
 *
 * @param fileId - File ID in 0.0.x format
 * @returns Parsed hand replay data
 */
export async function getHandReplay(fileId: string): Promise<HandReplayData> {
  try {
    const client = createHederaClient();

    const query = new FileContentsQuery()
      .setFileId(FileId.fromString(fileId))
      .setMaxQueryPayment(new Hbar(1));

    const contents = await query.execute(client);
    const data = JSON.parse(contents.toString());

    return data as HandReplayData;
  } catch (error) {
    console.error('Failed to get hand replay:', error);
    throw error;
  }
}

/**
 * Append additional action to existing hand replay file
 * Note: Files can be appended until they reach ~1KB
 *
 * @param fileId - Existing file ID
 * @param action - New action to append
 */
export async function appendHandAction(
  fileId: string,
  action: HandReplayData['actions'][0]
): Promise<void> {
  try {
    const client = createHederaClient();

    // Get existing content
    const existingData = await getHandReplay(fileId);

    // Add new action
    existingData.actions.push(action);

    // Re-serialize
    const contents = JSON.stringify(existingData, null, 2);
    const contentsBuffer = Buffer.from(contents, 'utf-8');

    // Append to file
    const transaction = new FileAppendTransaction()
      .setFileId(FileId.fromString(fileId))
      .setContents(contentsBuffer)
      .setMaxTransactionFee(new Hbar(1));

    await transaction.execute(client);

    console.log(`✅ Action appended to file: ${fileId}`);
  } catch (error) {
    console.error('Failed to append hand action:', error);
    throw error;
  }
}

/**
 * Get all hand replay files for a game
 * Note: This requires tracking file IDs separately (e.g., in HCS or database)
 *
 * @param gameId - Game identifier
 * @param fileIds - Array of file IDs to fetch
 * @returns Array of hand replay data
 */
export async function getGameReplays(
  gameId: string,
  fileIds: string[]
): Promise<HandReplayData[]> {
  try {
    const replays: HandReplayData[] = [];

    for (const fileId of fileIds) {
      const replay = await getHandReplay(fileId);
      if (replay.gameId === gameId) {
        replays.push(replay);
      }
    }

    return replays.sort((a, b) => a.handNumber - b.handNumber);
  } catch (error) {
    console.error('Failed to get game replays:', error);
    throw error;
  }
}

/**
 * Calculate estimated cost for storing hand replay
 *
 * @param handData - Hand data to estimate
 * @returns Estimated cost in HBAR
 */
export function estimateHandReplayCost(handData: Partial<HandReplayData>): number {
  const json = JSON.stringify(handData);
  const sizeKB = Buffer.from(json).length / 1024;

  // HFS pricing: ~$0.05 per file creation + $0.00001 per KB
  // At ~$0.06 per HBAR, that's approximately:
  const baseCost = 0.83; // ~$0.05 / $0.06
  const storageCost = sizeKB * 0.00017; // ~$0.00001 / $0.06

  return baseCost + storageCost;
}

/**
 * Example usage:
 *
 * ```typescript
 * // Save hand replay after game ends
 * const fileId = await createHandReplayFile('game-123', {
 *   handNumber: 1,
 *   players: [
 *     { address: '0x...', position: 0, startingChips: 1000 },
 *     { address: '0x...', position: 1, startingChips: 1000 },
 *   ],
 *   actions: [
 *     { player: '0x...', action: 'raise', amount: 20, timestamp: Date.now(), round: 'pre-flop' },
 *     { player: '0x...', action: 'call', amount: 20, timestamp: Date.now(), round: 'pre-flop' },
 *   ],
 *   communityCards: [1, 2, 3, 4, 5],
 *   winner: '0x...',
 *   pot: 40,
 *   rake: 2,
 * });
 *
 * // Load replay later
 * const replay = await getHandReplay(fileId);
 * console.log(replay.actions);
 * ```
 */
