/**
 * Create NFT Collections
 *
 * This script creates NFT collections on Hedera Token Service (HTS):
 * 1. TOURNAMENT_TICKET - Entry passes for tournaments
 * 2. ACHIEVEMENT_BADGE - Player achievement rewards
 */

import {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  Hbar,
  AccountId,
  PrivateKey,
  Client
} from '@hashgraph/sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function createNFTCollection(
  client: Client,
  operatorId: AccountId,
  operatorKey: PrivateKey,
  name: string,
  symbol: string,
  maxSupply: number
) {
  console.log(`\nCreating ${name} NFT collection...`);

  const tokenCreateTx = new TokenCreateTransaction()
    .setTokenName(name)
    .setTokenSymbol(symbol)
    .setTokenType(TokenType.NonFungibleUnique)
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(maxSupply)
    .setTreasuryAccountId(operatorId)
    .setAdminKey(operatorKey)
    .setSupplyKey(operatorKey)
    .setFreezeKey(operatorKey)
    .setWipeKey(operatorKey)
    .setMaxTransactionFee(new Hbar(20));

  const tokenCreateSubmit = await tokenCreateTx.execute(client);
  const tokenCreateRx = await tokenCreateSubmit.getReceipt(client);
  const tokenId = tokenCreateRx.tokenId;

  console.log(`✅ ${name} created: ${tokenId}`);
  return tokenId?.toString();
}

async function createAllNFTs() {
  console.log('========================================');
  console.log('CREATING NFT COLLECTIONS');
  console.log('========================================\n');

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
  console.log(`Treasury Account: ${accountId}\n`);

  try {
    // Create Tournament Ticket NFT
    const tournamentTicketId = await createNFTCollection(
      client,
      operatorId,
      operatorKey,
      'Tournament Ticket',
      'TICKET',
      10000 // Max 10,000 tournament tickets
    );

    // Create Achievement Badge NFT
    const achievementBadgeId = await createNFTCollection(
      client,
      operatorId,
      operatorKey,
      'Achievement Badge',
      'BADGE',
      50000 // Max 50,000 achievement badges
    );

    console.log('\n========================================');
    console.log('NFT COLLECTIONS CREATED SUCCESSFULLY');
    console.log('========================================\n');

    console.log('Tournament Ticket NFT:');
    console.log(`  Token ID: ${tournamentTicketId}`);
    console.log(`  Max Supply: 10,000`);
    console.log(`  View: https://hashscan.io/${network}/token/${tournamentTicketId}\n`);

    console.log('Achievement Badge NFT:');
    console.log(`  Token ID: ${achievementBadgeId}`);
    console.log(`  Max Supply: 50,000`);
    console.log(`  View: https://hashscan.io/${network}/token/${achievementBadgeId}\n`);

    console.log('========================================');
    console.log('NEXT STEPS');
    console.log('========================================');
    console.log('Add to .env.local:\n');
    console.log(`NEXT_PUBLIC_TOURNAMENT_TICKET_NFT_ID="${tournamentTicketId}"`);
    console.log(`NEXT_PUBLIC_ACHIEVEMENT_BADGE_NFT_ID="${achievementBadgeId}"\n`);

    client.close();

    return {
      tournamentTicketId,
      achievementBadgeId
    };
  } catch (error) {
    console.error('\n❌ Error creating NFTs:', error);
    client.close();
    throw error;
  }
}

export { createAllNFTs };
