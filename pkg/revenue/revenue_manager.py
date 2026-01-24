"""
Excalibur $EXS Revenue Operations Module
Multi-Stream Revenue Generation System

This module implements various revenue-generating activities to fund the treasury
vault while providing fair rewards to users.

Lead Architect: Travis D Jones (holedozer@icloud.com)
"""

from typing import Dict, List, Tuple
from decimal import Decimal, InvalidOperation
from dataclasses import dataclass
from datetime import datetime
import json


@dataclass
class RevenueStream:
    """Represents a single revenue stream."""
    name: str
    description: str
    treasury_share: Decimal
    user_share: Decimal
    operational_share: Decimal
    estimated_apr: str
    status: str = "active"


class RevenueManager:
    """
    Manages multiple revenue streams for the Excalibur $EXS protocol.
    
    Coordinates cross-chain mining, futures trading, Lightning routing,
    Taproot processing, DeFi yield farming, MEV extraction, and more.
    """
    
    def __init__(self):
        """Initialize the Revenue Manager."""
        self.revenue_streams: Dict[str, RevenueStream] = {}
        self.total_revenue_generated = Decimal('0')
        self.total_treasury_collected = Decimal('0')
        self.total_user_rewards_distributed = Decimal('0')
        self.revenue_history: List[Dict] = []
        self._initialize_streams()
    
    def _initialize_streams(self):
        """Initialize all revenue streams from tokenomics config."""
        # Cross-Chain Mining
        self.revenue_streams['cross_chain_mining'] = RevenueStream(
            name="Cross-Chain Mining",
            description="Mining across BTC, ETH, LTC, XMR, DOGE",
            treasury_share=Decimal('0.40'),
            user_share=Decimal('0.55'),
            operational_share=Decimal('0.05'),
            estimated_apr="8-15%"
        )
        
        # Smart Contract Futures Trading
        self.revenue_streams['futures_trading'] = RevenueStream(
            name="Smart Contract Futures",
            description="Automated futures on GMX, dYdX, Synthetix",
            treasury_share=Decimal('0.30'),
            user_share=Decimal('0.60'),
            operational_share=Decimal('0.10'),  # Includes risk reserve
            estimated_apr="12-25%"
        )
        
        # Lightning Network Fee Routing
        self.revenue_streams['lightning_routing'] = RevenueStream(
            name="Lightning Fee Routing",
            description="P2TR Lightning channel routing fees",
            treasury_share=Decimal('0.35'),
            user_share=Decimal('0.60'),
            operational_share=Decimal('0.05'),
            estimated_apr="10-20%"
        )
        
        # Taproot Processing Services
        self.revenue_streams['taproot_processing'] = RevenueStream(
            name="Taproot Processing",
            description="P2TR transaction batching and optimization",
            treasury_share=Decimal('0.25'),
            user_share=Decimal('0.70'),
            operational_share=Decimal('0.05'),
            estimated_apr="5-12%"
        )
        
        # DeFi Yield Farming
        self.revenue_streams['yield_farming'] = RevenueStream(
            name="DeFi Yield Farming",
            description="Aave, Compound, Curve, Convex yield strategies",
            treasury_share=Decimal('0.30'),
            user_share=Decimal('0.65'),
            operational_share=Decimal('0.05'),
            estimated_apr="6-18%"
        )
        
        # MEV Extraction
        self.revenue_streams['mev_extraction'] = RevenueStream(
            name="MEV Extraction",
            description="Flashbots and MEV-boost strategies",
            treasury_share=Decimal('0.40'),
            user_share=Decimal('0.50'),
            operational_share=Decimal('0.10'),
            estimated_apr="15-40%"
        )
        
        # Multi-Chain Staking
        self.revenue_streams['staking_services'] = RevenueStream(
            name="Staking Services",
            description="ETH, ADA, DOT, ATOM, SOL staking pools",
            treasury_share=Decimal('0.20'),
            user_share=Decimal('0.75'),
            operational_share=Decimal('0.05'),
            estimated_apr="4-12%"
        )
        
        # NFT Royalty Pools
        self.revenue_streams['nft_royalties'] = RevenueStream(
            name="NFT Royalty Pools",
            description="Curated NFT collections with royalty sharing",
            treasury_share=Decimal('0.30'),
            user_share=Decimal('0.60'),
            operational_share=Decimal('0.10'),
            estimated_apr="8-25%"
        )
        
        # Lending Protocol
        self.revenue_streams['lending_protocol'] = RevenueStream(
            name="$EXS Lending Protocol",
            description="Over-collateralized lending with BTC/ETH/USDC",
            treasury_share=Decimal('0.25'),
            user_share=Decimal('0.70'),
            operational_share=Decimal('0.05'),
            estimated_apr="5-15%"
        )
    
    def process_revenue(self, stream_name: str, amount: Decimal, 
                       currency: str = "$EXS") -> Dict:
        """
        Process revenue from a specific stream and distribute accordingly.
        
        Args:
            stream_name: Name of the revenue stream
            amount: Total revenue generated
            currency: Currency of revenue ($EXS, BTC, ETH, etc.)
            
        Returns:
            Dictionary containing distribution details
        """
        if stream_name not in self.revenue_streams:
            raise ValueError(f"Unknown revenue stream: {stream_name}")
        
        stream = self.revenue_streams[stream_name]
        
        # Calculate distribution
        treasury_amount = amount * stream.treasury_share
        user_amount = amount * stream.user_share
        operational_amount = amount * stream.operational_share
        
        # Update totals
        self.total_revenue_generated += amount
        self.total_treasury_collected += treasury_amount
        self.total_user_rewards_distributed += user_amount
        
        # Record in history
        record = {
            'timestamp': datetime.now().isoformat(),
            'stream': stream_name,
            'total_revenue': str(amount),
            'treasury': str(treasury_amount),
            'users': str(user_amount),
            'operations': str(operational_amount),
            'currency': currency
        }
        self.revenue_history.append(record)
        
        return {
            'success': True,
            'stream': stream_name,
            'total_revenue': amount,
            'distribution': {
                'treasury': treasury_amount,
                'users': user_amount,
                'operations': operational_amount
            },
            'currency': currency,
            'treasury_share_pct': float(stream.treasury_share * 100),
            'user_share_pct': float(stream.user_share * 100)
        }
    
    def calculate_user_rewards(self, user_stake: Decimal, total_staked: Decimal,
                              forge_count: int, holding_months: int,
                              is_lp: bool = False) -> Decimal:
        """
        Calculate user rewards with bonus multipliers.
        
        Args:
            user_stake: Amount of $EXS user has staked
            total_staked: Total $EXS staked across all users
            forge_count: Number of forges completed by user
            holding_months: Months the user has held $EXS
            is_lp: Whether user is providing liquidity
            
        Returns:
            User's share of revenue rewards
        """
        try:
            if total_staked == 0 or user_stake == 0:
                return Decimal('0')
            
            # Base share proportional to stake
            base_share = user_stake / total_staked
        except (ZeroDivisionError, InvalidOperation):
            return Decimal('0')
        
        # Apply multipliers
        multiplier = Decimal('1.0')
        
        # Long-term holder bonus
        if holding_months >= 24:
            multiplier *= Decimal('1.5')
        elif holding_months >= 12:
            multiplier *= Decimal('1.25')
        elif holding_months >= 6:
            multiplier *= Decimal('1.1')
        
        # Active forger bonus
        if forge_count >= 100:
            multiplier *= Decimal('1.30')
        elif forge_count >= 50:
            multiplier *= Decimal('1.15')
        elif forge_count >= 10:
            multiplier *= Decimal('1.05')
        
        # Liquidity provider bonus
        if is_lp:
            multiplier *= Decimal('1.2')
        
        # Calculate final share
        weighted_share = base_share * multiplier
        
        # Distribute from user rewards pool
        user_rewards_pool = self.total_user_rewards_distributed
        user_allocation = user_rewards_pool * weighted_share
        
        return user_allocation
    
    def get_revenue_stats(self) -> Dict:
        """Get comprehensive revenue statistics."""
        active_streams = sum(1 for s in self.revenue_streams.values() 
                           if s.status == "active")
        
        return {
            'total_revenue_generated': str(self.total_revenue_generated),
            'total_treasury_collected': str(self.total_treasury_collected),
            'total_user_rewards': str(self.total_user_rewards_distributed),
            'active_streams': active_streams,
            'total_streams': len(self.revenue_streams),
            'revenue_events': len(self.revenue_history),
            'streams': {
                name: {
                    'description': stream.description,
                    'treasury_share': f"{float(stream.treasury_share * 100):.1f}%",
                    'user_share': f"{float(stream.user_share * 100):.1f}%",
                    'estimated_apr': stream.estimated_apr,
                    'status': stream.status
                }
                for name, stream in self.revenue_streams.items()
            }
        }
    
    def get_stream_performance(self, stream_name: str) -> Dict:
        """Get performance metrics for a specific stream."""
        stream_events = [e for e in self.revenue_history 
                        if e['stream'] == stream_name]
        
        if not stream_events:
            return {'error': 'No data for this stream'}
        
        total_revenue = sum(Decimal(e['total_revenue']) for e in stream_events)
        total_treasury = sum(Decimal(e['treasury']) for e in stream_events)
        total_users = sum(Decimal(e['users']) for e in stream_events)
        
        return {
            'stream': stream_name,
            'total_events': len(stream_events),
            'total_revenue': str(total_revenue),
            'treasury_collected': str(total_treasury),
            'user_rewards': str(total_users),
            'last_event': stream_events[-1]['timestamp'] if stream_events else None
        }
    
    def export_revenue_report(self, filename: str = 'revenue_report.json'):
        """Export comprehensive revenue report to JSON."""
        report = {
            'generated_at': datetime.now().isoformat(),
            'statistics': self.get_revenue_stats(),
            'stream_performance': {
                name: self.get_stream_performance(name)
                for name in self.revenue_streams.keys()
            },
            'recent_history': self.revenue_history[-50:]  # Last 50 events
        }
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        return report


def main():
    """Example usage of the Revenue Manager."""
    print("=" * 70)
    print("Excalibur $EXS Revenue Operations System")
    print("=" * 70)
    print()
    
    manager = RevenueManager()
    
    # Simulate revenue from various streams
    print("Processing Revenue Streams...")
    print()
    
    # Cross-chain mining revenue
    result1 = manager.process_revenue('cross_chain_mining', Decimal('100.5'), 'BTC')
    print(f"✓ Cross-Chain Mining: {result1['total_revenue']} BTC")
    print(f"  Treasury: {result1['distribution']['treasury']} BTC ({result1['treasury_share_pct']:.1f}%)")
    print(f"  Users: {result1['distribution']['users']} BTC ({result1['user_share_pct']:.1f}%)")
    print()
    
    # Futures trading revenue
    result2 = manager.process_revenue('futures_trading', Decimal('5000'), '$EXS')
    print(f"✓ Futures Trading: {result2['total_revenue']} $EXS")
    print(f"  Treasury: {result2['distribution']['treasury']} $EXS")
    print(f"  Users: {result2['distribution']['users']} $EXS")
    print()
    
    # Lightning routing fees
    result3 = manager.process_revenue('lightning_routing', Decimal('2.5'), 'BTC')
    print(f"✓ Lightning Routing: {result3['total_revenue']} BTC")
    print(f"  Treasury: {result3['distribution']['treasury']} BTC")
    print(f"  Users: {result3['distribution']['users']} BTC")
    print()
    
    # Get overall statistics
    stats = manager.get_revenue_stats()
    print("=" * 70)
    print("Revenue Statistics")
    print("=" * 70)
    print(f"Total Revenue Generated: {stats['total_revenue_generated']} (multi-currency)")
    print(f"Treasury Collected: {stats['total_treasury_collected']}")
    print(f"User Rewards Distributed: {stats['total_user_rewards']}")
    print(f"Active Streams: {stats['active_streams']}/{stats['total_streams']}")
    print()
    
    # Calculate user rewards example
    user_reward = manager.calculate_user_rewards(
        user_stake=Decimal('1000'),
        total_staked=Decimal('100000'),
        forge_count=50,
        holding_months=12,
        is_lp=True
    )
    print("Example User Reward Calculation:")
    print(f"  Stake: 1,000 $EXS (1% of total)")
    print(f"  Forges: 50 (1.15x multiplier)")
    print(f"  Holding: 12 months (1.25x multiplier)")
    print(f"  LP Provider: Yes (1.2x multiplier)")
    print(f"  Total Multiplier: 1.725x")
    print(f"  Estimated Reward Share: {user_reward}")


if __name__ == "__main__":
    main()
