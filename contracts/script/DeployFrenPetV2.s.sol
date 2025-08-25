// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/FrenPetV2.sol";

contract DeployFrenPetV2 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        FrenPetV2 frenPet = new FrenPetV2();
        
        console.log("FrenPetV2 deployed at:", address(frenPet));
        
        vm.stopBroadcast();
    }
}