// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/FrenPetV2.sol";
import "../src/FrenPetV2Enhanced.sol";
import "../src/ItemManager.sol";

contract DeployFrenPetV2 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy base FrenPetV2 (without items)
        FrenPetV2 frenPetV2 = new FrenPetV2();
        console.log("FrenPetV2 deployed at:", address(frenPetV2));
        
        // Deploy enhanced version with items
        FrenPetV2Enhanced frenPetV2Enhanced = new FrenPetV2Enhanced();
        console.log("FrenPetV2Enhanced deployed at:", address(frenPetV2Enhanced));
        
        // The ItemManager is deployed automatically by FrenPetV2Enhanced
        address itemManager = address(frenPetV2Enhanced.itemManager());
        console.log("ItemManager deployed at:", itemManager);
        
        vm.stopBroadcast();
        
        // Log deployment info
        console.log("\n=== Deployment Complete ===");
        console.log("Network: RISE Testnet");
        console.log("FrenPetV2:", address(frenPetV2));
        console.log("FrenPetV2Enhanced:", address(frenPetV2Enhanced));
        console.log("ItemManager:", itemManager);
        console.log("\n=== Contract Features ===");
        console.log("- 6 Pet Types (Normal, Fire, Water, Grass, Electric, Dragon)");
        console.log("- Battle System with type advantages");
        console.log("- Inventory & Item System");
        console.log("- Marketplace for trading");
        console.log("- Evolution System (3 stages)");
        console.log("- Daily Rewards");
        console.log("- Gasless transactions ready");
    }
}