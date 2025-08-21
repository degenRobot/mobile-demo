// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./IPetTypes.sol";

/**
 * @title IBattleSystem
 * @notice Interface for the battle system
 */
interface IBattleSystem {
    // Events
    event BattleInitiated(uint256 indexed battleId, address challenger, address opponent);
    event MoveSubmitted(uint256 indexed battleId, address player, IPetTypes.BattleMove move);
    event BattleResolved(uint256 indexed battleId, address winner, uint256 rewards);
    
    // Functions
    function initiateBattle(address _challenger, address _opponent) external returns (uint256 battleId);
    function submitMove(uint256 _battleId, IPetTypes.BattleMove _move) external;
    function resolveBattle(uint256 _battleId) external;
    function getBattleStatus(uint256 _battleId) external view returns (
        address challenger,
        address opponent,
        address winner,
        bool completed
    );
    function calculateDamage(
        IPetTypes.Pet memory attacker,
        IPetTypes.Pet memory defender,
        IPetTypes.BattleMove move
    ) external pure returns (uint256);
}