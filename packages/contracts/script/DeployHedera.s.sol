// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {GameFactory} from "src/GameFactory.sol";
import {RevealVerifier} from "src/zypher-verifiers/shuffle/RevealVerifier.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title DeployHedera
 * @notice Deployment script for Hedera Testnet
 * @dev Usage:
 *   forge script script/DeployHedera.s.sol:DeployHedera \
 *     --rpc-url hedera_testnet \
 *     --private-key $HEDERA_ECDSA_PRIVATE_KEY \
 *     --broadcast \
 *     --verify
 */
contract DeployHedera is Script {
    GameFactory public factory;
    RevealVerifier public revealVerifier;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("HEDERA_ECDSA_PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        console.log("========================================");
        console.log("HEDERA TESTNET DEPLOYMENT");
        console.log("========================================");
        console.log("Deployer Address:", deployerAddress);
        console.log("Chain ID: 296 (Hedera Testnet)");
        console.log("RPC: https://testnet.hashio.io/api");
        console.log("========================================\n");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy RevealVerifier
        console.log("1. Deploying RevealVerifier...");
        revealVerifier = new RevealVerifier();
        console.log("   RevealVerifier deployed at:", address(revealVerifier));
        console.log("");

        // Deploy GameFactory
        // Note: Forge will automatically deploy and link required libraries
        // (QuickSort and TexasPoker) when deploying contracts that use them
        console.log("2. Deploying GameFactory...");
        factory = new GameFactory();
        console.log("   GameFactory deployed at:", address(factory));
        console.log("");

        vm.stopBroadcast();

        // Update configuration files
        console.log("3. Updating configuration files...");
        updateEnvFile(address(factory), address(revealVerifier));
        updateConfigJson(address(factory), address(revealVerifier));
        console.log("   Configuration updated successfully");
        console.log("");

        // Display deployment summary
        displaySummary(deployerAddress, address(factory), address(revealVerifier));
    }

    function updateEnvFile(address factoryAddress, address verifierAddress) internal {
        // Note: Manual update of .env.local required as Forge can't modify .env files
        // This is a reminder function
        console.log("   Manual Step Required:");
        console.log("   Update apps/www/.env.local with:");
        console.log("   NEXT_PUBLIC_GAME_FACTORY_ADDRESS=", Strings.toHexString(uint160(factoryAddress)));
        console.log("   NEXT_PUBLIC_REVEAL_VERIFIER_ADDRESS=", Strings.toHexString(uint160(verifierAddress)));
    }

    function updateConfigJson(address factoryAddress, address verifierAddress) internal {
        string memory configPath = "../../apps/www/public/config.json";

        vm.writeJson(
            Strings.toHexString(uint160(factoryAddress)),
            configPath,
            ".GAME_FACTORY_ADDRESS"
        );

        vm.writeJson(
            Strings.toHexString(uint160(verifierAddress)),
            configPath,
            ".REVEAL_VERIFIER"
        );

        vm.writeJson(
            '"hedera-testnet"',
            configPath,
            ".network"
        );

        vm.writeJson(
            '296',
            configPath,
            ".chainId"
        );
    }

    function displaySummary(address deployer, address factoryAddr, address verifierAddr) internal view {
        console.log("========================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("========================================");
        console.log("Network:            Hedera Testnet");
        console.log("Chain ID:           296");
        console.log("Deployer:           ", deployer);
        console.log("");
        console.log("Deployed Contracts:");
        console.log("-------------------");
        console.log("GameFactory:        ", factoryAddr);
        console.log("RevealVerifier:     ", verifierAddr);
        console.log("");
        console.log("Note: Libraries (QuickSort, TexasPoker) are automatically");
        console.log("deployed and linked by Forge. Check transaction logs for addresses.");
        console.log("");
        console.log("========================================");
        console.log("VERIFICATION");
        console.log("========================================");
        console.log("Verify contracts on HashScan:");
        console.log("https://hashscan.io/testnet/contract/", factoryAddr);
        console.log("");
        console.log("========================================");
        console.log("HEDERA INTEGRATION");
        console.log("========================================");
        console.log("On-chain Verification:");
        console.log("- Reveal: ON-CHAIN (trustless)");
        console.log("- Shuffle: OFF-CHAIN (client-side proof generation)");
        console.log("");
        console.log("Hedera Services to Integrate:");
        console.log("- HTS: Create POKER_CHIP token");
        console.log("- HCS: Create game event topics");
        console.log("- HFS: Store game history");
        console.log("");
        console.log("========================================");
        console.log("NEXT STEPS");
        console.log("========================================");
        console.log("1. Update .env.local with contract addresses (see above)");
        console.log("");
        console.log("2. Create HTS tokens:");
        console.log("   cd apps/www");
        console.log("   pnpm create-tokens");
        console.log("");
        console.log("3. Create HCS topics:");
        console.log("   pnpm create-topics");
        console.log("");
        console.log("4. Start frontend:");
        console.log("   pnpm dev");
        console.log("");
        console.log("5. Test game creation and play!");
        console.log("========================================\n");
    }
}
