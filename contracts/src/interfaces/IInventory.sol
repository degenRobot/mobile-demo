// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./IPetTypes.sol";

/**
 * @title IInventory
 * @notice Interface for inventory management system
 */
interface IInventory {
    // Events
    event ItemAdded(address indexed owner, IPetTypes.ItemType item, uint256 quantity);
    event ItemUsed(address indexed owner, IPetTypes.ItemType item);
    event CoinsTransferred(address indexed from, address indexed to, uint256 amount);
    
    // Functions
    function addItem(address _owner, IPetTypes.ItemType _item, uint256 _quantity) external;
    function removeItem(address _owner, IPetTypes.ItemType _item, uint256 _quantity) external;
    function hasItem(address _owner, IPetTypes.ItemType _item, uint256 _quantity) external view returns (bool);
    function getItemCount(address _owner, IPetTypes.ItemType _item) external view returns (uint256);
    function addCoins(address _owner, uint256 _amount) external;
    function removeCoins(address _owner, uint256 _amount) external;
    function getCoins(address _owner) external view returns (uint256);
}