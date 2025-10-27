/**
 * Create HCS Topics
 *
 * This script creates Hedera Consensus Service (HCS) topics for:
 * 1. GAME_EVENTS - Real-time game state updates
 * 2. GAME_CHAT - Player communication
 * 3. GLOBAL_LOBBY - Live games list
 */

import {
  TopicCreateTransaction,
  TopicId,
  AccountId,
  PrivateKey,
  Client,
  Hbar
} from '@hashgraph/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function createHCSTopic(
  client: Client,
  operatorId: AccountId,
  operatorKey: PrivateKey,
  memo: string
): Promise<string> {
  console.log(`\nCreating HCS topic: ${memo}...`);

  const transaction = new TopicCreateTransaction()
    .setTopicMemo(memo)
    .setAdminKey(operatorKey)
    .setSubmitKey(operatorKey)
    .setMaxTransactionFee(new Hbar(2));

  const txResponse = await transaction.execute(client);
  const receipt = await txResponse.getReceipt(client);
  const topicId = receipt.topicId;

  console.log(`✅ Topic created: ${topicId}`);
  return topicId?.toString() || '';
}

async function createAllTopics() {
  console.log('╔═════════════════════════════════════════╗');
  console.log('║  HEDERA CONSENSUS SERVICE (HCS) SETUP   ║');
  console.log('║  Texas Hold\'em ZK Poker                 ║');
  console.log('╚═════════════════════════════════════════╝\n');

  // Validate environment variables
  const accountId = process.env.NEXT_PUBLIC_HEDERA_ED25519_ACCOUNT_ID;
  const privateKeyDer = process.env.HEDERA_ED25519_PRIVATE_KEY_DER;
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK;

  if (!accountId || !privateKeyDer) {
    throw new Error('Missing required environment variables');
  }

  // Create Hedera client
  const client = network === 'mainnet'
    ? Client.forMainnet()
    : Client.forTestnet();

  const operatorId = AccountId.fromString(accountId);
  const operatorKey = PrivateKey.fromStringDer(privateKeyDer);
  client.setOperator(operatorId, operatorKey);

  console.log(`Network: ${network}`);
  console.log(`Operator Account: ${accountId}\n`);

  try {
    // Create Game Events Topic
    const gameEventsTopic = await createHCSTopic(
      client,
      operatorId,
      operatorKey,
      'Texas Holdem - Game Events'
    );

    // Wait a bit between transactions
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create Game Chat Topic
    const gameChatTopic = await createHCSTopic(
      client,
      operatorId,
      operatorKey,
      'Texas Holdem - Game Chat'
    );

    // Wait a bit between transactions
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create Global Lobby Topic
    const globalLobbyTopic = await createHCSTopic(
      client,
      operatorId,
      operatorKey,
      'Texas Holdem - Global Lobby'
    );

    console.log('\n╔═════════════════════════════════════════╗');
    console.log('║  HCS TOPICS CREATED SUCCESSFULLY! ✅    ║');
    console.log('╚═════════════════════════════════════════╝\n');

    console.log('📋 SUMMARY OF CREATED TOPICS:\n');
    console.log('Game Events Topic:');
    console.log(`  Topic ID: ${gameEventsTopic}`);
    console.log(`  Purpose: Real-time game state updates`);
    console.log(`  View: https://hashscan.io/${network}/topic/${gameEventsTopic}\n`);

    console.log('Game Chat Topic:');
    console.log(`  Topic ID: ${gameChatTopic}`);
    console.log(`  Purpose: Player communication`);
    console.log(`  View: https://hashscan.io/${network}/topic/${gameChatTopic}\n`);

    console.log('Global Lobby Topic:');
    console.log(`  Topic ID: ${globalLobbyTopic}`);
    console.log(`  Purpose: Live games list`);
    console.log(`  View: https://hashscan.io/${network}/topic/${globalLobbyTopic}\n`);

    console.log('========================================');
    console.log('UPDATE YOUR .env.local FILE');
    console.log('========================================\n');
    console.log('Add these lines:\n');
    console.log(`NEXT_PUBLIC_GAME_EVENTS_TOPIC_ID="${gameEventsTopic}"`);
    console.log(`NEXT_PUBLIC_GAME_CHAT_TOPIC_ID="${gameChatTopic}"`);
    console.log(`NEXT_PUBLIC_GLOBAL_LOBBY_TOPIC_ID="${globalLobbyTopic}"`);
    console.log('\n========================================\n');

    client.close();

    return {
      gameEventsTopic,
      gameChatTopic,
      globalLobbyTopic
    };
  } catch (error) {
    console.error('\n❌ Error creating topics:', error);
    client.close();
    throw error;
  }
}

// Run the script
createAllTopics()
  .then(() => {
    console.log('✅ HCS topic creation completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

export { createAllTopics };
