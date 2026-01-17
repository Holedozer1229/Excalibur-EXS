// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title FounderAdvantage
 * @dev Provides discounts and protections for early forgers
 * 
 * Early forgers receive:
 * - 25% discount on their first 10 forges
 * - 10% permanent discount on all future forges
 * - Protection from demand multipliers for first 100 forges
 * - Priority access during special events
 * 
 * This creates long-term value for early adopters and rewards
 * those who believed in the project from the beginning.
 */
contract FounderAdvantage is AccessControl {
    bytes32 public constant FORGE_MANAGER_ROLE = keccak256("FORGE_MANAGER_ROLE");
    
    struct FounderStatus {
        uint256 firstForgeBlock;
        uint256 firstForgeTimestamp;
        uint256 forgeCount;
        bool isFounder; // Set to true after first forge
    }
    
    mapping(address => FounderStatus) public founderStatus;
    
    uint256 public constant EARLY_FORGE_DISCOUNT = 25; // 25% discount for first 10
    uint256 public constant PERMANENT_DISCOUNT = 10; // 10% discount forever after
    uint256 public constant DEMAND_SHIELD_FORGES = 100; // Shield from demand for 100 forges
    uint256 public constant EARLY_FORGE_COUNT = 10; // First 10 forges get extra discount
    
    uint256 public founderCutoffBlock; // Block after which founders are no longer registered
    uint256 public founderCutoffForges; // Total forge count cutoff (e.g., first 1,000 forgers)
    
    event FounderRegistered(address indexed founder, uint256 blockNumber, uint256 timestamp);
    event ForgeRecorded(address indexed founder, uint256 forgeCount, uint256 discount);
    event FounderCutoffSet(uint256 blockNumber, uint256 forgeCount);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(FORGE_MANAGER_ROLE, msg.sender);
        
        // Initially no cutoff - will be set by admin
        founderCutoffBlock = type(uint256).max;
        founderCutoffForges = 1000; // Default: first 1,000 forgers are founders
    }
    
    /**
     * @dev Records a forge for a user
     * Registers them as founder if eligible
     * @param forger Address of the forger
     * @param totalForges Current total forge count (for cutoff check)
     */
    function recordForge(address forger, uint256 totalForges) 
        external 
        onlyRole(FORGE_MANAGER_ROLE) 
    {
        FounderStatus storage status = founderStatus[forger];
        
        // Register as founder if first forge and within cutoff
        if (!status.isFounder && _isWithinFounderCutoff(totalForges)) {
            status.isFounder = true;
            status.firstForgeBlock = block.number;
            status.firstForgeTimestamp = block.timestamp;
            emit FounderRegistered(forger, block.number, block.timestamp);
        }
        
        // Increment forge count
        status.forgeCount++;
        
        uint256 discount = getDiscount(forger);
        emit ForgeRecorded(forger, status.forgeCount, discount);
    }
    
    /**
     * @dev Checks if current state is within founder cutoff period
     * @param totalForges Current total forge count
     * @return Whether founders can still be registered
     */
    function _isWithinFounderCutoff(uint256 totalForges) internal view returns (bool) {
        return block.number < founderCutoffBlock && totalForges < founderCutoffForges;
    }
    
    /**
     * @dev Sets the founder cutoff parameters
     * @param blockNumber Block number cutoff
     * @param forgeCount Forge count cutoff
     */
    function setFounderCutoff(uint256 blockNumber, uint256 forgeCount) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(blockNumber > block.number, "Block number must be in future");
        require(forgeCount > 0, "Forge count must be positive");
        
        founderCutoffBlock = blockNumber;
        founderCutoffForges = forgeCount;
        
        emit FounderCutoffSet(blockNumber, forgeCount);
    }
    
    /**
     * @dev Gets the discount percentage for a forger
     * @param forger Address of the forger
     * @return Discount percentage (0-25)
     */
    function getDiscount(address forger) public view returns (uint256) {
        FounderStatus memory status = founderStatus[forger];
        
        if (!status.isFounder) {
            return 0; // Not a founder
        }
        
        // First 10 forges get 25% discount
        if (status.forgeCount < EARLY_FORGE_COUNT) {
            return EARLY_FORGE_DISCOUNT;
        }
        
        // All subsequent forges get 10% discount
        return PERMANENT_DISCOUNT;
    }
    
    /**
     * @dev Calculates the discounted fee for a forger
     * @param forger Address of the forger
     * @param baseFee Base forge fee before discount
     * @return Discounted fee
     */
    function getDiscountedFee(address forger, uint256 baseFee) 
        public 
        view 
        returns (uint256) 
    {
        uint256 discount = getDiscount(forger);
        if (discount == 0) {
            return baseFee;
        }
        
        // Apply discount: fee * (100 - discount) / 100
        return baseFee * (100 - discount) / 100;
    }
    
    /**
     * @dev Checks if a forger is shielded from demand multipliers
     * Founders are shielded for their first 100 forges
     * @param forger Address of the forger
     * @return Whether forger is shielded from demand multipliers
     */
    function isDemandShielded(address forger) public view returns (bool) {
        FounderStatus memory status = founderStatus[forger];
        return status.isFounder && status.forgeCount < DEMAND_SHIELD_FORGES;
    }
    
    /**
     * @dev Calculates the final fee with founder advantages applied
     * Includes both discount and demand shield
     * @param forger Address of the forger
     * @param baseFee Base fee before adjustments
     * @param demandMultiplier Demand multiplier (100 = 1.0x)
     * @return Final fee with founder advantages
     */
    function getProtectedFee(
        address forger,
        uint256 baseFee,
        uint256 demandMultiplier
    ) external view returns (uint256) {
        // Apply discount first
        uint256 discountedFee = getDiscountedFee(forger, baseFee);
        
        // Check if founder is shielded from demand
        if (isDemandShielded(forger)) {
            // Ignore demand multiplier
            return discountedFee;
        }
        
        // Apply demand multiplier if not shielded
        return discountedFee * demandMultiplier / 100;
    }
    
    /**
     * @dev Checks if an address is registered as a founder
     * @param forger Address to check
     * @return Whether address is a founder
     */
    function isFounder(address forger) external view returns (bool) {
        return founderStatus[forger].isFounder;
    }
    
    /**
     * @dev Gets detailed founder status
     * @param forger Address to check
     * @return status Complete founder status struct
     */
    function getFounderStatus(address forger) 
        external 
        view 
        returns (FounderStatus memory status) 
    {
        return founderStatus[forger];
    }
    
    /**
     * @dev Gets comprehensive founder advantages
     * @param forger Address to check
     * @return isFounder Whether address is a founder
     * @return forgeCount Number of forges completed
     * @return currentDiscount Current discount percentage
     * @return isDemandShielded Whether shielded from demand multipliers
     * @return forgesUntilShieldEnd Forges remaining with demand shield
     */
    function getFounderAdvantages(address forger) 
        external 
        view 
        returns (
            bool isFounder_,
            uint256 forgeCount,
            uint256 currentDiscount,
            bool isDemandShielded_,
            uint256 forgesUntilShieldEnd
        ) 
    {
        FounderStatus memory status = founderStatus[forger];
        isFounder_ = status.isFounder;
        forgeCount = status.forgeCount;
        currentDiscount = getDiscount(forger);
        isDemandShielded_ = isDemandShielded(forger);
        
        if (isDemandShielded_ && status.forgeCount < DEMAND_SHIELD_FORGES) {
            forgesUntilShieldEnd = DEMAND_SHIELD_FORGES - status.forgeCount;
        } else {
            forgesUntilShieldEnd = 0;
        }
    }
    
    /**
     * @dev Emergency function to manually register a founder
     * Only for fixing errors or special cases
     * @param forger Address to register
     * @param forgeCount Initial forge count
     */
    function manuallyRegisterFounder(address forger, uint256 forgeCount) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(forger != address(0), "Invalid address");
        require(!founderStatus[forger].isFounder, "Already a founder");
        
        founderStatus[forger] = FounderStatus({
            isFounder: true,
            firstForgeBlock: block.number,
            firstForgeTimestamp: block.timestamp,
            forgeCount: forgeCount
        });
        
        emit FounderRegistered(forger, block.number, block.timestamp);
    }
}
