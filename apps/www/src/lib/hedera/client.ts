/**
 * Hedera Client Configuration
 *
 * This module provides Hedera SDK client setup for interacting with
 * native Hedera services (HTS, HCS, HFS)
 */

import {
  Client,
  AccountId,
  PrivateKey
} from '@hashgraph/sdk';
import { env } from '~/env';

/**
 * Create Hedera Client for Server-Side Operations
 * Uses Ed25519 account for native Hedera services
 */
export function createHederaClient(): Client {
  const network = env.NEXT_PUBLIC_HEDERA_NETWORK;

  // Initialize client based on network
  const client = network === 'mainnet'
    ? Client.forMainnet()
    : Client.forTestnet();

  // Set operator (account that pays transaction fees)
  if (env.NEXT_PUBLIC_HEDERA_ED25519_ACCOUNT_ID && process.env.HEDERA_ED25519_PRIVATE_KEY_DER) {
    const operatorId = AccountId.fromString(env.NEXT_PUBLIC_HEDERA_ED25519_ACCOUNT_ID);
    const operatorKey = PrivateKey.fromStringDer(process.env.HEDERA_ED25519_PRIVATE_KEY_DER);

    client.setOperator(operatorId, operatorKey);
  }

  return client;
}

/**
 * Create Hedera Client for ECDSA Account (EVM Compatible)
 * Uses ECDSA account for smart contract interactions
 */
export function createECDSAClient(): Client {
  const network = env.NEXT_PUBLIC_HEDERA_NETWORK;

  const client = network === 'mainnet'
    ? Client.forMainnet()
    : Client.forTestnet();

  if (env.NEXT_PUBLIC_HEDERA_ECDSA_ACCOUNT_ID && process.env.HEDERA_ECDSA_PRIVATE_KEY) {
    const operatorId = AccountId.fromString(env.NEXT_PUBLIC_HEDERA_ECDSA_ACCOUNT_ID);
    const operatorKey = PrivateKey.fromStringECDSA(process.env.HEDERA_ECDSA_PRIVATE_KEY);

    client.setOperator(operatorId, operatorKey);
  }

  return client;
}

/**
 * Get Mirror Node API URL
 */
export function getMirrorNodeUrl(): string {
  return env.NEXT_PUBLIC_HEDERA_MIRROR_NODE;
}

/**
 * Get JSON-RPC Relay URL
 */
export function getJsonRpcUrl(): string {
  return env.NEXT_PUBLIC_HEDERA_JSON_RPC;
}
