#!/usr/bin/env python3
"""
Quick test script to verify Emporium API endpoints

This script tests the basic functionality of the Emporium of Man API.
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from pkg.emporium import BlockchainMonitor, GrailLogic, EmporiumAPI


def test_blockchain_monitor():
    """Test BlockchainMonitor functionality."""
    print("🧪 Testing BlockchainMonitor...")
    
    monitor = BlockchainMonitor(network='testnet')
    
    # Test recording inscription
    inscription = monitor.record_prophecy_inscription(
        axiom="sword legend pull magic kingdom artist stone destroy forget fire steel honey question",
        vault_address="bc1p_test_address",
        txid="a" * 64,
        block_height=12345
    )
    
    assert inscription.inscription_id
    assert inscription.confirmed
    print(f"  ✅ Created inscription: {inscription.inscription_id}")
    
    # Test getting status
    status = monitor.get_status()
    assert status['total_inscriptions'] == 1
    print(f"  ✅ Monitor status: {status['total_inscriptions']} inscription(s)")
    
    print("✅ BlockchainMonitor tests passed!\n")


def test_grail_logic():
    """Test GrailLogic functionality."""
    print("🧪 Testing GrailLogic...")
    
    grail = GrailLogic()
    
    # Test creating vault
    vault = grail.create_vault(owner_address="bc1p_test_owner")
    assert vault.vault_id
    print(f"  ✅ Created vault: {vault.vault_id}")
    
    # Test forge recording
    success, ergotropy = grail.record_forge(vault.vault_id)
    assert success
    assert ergotropy > 0
    print(f"  ✅ Recorded forge: gained {ergotropy} ergotropy")
    
    # Test vault status
    status = grail.get_vault_status(vault.vault_id)
    assert status is not None
    assert status['vault']['total_forges'] == 1
    print(f"  ✅ Vault status retrieved: {status['vault']['total_forges']} forge(s)")
    
    print("✅ GrailLogic tests passed!\n")


def test_emporium_api():
    """Test EmporiumAPI initialization."""
    print("🧪 Testing EmporiumAPI...")
    
    api = EmporiumAPI()
    blueprint = api.get_blueprint()
    
    assert blueprint.name == 'emporium'
    assert blueprint.url_prefix == '/emporium'
    print(f"  ✅ API blueprint created: {blueprint.url_prefix}")
    
    # Get status (without Flask app context, just verify method exists)
    assert hasattr(api, 'get_status')
    assert hasattr(api, 'create_vault')
    assert hasattr(api, 'get_vault')
    print("  ✅ All endpoint methods exist")
    
    print("✅ EmporiumAPI tests passed!\n")


def main():
    """Run all tests."""
    print("=" * 60)
    print("🏛️  EMPORIUM OF MAN - INTEGRATION TESTS")
    print("=" * 60 + "\n")
    
    try:
        test_blockchain_monitor()
        test_grail_logic()
        test_emporium_api()
        
        print("=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)
        return 0
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
