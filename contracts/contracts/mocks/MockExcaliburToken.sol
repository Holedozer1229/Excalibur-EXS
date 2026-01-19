// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MockExcaliburToken
 * @dev Mock EXS Token for testing ForgeVerifier
 */
contract MockExcaliburToken is AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    mapping(address => uint256) public mintedRewards;
    uint256 public totalMinted;
    
    event ForgeRewardMinted(address indexed recipient, uint256 amount);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }
    
    function mintForgeReward(address recipient, uint256 amount) external onlyRole(MINTER_ROLE) {
        mintedRewards[recipient] += amount;
        totalMinted += amount;
        emit ForgeRewardMinted(recipient, amount);
    }
    
    function grantMinterRole(address minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MINTER_ROLE, minter);
    }
}
