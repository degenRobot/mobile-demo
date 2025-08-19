// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IVRFConsumer {
    function rawFulfillRandomNumbers(uint256 requestId, uint256[] calldata randomNumbers) external;
}

interface IVRFCoordinator {
    function requestRandomNumbers(uint256 numNumbers, uint256 seed) external returns (uint256 requestId);
}