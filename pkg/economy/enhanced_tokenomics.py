#!/usr/bin/env python3
"""
Excalibur $EXS Enhanced Tokenomics Engine

Implements improved halving schedule and dynamic difficulty adjustment
that resolves Bitcoin's current problems:
- Smooth exponential halvings instead of cliff drops
- Real-time difficulty adjustment with anti-manipulation
- Tail emission for long-term security
- Adaptive fee market with surge pricing

Author: Travis D. Jones <holedozer@icloud.com>
License: BSD 3-Clause
"""

import json
import math
from typing import Dict, List, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timezone


@dataclass
class ForgeReward:
    """Reward calculation for a specific forge"""
    forge_number: int
    base_reward: float
    actual_reward: float
    treasury_fee: float
    miner_payout: float
    halving_number: int
    in_transition: bool
    transition_progress: float


@dataclass
class DifficultyAdjustment:
    """Difficulty adjustment calculation"""
    current_difficulty: int
    new_difficulty: int
    adjustment_factor: float
    actual_time: float
    target_time: float
    emergency_mode: bool
    reason: str


class EnhancedTokenomics:
    """
    Enhanced Tokenomics Engine for Excalibur $EXS
    
    Improvements over Bitcoin:
    1. Smooth exponential halving (no cliff effects)
    2. Real-time difficulty adjustment (24h window)
    3. Tail emission (0.1 $EXS perpetual)
    4. Adaptive fee market with surge pricing
    5. Anti-manipulation timestamp validation
    """
    
    # Supply constants
    TOTAL_CAP = 21_000_000
    INITIAL_REWARD = 50.0
    MIN_REWARD = 0.1  # Tail emission
    
    # Halving schedule
    HALVING_INTERVAL = 52_500  # Forges between halvings
    TRANSITION_PERIOD = 1_000  # Forges for smooth transition
    DECAY_RATE = 0.001  # Exponential decay rate
    
    # Difficulty adjustment
    TARGET_FORGE_TIME = 600  # 10 minutes in seconds
    ADJUSTMENT_WINDOW = 144  # ~24 hours at target rate
    MIN_ADJUSTMENT_FACTOR = 0.5  # Max 50% decrease
    MAX_ADJUSTMENT_FACTOR = 2.0  # Max 100% increase
    EMERGENCY_THRESHOLD = 0.25  # 25% off target triggers emergency
    
    # Fee structure
    TREASURY_FEE_PERCENT = 0.01  # 1%
    BASE_FORGE_FEE_BTC = 0.0001
    SURGE_MULTIPLIER_MAX = 10.0
    
    # EMA parameters
    EMA_ALPHA = 0.1  # Smoothing factor for real-time adjustment
    
    def __init__(self):
        """Initialize the enhanced tokenomics engine."""
        self.current_forge = 0
        self.current_difficulty = 4
        self.forge_times = []
        self.total_minted = 0.0
    
    def calculate_reward(self, forge_number: int) -> ForgeReward:
        """
        Calculate reward for a given forge number with smooth halving.
        
        Uses exponential decay during transition periods to prevent
        cliff effects that cause hashrate volatility.
        
        Args:
            forge_number: The forge number
            
        Returns:
            ForgeReward with detailed breakdown
        """
        # Determine which halving period we're in
        halving_number = forge_number // self.HALVING_INTERVAL
        
        # Base reward before any halvings
        base_reward = self.INITIAL_REWARD / (2 ** halving_number)
        
        # Apply tail emission floor
        if base_reward < self.MIN_REWARD:
            base_reward = self.MIN_REWARD
        
        # Check if we're in a transition period
        forges_into_period = forge_number % self.HALVING_INTERVAL
        in_transition = forges_into_period < self.TRANSITION_PERIOD
        
        if in_transition and halving_number > 0:
            # Smooth exponential transition
            prev_reward = self.INITIAL_REWARD / (2 ** (halving_number - 1))
            transition_progress = forges_into_period / self.TRANSITION_PERIOD
            
            # Exponential decay formula
            actual_reward = prev_reward * math.exp(-self.DECAY_RATE * forges_into_period)
            actual_reward = max(actual_reward, base_reward)
        else:
            actual_reward = base_reward
            transition_progress = 0.0
        
        # Calculate treasury fee and miner payout
        treasury_fee = actual_reward * self.TREASURY_FEE_PERCENT
        miner_payout = actual_reward - treasury_fee
        
        return ForgeReward(
            forge_number=forge_number,
            base_reward=base_reward,
            actual_reward=actual_reward,
            treasury_fee=treasury_fee,
            miner_payout=miner_payout,
            halving_number=halving_number,
            in_transition=in_transition,
            transition_progress=transition_progress
        )
    
    def calculate_difficulty_adjustment(
        self,
        current_difficulty: int,
        forge_times: List[float]
    ) -> DifficultyAdjustment:
        """
        Calculate new difficulty with improved algorithm.
        
        Improvements over Bitcoin:
        - 24-hour window instead of 2-week
        - Real-time EMA smoothing
        - Emergency mode for extreme conditions
        - Timestamp outlier rejection
        
        Args:
            current_difficulty: Current difficulty level
            forge_times: List of recent forge times (seconds)
            
        Returns:
            DifficultyAdjustment with new difficulty
        """
        if len(forge_times) < 2:
            return DifficultyAdjustment(
                current_difficulty=current_difficulty,
                new_difficulty=current_difficulty,
                adjustment_factor=1.0,
                actual_time=0,
                target_time=self.TARGET_FORGE_TIME,
                emergency_mode=False,
                reason="Insufficient data"
            )
        
        # Use last ADJUSTMENT_WINDOW forges
        window = forge_times[-self.ADJUSTMENT_WINDOW:]
        
        # Remove outliers (timestamp manipulation protection)
        sorted_times = sorted(window)
        # Use median-based trimming (remove top and bottom 10%)
        trim_size = len(sorted_times) // 10
        if trim_size > 0:
            trimmed_times = sorted_times[trim_size:-trim_size]
        else:
            trimmed_times = sorted_times
        
        # Calculate actual average time
        actual_time = sum(trimmed_times) / len(trimmed_times) if trimmed_times else self.TARGET_FORGE_TIME
        
        # Calculate adjustment factor with damping
        raw_factor = actual_time / self.TARGET_FORGE_TIME
        damped_factor = max(
            self.MIN_ADJUSTMENT_FACTOR,
            min(raw_factor, self.MAX_ADJUSTMENT_FACTOR)
        )
        
        # Apply EMA smoothing for stability
        ema_factor = self.EMA_ALPHA * damped_factor + (1 - self.EMA_ALPHA) * 1.0
        
        # Check for emergency conditions
        emergency_mode = False
        if actual_time > (4 * self.TARGET_FORGE_TIME):
            # Network is extremely slow, emergency adjustment
            ema_factor = 0.5
            emergency_mode = True
            reason = "Emergency: Network hashrate critically low"
        elif actual_time < (0.25 * self.TARGET_FORGE_TIME):
            # Network is extremely fast, prevent attack
            ema_factor = 2.0
            emergency_mode = True
            reason = "Emergency: Suspected hashrate attack"
        else:
            reason = "Normal adjustment"
        
        # Calculate new difficulty
        new_difficulty = int(current_difficulty * ema_factor)
        new_difficulty = max(1, new_difficulty)  # Minimum difficulty of 1
        
        return DifficultyAdjustment(
            current_difficulty=current_difficulty,
            new_difficulty=new_difficulty,
            adjustment_factor=ema_factor,
            actual_time=actual_time,
            target_time=self.TARGET_FORGE_TIME,
            emergency_mode=emergency_mode,
            reason=reason
        )
    
    def calculate_dynamic_fee(
        self,
        base_fee: float,
        network_congestion: float
    ) -> float:
        """
        Calculate dynamic forge fee with surge pricing.
        
        Args:
            base_fee: Base fee in BTC
            network_congestion: Congestion level (0.0 to 1.0)
            
        Returns:
            Dynamic fee in BTC
        """
        # Surge multiplier based on congestion
        surge_multiplier = 1.0 + (network_congestion * (self.SURGE_MULTIPLIER_MAX - 1.0))
        dynamic_fee = base_fee * surge_multiplier
        
        return min(dynamic_fee, base_fee * self.SURGE_MULTIPLIER_MAX)
    
    def simulate_emission_schedule(self, max_forges: int = 420_000) -> Dict:
        """
        Simulate the complete emission schedule.
        
        Args:
            max_forges: Maximum forges to simulate
            
        Returns:
            Dictionary with simulation results
        """
        results = {
            'total_forges': max_forges,
            'total_minted': 0.0,
            'halvings': [],
            'rewards_by_period': []
        }
        
        current_period = 0
        period_rewards = []
        
        for forge in range(max_forges):
            reward = self.calculate_reward(forge)
            results['total_minted'] += reward.actual_reward
            period_rewards.append(reward.actual_reward)
            
            # Track halving transitions
            period = forge // self.HALVING_INTERVAL
            if period != current_period:
                results['halvings'].append({
                    'halving_number': period,
                    'at_forge': forge,
                    'reward': reward.actual_reward
                })
                
                results['rewards_by_period'].append({
                    'period': current_period,
                    'avg_reward': sum(period_rewards) / len(period_rewards),
                    'total_minted': sum(period_rewards),
                    'forge_count': len(period_rewards)
                })
                
                current_period = period
                period_rewards = []
        
        return results
    
    def compare_to_bitcoin(self, forge_number: int) -> Dict:
        """
        Compare Excalibur's reward schedule to Bitcoin's at a given point.
        
        Args:
            forge_number: Forge number to compare
            
        Returns:
            Comparison dictionary
        """
        exs_reward = self.calculate_reward(forge_number)
        
        # Bitcoin's abrupt halving
        btc_halving = forge_number // self.HALVING_INTERVAL
        btc_reward = self.INITIAL_REWARD / (2 ** btc_halving)
        
        # Calculate volatility (reward change from previous forge)
        if forge_number > 0:
            exs_prev = self.calculate_reward(forge_number - 1).actual_reward
            btc_prev = self.INITIAL_REWARD / (2 ** ((forge_number - 1) // self.HALVING_INTERVAL))
            
            exs_change = abs(exs_reward.actual_reward - exs_prev) / exs_prev if exs_prev > 0 else 0
            btc_change = abs(btc_reward - btc_prev) / btc_prev if btc_prev > 0 else 0
        else:
            exs_change = 0
            btc_change = 0
        
        return {
            'forge_number': forge_number,
            'excalibur': {
                'reward': exs_reward.actual_reward,
                'in_transition': exs_reward.in_transition,
                'volatility': exs_change * 100
            },
            'bitcoin': {
                'reward': btc_reward,
                'in_transition': False,
                'volatility': btc_change * 100
            },
            'improvement': {
                'volatility_reduction': ((btc_change - exs_change) / btc_change * 100) if btc_change > 0 else 0
            }
        }


def main():
    """Demonstration and testing of enhanced tokenomics."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Excalibur $EXS Enhanced Tokenomics Engine'
    )
    
    parser.add_argument('command', 
                       choices=['reward', 'difficulty', 'simulate', 'compare'],
                       help='Command to execute')
    
    parser.add_argument('--forge', type=int, default=0,
                       help='Forge number for reward calculation')
    
    parser.add_argument('--max-forges', type=int, default=420000,
                       help='Maximum forges for simulation')
    
    args = parser.parse_args()
    
    engine = EnhancedTokenomics()
    
    if args.command == 'reward':
        reward = engine.calculate_reward(args.forge)
        print("=" * 70)
        print(f"FORGE #{args.forge} REWARD CALCULATION")
        print("=" * 70)
        print(f"Base Reward:         {reward.base_reward:.8f} $EXS")
        print(f"Actual Reward:       {reward.actual_reward:.8f} $EXS")
        print(f"Treasury Fee (1%):   {reward.treasury_fee:.8f} $EXS")
        print(f"Miner Payout:        {reward.miner_payout:.8f} $EXS")
        print(f"Halving Number:      {reward.halving_number}")
        print(f"In Transition:       {reward.in_transition}")
        if reward.in_transition:
            print(f"Transition Progress: {reward.transition_progress*100:.2f}%")
        print("=" * 70)
    
    elif args.command == 'difficulty':
        # Example forge times (in seconds)
        forge_times = [580, 620, 590, 610, 600, 595, 605, 598] * 20
        
        adjustment = engine.calculate_difficulty_adjustment(4, forge_times)
        print("=" * 70)
        print("DIFFICULTY ADJUSTMENT")
        print("=" * 70)
        print(f"Current Difficulty:  {adjustment.current_difficulty}")
        print(f"New Difficulty:      {adjustment.new_difficulty}")
        print(f"Adjustment Factor:   {adjustment.adjustment_factor:.4f}x")
        print(f"Actual Forge Time:   {adjustment.actual_time:.2f}s")
        print(f"Target Forge Time:   {adjustment.target_time}s")
        print(f"Emergency Mode:      {adjustment.emergency_mode}")
        print(f"Reason:              {adjustment.reason}")
        print("=" * 70)
    
    elif args.command == 'simulate':
        print("Simulating emission schedule...")
        results = engine.simulate_emission_schedule(args.max_forges)
        
        print("=" * 70)
        print("EMISSION SCHEDULE SIMULATION")
        print("=" * 70)
        print(f"Total Forges:        {results['total_forges']:,}")
        print(f"Total Minted:        {results['total_minted']:,.2f} $EXS")
        print(f"Supply Cap:          {engine.TOTAL_CAP:,} $EXS")
        print(f"Minted %:            {results['total_minted']/engine.TOTAL_CAP*100:.2f}%")
        print()
        print("Halving Events:")
        for halving in results['halvings'][:8]:
            print(f"  Halving {halving['halving_number']}: Forge {halving['at_forge']:,}, Reward: {halving['reward']:.4f} $EXS")
        print("=" * 70)
    
    elif args.command == 'compare':
        # Compare at critical halvings
        test_forges = [52499, 52500, 52501,  # First halving
                      105000, 157500, 210000,  # Subsequent halvings
                      52250, 52750]  # During transition
        
        print("=" * 70)
        print("EXCALIBUR vs BITCOIN COMPARISON")
        print("=" * 70)
        
        for forge in test_forges:
            comp = engine.compare_to_bitcoin(forge)
            print(f"\nForge #{forge:,}:")
            print(f"  Excalibur: {comp['excalibur']['reward']:.8f} $EXS (vol: {comp['excalibur']['volatility']:.4f}%)")
            print(f"  Bitcoin:   {comp['bitcoin']['reward']:.8f} BTC (vol: {comp['bitcoin']['volatility']:.4f}%)")
            if comp['improvement']['volatility_reduction'] > 0:
                print(f"  Improvement: {comp['improvement']['volatility_reduction']:.2f}% less volatile")
        
        print("=" * 70)


if __name__ == '__main__':
    main()
