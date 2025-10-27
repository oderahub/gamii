/**
 * Master Script: Create All HTS Tokens
 *
 * This script creates all tokens needed for the Texas Hold'em application:
 * 1. POKER_CHIP - Fungible token for in-game currency
 * 2. TOURNAMENT_TICKET - NFT for tournament entries
 * 3. ACHIEVEMENT_BADGE - NFT for player achievements
 */

import { createPokerChipToken } from './create-poker-chip';
import { createAllNFTs } from './create-nfts';

async function createAllTokens() {
  console.log('\n╔═════════════════════════════════════════╗');
  console.log('║  HEDERA TOKEN SERVICE (HTS) SETUP       ║');
  console.log('║  Texas Hold\'em ZK Poker                 ║');
  console.log('╚═════════════════════════════════════════╝\n');

  try {
    // Step 1: Create fungible token
    console.log('📍 Step 1/2: Creating fungible token...\n');
    const pokerChipId = await createPokerChipToken();

    // Wait a bit between transactions
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Create NFT collections
    console.log('\n📍 Step 2/2: Creating NFT collections...\n');
    const nftIds = await createAllNFTs();

    // Summary
    console.log('\n╔═════════════════════════════════════════╗');
    console.log('║  ALL TOKENS CREATED SUCCESSFULLY! ✅    ║');
    console.log('╚═════════════════════════════════════════╝\n');

    console.log('📋 SUMMARY OF CREATED TOKENS:\n');
    console.log('Fungible Token:');
    console.log(`  POKER_CHIP: ${pokerChipId}\n`);
    console.log('NFT Collections:');
    console.log(`  TOURNAMENT_TICKET: ${nftIds.tournamentTicketId}`);
    console.log(`  ACHIEVEMENT_BADGE: ${nftIds.achievementBadgeId}\n`);

    console.log('========================================');
    console.log('UPDATE YOUR .env.local FILE');
    console.log('========================================\n');
    console.log('Copy and paste these lines:\n');
    console.log(`NEXT_PUBLIC_POKER_CHIP_TOKEN_ID="${pokerChipId}"`);
    console.log(`NEXT_PUBLIC_TOURNAMENT_TICKET_NFT_ID="${nftIds.tournamentTicketId}"`);
    console.log(`NEXT_PUBLIC_ACHIEVEMENT_BADGE_NFT_ID="${nftIds.achievementBadgeId}"`);
    console.log('\n========================================\n');

  } catch (error) {
    console.error('\n❌ Token creation process failed:', error);
    process.exit(1);
  }
}

// Run the script
createAllTokens()
  .then(() => {
    console.log('✅ Token creation process completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
