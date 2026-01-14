// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ForgingVelocity
 * @dev Tracks forging velocity and calculates velocity-based multipliers
 * 
 * Monitors the rate at which forges are being completed to dynamically
 * adjust difficulty. Higher velocity = higher multiplier = higher fees
 * to prevent system overload and maintain healthy growth rate.
 * 
 * Target: 500 forges per week
 * Multiplier: Up to 2.0x if forging significantly above target
 */
contract ForgingVelocity is AccessControl {
    bytes32 public constant FORGE_RECORDER_ROLE = keccak256("FORGE_RECORDER_ROLE");
    
    uint256 public constant TARGET_WEEKLY_FORGES = 500;
    uint256 public constant RETENTION_PERIOD = 14 days; // Keep 2 weeks of data
    uint256 public constant MAX_VELOCITY_MULTIPLIER = 200; // 2.0x cap
    
    // Dynamic array to store forge timestamps
    uint256[] public forgeTimestamps;
    
    // Optimization: Track the oldest valid index to avoid repeated scans
    uint256 public oldestValidIndex;
    
    event ForgeRecorded(uint256 timestamp, uint256 totalForges);
    event TimestampsTrimmed(uint256 removedCount, uint256 remainingCount);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(FORGE_RECORDER_ROLE, msg.sender);
    }
    
    /**
     * @dev Records a new forge timestamp
     * Called by ForgeVerifier when a forge is verified
     */
    function recordForge() external onlyRole(FORGE_RECORDER_ROLE) {
        forgeTimestamps.push(block.timestamp);
        emit ForgeRecorded(block.timestamp, forgeTimestamps.length);
        
        // Trim old data periodically (every 100 forges)
        if (forgeTimestamps.length % 100 == 0) {
            _trimOldTimestamps();
        }
    }
    
    /**
     * @dev Removes timestamps older than retention period
     * Keeps array size manageable
     */
    function _trimOldTimestamps() internal {
        if (forgeTimestamps.length == 0) return;
        
        uint256 cutoffTime = block.timestamp - RETENTION_PERIOD;
        uint256 newOldestIndex = oldestValidIndex;
        
        // Find first timestamp within retention period
        while (newOldestIndex < forgeTimestamps.length && 
               forgeTimestamps[newOldestIndex] < cutoffTime) {
            newOldestIndex++;
        }
        
        // Update the oldest valid index
        uint256 removedCount = newOldestIndex - oldestValidIndex;
        if (removedCount > 0) {
            oldestValidIndex = newOldestIndex;
            emit TimestampsTrimmed(removedCount, forgeTimestamps.length - oldestValidIndex);
        }
    }
    
    /**
     * @dev Manually triggers timestamp trimming
     * Can be called by anyone to help maintain the array
     */
    function trimOldTimestamps() external {
        _trimOldTimestamps();
    }
    
    /**
     * @dev Gets the number of forges in the last N days
     * @param days Number of days to look back
     * @return Number of forges in that period
     */
    function getForgesInLastDays(uint256 days) public view returns (uint256) {
        if (forgeTimestamps.length == 0 || days == 0) {
            return 0;
        }
        
        uint256 cutoffTime = block.timestamp - (days * 1 days);
        uint256 count = 0;
        
        // Count from oldest valid index forward
        for (uint256 i = oldestValidIndex; i < forgeTimestamps.length; i++) {
            if (forgeTimestamps[i] >= cutoffTime) {
                count++;
            }
        }
        
        return count;
    }
    
    /**
     * @dev Gets forges in the last 7 days (one week)
     * @return Number of forges in the last week
     */
    function getForgesLastWeek() external view returns (uint256) {
        return getForgesInLastDays(7);
    }
    
    /**
     * @dev Calculates current forging velocity
     * Returns forges per day as a percentage of target
     * @return Velocity percentage (100 = at target, 200 = 2x target)
     */
    function getVelocity() public view returns (uint256) {
        if (forgeTimestamps.length <= oldestValidIndex + 1) {
            return 0; // Not enough data
        }
        
        uint256 oldest = forgeTimestamps[oldestValidIndex];
        uint256 newest = forgeTimestamps[forgeTimestamps.length - 1];
        
        if (newest <= oldest) {
            return 0; // Invalid state
        }
        
        // Calculate days elapsed
        uint256 daysElapsed = (newest - oldest) / 1 days;
        if (daysElapsed == 0) {
            // Very fast forging - return extreme velocity
            return 300; // 3x target
        }
        
        // Calculate forges per day
        uint256 validForges = forgeTimestamps.length - oldestValidIndex;
        uint256 forgesPerDay = validForges / daysElapsed;
        
        // Target is 500/week = ~71.4/day
        uint256 targetPerDay = TARGET_WEEKLY_FORGES / 7;
        
        // Return as percentage of target
        if (targetPerDay == 0) return 100;
        return (forgesPerDay * 100) / targetPerDay;
    }
    
    /**
     * @dev Calculates velocity-based fee multiplier
     * @return Multiplier as percentage (100 = 1.0x, 200 = 2.0x)
     */
    function getVelocityMultiplier() public view returns (uint256) {
        uint256 velocity = getVelocity();
        
        // No multiplier if at or below target
        if (velocity <= 100) {
            return 100; // 1.0x
        }
        
        // Exponential increase above target
        // 150% velocity = 100 + (50 * 25 / 100) = 112.5 = 1.125x
        // 200% velocity = 100 + (100 * 25 / 100) = 125 = 1.25x
        // 300% velocity = 100 + (200 * 25 / 100) = 150 = 1.5x
        // Capped at 2.0x
        uint256 excess = velocity - 100;
        uint256 multiplier = 100 + (excess * 25 / 100);
        
        return min(multiplier, MAX_VELOCITY_MULTIPLIER);
    }
    
    /**
     * @dev Checks if velocity has been high for consecutive days
     * Used for triggering emergency difficulty adjustments
     * @param days Number of consecutive days to check
     * @param threshold Velocity threshold (e.g., 150 for 150%)
     * @return Whether velocity has been consistently high
     */
    function isVelocityHighFor(uint256 days, uint256 threshold) external view returns (bool) {
        if (forgeTimestamps.length <= oldestValidIndex + 1) {
            return false;
        }
        
        // Check each of the last N days
        for (uint256 i = 0; i < days; i++) {
            uint256 forgesInDay = getForgesInLastDays(i + 1) - getForgesInLastDays(i);
            uint256 targetPerDay = TARGET_WEEKLY_FORGES / 7;
            
            if (forgesInDay * 100 / targetPerDay < threshold) {
                return false; // One day below threshold
            }
        }
        
        return true; // All days above threshold
    }
    
    /**
     * @dev Gets detailed velocity statistics
     * @return forgesLast7Days Forges in last week
     * @return forgesLast24Hours Forges in last day
     * @return currentVelocity Current velocity percentage
     * @return velocityMultiplier Current multiplier
     */
    function getVelocityStats() external view returns (
        uint256 forgesLast7Days,
        uint256 forgesLast24Hours,
        uint256 currentVelocity,
        uint256 velocityMultiplier
    ) {
        forgesLast7Days = getForgesInLastDays(7);
        forgesLast24Hours = getForgesInLastDays(1);
        currentVelocity = getVelocity();
        velocityMultiplier = getVelocityMultiplier();
    }
    
    /**
     * @dev Gets the total number of recorded forges
     * @return Total forge count
     */
    function getTotalForges() external view returns (uint256) {
        return forgeTimestamps.length;
    }
    
    /**
     * @dev Gets the number of valid (non-trimmed) forge records
     * @return Valid forge count
     */
    function getValidForgeCount() external view returns (uint256) {
        if (forgeTimestamps.length <= oldestValidIndex) {
            return 0;
        }
        return forgeTimestamps.length - oldestValidIndex;
    }
    
    /**
     * @dev Returns the minimum of two numbers
     */
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
