// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.20;

/**
 * @title MockFounderSwordsNFT
 * @dev Mock Founder Swords NFT for testing ForgeVerifier
 */
contract MockFounderSwordsNFT {
    uint256 public totalFeesReceived;
    
    event FeesDeposited(uint256 amount);
    
    function depositForgeFees() external payable {
        totalFeesReceived += msg.value;
        emit FeesDeposited(msg.value);
    }
}
