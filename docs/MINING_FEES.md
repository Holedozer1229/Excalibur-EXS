# Mining Fees and Miner Rewards in Excalibur $EXS

## Overview

The Excalibur $EXS protocol implements a sophisticated fee mechanism that incentivizes miners while maintaining network security and sustainability. This document provides comprehensive details on transaction fees, fee scaling, energy optimization, and miner reward distribution.

---

## Table of Contents

1. [Fee Structure Overview](#fee-structure-overview)
2. [Transaction Fee Mechanism](#transaction-fee-mechanism)
3. [Fee Scaling for Anomaly Detection](#fee-scaling-for-anomaly-detection)
4. [Energy Optimization](#energy-optimization)
5. [Fee Aggregation](#fee-aggregation)
6. [Miner Reward Distribution](#miner-reward-distribution)
7. [Treasury Allocation](#treasury-allocation)
8. [Economic Analysis](#economic-analysis)
9. [Fee Examples](#fee-examples)

---

## Fee Structure Overview

Excalibur $EXS employs a multi-layered fee system:

```
┌─────────────────────────────────────────────┐
│        Excalibur Fee Architecture           │
├─────────────────────────────────────────────┤
│                                             │
│  Block Reward (50 $EXS)                    │
│    ├─ Miner Share: 42.5 $EXS (85%)        │
│    └─ Treasury Share: 7.5 $EXS (15%)      │
│                                             │
│  Transaction Fees                           │
│    ├─ Base Fee: 0.0001 BTC                │
│    ├─ Dynamic Fee: Based on congestion    │
│    ├─ Priority Fee: Optional accelerator  │
│    └─ Miner Receives: 99% of fees         │
│        Treasury Receives: 1% of fees       │
│                                             │
│  Forge Fees                                 │
│    ├─ Per-Forge: 0.0001 BTC               │
│    └─ Goes to treasury for operations     │
│                                             │
└─────────────────────────────────────────────┘
```

### Key Components

1. **Block Reward**: Fixed 50 $EXS per block (subject to halving)
2. **Transaction Fees**: Dynamic based on network conditions
3. **Forge Fees**: Fixed 0.0001 BTC per forge operation
4. **Treasury Fee**: 1% of all rewards for protocol sustainability

---

## Transaction Fee Mechanism

### Base Fee Calculation

Every transaction pays a base fee calculated as:

```python
base_fee = transaction_size_bytes * fee_rate_per_byte

Where:
- transaction_size_bytes = serialized transaction size
- fee_rate_per_byte = 1 satoshi/byte (minimum)
```

### Dynamic Fee Adjustment

Fees adjust dynamically based on network congestion:

```python
class DynamicFeeCalculator:
    """
    Calculate dynamic transaction fees based on network conditions.
    """
    
    # Fee tiers (satoshis per byte)
    MIN_FEE_RATE = 1        # Minimum: 1 sat/byte
    LOW_FEE_RATE = 5        # Low priority: 5 sat/byte
    MEDIUM_FEE_RATE = 10    # Medium priority: 10 sat/byte
    HIGH_FEE_RATE = 20      # High priority: 20 sat/byte
    URGENT_FEE_RATE = 50    # Urgent: 50 sat/byte
    
    def __init__(self, mempool_size: int, block_capacity: int = 1000):
        self.mempool_size = mempool_size
        self.block_capacity = block_capacity
    
    def get_fee_rate(self, priority: str = 'medium') -> int:
        """
        Get current fee rate based on network congestion.
        
        Args:
            priority: 'low', 'medium', 'high', or 'urgent'
        
        Returns:
            Fee rate in satoshis per byte
        """
        # Calculate congestion ratio
        congestion_ratio = self.mempool_size / self.block_capacity
        
        # Base fee rates
        rates = {
            'low': self.LOW_FEE_RATE,
            'medium': self.MEDIUM_FEE_RATE,
            'high': self.HIGH_FEE_RATE,
            'urgent': self.URGENT_FEE_RATE
        }
        
        base_rate = rates.get(priority, self.MEDIUM_FEE_RATE)
        
        # Apply congestion multiplier
        if congestion_ratio > 2.0:
            # Severe congestion: 3x multiplier
            return int(base_rate * 3)
        elif congestion_ratio > 1.0:
            # High congestion: 2x multiplier
            return int(base_rate * 2)
        elif congestion_ratio > 0.5:
            # Moderate congestion: 1.5x multiplier
            return int(base_rate * 1.5)
        else:
            # Low congestion: base rate
            return base_rate
    
    def calculate_transaction_fee(
        self,
        tx_size_bytes: int,
        priority: str = 'medium'
    ) -> int:
        """
        Calculate total transaction fee.
        
        Args:
            tx_size_bytes: Transaction size in bytes
            priority: Fee priority level
        
        Returns:
            Total fee in satoshis
        """
        fee_rate = self.get_fee_rate(priority)
        total_fee = tx_size_bytes * fee_rate
        
        # Ensure minimum fee
        min_fee = tx_size_bytes * self.MIN_FEE_RATE
        return max(total_fee, min_fee)
    
    def estimate_confirmation_time(
        self,
        tx_size_bytes: int,
        fee_paid: int
    ) -> int:
        """
        Estimate confirmation time based on fee paid.
        
        Returns:
            Estimated blocks until confirmation
        """
        fee_rate_paid = fee_paid / tx_size_bytes
        
        # Calculate position in mempool
        if fee_rate_paid >= self.URGENT_FEE_RATE:
            return 1  # Next block
        elif fee_rate_paid >= self.HIGH_FEE_RATE:
            return 2  # 1-2 blocks
        elif fee_rate_paid >= self.MEDIUM_FEE_RATE:
            return 5  # 3-5 blocks
        elif fee_rate_paid >= self.LOW_FEE_RATE:
            return 10  # 5-10 blocks
        else:
            return 20  # 10+ blocks


# Example usage
mempool = 1500  # 1500 transactions waiting
capacity = 1000  # 1000 transactions per block

calculator = DynamicFeeCalculator(mempool, capacity)

# Calculate fee for 250-byte transaction
tx_size = 250
medium_fee = calculator.calculate_transaction_fee(tx_size, 'medium')
high_fee = calculator.calculate_transaction_fee(tx_size, 'high')

print(f"Medium priority fee: {medium_fee} satoshis")
print(f"High priority fee: {high_fee} satoshis")
```

### Fee Priority System

```python
class FeePriority:
    """
    Transaction fee priority levels.
    """
    
    LOW = 'low'           # Confirm in 10+ blocks (~100+ minutes)
    MEDIUM = 'medium'     # Confirm in 3-5 blocks (~30-50 minutes)
    HIGH = 'high'         # Confirm in 1-2 blocks (~10-20 minutes)
    URGENT = 'urgent'     # Confirm in next block (~10 minutes)
    
    @staticmethod
    def get_multiplier(priority: str) -> float:
        """Get fee multiplier for priority level."""
        multipliers = {
            'low': 0.5,
            'medium': 1.0,
            'high': 2.0,
            'urgent': 5.0
        }
        return multipliers.get(priority, 1.0)
```

---

## Fee Scaling for Anomaly Detection

Excalibur implements intelligent fee scaling to detect and mitigate network anomalies such as spam attacks or unusual transaction patterns.

### Anomaly Detection System

```python
class AnomalyDetector:
    """
    Detect anomalous transaction patterns and adjust fees accordingly.
    """
    
    def __init__(self):
        self.baseline_tx_rate = 10.0  # transactions per minute
        self.baseline_fee_rate = 10   # sat/byte
        self.anomaly_threshold = 3.0  # 3x normal rate
    
    def detect_spam_attack(
        self,
        current_tx_rate: float,
        time_window_minutes: int = 10
    ) -> bool:
        """
        Detect potential spam attack.
        
        Args:
            current_tx_rate: Current transaction rate (tx/min)
            time_window_minutes: Analysis window
        
        Returns:
            True if spam attack detected
        """
        ratio = current_tx_rate / self.baseline_tx_rate
        
        if ratio > self.anomaly_threshold:
            print(f"⚠️  Spam attack detected: {ratio:.2f}x normal rate")
            return True
        
        return False
    
    def calculate_anomaly_fee_multiplier(
        self,
        current_tx_rate: float
    ) -> float:
        """
        Calculate fee multiplier based on anomaly severity.
        
        Exponential scaling to discourage attacks.
        """
        ratio = current_tx_rate / self.baseline_tx_rate
        
        if ratio <= 1.0:
            return 1.0  # Normal conditions
        elif ratio <= 2.0:
            return 1.5  # Slightly elevated
        elif ratio <= 3.0:
            return 2.5  # Elevated
        elif ratio <= 5.0:
            return 5.0  # High alert
        else:
            return 10.0  # Maximum defense mode
    
    def analyze_transaction_pattern(
        self,
        recent_transactions: list
    ) -> dict:
        """
        Analyze transaction patterns for anomalies.
        
        Checks:
        - Duplicate transactions from same address
        - Dust attacks (many small outputs)
        - Circular transaction patterns
        - Unusual fee patterns
        """
        analysis = {
            'total_transactions': len(recent_transactions),
            'unique_senders': len(set(tx.get('from') for tx in recent_transactions)),
            'avg_value': 0,
            'dust_count': 0,
            'anomaly_score': 0.0
        }
        
        # Calculate average value
        values = [tx.get('value', 0) for tx in recent_transactions]
        analysis['avg_value'] = sum(values) / len(values) if values else 0
        
        # Count dust outputs (< 546 satoshis)
        dust_threshold = 546
        analysis['dust_count'] = sum(1 for v in values if v < dust_threshold)
        
        # Calculate anomaly score
        dust_ratio = analysis['dust_count'] / len(recent_transactions) if recent_transactions else 0
        sender_ratio = analysis['unique_senders'] / len(recent_transactions) if recent_transactions else 1
        
        # High dust + low unique senders = likely attack
        analysis['anomaly_score'] = dust_ratio * (1 - sender_ratio)
        
        return analysis
    
    def get_adjusted_fee_rate(
        self,
        base_fee_rate: int,
        current_tx_rate: float,
        recent_transactions: list
    ) -> int:
        """
        Get fee rate adjusted for detected anomalies.
        """
        # Check for spam attack
        is_spam = self.detect_spam_attack(current_tx_rate)
        
        # Analyze transaction patterns
        pattern_analysis = self.analyze_transaction_pattern(recent_transactions)
        
        # Calculate total multiplier
        multiplier = 1.0
        
        if is_spam:
            multiplier *= self.calculate_anomaly_fee_multiplier(current_tx_rate)
        
        if pattern_analysis['anomaly_score'] > 0.5:
            multiplier *= (1 + pattern_analysis['anomaly_score'])
        
        # Apply multiplier
        adjusted_fee_rate = int(base_fee_rate * multiplier)
        
        print(f"Fee rate adjusted: {base_fee_rate} → {adjusted_fee_rate} sat/byte")
        print(f"Multiplier: {multiplier:.2f}x")
        
        return adjusted_fee_rate


# Example: Detect and respond to anomaly
detector = AnomalyDetector()

# Simulate normal conditions
normal_rate = 12.0  # tx/min
normal_txs = [{'from': f'addr{i}', 'value': 100000} for i in range(10)]

normal_fee = detector.get_adjusted_fee_rate(10, normal_rate, normal_txs)
print(f"Normal fee rate: {normal_fee} sat/byte\n")

# Simulate spam attack
attack_rate = 150.0  # tx/min (15x normal!)
attack_txs = [{'from': 'spam_addr', 'value': 100} for _ in range(100)]

attack_fee = detector.get_adjusted_fee_rate(10, attack_rate, attack_txs)
print(f"Attack defense fee rate: {attack_fee} sat/byte")
```

---

## Energy Optimization

Excalibur implements energy-aware fee mechanisms to incentivize efficient mining.

### Energy-Efficient Mining Incentives

```python
class EnergyOptimizer:
    """
    Optimize mining rewards based on energy efficiency.
    """
    
    def __init__(self):
        self.baseline_energy_per_hash = 100.0  # J/TH (joules per terahash)
        self.green_energy_bonus = 1.1          # 10% bonus for green energy
    
    def calculate_energy_efficiency_bonus(
        self,
        miner_energy_per_hash: float,
        uses_renewable: bool = False
    ) -> float:
        """
        Calculate bonus multiplier for energy-efficient mining.
        
        Args:
            miner_energy_per_hash: Miner's energy consumption (J/TH)
            uses_renewable: Whether miner uses renewable energy
        
        Returns:
            Reward multiplier (1.0 = no bonus, 1.2 = 20% bonus)
        """
        # Efficiency bonus (lower energy = higher bonus)
        efficiency_ratio = self.baseline_energy_per_hash / miner_energy_per_hash
        efficiency_bonus = min(1.2, max(1.0, efficiency_ratio))
        
        # Green energy bonus
        green_bonus = self.green_energy_bonus if uses_renewable else 1.0
        
        # Total multiplier
        total_multiplier = efficiency_bonus * green_bonus
        
        return total_multiplier
    
    def calculate_optimal_mining_time(
        self,
        electricity_prices: list,
        block_times: list
    ) -> dict:
        """
        Calculate optimal mining times based on electricity prices.
        
        Args:
            electricity_prices: List of (timestamp, price_per_kwh)
            block_times: Recent block discovery times
        
        Returns:
            Optimal mining schedule
        """
        # Find lowest price periods
        sorted_prices = sorted(electricity_prices, key=lambda x: x[1])
        low_price_periods = sorted_prices[:len(sorted_prices)//3]  # Bottom 33%
        
        # Calculate expected profitability
        avg_block_time = sum(block_times) / len(block_times) if block_times else 600
        
        schedule = {
            'optimal_periods': [p[0] for p in low_price_periods],
            'avg_block_time': avg_block_time,
            'expected_savings': (sorted_prices[-1][1] - sorted_prices[0][1]) / sorted_prices[-1][1]
        }
        
        return schedule
    
    def estimate_mining_profitability(
        self,
        hashrate_th: float,
        power_consumption_w: float,
        electricity_cost_kwh: float,
        block_reward: float = 50.0,
        exs_price_usd: float = 1.0
    ) -> dict:
        """
        Estimate mining profitability.
        
        Args:
            hashrate_th: Hashrate in terahashes/second
            power_consumption_w: Power consumption in watts
            electricity_cost_kwh: Electricity cost per kWh
            block_reward: Block reward in $EXS
            exs_price_usd: $EXS price in USD
        
        Returns:
            Profitability analysis
        """
        # Energy consumption per day
        energy_kwh_per_day = (power_consumption_w * 24) / 1000
        
        # Energy cost per day
        energy_cost_per_day = energy_kwh_per_day * electricity_cost_kwh
        
        # Expected blocks per day (assuming 10-minute blocks)
        # This is simplified - actual probability depends on network hashrate
        blocks_per_day = 144 * (hashrate_th / 1000)  # Rough estimate
        
        # Expected revenue per day
        revenue_per_day = blocks_per_day * block_reward * exs_price_usd
        
        # Net profit
        net_profit_per_day = revenue_per_day - energy_cost_per_day
        
        return {
            'revenue_per_day_usd': revenue_per_day,
            'energy_cost_per_day_usd': energy_cost_per_day,
            'net_profit_per_day_usd': net_profit_per_day,
            'roi_days': power_consumption_w / net_profit_per_day if net_profit_per_day > 0 else float('inf'),
            'profitable': net_profit_per_day > 0
        }


# Example: Energy efficiency analysis
optimizer = EnergyOptimizer()

# Efficient miner
efficient_bonus = optimizer.calculate_energy_efficiency_bonus(
    miner_energy_per_hash=70.0,  # 30% more efficient
    uses_renewable=True
)
print(f"Efficient green miner bonus: {efficient_bonus:.2f}x")

# Inefficient miner
inefficient_bonus = optimizer.calculate_energy_efficiency_bonus(
    miner_energy_per_hash=150.0,  # 50% less efficient
    uses_renewable=False
)
print(f"Inefficient miner bonus: {inefficient_bonus:.2f}x")

# Profitability estimate
profitability = optimizer.estimate_mining_profitability(
    hashrate_th=100.0,           # 100 TH/s
    power_consumption_w=3000,    # 3 kW
    electricity_cost_kwh=0.10,   # $0.10/kWh
    block_reward=50.0,
    exs_price_usd=5.0
)

print(f"\nMining Profitability:")
print(f"Revenue: ${profitability['revenue_per_day_usd']:.2f}/day")
print(f"Energy Cost: ${profitability['energy_cost_per_day_usd']:.2f}/day")
print(f"Net Profit: ${profitability['net_profit_per_day_usd']:.2f}/day")
print(f"Profitable: {profitability['profitable']}")
```

---

## Fee Aggregation

Multiple fees are aggregated at the block level and distributed to miners.

### Fee Aggregation System

```python
class FeeAggregator:
    """
    Aggregate and distribute transaction fees at block level.
    """
    
    def __init__(self, treasury_percentage: float = 0.01):
        self.treasury_percentage = treasury_percentage  # 1% to treasury
    
    def aggregate_block_fees(self, transactions: list) -> dict:
        """
        Aggregate all fees from block transactions.
        
        Args:
            transactions: List of transactions in block
        
        Returns:
            Fee breakdown and distribution
        """
        total_fees = 0
        fee_breakdown = {
            'base_fees': 0,
            'priority_fees': 0,
            'forge_fees': 0
        }
        
        for tx in transactions:
            # Extract fee components
            base_fee = tx.get('base_fee', 0)
            priority_fee = tx.get('priority_fee', 0)
            
            total_fees += base_fee + priority_fee
            fee_breakdown['base_fees'] += base_fee
            fee_breakdown['priority_fees'] += priority_fee
        
        # Calculate distribution
        treasury_share = int(total_fees * self.treasury_percentage)
        miner_share = total_fees - treasury_share
        
        return {
            'total_fees': total_fees,
            'breakdown': fee_breakdown,
            'miner_share': miner_share,
            'treasury_share': treasury_share,
            'treasury_percentage': self.treasury_percentage * 100
        }
    
    def create_fee_distribution_outputs(
        self,
        fee_aggregate: dict,
        miner_address: str,
        treasury_address: str
    ) -> list:
        """
        Create transaction outputs for fee distribution.
        
        Returns:
            List of outputs for coinbase transaction
        """
        outputs = []
        
        # Miner output
        if fee_aggregate['miner_share'] > 0:
            outputs.append({
                'address': miner_address,
                'value': fee_aggregate['miner_share'],
                'type': 'miner_fee_reward'
            })
        
        # Treasury output
        if fee_aggregate['treasury_share'] > 0:
            outputs.append({
                'address': treasury_address,
                'value': fee_aggregate['treasury_share'],
                'type': 'treasury_fee_share'
            })
        
        return outputs
    
    def generate_fee_report(
        self,
        block_height: int,
        fee_aggregate: dict,
        block_reward: float = 50.0
    ) -> str:
        """
        Generate human-readable fee distribution report.
        """
        report = f"""
=== Block #{block_height} Fee Report ===

Fee Breakdown:
  Base Fees:     {fee_aggregate['breakdown']['base_fees']:>10} satoshis
  Priority Fees: {fee_aggregate['breakdown']['priority_fees']:>10} satoshis
  Total Fees:    {fee_aggregate['total_fees']:>10} satoshis

Distribution:
  Miner Share:   {fee_aggregate['miner_share']:>10} satoshis (99%)
  Treasury:      {fee_aggregate['treasury_share']:>10} satoshis (1%)

Total Miner Reward:
  Block Reward:  {block_reward:>10.2f} $EXS
  + Fees:        {fee_aggregate['miner_share'] / 100000000:>10.8f} BTC
  = Total:       {block_reward:>10.2f} $EXS + fees
"""
        return report


# Example: Fee aggregation for a block
aggregator = FeeAggregator(treasury_percentage=0.01)

# Sample transactions
transactions = [
    {'base_fee': 1000, 'priority_fee': 500},
    {'base_fee': 2000, 'priority_fee': 0},
    {'base_fee': 1500, 'priority_fee': 1000},
    {'base_fee': 3000, 'priority_fee': 2000},
]

# Aggregate fees
fee_aggregate = aggregator.aggregate_block_fees(transactions)

# Generate report
report = aggregator.generate_fee_report(12345, fee_aggregate)
print(report)
```

---

## Miner Reward Distribution

Complete reward distribution including block rewards, fees, and bonuses.

### Reward Distribution System

```python
class MinerRewardDistributor:
    """
    Comprehensive miner reward distribution system.
    """
    
    def __init__(self):
        self.base_block_reward = 50.0  # $EXS
        self.treasury_percentage = 0.15  # 15%
        self.halving_interval = 210000  # blocks
    
    def calculate_block_reward(self, block_height: int) -> float:
        """
        Calculate block reward with halving.
        
        Args:
            block_height: Current block height
        
        Returns:
            Block reward in $EXS
        """
        halvings = block_height // self.halving_interval
        
        # Apply halving
        reward = self.base_block_reward / (2 ** halvings)
        
        # Minimum reward (tail emission)
        min_reward = 0.1
        return max(reward, min_reward)
    
    def distribute_block_reward(
        self,
        block_height: int,
        transaction_fees: int,
        miner_address: str,
        treasury_address: str,
        energy_bonus: float = 1.0
    ) -> dict:
        """
        Complete reward distribution for a mined block.
        
        Args:
            block_height: Block height
            transaction_fees: Total transaction fees (satoshis)
            miner_address: Miner's receiving address
            treasury_address: Treasury address
            energy_bonus: Energy efficiency bonus multiplier
        
        Returns:
            Complete reward breakdown
        """
        # Calculate base block reward
        block_reward = self.calculate_block_reward(block_height)
        
        # Apply energy bonus to block reward
        adjusted_block_reward = block_reward * energy_bonus
        
        # Split block reward
        treasury_block_share = adjusted_block_reward * self.treasury_percentage
        miner_block_share = adjusted_block_reward - treasury_block_share
        
        # Split transaction fees (1% to treasury)
        treasury_fee_share = int(transaction_fees * 0.01)
        miner_fee_share = transaction_fees - treasury_fee_share
        
        # Total distributions
        total_miner_reward_exs = miner_block_share
        total_miner_reward_fees_sats = miner_fee_share
        total_treasury_exs = treasury_block_share
        total_treasury_fees_sats = treasury_fee_share
        
        return {
            'block_height': block_height,
            'miner': {
                'address': miner_address,
                'block_reward_exs': miner_block_share,
                'transaction_fees_sats': miner_fee_share,
                'total_exs': miner_block_share,
                'energy_bonus_applied': energy_bonus
            },
            'treasury': {
                'address': treasury_address,
                'block_reward_exs': treasury_block_share,
                'transaction_fees_sats': treasury_fee_share,
                'total_exs': treasury_block_share,
                'percentage': self.treasury_percentage * 100
            },
            'totals': {
                'block_reward_exs': adjusted_block_reward,
                'transaction_fees_sats': transaction_fees,
                'miner_percentage': (1 - self.treasury_percentage) * 100,
                'treasury_percentage': self.treasury_percentage * 100
            }
        }
    
    def create_coinbase_transaction(
        self,
        distribution: dict,
        block_height: int
    ) -> dict:
        """
        Create coinbase transaction with reward distribution.
        
        Args:
            distribution: Reward distribution from distribute_block_reward()
            block_height: Block height
        
        Returns:
            Coinbase transaction
        """
        # Create outputs
        outputs = []
        
        # Miner output (block reward)
        outputs.append({
            'address': distribution['miner']['address'],
            'value': int(distribution['miner']['block_reward_exs'] * 100000000),  # Convert to satoshis
            'type': 'miner_reward'
        })
        
        # Miner fees output (if any)
        if distribution['miner']['transaction_fees_sats'] > 0:
            outputs.append({
                'address': distribution['miner']['address'],
                'value': distribution['miner']['transaction_fees_sats'],
                'type': 'miner_fees'
            })
        
        # Treasury outputs (with CLTV time-locks)
        treasury_outputs = self.create_treasury_outputs(
            distribution['treasury']['block_reward_exs'],
            distribution['treasury']['address'],
            block_height
        )
        outputs.extend(treasury_outputs)
        
        # Treasury fees output
        if distribution['treasury']['transaction_fees_sats'] > 0:
            outputs.append({
                'address': distribution['treasury']['address'],
                'value': distribution['treasury']['transaction_fees_sats'],
                'type': 'treasury_fees'
            })
        
        # Create coinbase transaction
        coinbase = {
            'version': 1,
            'is_coinbase': True,
            'inputs': [{
                'prevout': '0' * 64,
                'vout': 0xffffffff,
                'sequence': 0xffffffff,
                'coinbase_data': f'Block {block_height} - Excalibur $EXS'
            }],
            'outputs': outputs,
            'locktime': 0
        }
        
        return coinbase
    
    def create_treasury_outputs(
        self,
        treasury_amount: float,
        treasury_address: str,
        block_height: int
    ) -> list:
        """
        Create 3 treasury mini-outputs with CLTV time-locks.
        
        Implements 12-month rolling release:
        - Output 1: Immediately available
        - Output 2: Locked for ~1 month (4,320 blocks)
        - Output 3: Locked for ~2 months (8,640 blocks)
        """
        mini_output_amount = treasury_amount / 3  # Split into 3 equal parts
        
        outputs = []
        
        # Output 1: Immediate (0 blocks)
        outputs.append({
            'address': treasury_address,
            'value': int(mini_output_amount * 100000000),
            'type': 'treasury_immediate',
            'lock_height': block_height
        })
        
        # Output 2: Locked ~1 month
        outputs.append({
            'address': treasury_address,
            'value': int(mini_output_amount * 100000000),
            'type': 'treasury_1month',
            'lock_height': block_height + 4320
        })
        
        # Output 3: Locked ~2 months
        outputs.append({
            'address': treasury_address,
            'value': int(mini_output_amount * 100000000),
            'type': 'treasury_2month',
            'lock_height': block_height + 8640
        })
        
        return outputs


# Example: Complete reward distribution
distributor = MinerRewardDistributor()

# Mine a block
block_height = 12345
transaction_fees = 50000  # 50,000 satoshis in fees
miner_addr = "bc1p...miner"
treasury_addr = "bc1p...treasury"
energy_bonus = 1.1  # 10% bonus for green energy

# Calculate distribution
distribution = distributor.distribute_block_reward(
    block_height,
    transaction_fees,
    miner_addr,
    treasury_addr,
    energy_bonus
)

# Print reward breakdown
print("=== Reward Distribution ===\n")
print(f"Block Height: {distribution['block_height']}")
print(f"\nMiner Rewards:")
print(f"  Block Reward: {distribution['miner']['block_reward_exs']:.8f} $EXS")
print(f"  TX Fees: {distribution['miner']['transaction_fees_sats']} satoshis")
print(f"  Energy Bonus: {distribution['miner']['energy_bonus_applied']:.2f}x")
print(f"\nTreasury Allocation:")
print(f"  Block Share: {distribution['treasury']['block_reward_exs']:.8f} $EXS")
print(f"  Fee Share: {distribution['treasury']['transaction_fees_sats']} satoshis")
print(f"  Percentage: {distribution['treasury']['percentage']:.1f}%")

# Create coinbase transaction
coinbase = distributor.create_coinbase_transaction(distribution, block_height)
print(f"\nCoinbase Transaction:")
print(f"  Inputs: {len(coinbase['inputs'])}")
print(f"  Outputs: {len(coinbase['outputs'])}")
```

---

## Treasury Allocation

Detailed treasury allocation mechanism with CLTV time-locks.

### Treasury Structure

```python
class TreasuryManager:
    """
    Manage treasury allocation and time-locked releases.
    """
    
    def __init__(self):
        self.mini_outputs = []  # Track all treasury outputs
        self.total_balance = 0.0
    
    def add_treasury_allocation(
        self,
        block_height: int,
        amount: float
    ):
        """
        Add new treasury allocation with 3 mini-outputs.
        """
        mini_amount = amount / 3
        
        # Create 3 mini-outputs
        self.mini_outputs.append({
            'block_height': block_height,
            'amount': mini_amount,
            'lock_height': block_height,  # Immediate
            'is_spendable': True
        })
        
        self.mini_outputs.append({
            'block_height': block_height,
            'amount': mini_amount,
            'lock_height': block_height + 4320,  # ~1 month
            'is_spendable': False
        })
        
        self.mini_outputs.append({
            'block_height': block_height,
            'amount': mini_amount,
            'lock_height': block_height + 8640,  # ~2 months
            'is_spendable': False
        })
        
        self.total_balance += amount
    
    def get_spendable_balance(self, current_block_height: int) -> float:
        """
        Get currently spendable treasury balance.
        """
        spendable = 0.0
        
        for output in self.mini_outputs:
            if current_block_height >= output['lock_height']:
                output['is_spendable'] = True
                spendable += output['amount']
        
        return spendable
    
    def get_locked_balance(self, current_block_height: int) -> float:
        """
        Get locked (not yet spendable) treasury balance.
        """
        locked = 0.0
        
        for output in self.mini_outputs:
            if current_block_height < output['lock_height']:
                locked += output['amount']
        
        return locked
    
    def get_treasury_report(self, current_block_height: int) -> str:
        """
        Generate treasury status report.
        """
        spendable = self.get_spendable_balance(current_block_height)
        locked = self.get_locked_balance(current_block_height)
        
        report = f"""
=== Treasury Status Report ===
Current Block Height: {current_block_height}

Balances:
  Total Balance:    {self.total_balance:>15.8f} $EXS
  Spendable:        {spendable:>15.8f} $EXS
  Locked:           {locked:>15.8f} $EXS

Mini-Outputs: {len(self.mini_outputs)}
  Immediate:        {len([o for o in self.mini_outputs if o['lock_height'] == o['block_height']])}
  1-Month Locked:   {len([o for o in self.mini_outputs if o['lock_height'] == o['block_height'] + 4320])}
  2-Month Locked:   {len([o for o in self.mini_outputs if o['lock_height'] == o['block_height'] + 8640])}

Upcoming Unlocks:
"""
        # Find next 5 unlocks
        upcoming = sorted(
            [o for o in self.mini_outputs if not o['is_spendable']],
            key=lambda x: x['lock_height']
        )[:5]
        
        for output in upcoming:
            blocks_until = output['lock_height'] - current_block_height
            days_until = (blocks_until * 10) / (60 * 24)  # Approximate
            report += f"  Block {output['lock_height']}: {output['amount']:.8f} $EXS (~{days_until:.1f} days)\n"
        
        return report


# Example: Treasury management over time
treasury = TreasuryManager()

# Simulate several blocks
for block in range(0, 10000, 100):
    treasury.add_treasury_allocation(block, 7.5)  # 7.5 $EXS per block

# Check status at different heights
for height in [5000, 10000, 15000]:
    report = treasury.get_treasury_report(height)
    print(report)
    print()
```

---

## Economic Analysis

### Fee Market Dynamics

```python
def analyze_fee_market(
    mempool_sizes: list,
    fee_rates: list,
    timestamps: list
) -> dict:
    """
    Analyze fee market dynamics over time.
    """
    import statistics
    
    analysis = {
        'avg_mempool_size': statistics.mean(mempool_sizes),
        'max_mempool_size': max(mempool_sizes),
        'avg_fee_rate': statistics.mean(fee_rates),
        'max_fee_rate': max(fee_rates),
        'min_fee_rate': min(fee_rates),
        'fee_volatility': statistics.stdev(fee_rates) if len(fee_rates) > 1 else 0,
        'congestion_periods': sum(1 for s in mempool_sizes if s > 1000)
    }
    
    return analysis
```

---

## Fee Examples

### Example 1: Normal Transaction

```python
# 250-byte transaction, medium priority, normal congestion
tx_size = 250
fee_rate = 10  # sat/byte
total_fee = tx_size * fee_rate  # 2,500 satoshis

print(f"Transaction Fee: {total_fee} satoshis (${total_fee * 0.0005:.4f} USD)")
```

### Example 2: High Priority During Congestion

```python
# 300-byte transaction, high priority, 2x congestion
tx_size = 300
base_rate = 20  # sat/byte (high priority)
congestion_multiplier = 2.0
effective_rate = int(base_rate * congestion_multiplier)
total_fee = tx_size * effective_rate  # 12,000 satoshis

print(f"Urgent Transaction Fee: {total_fee} satoshis (${total_fee * 0.0005:.4f} USD)")
```

### Example 3: Complete Block Reward

```python
# Block 12345
block_reward = 50.0  # $EXS
transaction_fees = 75000  # satoshis
miner_share = 42.5 + (75000 * 0.99 / 100000000)  # $EXS + BTC fees
treasury_share = 7.5 + (75000 * 0.01 / 100000000)

print(f"Miner Total: {miner_share:.8f} $EXS + fees")
print(f"Treasury: {treasury_share:.8f} $EXS + fees")
```

---

## References

- **Excalibur Whitepaper**: [docs/manifesto.md](./manifesto.md)
- **Genesis Documentation**: [docs/GENESIS.md](./GENESIS.md)
- **Tetra-PoW**: [docs/TETRAPOW_BLOCKCHAIN_INTERACTION.md](./TETRAPOW_BLOCKCHAIN_INTERACTION.md)
- **Enhanced Tokenomics**: [pkg/economy/ENHANCED_TOKENOMICS.md](../pkg/economy/ENHANCED_TOKENOMICS.md)

---

## Contact

For questions about fees and rewards:

- **Lead Architect**: Travis D. Jones
- **Email**: holedozer@icloud.com
- **Repository**: https://github.com/Holedozer1229/Excalibur-EXS

---

*"Fair fees ensure sustainable security."*  
— The Excalibur Economic Principle
