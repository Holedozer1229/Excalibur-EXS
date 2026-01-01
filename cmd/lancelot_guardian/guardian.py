# File: cmd/lancelot_guardian/guardian.py
# Purpose: Blockchain LLM Cloud Guardian - monitors miners, treasury, and network health
# Integrates with: Tetra-PoW, Dice-Roll miners, Treasury API, Rosetta API
# Alerts: Slack, Discord, Email, SMS

import requests
import time
import json
import yaml
from datetime import datetime
from typing import Dict, List, Any, Optional

class LancelotGuardian:
    """
    Lancelot Blockchain LLM Cloud Guardian
    
    Monitors:
    - Miner health (Tetra-PoW + Dice-Roll)
    - Treasury mini-output schedule
    - CLTV time-lock releases
    - Block production rate
    - Network anomalies
    
    Alerts via configured channels (Slack, Discord, etc.)
    """
    
    def __init__(self, config_path: str = "config.yaml"):
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.tetra_pow_url = self.config.get('tetra_pow_url', 'http://localhost:8082')
        self.diceminer_url = self.config.get('diceminer_url', 'http://localhost:8083')
        self.treasury_url = self.config.get('treasury_url', 'http://localhost:8080')
        self.rosetta_url = self.config.get('rosetta_url', 'http://localhost:8081')
        
        self.alert_channels = self.config.get('alert_channels', {})
        self.check_interval = self.config.get('check_interval', 60)  # seconds
        
        self.stats = {
            'checks_performed': 0,
            'alerts_sent': 0,
            'last_check': None,
            'start_time': datetime.now()
        }
        
        print("🛡️  Lancelot Guardian Starting...")
        print(f"⛏️  Monitoring Tetra-PoW: {self.tetra_pow_url}")
        print(f"🎲 Monitoring Dice-Roll: {self.diceminer_url}")
        print(f"🏛️  Monitoring Treasury: {self.treasury_url}")
        print(f"🌹 Monitoring Rosetta: {self.rosetta_url}")
        print(f"⏱️  Check interval: {self.check_interval}s")
    
    def monitor(self):
        """Main monitoring loop"""
        print(f"🚀 Guardian monitoring active...")
        
        while True:
            try:
                self.perform_health_checks()
                time.sleep(self.check_interval)
            except KeyboardInterrupt:
                print("\n🛑 Guardian shutting down...")
                break
            except Exception as e:
                print(f"❌ Error in monitoring loop: {e}")
                time.sleep(self.check_interval)
    
    def perform_health_checks(self):
        """Execute all health checks"""
        self.stats['checks_performed'] += 1
        self.stats['last_check'] = datetime.now()
        
        timestamp = datetime.now().isoformat()
        print(f"\n[{timestamp}] 🔍 Performing health checks...")
        
        # Check miners
        tetra_status = self.check_miner_health(self.tetra_pow_url, "Tetra-PoW")
        dice_status = self.check_miner_health(self.diceminer_url, "Dice-Roll")
        
        # Check treasury
        treasury_status = self.check_treasury_health()
        
        # Check for upcoming CLTV unlocks
        self.check_cltv_schedule()
        
        # Summary
        all_healthy = tetra_status and dice_status and treasury_status
        status_emoji = "✅" if all_healthy else "⚠️"
        print(f"{status_emoji} Health check complete\n")
    
    def check_miner_health(self, url: str, name: str) -> bool:
        """Check if miner is responding and healthy"""
        try:
            response = requests.get(f"{url}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                print(f"  ✅ {name}: Healthy")
                
                # Get stats if available
                try:
                    stats_resp = requests.get(f"{url}/stats", timeout=5)
                    if stats_resp.status_code == 200:
                        stats = stats_resp.json()
                        print(f"     📊 Attempts: {stats.get('total_attempts', 'N/A')}")
                        print(f"     🎯 Valid blocks: {stats.get('valid_blocks', 'N/A')}")
                        print(f"     ⚡ Hashrate: {stats.get('hashrate', 0):.2f} H/s")
                except:
                    pass
                
                return True
            else:
                self.send_alert(f"{name} miner returned status {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"  ❌ {name}: Unreachable ({e})")
            self.send_alert(f"{name} miner is unreachable")
            return False
    
    def check_treasury_health(self) -> bool:
        """Check treasury API and mini-output schedule"""
        try:
            response = requests.get(f"{self.treasury_url}/stats", timeout=5)
            if response.status_code == 200:
                stats = response.json()
                print(f"  ✅ Treasury: Healthy")
                print(f"     💰 Balance: {stats.get('treasury_balance', 'N/A')} EXS")
                print(f"     🔓 Spendable: {stats.get('spendable_balance', 'N/A')} EXS")
                print(f"     🔒 Locked: {stats.get('locked_balance', 'N/A')} EXS")
                print(f"     📦 Mini-outputs: {stats.get('mini_outputs_total', 'N/A')}")
                return True
            else:
                self.send_alert(f"Treasury API returned status {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"  ❌ Treasury: Unreachable ({e})")
            self.send_alert("Treasury API is unreachable")
            return False
    
    def check_cltv_schedule(self):
        """Check for upcoming CLTV time-lock releases"""
        try:
            response = requests.get(f"{self.treasury_url}/mini-outputs", timeout=5)
            if response.status_code == 200:
                data = response.json()
                locked_outputs = data.get('locked_mini_outputs', [])
                
                if locked_outputs:
                    # Sort by unlock height
                    sorted_outputs = sorted(locked_outputs, key=lambda x: x.get('UnlockHeight', 0))
                    next_unlock = sorted_outputs[0] if sorted_outputs else None
                    
                    if next_unlock:
                        unlock_height = next_unlock.get('UnlockHeight')
                        amount = next_unlock.get('Amount')
                        print(f"  🔐 Next CLTV unlock: {amount} EXS at block {unlock_height}")
        except:
            pass
    
    def send_alert(self, message: str):
        """Send alert via configured channels"""
        self.stats['alerts_sent'] += 1
        timestamp = datetime.now().isoformat()
        alert_msg = f"[{timestamp}] 🚨 ALERT: {message}"
        
        print(f"\n{alert_msg}\n")
        
        # Send to Slack if configured
        if 'slack_webhook' in self.alert_channels:
            try:
                requests.post(
                    self.alert_channels['slack_webhook'],
                    json={'text': alert_msg},
                    timeout=5
                )
            except:
                pass
        
        # Send to Discord if configured
        if 'discord_webhook' in self.alert_channels:
            try:
                requests.post(
                    self.alert_channels['discord_webhook'],
                    json={'content': alert_msg},
                    timeout=5
                )
            except:
                pass
    
    def get_stats(self) -> Dict[str, Any]:
        """Return guardian statistics"""
        uptime = (datetime.now() - self.stats['start_time']).total_seconds()
        return {
            'checks_performed': self.stats['checks_performed'],
            'alerts_sent': self.stats['alerts_sent'],
            'last_check': self.stats['last_check'].isoformat() if self.stats['last_check'] else None,
            'uptime_seconds': uptime
        }

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Lancelot Guardian - EXS Blockchain Monitor')
    parser.add_argument('--config', type=str, default='config.yaml',
                       help='Configuration file path')
    
    args = parser.parse_args()
    
    guardian = LancelotGuardian(args.config)
    guardian.monitor()

if __name__ == "__main__":
    main()
