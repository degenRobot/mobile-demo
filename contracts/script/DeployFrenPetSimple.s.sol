// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/FrenPetSimple.sol";

contract DeployFrenPetSimple is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        FrenPetSimple frenPetSimple = new FrenPetSimple();
        
        console.log("FrenPetSimple deployed at:", address(frenPetSimple));
        
        vm.stopBroadcast();
    }
}