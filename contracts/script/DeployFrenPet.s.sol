// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console2} from "forge-std/Script.sol";
import {FrenPet} from "../src/FrenPet.sol";

contract DeployFrenPetScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        FrenPet frenPet = new FrenPet();
        console2.log("FrenPet deployed at:", address(frenPet));

        vm.stopBroadcast();
    }
}