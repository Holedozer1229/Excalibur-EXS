#!/usr/bin/env python3
"""
Excalibur $EXS Bitcoin Faucet Integration

A Bitcoin faucet system inspired by freebitco.in to help users fund
transaction fees for forge operations. Users can claim small amounts
of BTC at regular intervals to cover the 0.0001 BTC forge fee.

Features:
- Hourly claims with captcha protection
- Reward tiers based on claim count
- Referral system
- Auto-fund forge fees
- Integration with unified miner

Author: Travis D. Jones <holedozer@icloud.com>
License: BSD 3-Clause
"""

import hashlib
import time
import random
import json
import os
from typing import Dict, Optional, List
from dataclasses import dataclass, asdict
from datetime import datetime, timezone, timedelta


@dataclass
class FaucetClaim:
    """Record of a faucet claim"""
    claim_id: str
    user_address: str
    amount_btc: float
    timestamp: str
    claim_count: int
    reward_tier: str
    captcha_passed: bool


@dataclass
class FaucetBalance:
    """User's faucet balance"""
    address: str
    balance_btc: float
    total_claimed: float
    claim_count: int
    last_claim_time: Optional[str]
    referral_earnings: float
    next_claim_available: str


class BTCFaucet:
    """
    Bitcoin Faucet for Excalibur $EXS Protocol
    
    Provides free BTC to users for paying forge transaction fees.
    Users can claim BTC every hour, with rewards increasing based
    on consecutive claims and loyalty.
    """
    
    # Reward tiers (in satoshis)
    REWARD_TIERS = {
        'newbie': (50, 100),      # 50-100 satoshis for first 10 claims
        'regular': (100, 200),    # 100-200 satoshis for 10-50 claims
        'veteran': (200, 500),    # 200-500 satoshis for 50-100 claims
        'legend': (500, 1000),    # 500-1000 satoshis for 100+ claims
        'jackpot': (10000, 50000) # 0.1-0.5 mBTC jackpot (0.01% chance)
    }
    
    # Claim interval (1 hour)
    CLAIM_INTERVAL_SECONDS = 3600
    
    # Forge fee requirement
    FORGE_FEE_BTC = 0.0001  # 10,000 satoshis
    
    # Referral bonus
    REFERRAL_BONUS_PERCENT = 0.25  # 25% of referee's claims
    
    def __init__(self, data_dir: str = "/tmp/exs_faucet"):
        """
        Initialize the BTC Faucet.
        
        Args:
            data_dir: Directory to store faucet data
        """
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        
        self.users_file = os.path.join(data_dir, "faucet_users.json")
        self.claims_file = os.path.join(data_dir, "faucet_claims.json")
        
        # Load or initialize data
        self.users = self._load_users()
        self.claims = self._load_claims()
        
        # Faucet statistics
        self.total_distributed = 0.0
        self.total_claims = 0
    
    def _load_users(self) -> Dict:
        """Load user data from file"""
        if os.path.exists(self.users_file):
            with open(self.users_file, 'r') as f:
                return json.load(f)
        return {}
    
    def _save_users(self):
        """Save user data to file"""
        with open(self.users_file, 'w') as f:
            json.dump(self.users, f, indent=2)
    
    def _load_claims(self) -> List:
        """Load claim history from file"""
        if os.path.exists(self.claims_file):
            with open(self.claims_file, 'r') as f:
                return json.load(f)
        return []
    
    def _save_claims(self):
        """Save claim history to file"""
        with open(self.claims_file, 'w') as f:
            json.dump(self.claims[-1000:], f, indent=2)  # Keep last 1000 claims
    
    def _get_reward_tier(self, claim_count: int) -> str:
        """Determine reward tier based on claim count"""
        if claim_count < 10:
            return 'newbie'
        elif claim_count < 50:
            return 'regular'
        elif claim_count < 100:
            return 'veteran'
        else:
            return 'legend'
    
    def _calculate_reward(self, claim_count: int) -> tuple[float, str]:
        """
        Calculate reward amount in BTC.
        
        Args:
            claim_count: Number of claims user has made
            
        Returns:
            Tuple of (reward_btc, tier_name)
        """
        # Check for jackpot (0.01% chance)
        if random.random() < 0.0001:
            satoshis = random.randint(*self.REWARD_TIERS['jackpot'])
            return satoshis / 100000000, 'jackpot'
        
        # Regular reward based on tier
        tier = self._get_reward_tier(claim_count)
        satoshis = random.randint(*self.REWARD_TIERS[tier])
        return satoshis / 100000000, tier
    
    def _verify_captcha(self, challenge: str, response: str) -> bool:
        """
        Verify captcha response.
        
        In production, this would integrate with reCAPTCHA or similar.
        For demo, we use a simple math captcha.
        
        Args:
            challenge: The captcha challenge (e.g., "5+3")
            response: User's response
            
        Returns:
            True if captcha is correct
        """
        try:
            # Parse simple math captcha
            if '+' in challenge:
                a, b = challenge.split('+')
                expected = int(a.strip()) + int(b.strip())
                return int(response) == expected
            elif '-' in challenge:
                a, b = challenge.split('-')
                expected = int(a.strip()) - int(b.strip())
                return int(response) == expected
            elif '*' in challenge:
                a, b = challenge.split('*')
                expected = int(a.strip()) * int(b.strip())
                return int(response) == expected
        except:
            return False
        
        return False
    
    def register_user(self, address: str, referrer: Optional[str] = None) -> bool:
        """
        Register a new user for the faucet.
        
        Args:
            address: User's BTC address
            referrer: Optional referrer address
            
        Returns:
            True if registration successful
        """
        if address in self.users:
            print(f"⚠️  Address {address[:16]}... already registered")
            return False
        
        self.users[address] = {
            'balance': 0.0,
            'total_claimed': 0.0,
            'claim_count': 0,
            'last_claim_time': None,
            'referrer': referrer,
            'referral_earnings': 0.0,
            'referrals': []
        }
        
        # Add to referrer's referral list
        if referrer and referrer in self.users:
            self.users[referrer]['referrals'].append(address)
        
        self._save_users()
        print(f"✅ Registered address: {address[:16]}...")
        return True
    
    def can_claim(self, address: str) -> tuple[bool, str]:
        """
        Check if user can claim from faucet.
        
        Args:
            address: User's BTC address
            
        Returns:
            Tuple of (can_claim, reason)
        """
        if address not in self.users:
            return False, "Address not registered"
        
        user = self.users[address]
        
        if user['last_claim_time'] is None:
            return True, "First claim available"
        
        last_claim = datetime.fromisoformat(user['last_claim_time'])
        elapsed = datetime.now(timezone.utc) - last_claim
        
        if elapsed.total_seconds() < self.CLAIM_INTERVAL_SECONDS:
            remaining = self.CLAIM_INTERVAL_SECONDS - elapsed.total_seconds()
            minutes = int(remaining // 60)
            return False, f"Next claim in {minutes} minutes"
        
        return True, "Claim available"
    
    def claim(self, address: str, captcha_challenge: str, captcha_response: str) -> Optional[FaucetClaim]:
        """
        Process a faucet claim.
        
        Args:
            address: User's BTC address
            captcha_challenge: The captcha challenge
            captcha_response: User's captcha response
            
        Returns:
            FaucetClaim if successful, None otherwise
        """
        # Verify captcha
        if not self._verify_captcha(captcha_challenge, captcha_response):
            print("❌ Captcha verification failed")
            return None
        
        # Check if can claim
        can_claim, reason = self.can_claim(address)
        if not can_claim:
            print(f"❌ Cannot claim: {reason}")
            return None
        
        user = self.users[address]
        
        # Calculate reward
        reward_btc, tier = self._calculate_reward(user['claim_count'])
        
        # Update user data
        user['balance'] += reward_btc
        user['total_claimed'] += reward_btc
        user['claim_count'] += 1
        user['last_claim_time'] = datetime.now(timezone.utc).isoformat()
        
        # Process referral bonus
        if user.get('referrer') and user['referrer'] in self.users:
            referrer = self.users[user['referrer']]
            bonus = reward_btc * self.REFERRAL_BONUS_PERCENT
            referrer['balance'] += bonus
            referrer['referral_earnings'] += bonus
        
        # Create claim record
        claim = FaucetClaim(
            claim_id=hashlib.sha256(f"{address}{time.time()}".encode()).hexdigest()[:16],
            user_address=address,
            amount_btc=reward_btc,
            timestamp=datetime.now(timezone.utc).isoformat(),
            claim_count=user['claim_count'],
            reward_tier=tier,
            captcha_passed=True
        )
        
        self.claims.append(asdict(claim))
        self.total_distributed += reward_btc
        self.total_claims += 1
        
        # Save data
        self._save_users()
        self._save_claims()
        
        # Display claim result
        satoshis = int(reward_btc * 100000000)
        if tier == 'jackpot':
            print(f"🎉 JACKPOT! You won {satoshis} satoshis ({reward_btc:.8f} BTC)!")
        else:
            print(f"✅ Claim successful!")
            print(f"   Reward: {satoshis} satoshis ({reward_btc:.8f} BTC)")
            print(f"   Tier: {tier}")
            print(f"   Claims: {user['claim_count']}")
        
        return claim
    
    def get_balance(self, address: str) -> Optional[FaucetBalance]:
        """
        Get user's faucet balance.
        
        Args:
            address: User's BTC address
            
        Returns:
            FaucetBalance if user exists
        """
        if address not in self.users:
            return None
        
        user = self.users[address]
        
        # Calculate next claim time
        if user['last_claim_time']:
            last_claim = datetime.fromisoformat(user['last_claim_time'])
            next_claim = last_claim + timedelta(seconds=self.CLAIM_INTERVAL_SECONDS)
            next_claim_str = next_claim.isoformat()
        else:
            next_claim_str = "Now"
        
        return FaucetBalance(
            address=address,
            balance_btc=user['balance'],
            total_claimed=user['total_claimed'],
            claim_count=user['claim_count'],
            last_claim_time=user['last_claim_time'],
            referral_earnings=user['referral_earnings'],
            next_claim_available=next_claim_str
        )
    
    def has_forge_fee(self, address: str) -> bool:
        """
        Check if user has enough balance for forge fee.
        
        Args:
            address: User's BTC address
            
        Returns:
            True if user has >= 0.0001 BTC
        """
        if address not in self.users:
            return False
        
        return self.users[address]['balance'] >= self.FORGE_FEE_BTC
    
    def deduct_forge_fee(self, address: str) -> bool:
        """
        Deduct forge fee from user's balance.
        
        Args:
            address: User's BTC address
            
        Returns:
            True if successful
        """
        if not self.has_forge_fee(address):
            return False
        
        self.users[address]['balance'] -= self.FORGE_FEE_BTC
        self._save_users()
        
        print(f"✅ Forge fee deducted: {self.FORGE_FEE_BTC} BTC")
        return True
    
    def get_referral_link(self, address: str) -> str:
        """
        Generate referral link for user.
        
        Args:
            address: User's BTC address
            
        Returns:
            Referral link
        """
        ref_code = hashlib.sha256(address.encode()).hexdigest()[:8]
        return f"https://exs-faucet.io/claim?ref={ref_code}"
    
    def print_balance(self, address: str):
        """Print formatted balance for user"""
        balance = self.get_balance(address)
        if not balance:
            print(f"❌ Address not registered")
            return
        
        print("═" * 60)
        print("  EXCALIBUR $EXS FAUCET BALANCE")
        print("═" * 60)
        print(f"Address:         {address[:16]}...")
        print(f"Balance:         {balance.balance_btc:.8f} BTC ({int(balance.balance_btc * 100000000)} sat)")
        print(f"Total Claimed:   {balance.total_claimed:.8f} BTC")
        print(f"Claim Count:     {balance.claim_count}")
        print(f"Referral Bonus:  {balance.referral_earnings:.8f} BTC")
        
        if balance.next_claim_available == "Now":
            print(f"Next Claim:      Available now! ✅")
        else:
            next_claim = datetime.fromisoformat(balance.next_claim_available)
            now = datetime.now(timezone.utc)
            if next_claim > now:
                remaining = (next_claim - now).total_seconds()
                minutes = int(remaining // 60)
                print(f"Next Claim:      In {minutes} minutes")
            else:
                print(f"Next Claim:      Available now! ✅")
        
        forge_fees = int(balance.balance_btc / self.FORGE_FEE_BTC)
        print(f"\nForge Fees Available: {forge_fees}")
        print("═" * 60)
    
    def get_stats(self) -> Dict:
        """Get faucet statistics"""
        return {
            'total_users': len(self.users),
            'total_distributed_btc': self.total_distributed,
            'total_distributed_sat': int(self.total_distributed * 100000000),
            'total_claims': self.total_claims,
            'avg_claim_btc': self.total_distributed / self.total_claims if self.total_claims > 0 else 0
        }
    
    def print_stats(self):
        """Print formatted statistics"""
        stats = self.get_stats()
        
        print("═" * 60)
        print("  FAUCET STATISTICS")
        print("═" * 60)
        print(f"Total Users:     {stats['total_users']}")
        print(f"Total Claims:    {stats['total_claims']}")
        print(f"Total Distributed: {stats['total_distributed_btc']:.8f} BTC")
        print(f"                   {stats['total_distributed_sat']:,} satoshis")
        print(f"Average Claim:   {stats['avg_claim_btc']:.8f} BTC")
        print("═" * 60)


def main():
    """Demonstration of the BTC Faucet"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Excalibur $EXS Bitcoin Faucet',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Commands:
  register    Register a new address
  claim       Claim BTC from faucet
  balance     Check your balance
  stats       View faucet statistics

Examples:
  # Register
  python3 btc_faucet.py register --address bc1q...
  
  # Claim with captcha
  python3 btc_faucet.py claim --address bc1q... --captcha "5+3" --answer 8
  
  # Check balance
  python3 btc_faucet.py balance --address bc1q...
        """
    )
    
    parser.add_argument('command', 
                       choices=['register', 'claim', 'balance', 'stats'],
                       help='Command to execute')
    
    parser.add_argument('--address', type=str,
                       help='Your BTC address')
    
    parser.add_argument('--referrer', type=str,
                       help='Referrer address (for registration)')
    
    parser.add_argument('--captcha', type=str,
                       help='Captcha challenge (e.g., "5+3")')
    
    parser.add_argument('--answer', type=str,
                       help='Captcha answer')
    
    args = parser.parse_args()
    
    # Initialize faucet
    faucet = BTCFaucet()
    
    print("💧 EXCALIBUR $EXS BITCOIN FAUCET 💧")
    print("=" * 60)
    print()
    
    if args.command == 'register':
        if not args.address:
            print("❌ Error: --address required")
            return
        
        faucet.register_user(args.address, referrer=args.referrer)
        
        if args.referrer:
            print(f"   Referrer: {args.referrer[:16]}...")
        
        print(f"\n📎 Your referral link:")
        print(f"   {faucet.get_referral_link(args.address)}")
        print(f"\n💡 Earn 25% of what your referrals claim!")
    
    elif args.command == 'claim':
        if not args.address:
            print("❌ Error: --address required")
            return
        
        if not args.captcha or not args.answer:
            print("❌ Error: --captcha and --answer required")
            print("\n💡 Example captcha: --captcha '5+3' --answer 8")
            return
        
        claim = faucet.claim(args.address, args.captcha, args.answer)
        
        if claim:
            print(f"\n💰 New Balance: {faucet.users[args.address]['balance']:.8f} BTC")
            print(f"⏰ Next claim in 60 minutes")
    
    elif args.command == 'balance':
        if not args.address:
            print("❌ Error: --address required")
            return
        
        faucet.print_balance(args.address)
    
    elif args.command == 'stats':
        faucet.print_stats()
    
    print()


if __name__ == '__main__':
    main()
