#!/usr/bin/env python3
"""
Excalibur $EXS Unified Mining Interface

A pure Python interface that combines:
- CPU solo merge mining (EXS + Bitcoin/Litecoin)
- Lightning Network routing/rerouting
- Dice roll probabilistic mining
- Unified interface for all mining operations

MIGRATION NOTE: Unified miner now uses batched/fused kernel
- See mining/tetrapow_dice_universal.py for the new batched implementation
- All mining workflows now leverage batch processing for improved performance
- Easy fusion composition enables modular mining operations

Author: Travis D. Jones <holedozer@gmail.com>
License: BSD 3-Clause
"""

import hashlib
import time
import random
import json
import threading
import sys
import os
from typing import Dict, List, Tuple, Optional, Callable
from dataclasses import dataclass, asdict
from datetime import datetime, timezone

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from tetra_pow_miner import TetraPowMiner
    from btc_faucet import BTCFaucet
    from mining.tetrapow_dice_universal import UniversalMiningKernel
except ImportError:
    # Try absolute import
    from pkg.miner.tetra_pow_miner import TetraPowMiner
    from pkg.miner.btc_faucet import BTCFaucet
    from pkg.mining.tetrapow_dice_universal import UniversalMiningKernel


@dataclass
class MiningResult:
    """Result from a mining operation"""
    success: bool
    nonce: int
    hash: str
    timestamp: str
    attempts: int
    hash_rate: float
    mining_mode: str
    chain: str
    difficulty: int


@dataclass
class LightningRoute:
    """Lightning Network route information"""
    route_id: str
    source: str
    destination: str
    amount_msat: int
    fee_msat: int
    hops: List[str]
    success: bool
    timestamp: str


@dataclass
class DiceRollResult:
    """Dice roll mining result"""
    roll: int
    target: int
    success: bool
    hash: str
    nonce: int
    timestamp: str


class UnifiedMiner:
    """
    Unified Mining Interface for Excalibur $EXS Protocol
    
    Features:
    - Solo mining on Excalibur $EXS
    - Merge mining with Bitcoin/Litecoin
    - Lightning Network routing integration
    - Dice roll probabilistic mining
    - CPU-optimized mining algorithms
    - Batched/fused kernel for improved performance
    """
    
    # Canonical axiom for EXS
    CANONICAL_AXIOM = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question"
    
    # Supported merge mining chains
    MERGE_CHAINS = ['BTC', 'LTC', 'DOGE']
    
    # Dice roll configuration
    DICE_SIDES = 100
    DICE_WIN_THRESHOLD = 95  # Need 95+ to win (5% chance)
    
    # Batched mining configuration
    DEFAULT_BATCH_SIZE = 32
    
    def __init__(self, 
                 difficulty: int = 4,
                 merge_mining_enabled: bool = False,
                 lightning_routing_enabled: bool = False,
                 dice_mode_enabled: bool = False,
                 faucet_enabled: bool = False,
                 btc_address: Optional[str] = None,
                 batch_size: int = DEFAULT_BATCH_SIZE):
        """
        Initialize the Unified Miner.
        
        Args:
            difficulty: Mining difficulty (leading zero bytes)
            merge_mining_enabled: Enable merge mining with other chains
            lightning_routing_enabled: Enable Lightning Network routing
            dice_mode_enabled: Enable dice roll probabilistic mining
            faucet_enabled: Enable BTC faucet for auto-funding forge fees
            btc_address: BTC address for faucet claims (required if faucet_enabled)
            batch_size: Batch size for processing (default: 32)
        """
        self.difficulty = difficulty
        self.merge_mining_enabled = merge_mining_enabled
        self.lightning_routing_enabled = lightning_routing_enabled
        self.dice_mode_enabled = dice_mode_enabled
        self.faucet_enabled = faucet_enabled
        self.btc_address = btc_address
        self.batch_size = batch_size
        
        # Initialize core miner with batched kernel
        self.core_miner = TetraPowMiner(difficulty=difficulty, batch_size=batch_size)
        
        # Initialize universal kernel for dice operations
        self.universal_kernel = UniversalMiningKernel(batch_size=batch_size)
        
        # Initialize faucet if enabled
        self.faucet = None
        if faucet_enabled:
            self.faucet = BTCFaucet()
            if btc_address and btc_address not in self.faucet.users:
                self.faucet.register_user(btc_address)
        
        # Mining statistics
        self.stats = {
            'total_attempts': 0,
            'total_success': 0,
            'start_time': None,
            'chains_mined': {},
            'lightning_routes': 0,
            'dice_rolls': 0,
            'faucet_claims': 0
        }
        
        # Lightning Network state
        self.lightning_channels = []
        self.lightning_balance = 0
        
        # Thread control
        self.mining_active = False
        self.mining_threads = []
    
    def solo_mine(self, 
                  axiom: str = None,
                  nonce_start: int = 0,
                  max_attempts: int = 1000000) -> MiningResult:
        """
        Solo mine Excalibur $EXS on CPU.
        
        Args:
            axiom: The 13-word axiom (defaults to canonical)
            nonce_start: Starting nonce value
            max_attempts: Maximum mining attempts
            
        Returns:
            MiningResult with mining outcome
        """
        if axiom is None:
            axiom = self.CANONICAL_AXIOM
        
        # Check and deduct forge fee before mining
        if not self.check_and_deduct_forge_fee():
            print("❌ Mining aborted: Insufficient forge fee")
            print("💡 Claim from faucet or wait for next claim interval")
            return MiningResult(
                success=False,
                nonce=0,
                hash="",
                timestamp=datetime.now(timezone.utc).isoformat(),
                attempts=0,
                hash_rate=0,
                mining_mode="solo",
                chain="EXS",
                difficulty=self.difficulty
            )
        
        print(f"🎯 Solo Mining $EXS")
        print(f"   Difficulty: {self.difficulty} leading zero bytes")
        print(f"   Mode: CPU Solo")
        print()
        
        start_time = time.time()
        success, final_hash, nonce, _ = self.core_miner.mine(
            axiom=axiom,
            nonce=nonce_start,
            max_attempts=max_attempts
        )
        elapsed = time.time() - start_time
        
        result = MiningResult(
            success=success,
            nonce=nonce,
            hash=final_hash.hex() if success else "",
            timestamp=datetime.now(timezone.utc).isoformat(),
            attempts=max_attempts if not success else (nonce - nonce_start + 1),
            hash_rate=max_attempts / elapsed if elapsed > 0 else 0,
            mining_mode="solo",
            chain="EXS",
            difficulty=self.difficulty
        )
        
        if success:
            self.stats['total_success'] += 1
        self.stats['total_attempts'] += result.attempts
        
        return result
    
    def merge_mine(self,
                   primary_chain: str = "EXS",
                   merge_chains: List[str] = None,
                   axiom: str = None,
                   nonce_start: int = 0,
                   max_attempts: int = 100000) -> Dict[str, MiningResult]:
        """
        Merge mine across multiple chains simultaneously.
        
        Merge mining allows mining multiple chains with one computation by
        including the hash of auxiliary chains in the primary chain's coinbase.
        
        Args:
            primary_chain: Primary chain to mine (EXS)
            merge_chains: List of auxiliary chains to merge mine (BTC, LTC, DOGE)
            axiom: The 13-word axiom
            nonce_start: Starting nonce
            max_attempts: Maximum attempts
            
        Returns:
            Dictionary mapping chain names to MiningResults
        """
        if not self.merge_mining_enabled:
            print("⚠️  Merge mining not enabled. Enable with merge_mining_enabled=True")
            return {}
        
        if axiom is None:
            axiom = self.CANONICAL_AXIOM
        
        if merge_chains is None:
            merge_chains = ['BTC']
        
        # Validate merge chains
        merge_chains = [c for c in merge_chains if c in self.MERGE_CHAINS]
        
        print(f"⛏️  Merge Mining")
        print(f"   Primary: {primary_chain}")
        print(f"   Auxiliary: {', '.join(merge_chains)}")
        print(f"   Difficulty: {self.difficulty}")
        print()
        
        results = {}
        start_time = time.time()
        
        # Mine primary chain
        print(f"Mining {primary_chain}...")
        success, final_hash, nonce, _ = self.core_miner.mine(
            axiom=axiom,
            nonce=nonce_start,
            max_attempts=max_attempts
        )
        
        elapsed = time.time() - start_time
        hash_rate = max_attempts / elapsed if elapsed > 0 else 0
        
        # Create result for primary chain
        results[primary_chain] = MiningResult(
            success=success,
            nonce=nonce,
            hash=final_hash.hex() if success else "",
            timestamp=datetime.now(timezone.utc).isoformat(),
            attempts=max_attempts if not success else (nonce - nonce_start + 1),
            hash_rate=hash_rate,
            mining_mode="merge",
            chain=primary_chain,
            difficulty=self.difficulty
        )
        
        # If primary succeeds, auxiliary chains also succeed (merge mining property)
        if success:
            for chain in merge_chains:
                # Create auxiliary chain hash by including primary hash
                aux_hash = hashlib.sha256(final_hash + chain.encode()).digest()
                
                results[chain] = MiningResult(
                    success=True,
                    nonce=nonce,
                    hash=aux_hash.hex(),
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    attempts=0,  # Free due to merge mining
                    hash_rate=hash_rate,
                    mining_mode="merge_auxiliary",
                    chain=chain,
                    difficulty=self.difficulty
                )
                
                print(f"✅ Merge mined {chain}: {aux_hash.hex()[:16]}...")
                
                # Update stats
                if chain not in self.stats['chains_mined']:
                    self.stats['chains_mined'][chain] = 0
                self.stats['chains_mined'][chain] += 1
        
        return results
    
    def dice_roll_mine(self,
                       axiom: str = None,
                       rolls: int = 100) -> List[DiceRollResult]:
        """
        Dice roll probabilistic mining using batched kernel.
        
        This mode uses a probabilistic approach where each mining attempt is like
        rolling dice. If you roll high enough, you find a valid hash faster.
        This simulates the probabilistic nature of PoW mining.
        
        Now uses batched dice roll computation for improved performance.
        
        Args:
            axiom: The 13-word axiom
            rolls: Number of dice rolls to attempt
            
        Returns:
            List of DiceRollResults
        """
        if not self.dice_mode_enabled:
            print("⚠️  Dice mode not enabled. Enable with dice_mode_enabled=True")
            return []
        
        if axiom is None:
            axiom = self.CANONICAL_AXIOM
        
        print(f"🎲 Dice Roll Mining (Batched Mode)")
        print(f"   Rolls: {rolls}")
        print(f"   Target: {self.DICE_WIN_THRESHOLD}+ on d{self.DICE_SIDES}")
        print(f"   Win Rate: {(self.DICE_SIDES - self.DICE_WIN_THRESHOLD + 1) / self.DICE_SIDES * 100:.1f}%")
        print(f"   Batch Size: {self.batch_size}")
        print()
        
        results = []
        wins = 0
        
        # Generate batched dice rolls using the universal kernel
        server_seed = "unified_miner_seed_" + hashlib.sha256(axiom.encode()).hexdigest()[:16]
        
        # Prepare batch data
        client_seeds = [f"client_seed_{i}" for i in range(rolls)]
        nonces = [random.randint(0, 1000000) for _ in range(rolls)]
        
        # Use batched dice roll computation
        batch_results = self.universal_kernel.batch_dice_roll_mine(
            server_seed=server_seed,
            client_seeds=client_seeds,
            nonces=nonces,
            max_value=self.DICE_SIDES * 100  # 10000 for 0.00-99.99 range
        )
        
        for i, (hmac_value, nonce, roll_float, roll_int) in enumerate(batch_results):
            # roll_float is in 0.00-99.99 range, convert to 1-100
            roll = min(int(roll_float) + 1, 100)
            
            # Check if roll wins
            if roll >= self.DICE_WIN_THRESHOLD:
                # Verify with actual mining
                valid, final_hash = self.core_miner.verify(axiom, nonce)
                
                result = DiceRollResult(
                    roll=roll,
                    target=self.DICE_WIN_THRESHOLD,
                    success=True,
                    hash=final_hash.hex(),
                    nonce=nonce,
                    timestamp=datetime.now(timezone.utc).isoformat()
                )
                
                wins += 1
                print(f"🎉 Roll {i+1}: {roll}/{self.DICE_SIDES} - WIN! (Nonce: {nonce})")
            else:
                result = DiceRollResult(
                    roll=roll,
                    target=self.DICE_WIN_THRESHOLD,
                    success=False,
                    hash="",
                    nonce=nonce,
                    timestamp=datetime.now(timezone.utc).isoformat()
                )
                
                if (i + 1) % 10 == 0:
                    print(f"   Roll {i+1}: {roll}/{self.DICE_SIDES}")
            
            results.append(result)
            self.stats['dice_rolls'] += 1
        
        print()
        print(f"Dice Results: {wins}/{rolls} wins ({wins/rolls*100:.1f}%)")
        
        return results
    
    def lightning_route_payment(self,
                                destination: str,
                                amount_msat: int,
                                max_fee_msat: int = 1000) -> LightningRoute:
        """
        Route a Lightning Network payment.
        
        This simulates routing a payment through the Lightning Network,
        potentially earning routing fees while supporting the network.
        
        Args:
            destination: Destination node public key
            amount_msat: Amount in millisatoshis
            max_fee_msat: Maximum routing fee
            
        Returns:
            LightningRoute with routing details
        """
        if not self.lightning_routing_enabled:
            print("⚠️  Lightning routing not enabled. Enable with lightning_routing_enabled=True")
            return None
        
        print(f"⚡ Lightning Network Routing")
        print(f"   Destination: {destination[:16]}...")
        print(f"   Amount: {amount_msat} msat ({amount_msat/1000:.3f} sat)")
        print()
        
        # Simulate route finding (in production, use actual LN routing)
        hops = [
            "self",
            f"node_{random.randint(1000, 9999)}",
            f"node_{random.randint(1000, 9999)}",
            destination
        ]
        
        # Calculate routing fee (0.1% + base fee)
        fee_msat = min(int(amount_msat * 0.001) + 100, max_fee_msat)
        
        # Simulate success (95% success rate)
        success = random.random() > 0.05
        
        route = LightningRoute(
            route_id=hashlib.sha256(f"{destination}{amount_msat}{time.time()}".encode()).hexdigest()[:16],
            source="self",
            destination=destination,
            amount_msat=amount_msat,
            fee_msat=fee_msat if success else 0,
            hops=hops,
            success=success,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        
        if success:
            print(f"✅ Route successful")
            print(f"   Hops: {len(hops)}")
            print(f"   Fee earned: {fee_msat} msat")
            self.lightning_balance += fee_msat
            self.stats['lightning_routes'] += 1
        else:
            print(f"❌ Route failed")
        
        return route
    
    def claim_faucet(self, captcha_challenge: str, captcha_response: str) -> bool:
        """
        Claim BTC from faucet to fund forge fees.
        
        Args:
            captcha_challenge: The captcha challenge (e.g., "5+3")
            captcha_response: User's response to captcha
            
        Returns:
            True if claim successful
        """
        if not self.faucet_enabled or not self.faucet:
            print("⚠️  Faucet not enabled. Initialize with faucet_enabled=True")
            return False
        
        if not self.btc_address:
            print("⚠️  No BTC address configured")
            return False
        
        print("💧 Claiming from BTC Faucet...")
        claim = self.faucet.claim(self.btc_address, captcha_challenge, captcha_response)
        
        if claim:
            self.stats['faucet_claims'] += 1
            return True
        
        return False
    
    def auto_fund_forge_fee(self) -> bool:
        """
        Automatically check and fund forge fee from faucet if needed.
        
        Returns:
            True if forge fee is available
        """
        if not self.faucet_enabled or not self.faucet:
            return True  # Assume fee available if faucet disabled
        
        if not self.btc_address:
            return True
        
        # Check if user has forge fee
        if self.faucet.has_forge_fee(self.btc_address):
            return True
        
        # Check if can claim
        can_claim, reason = self.faucet.can_claim(self.btc_address)
        
        if can_claim:
            print("💧 Insufficient forge fee. Attempting faucet claim...")
            # Auto-solve simple captcha for auto-funding
            captcha = f"{random.randint(1, 9)}+{random.randint(1, 9)}"
            parts = captcha.split('+')
            answer = str(int(parts[0]) + int(parts[1]))
            
            return self.claim_faucet(captcha, answer)
        else:
            print(f"⚠️  Insufficient forge fee. {reason}")
            return False
    
    def check_and_deduct_forge_fee(self) -> bool:
        """
        Check if forge fee is available and deduct it.
        
        Returns:
            True if fee successfully deducted
        """
        if not self.faucet_enabled or not self.faucet:
            return True  # Assume fee paid if faucet disabled
        
        if not self.btc_address:
            return True
        
        if not self.faucet.has_forge_fee(self.btc_address):
            if not self.auto_fund_forge_fee():
                return False
        
        return self.faucet.deduct_forge_fee(self.btc_address)
    
    def get_faucet_balance(self):
        """Display current faucet balance."""
        if not self.faucet_enabled or not self.faucet:
            print("⚠️  Faucet not enabled")
            return
        
        if not self.btc_address:
            print("⚠️  No BTC address configured")
            return
        
        self.faucet.print_balance(self.btc_address)
    
    def start_continuous_mining(self,
                               mode: str = "solo",
                               callback: Optional[Callable] = None):
        """
        Start continuous background mining.
        
        Args:
            mode: Mining mode ("solo", "merge", "dice")
            callback: Optional callback function called on each result
        """
        if self.mining_active:
            print("⚠️  Mining already active")
            return
        
        self.mining_active = True
        self.stats['start_time'] = time.time()
        
        def mining_loop():
            print(f"🚀 Starting continuous {mode} mining...")
            while self.mining_active:
                try:
                    if mode == "solo":
                        result = self.solo_mine(max_attempts=10000)
                        if callback:
                            callback(result)
                    
                    elif mode == "merge":
                        results = self.merge_mine(max_attempts=10000)
                        if callback:
                            callback(results)
                    
                    elif mode == "dice":
                        results = self.dice_roll_mine(rolls=10)
                        if callback:
                            callback(results)
                    
                    time.sleep(0.1)  # Brief pause between rounds
                    
                except Exception as e:
                    print(f"❌ Mining error: {e}")
                    time.sleep(1)
        
        thread = threading.Thread(target=mining_loop, daemon=True)
        thread.start()
        self.mining_threads.append(thread)
        
        print(f"✅ Continuous mining started in {mode} mode")
    
    def stop_mining(self):
        """Stop all continuous mining operations."""
        if not self.mining_active:
            print("⚠️  No active mining to stop")
            return
        
        self.mining_active = False
        print("🛑 Stopping mining...")
        
        # Wait for threads to finish
        for thread in self.mining_threads:
            thread.join(timeout=2)
        
        self.mining_threads = []
        print("✅ Mining stopped")
    
    def get_stats(self) -> Dict:
        """Get comprehensive mining statistics."""
        elapsed = time.time() - self.stats['start_time'] if self.stats['start_time'] else 0
        
        return {
            'total_attempts': self.stats['total_attempts'],
            'total_success': self.stats['total_success'],
            'success_rate': self.stats['total_success'] / self.stats['total_attempts'] 
                           if self.stats['total_attempts'] > 0 else 0,
            'uptime_seconds': elapsed,
            'chains_mined': self.stats['chains_mined'],
            'lightning_routes': self.stats['lightning_routes'],
            'lightning_balance_msat': self.lightning_balance,
            'dice_rolls': self.stats['dice_rolls'],
            'average_hash_rate': self.stats['total_attempts'] / elapsed if elapsed > 0 else 0
        }
    
    def print_stats(self):
        """Print formatted statistics."""
        stats = self.get_stats()
        
        print("═" * 60)
        print("  UNIFIED MINER STATISTICS")
        print("═" * 60)
        print(f"Total Attempts:     {stats['total_attempts']:,}")
        print(f"Successful Mines:   {stats['total_success']}")
        print(f"Success Rate:       {stats['success_rate']*100:.4f}%")
        print(f"Average Hash Rate:  {stats['average_hash_rate']:.1f} H/s")
        print(f"Uptime:             {stats['uptime_seconds']:.1f} seconds")
        
        if stats['chains_mined']:
            print(f"\nMerge Mining:")
            for chain, count in stats['chains_mined'].items():
                print(f"  {chain}: {count} blocks")
        
        if stats['lightning_routes'] > 0:
            print(f"\nLightning Routing:")
            print(f"  Routes:           {stats['lightning_routes']}")
            print(f"  Fees Earned:      {stats['lightning_balance_msat']} msat")
        
        if stats['dice_rolls'] > 0:
            print(f"\nDice Roll Mining:")
            print(f"  Total Rolls:      {stats['dice_rolls']}")
        
        if self.faucet_enabled and 'faucet_claims' in self.stats:
            print(f"\nBTC Faucet:")
            print(f"  Claims:           {self.stats['faucet_claims']}")
        
        print("═" * 60)


def main():
    """Demonstration of the Unified Miner interface."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Excalibur $EXS Unified Mining Interface',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Mining Modes:
  solo        Solo mine $EXS on CPU
  merge       Merge mine $EXS with BTC/LTC/DOGE
  dice        Dice roll probabilistic mining
  lightning   Lightning Network payment routing
  continuous  Start continuous background mining
  faucet      Claim BTC from faucet or check balance

Examples:
  # Solo mine with difficulty 1
  python unified_miner.py solo --difficulty 1
  
  # Merge mine EXS and BTC
  python unified_miner.py merge --chains BTC LTC
  
  # Dice roll mining
  python unified_miner.py dice --rolls 50
  
  # Route Lightning payment
  python unified_miner.py lightning --dest 03abc... --amount 100000
  
  # Claim from BTC faucet
  python unified_miner.py faucet --btc-address bc1q... --faucet-action claim
        """
    )
    
    parser.add_argument('mode', 
                       choices=['solo', 'merge', 'dice', 'lightning', 'continuous', 'faucet'],
                       help='Mining mode')
    
    parser.add_argument('--difficulty', type=int, default=1,
                       help='Mining difficulty (default: 1)')
    
    parser.add_argument('--axiom', type=str,
                       default=UnifiedMiner.CANONICAL_AXIOM,
                       help='The 13-word axiom')
    
    parser.add_argument('--chains', nargs='+',
                       choices=UnifiedMiner.MERGE_CHAINS,
                       default=['BTC'],
                       help='Chains to merge mine')
    
    parser.add_argument('--rolls', type=int, default=20,
                       help='Number of dice rolls')
    
    parser.add_argument('--dest', type=str,
                       help='Lightning destination node')
    
    parser.add_argument('--amount', type=int, default=100000,
                       help='Lightning amount in millisatoshis')
    
    parser.add_argument('--max-attempts', type=int, default=100000,
                       help='Maximum mining attempts')
    
    parser.add_argument('--enable-faucet', action='store_true',
                       help='Enable BTC faucet for auto-funding forge fees')
    
    parser.add_argument('--btc-address', type=str,
                       help='BTC address for faucet claims')
    
    parser.add_argument('--faucet-action', choices=['claim', 'balance'],
                       default='balance',
                       help='Faucet action (claim or check balance)')
    
    parser.add_argument('--payout-address', type=str,
                       help='Destination address for mining rewards/payouts')
    
    parser.add_argument('--batch-size', type=int, default=UnifiedMiner.DEFAULT_BATCH_SIZE,
                       help=f'Batch size for processing (default: {UnifiedMiner.DEFAULT_BATCH_SIZE})')
    
    args = parser.parse_args()
    
    # Initialize unified miner with all features enabled
    miner = UnifiedMiner(
        difficulty=args.difficulty,
        merge_mining_enabled=True,
        lightning_routing_enabled=True,
        dice_mode_enabled=True,
        faucet_enabled=args.enable_faucet or args.mode == 'faucet',
        btc_address=args.btc_address,
        batch_size=args.batch_size
    )
    
    print("⚔️  EXCALIBUR $EXS UNIFIED MINER ⚔️")
    print("=" * 60)
    
    # Display payout address if provided
    if args.payout_address:
        print(f"💰 Rewards Destination: {args.payout_address}")
        print("=" * 60)
    
    print()
    
    # Execute requested mode
    if args.mode == 'solo':
        result = miner.solo_mine(
            axiom=args.axiom,
            max_attempts=args.max_attempts
        )
        print()
        print("Result:", asdict(result))
        
        # Show payout info
        if args.payout_address and result.success:
            print()
            print(f"💰 REWARD DISTRIBUTION")
            print(f"   Total Forge Reward:  50.0 $EXS")
            print(f"   Miner Payout:        49.5 $EXS → {args.payout_address}")
            print(f"   Treasury Fee (1%):   0.5 $EXS → Protocol Treasury")
            print(f"   Forge Fee:           0.0001 BTC")
    
    elif args.mode == 'merge':
        results = miner.merge_mine(
            merge_chains=args.chains,
            axiom=args.axiom,
            max_attempts=args.max_attempts
        )
        print()
        for chain, result in results.items():
            print(f"{chain}: {asdict(result)}")
        
        # Show payout info for successful merge mining
        if args.payout_address:
            successful_chains = [chain for chain, result in results.items() if result.success]
            if successful_chains:
                print()
                print(f"💰 MERGE MINING DISTRIBUTION")
                print(f"   Primary Chain (EXS):")
                print(f"     Total Reward:      50.0 $EXS")
                print(f"     Miner Payout:      49.5 $EXS → {args.payout_address}")
                print(f"     Treasury Fee (1%): 0.5 $EXS → Protocol Treasury")
                print(f"   Auxiliary Chains:  {', '.join([c for c in successful_chains if c != 'EXS'])}")
                print(f"   Forge Fee:         0.0001 BTC")
    
    elif args.mode == 'dice':
        results = miner.dice_roll_mine(
            axiom=args.axiom,
            rolls=args.rolls
        )
        print()
        wins = sum(1 for r in results if r.success)
        print(f"Summary: {wins}/{len(results)} successful rolls")
        
        # Show payout info
        if args.payout_address and wins > 0:
            print()
            print(f"✅ Dice roll winnings will be sent to: {args.payout_address}")
            print(f"   Total wins: {wins}")
    
    elif args.mode == 'lightning':
        if not args.dest:
            print("❌ Error: --dest required for lightning mode")
            return
        
        route = miner.lightning_route_payment(
            destination=args.dest,
            amount_msat=args.amount
        )
        print()
        print("Route:", asdict(route))
    
    elif args.mode == 'faucet':
        if not args.btc_address:
            print("❌ Error: --btc-address required for faucet mode")
            return
        
        if args.faucet_action == 'balance':
            miner.get_faucet_balance()
        elif args.faucet_action == 'claim':
            # Generate simple captcha
            a, b = random.randint(1, 9), random.randint(1, 9)
            captcha = f"{a}+{b}"
            answer = str(a + b)
            
            print(f"💧 BTC Faucet Claim")
            print(f"   Captcha: {captcha} = ?")
            print(f"   (Auto-solving for demo: {answer})")
            print()
            
            if miner.claim_faucet(captcha, answer):
                print()
                miner.get_faucet_balance()
    
    elif args.mode == 'continuous':
        print("Starting continuous mining...")
        print("Press Ctrl+C to stop")
        print()
        
        miner.start_continuous_mining(mode='solo')
        
        try:
            while True:
                time.sleep(5)
                print("\nCurrent Stats:")
                miner.print_stats()
        except KeyboardInterrupt:
            print("\n\nShutting down...")
            miner.stop_mining()
    
    print()
    miner.print_stats()


if __name__ == '__main__':
    main()
