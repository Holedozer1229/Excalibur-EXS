// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DifficultyTriggers
 * @dev Manages automatic difficulty adjustment triggers
 * 
 * Four types of triggers:
 * 1. Forge Count Milestones - Every 2,016 forges
 * 2. Time Milestones - Monthly adjustments
 * 3. Velocity Triggers - Emergency adjustments for high velocity
 * 4. Treasury Milestones - Every 100 BTC in treasury
 * 
 * When triggered, emits events that can be used by off-chain systems
 * or other contracts to adjust difficulty parameters.
 */
contract DifficultyTriggers is AccessControl {
    bytes32 public constant TRIGGER_MANAGER_ROLE = keccak256("TRIGGER_MANAGER_ROLE");
    
    uint256 public constant FORGE_MILESTONE_INTERVAL = 2016; // Bitcoin homage
    uint256 public constant TIME_MILESTONE_INTERVAL = 30 days; // Monthly
    uint256 public constant TREASURY_MILESTONE_INTERVAL = 100 * 10**8; // 100 BTC in sats
    uint256 public constant HIGH_VELOCITY_THRESHOLD = 150; // 150% of target
    uint256 public constant HIGH_VELOCITY_DURATION = 3 days; // Must be high for 3 days
    
    uint256 public lastForgeAdjustmentCount;
    uint256 public lastTimeAdjustment;
    uint256 public lastTreasuryMilestone;
    uint256 public deploymentTime;
    
    uint256 public currentForgeFee;
    uint256 public totalForgesCompleted;
    uint256 public treasuryBalance;
    
    event DifficultyAdjusted(
        uint256 oldFee,
        uint256 newFee,
        uint256 timestamp,
        string reason
    );
    
    event TriggerActivated(
        string triggerType,
        uint256 timestamp,
        uint256 value
    );
    
    event ForgeMilestoneReached(
        uint256 forgeCount,
        uint256 milestone,
        uint256 timestamp
    );
    
    event TimeMilestoneReached(
        uint256 monthsSinceLaunch,
        uint256 timestamp
    );
    
    event TreasuryMilestoneReached(
        uint256 treasuryBalance,
        uint256 milestone,
        uint256 timestamp
    );
    
    event VelocityTriggerActivated(
        uint256 velocity,
        uint256 duration,
        uint256 timestamp
    );
    
    constructor(uint256 initialFee) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(TRIGGER_MANAGER_ROLE, msg.sender);
        
        deploymentTime = block.timestamp;
        lastTimeAdjustment = block.timestamp;
        currentForgeFee = initialFee;
    }
    
    /**
     * @dev Updates forge count and checks for triggers
     * @param newForgeCount Updated total forge count
     */
    function updateForgeCount(uint256 newForgeCount) 
        external 
        onlyRole(TRIGGER_MANAGER_ROLE) 
    {
        totalForgesCompleted = newForgeCount;
        _checkForgeMilestone();
    }
    
    /**
     * @dev Updates treasury balance and checks for triggers
     * @param newBalance Updated treasury balance in satoshis
     */
    function updateTreasuryBalance(uint256 newBalance) 
        external 
        onlyRole(TRIGGER_MANAGER_ROLE) 
    {
        treasuryBalance = newBalance;
        _checkTreasuryMilestone();
    }
    
    /**
     * @dev Checks all triggers and returns which ones are active
     * @return forgeMilestone Whether forge milestone is triggered
     * @return timeMilestone Whether time milestone is triggered
     * @return treasuryMilestone Whether treasury milestone is triggered
     */
    function checkTriggers() 
        public 
        view 
        returns (
            bool forgeMilestone,
            bool timeMilestone,
            bool treasuryMilestone
        ) 
    {
        forgeMilestone = _shouldTriggerForgeMilestone();
        timeMilestone = _shouldTriggerTimeMilestone();
        treasuryMilestone = _shouldTriggerTreasuryMilestone();
    }
    
    /**
     * @dev Checks if forge milestone trigger is active
     */
    function _shouldTriggerForgeMilestone() internal view returns (bool) {
        if (totalForgesCompleted == 0) return false;
        
        uint256 currentMilestone = totalForgesCompleted / FORGE_MILESTONE_INTERVAL;
        uint256 lastMilestone = lastForgeAdjustmentCount / FORGE_MILESTONE_INTERVAL;
        
        return currentMilestone > lastMilestone;
    }
    
    /**
     * @dev Checks if time milestone trigger is active
     */
    function _shouldTriggerTimeMilestone() internal view returns (bool) {
        return block.timestamp >= lastTimeAdjustment + TIME_MILESTONE_INTERVAL;
    }
    
    /**
     * @dev Checks if treasury milestone trigger is active
     */
    function _shouldTriggerTreasuryMilestone() internal view returns (bool) {
        if (treasuryBalance == 0) return false;
        
        uint256 currentMilestone = treasuryBalance / TREASURY_MILESTONE_INTERVAL;
        uint256 lastMilestone = lastTreasuryMilestone / TREASURY_MILESTONE_INTERVAL;
        
        return currentMilestone > lastMilestone;
    }
    
    /**
     * @dev Checks forge milestone and emits event if triggered
     */
    function _checkForgeMilestone() internal {
        if (_shouldTriggerForgeMilestone()) {
            uint256 milestone = (totalForgesCompleted / FORGE_MILESTONE_INTERVAL) * FORGE_MILESTONE_INTERVAL;
            lastForgeAdjustmentCount = totalForgesCompleted;
            
            emit ForgeMilestoneReached(totalForgesCompleted, milestone, block.timestamp);
            emit TriggerActivated("FORGE_MILESTONE", block.timestamp, milestone);
        }
    }
    
    /**
     * @dev Checks treasury milestone and emits event if triggered
     */
    function _checkTreasuryMilestone() internal {
        if (_shouldTriggerTreasuryMilestone()) {
            uint256 milestone = (treasuryBalance / TREASURY_MILESTONE_INTERVAL) * TREASURY_MILESTONE_INTERVAL;
            lastTreasuryMilestone = treasuryBalance;
            
            emit TreasuryMilestoneReached(treasuryBalance, milestone, block.timestamp);
            emit TriggerActivated("TREASURY_MILESTONE", block.timestamp, milestone);
        }
    }
    
    /**
     * @dev Manually triggers time milestone check
     * Can be called by anyone if time has passed
     */
    function checkTimeMilestone() external {
        if (_shouldTriggerTimeMilestone()) {
            uint256 monthsSinceLaunch = (block.timestamp - deploymentTime) / 30 days;
            lastTimeAdjustment = block.timestamp;
            
            emit TimeMilestoneReached(monthsSinceLaunch, block.timestamp);
            emit TriggerActivated("TIME_MILESTONE", block.timestamp, monthsSinceLaunch);
        }
    }
    
    /**
     * @dev Checks if velocity trigger should activate
     * @param velocity Current velocity percentage
     * @param highVelocityDuration How long velocity has been high (in days)
     * @return Whether velocity trigger is active
     */
    function shouldTriggerVelocity(uint256 velocity, uint256 highVelocityDuration) 
        public 
        pure 
        returns (bool) 
    {
        return velocity >= HIGH_VELOCITY_THRESHOLD && 
               highVelocityDuration >= HIGH_VELOCITY_DURATION / 1 days;
    }
    
    /**
     * @dev Records velocity trigger activation
     * @param velocity Current velocity
     * @param duration Duration velocity has been high
     */
    function recordVelocityTrigger(uint256 velocity, uint256 duration) 
        external 
        onlyRole(TRIGGER_MANAGER_ROLE) 
    {
        require(
            shouldTriggerVelocity(velocity, duration),
            "Velocity trigger conditions not met"
        );
        
        emit VelocityTriggerActivated(velocity, duration, block.timestamp);
        emit TriggerActivated("VELOCITY_TRIGGER", block.timestamp, velocity);
    }
    
    /**
     * @dev Adjusts the current forge fee
     * Called when triggers are activated
     * @param newFee New forge fee in satoshis
     * @param reason Human-readable reason for adjustment
     */
    function adjustForgeFee(uint256 newFee, string calldata reason) 
        external 
        onlyRole(TRIGGER_MANAGER_ROLE) 
    {
        require(newFee > 0, "Fee must be positive");
        
        uint256 oldFee = currentForgeFee;
        currentForgeFee = newFee;
        
        emit DifficultyAdjusted(oldFee, newFee, block.timestamp, reason);
    }
    
    /**
     * @dev Gets days since launch
     * @return Number of days since deployment
     */
    function getDaysSinceLaunch() public view returns (uint256) {
        return (block.timestamp - deploymentTime) / 1 days;
    }
    
    /**
     * @dev Gets months since launch
     * @return Number of months since deployment
     */
    function getMonthsSinceLaunch() public view returns (uint256) {
        return (block.timestamp - deploymentTime) / 30 days;
    }
    
    /**
     * @dev Gets time until next time milestone
     * @return Seconds until next monthly adjustment
     */
    function getTimeUntilNextMilestone() public view returns (uint256) {
        uint256 nextMilestone = lastTimeAdjustment + TIME_MILESTONE_INTERVAL;
        if (block.timestamp >= nextMilestone) {
            return 0;
        }
        return nextMilestone - block.timestamp;
    }
    
    /**
     * @dev Gets forges until next forge milestone
     * @return Number of forges until next 2,016 forge milestone
     */
    function getForgesUntilNextMilestone() public view returns (uint256) {
        uint256 nextMilestone = ((totalForgesCompleted / FORGE_MILESTONE_INTERVAL) + 1) * FORGE_MILESTONE_INTERVAL;
        return nextMilestone - totalForgesCompleted;
    }
    
    /**
     * @dev Gets comprehensive trigger status
     * @return forgeTrigger Forge milestone trigger status
     * @return timeTrigger Time milestone trigger status  
     * @return treasuryTrigger Treasury milestone trigger status
     * @return forgesUntilNext Forges until next milestone
     * @return timeUntilNext Seconds until next time milestone
     */
    function getTriggerStatus() 
        external 
        view 
        returns (
            bool forgeTrigger,
            bool timeTrigger,
            bool treasuryTrigger,
            uint256 forgesUntilNext,
            uint256 timeUntilNext
        ) 
    {
        (forgeTrigger, timeTrigger, treasuryTrigger) = checkTriggers();
        forgesUntilNext = getForgesUntilNextMilestone();
        timeUntilNext = getTimeUntilNextMilestone();
    }
}
