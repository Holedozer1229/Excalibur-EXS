// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.20;

/**
 * @title ForgeDifficulty
 * @dev Three-layer difficulty calculation system for Excalibur forging
 * 
 * Layer 1: Base Difficulty - Increases 10% every 2,016 forges (Bitcoin homage)
 * Layer 2: Demand Multiplier - Adjusts based on forging velocity
 * Layer 3: Time Appreciation - Compounds 1% per month
 * 
 * Starting fee: 0.1 BTC (10,000,000 satoshis)
 * Maximum fee: 21 BTC (2,100,000,000 satoshis) - Bitcoin supply homage
 */
contract ForgeDifficulty {
    
    struct DifficultyMetrics {
        uint256 forgeCount;
        uint256 forgesLastWeek;
        uint256 daysSinceLaunch;
        uint256 btcPriceUsd; // In USD with 18 decimals (e.g., 50000 * 10**18)
    }
    
    uint256 public constant BASE_FEE = 10_000_000; // 0.1 BTC in satoshis
    uint256 public constant DIFFICULTY_ADJUSTMENT_INTERVAL = 2016; // Bitcoin homage
    uint256 public constant BASE_INCREASE_PERCENT = 10; // 10% per era
    uint256 public constant WEEKLY_TARGET_FORGES = 500; // Target 500 forges/week
    uint256 public constant MONTHLY_APPRECIATION_PERCENT = 1; // 1% per month
    uint256 public constant TARGET_BTC_PRICE = 50_000 * 10**18; // $50,000 normalized
    
    // Fee caps by era
    uint256 public constant CAP_FOUNDER_ERA = 11_000_000; // 0.11 BTC (first 1,000)
    uint256 public constant CAP_KNIGHTING_ERA = 25_000_000; // 0.25 BTC (first 10,000)
    uint256 public constant CAP_ROYAL_ERA = 100_000_000; // 1.0 BTC (first 50,000)
    uint256 public constant CAP_LEGENDARY_ERA = 2_100_000_000; // 21 BTC (50,000+)
    
    uint256 public constant MIN_FEE = 10_000_000; // Never below 0.1 BTC
    
    /**
     * @dev Calculates base difficulty based on forge count
     * Increases 10% every 2,016 forges
     * @param forgeCount Current number of forges completed
     * @return Base fee in satoshis
     */
    function calculateBaseDifficulty(uint256 forgeCount) public pure returns (uint256) {
        uint256 baseFee = BASE_FEE;
        
        // Calculate number of difficulty eras completed
        uint256 difficultyEra = forgeCount / DIFFICULTY_ADJUSTMENT_INTERVAL;
        
        // Apply 10% increase per era
        for (uint256 i = 0; i < difficultyEra; i++) {
            baseFee = baseFee * 110 / 100;
        }
        
        return baseFee;
    }
    
    /**
     * @dev Calculates demand multiplier based on forging velocity
     * Returns multiplier as percentage (100 = 1.0x, 200 = 2.0x)
     * @param forgesLastWeek Number of forges in the last 7 days
     * @return Demand multiplier (100-200)
     */
    function calculateDemandMultiplier(uint256 forgesLastWeek) public pure returns (uint256) {
        // No multiplier if at or below target
        if (forgesLastWeek <= WEEKLY_TARGET_FORGES) {
            return 100; // 1.0x
        }
        
        // Calculate excess ratio (e.g., 600 forges = 120% of target)
        uint256 excessRatio = forgesLastWeek * 100 / WEEKLY_TARGET_FORGES;
        
        // For every 10% over target, add 2% multiplier
        // 120% velocity = 100 + ((120-100) * 2 / 10) = 104 = 1.04x
        // 200% velocity = 100 + ((200-100) * 2 / 10) = 120 = 1.20x
        uint256 multiplier = 100 + ((excessRatio - 100) * 2 / 10);
        
        // Cap at 2.0x (200)
        return min(multiplier, 200);
    }
    
    /**
     * @dev Calculates time-based appreciation
     * Compounds 1% per month
     * @param daysSinceLaunch Days since contract launch
     * @return Time multiplier as percentage (100 = 1.0x)
     */
    function calculateTimeAppreciation(uint256 daysSinceLaunch) public pure returns (uint256) {
        // Calculate months elapsed
        uint256 months = daysSinceLaunch / 30;
        
        // Apply 1% compounded appreciation per month
        uint256 appreciation = 100;
        for (uint256 i = 0; i < months; i++) {
            appreciation = appreciation * 101 / 100;
        }
        
        return appreciation;
    }
    
    /**
     * @dev Normalizes fee based on BTC price to maintain stable USD value
     * Adjusts relative to $50,000 BTC target
     * @param btcPriceUsd Current BTC price in USD (with 18 decimals)
     * @return BTC price adjustment (50-200, representing 0.5x to 2.0x)
     */
    function calculateBtcAdjustment(uint256 btcPriceUsd) public pure returns (uint256) {
        if (btcPriceUsd == 0) {
            return 100; // No adjustment if price unavailable
        }
        
        // Calculate adjustment: targetPrice * 100 / currentPrice
        // If BTC is $100k, adjustment = 50k * 100 / 100k = 50 (0.5x)
        // If BTC is $25k, adjustment = 50k * 100 / 25k = 200 (2.0x)
        uint256 adjustment = TARGET_BTC_PRICE * 100 / btcPriceUsd;
        
        // Keep adjustment between 0.5x and 2.0x
        return max(50, min(200, adjustment));
    }
    
    /**
     * @dev Calculates the complete required forge fee
     * Combines all difficulty layers
     * @param metrics Difficulty calculation metrics
     * @return Required fee in satoshis
     */
    function calculateRequiredFee(DifficultyMetrics memory metrics) public pure returns (uint256) {
        // Layer 1: Base difficulty
        uint256 baseFee = calculateBaseDifficulty(metrics.forgeCount);
        
        // Layer 2: Demand multiplier
        uint256 demandMultiplier = calculateDemandMultiplier(metrics.forgesLastWeek);
        
        // Layer 3: Time appreciation
        uint256 timeMultiplier = calculateTimeAppreciation(metrics.daysSinceLaunch);
        
        // Layer 4: BTC price normalization (optional)
        uint256 btcAdjustment = calculateBtcAdjustment(metrics.btcPriceUsd);
        
        // Calculate raw fee: baseFee * (demand/100) * (time/100) * (btc/100)
        uint256 rawFee = baseFee;
        rawFee = rawFee * demandMultiplier / 100;
        rawFee = rawFee * timeMultiplier / 100;
        rawFee = rawFee * btcAdjustment / 100;
        
        // Apply caps and minimums
        return applyCaps(rawFee, metrics.forgeCount);
    }
    
    /**
     * @dev Applies era-based caps to the calculated fee
     * @param fee Calculated fee before caps
     * @param forgeCount Current forge count
     * @return Fee with caps applied
     */
    function applyCaps(uint256 fee, uint256 forgeCount) public pure returns (uint256) {
        // Determine maximum based on forge count era
        uint256 maximum;
        if (forgeCount < 1_000) {
            maximum = CAP_FOUNDER_ERA; // 0.11 BTC
        } else if (forgeCount < 10_000) {
            maximum = CAP_KNIGHTING_ERA; // 0.25 BTC
        } else if (forgeCount < 50_000) {
            maximum = CAP_ROYAL_ERA; // 1.0 BTC
        } else {
            maximum = CAP_LEGENDARY_ERA; // 21 BTC
        }
        
        // Apply minimum and maximum constraints
        return max(MIN_FEE, min(maximum, fee));
    }
    
    /**
     * @dev Returns the minimum of two numbers
     */
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
    
    /**
     * @dev Returns the maximum of two numbers
     */
    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }
    
    /**
     * @dev Projects future fee based on assumptions
     * Useful for dashboard displays
     * @param futureForgeCount Projected forge count
     * @param assumedVelocity Assumed weekly forges
     * @param assumedDays Assumed days from launch
     * @param btcPriceUsd Assumed BTC price
     * @return Projected fee in satoshis
     */
    function projectFutureFee(
        uint256 futureForgeCount,
        uint256 assumedVelocity,
        uint256 assumedDays,
        uint256 btcPriceUsd
    ) external pure returns (uint256) {
        DifficultyMetrics memory metrics = DifficultyMetrics({
            forgeCount: futureForgeCount,
            forgesLastWeek: assumedVelocity,
            daysSinceLaunch: assumedDays,
            btcPriceUsd: btcPriceUsd
        });
        
        return calculateRequiredFee(metrics);
    }
}
