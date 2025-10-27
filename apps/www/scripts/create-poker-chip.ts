/**
 * Create POKER_CHIP Fungible Token
 *
 * This script creates a fungible token on Hedera Token Service (HTS)
 * to be used as the in-game currency for Texas Hold'em poker.
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

async function createPokerChipToken() {
  console.log('========================================');
  console.log('CREATING POKER_CHIP FUNGIBLE TOKEN');
  console.log('========================================\n');

  // Validate environment variables
  const accountId = process.env.NEXT_PUBLIC_HEDERA_ED25519_ACCOUNT_ID;
  const privateKeyDer = process.env.HEDERA_ED25519_PRIVATE_KEY_DER;
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK;

  if (!accountId || !privateKeyDer) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_HEDERA_ED25519_ACCOUNT_ID or HEDERA_ED25519_PRIVATE_KEY_DER');
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
    // Create fungible token
    const tokenCreateTx = new TokenCreateTransaction()
      .setTokenName('Poker Chip')
      .setTokenSymbol('CHIP')
      .setDecimals(2) // 2 decimals like USD cents
      .setInitialSupply(1000000000) // 10 million CHIP (with 2 decimals = 10,000,000.00)
      .setTreasuryAccountId(operatorId)
      .setSupplyType(TokenSupplyType.Infinite) // Can mint more if needed
      .setTokenType(TokenType.FungibleCommon)
      .setAdminKey(operatorKey)
      .setSupplyKey(operatorKey)
      .setFreezeKey(operatorKey)
      .setWipeKey(operatorKey)
      .setMaxTransactionFee(new Hbar(20)); // Max fee for token creation

    console.log('Submitting token creation transaction...');
    const tokenCreateSubmit = await tokenCreateTx.execute(client);
    const tokenCreateRx = await tokenCreateSubmit.getReceipt(client);
    const tokenId = tokenCreateRx.tokenId;

    console.log('\n✅ POKER_CHIP Token Created Successfully!\n');
    console.log(`Token ID: ${tokenId}`);
    console.log(`Token Name: Poker Chip`);
    console.log(`Token Symbol: CHIP`);
    console.log(`Decimals: 2`);
    console.log(`Initial Supply: 10,000,000.00 CHIP`);
    console.log(`Treasury: ${accountId}\n`);

    console.log('========================================');
    console.log('NEXT STEPS');
    console.log('========================================');
    console.log('1. Add to .env.local:');
    console.log(`   NEXT_PUBLIC_POKER_CHIP_TOKEN_ID="${tokenId}"\n`);
    console.log('2. View token on HashScan:');
    console.log(`   https://hashscan.io/${network}/token/${tokenId}\n`);

    client.close();
    return tokenId?.toString();
  } catch (error) {
    console.error('\n❌ Error creating token:', error);
    client.close();
    throw error;
  }
}

export { createPokerChipToken };
