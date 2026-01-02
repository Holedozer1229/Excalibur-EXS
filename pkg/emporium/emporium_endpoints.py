#!/usr/bin/env python3
"""
Emporium API Endpoints - REST API for Emporium of Man functionality

This module provides Flask-compatible API endpoints for the Emporium of Man system,
including Sovereign Vault operations, Grail status, and blockchain monitoring.

Endpoints:
- GET  /emporium/status - Get system status
- POST /emporium/execute - Execute Emporium operations
- GET  /emporium/vault/<vault_id> - Get vault details
- POST /emporium/vault/create - Create new vault
- POST /emporium/vault/<vault_id>/deposit - Deposit to vault
- POST /emporium/vault/<vault_id>/withdraw - Withdraw from vault
- GET  /emporium/inscriptions - Get prophecy inscriptions
- POST /emporium/inscriptions/record - Record new inscription
- GET  /emporium/leaderboard - Get Grail leaderboard

Author: Travis D. Jones <holedozer@gmail.com>
License: BSD 3-Clause
Copyright (c) 2025, Travis D. Jones
"""

import logging
from typing import Dict, Any
from decimal import Decimal
from flask import Blueprint, request, jsonify
from functools import wraps

from .blockchain_monitor import BlockchainMonitor
from .grail_logic import GrailLogic


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EmporiumAPI:
    """
    API handler for Emporium of Man endpoints.
    
    Provides RESTful endpoints for vault management, Grail system,
    and blockchain monitoring.
    """
    
    def __init__(self, blockchain_monitor: BlockchainMonitor = None, grail_logic: GrailLogic = None):
        """
        Initialize the Emporium API.
        
        Args:
            blockchain_monitor: BlockchainMonitor instance (optional, creates new if None)
            grail_logic: GrailLogic instance (optional, creates new if None)
        """
        self.blockchain_monitor = blockchain_monitor or BlockchainMonitor()
        self.grail_logic = grail_logic or GrailLogic()
        self.blueprint = self._create_blueprint()
        
        logger.info("EmporiumAPI initialized")
    
    def _create_blueprint(self) -> Blueprint:
        """Create Flask blueprint with all endpoints."""
        bp = Blueprint('emporium', __name__, url_prefix='/emporium')
        
        # Register routes
        bp.add_url_rule('/status', 'status', self.get_status, methods=['GET'])
        bp.add_url_rule('/execute', 'execute', self.execute_operation, methods=['POST'])
        bp.add_url_rule('/vault/<vault_id>', 'get_vault', self.get_vault, methods=['GET'])
        bp.add_url_rule('/vault/create', 'create_vault', self.create_vault, methods=['POST'])
        bp.add_url_rule('/vault/<vault_id>/deposit', 'deposit', self.deposit, methods=['POST'])
        bp.add_url_rule('/vault/<vault_id>/withdraw', 'withdraw', self.withdraw, methods=['POST'])
        bp.add_url_rule('/vault/<vault_id>/forge', 'record_forge', self.record_forge, methods=['POST'])
        bp.add_url_rule('/vault/<vault_id>/prophecy', 'record_prophecy', self.record_prophecy, methods=['POST'])
        bp.add_url_rule('/inscriptions', 'get_inscriptions', self.get_inscriptions, methods=['GET'])
        bp.add_url_rule('/inscriptions/record', 'record_inscription', self.record_inscription, methods=['POST'])
        bp.add_url_rule('/events', 'get_events', self.get_events, methods=['GET'])
        bp.add_url_rule('/leaderboard', 'get_leaderboard', self.get_leaderboard, methods=['GET'])
        
        return bp
    
    def get_blueprint(self) -> Blueprint:
        """Get the Flask blueprint for registration."""
        return self.blueprint
    
    def get_status(self) -> Dict[str, Any]:
        """
        GET /emporium/status
        
        Get overall Emporium system status.
        
        Returns:
            JSON response with system status
        """
        try:
            blockchain_status = self.blockchain_monitor.get_status()
            
            # Get vault statistics
            total_vaults = len(self.grail_logic.vaults)
            total_balance = sum(v.balance for v in self.grail_logic.vaults.values())
            total_ergotropy = sum(v.ergotropy for v in self.grail_logic.vaults.values())
            
            return jsonify({
                'success': True,
                'status': 'operational',
                'blockchain': blockchain_status,
                'vaults': {
                    'total': total_vaults,
                    'total_balance': str(total_balance),
                    'total_ergotropy': str(total_ergotropy),
                },
                'achievements': len(self.grail_logic.achievements),
                'quests': len(self.grail_logic.quests),
            })
        except Exception as e:
            logger.error(f"Error getting status: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    def execute_operation(self) -> Dict[str, Any]:
        """
        POST /emporium/execute
        
        Execute various Emporium operations.
        
        Request body:
        {
            "operation": "forge|prophecy|deposit|withdraw",
            "vault_id": "...",
            "params": {...}
        }
        
        Returns:
            JSON response with operation result
        """
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({'success': False, 'error': 'No data provided'}), 400
            
            operation = data.get('operation')
            vault_id = data.get('vault_id')
            params = data.get('params', {})
            
            if not operation:
                return jsonify({'success': False, 'error': 'Operation not specified'}), 400
            
            # Route to appropriate handler
            if operation == 'forge':
                return self._execute_forge(vault_id)
            elif operation == 'prophecy':
                return self._execute_prophecy(vault_id, params)
            elif operation == 'deposit':
                return self._execute_deposit(vault_id, params)
            elif operation == 'withdraw':
                return self._execute_withdraw(vault_id, params)
            else:
                return jsonify({'success': False, 'error': f'Unknown operation: {operation}'}), 400
                
        except Exception as e:
            logger.error(f"Error executing operation: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    def _execute_forge(self, vault_id: str) -> Dict[str, Any]:
        """Execute forge operation."""
        if not vault_id:
            return jsonify({'success': False, 'error': 'Vault ID required'}), 400
        
        success, ergotropy = self.grail_logic.record_forge(vault_id)
        
        if not success:
            return jsonify({'success': False, 'error': 'Failed to record forge'}), 400
        
        return jsonify({
            'success': True,
            'operation': 'forge',
            'ergotropy_gained': str(ergotropy),
        })
    
    def _execute_prophecy(self, vault_id: str, params: Dict) -> Dict[str, Any]:
        """Execute prophecy inscription operation."""
        if not vault_id:
            return jsonify({'success': False, 'error': 'Vault ID required'}), 400
        
        success, ergotropy = self.grail_logic.record_prophecy(vault_id)
        
        if not success:
            return jsonify({'success': False, 'error': 'Failed to record prophecy'}), 400
        
        return jsonify({
            'success': True,
            'operation': 'prophecy',
            'ergotropy_gained': str(ergotropy),
        })
    
    def _execute_deposit(self, vault_id: str, params: Dict) -> Dict[str, Any]:
        """Execute deposit operation."""
        if not vault_id:
            return jsonify({'success': False, 'error': 'Vault ID required'}), 400
        
        amount = params.get('amount')
        if not amount:
            return jsonify({'success': False, 'error': 'Amount required'}), 400
        
        try:
            amount = Decimal(str(amount))
        except:
            return jsonify({'success': False, 'error': 'Invalid amount'}), 400
        
        success = self.grail_logic.deposit(vault_id, amount)
        
        if not success:
            return jsonify({'success': False, 'error': 'Failed to deposit'}), 400
        
        return jsonify({
            'success': True,
            'operation': 'deposit',
            'amount': str(amount),
        })
    
    def _execute_withdraw(self, vault_id: str, params: Dict) -> Dict[str, Any]:
        """Execute withdraw operation."""
        if not vault_id:
            return jsonify({'success': False, 'error': 'Vault ID required'}), 400
        
        amount = params.get('amount')
        if not amount:
            return jsonify({'success': False, 'error': 'Amount required'}), 400
        
        try:
            amount = Decimal(str(amount))
        except:
            return jsonify({'success': False, 'error': 'Invalid amount'}), 400
        
        success = self.grail_logic.withdraw(vault_id, amount)
        
        if not success:
            return jsonify({'success': False, 'error': 'Failed to withdraw'}), 400
        
        return jsonify({
            'success': True,
            'operation': 'withdraw',
            'amount': str(amount),
        })
    
    def get_vault(self, vault_id: str) -> Dict[str, Any]:
        """
        GET /emporium/vault/<vault_id>
        
        Get detailed vault information.
        
        Args:
            vault_id: The vault ID
            
        Returns:
            JSON response with vault details
        """
        try:
            vault_status = self.grail_logic.get_vault_status(vault_id)
            
            if not vault_status:
                return jsonify({'success': False, 'error': 'Vault not found'}), 404
            
            return jsonify({
                'success': True,
                'data': vault_status,
            })
        except Exception as e:
            logger.error(f"Error getting vault: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    def create_vault(self) -> Dict[str, Any]:
        """
        POST /emporium/vault/create
        
        Create a new Sovereign Vault.
        
        Request body:
        {
            "owner_address": "bc1p..."
        }
        
        Returns:
            JSON response with new vault details
        """
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({'success': False, 'error': 'No data provided'}), 400
            
            owner_address = data.get('owner_address')
            
            if not owner_address:
                return jsonify({'success': False, 'error': 'Owner address required'}), 400
            
            # Check if vault already exists for this owner
            existing_vault = self.grail_logic.get_vault_by_owner(owner_address)
            if existing_vault:
                return jsonify({
                    'success': False,
                    'error': 'Vault already exists for this address',
                    'vault_id': existing_vault.vault_id,
                }), 400
            
            # Create vault
            vault = self.grail_logic.create_vault(owner_address)
            
            return jsonify({
                'success': True,
                'vault': vault.to_dict(),
            })
        except Exception as e:
            logger.error(f"Error creating vault: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    def deposit(self, vault_id: str) -> Dict[str, Any]:
        """
        POST /emporium/vault/<vault_id>/deposit
        
        Deposit $EXS to a vault.
        
        Request body:
        {
            "amount": "100.0"
        }
        
        Returns:
            JSON response with deposit result
        """
        return self._execute_deposit(vault_id, request.get_json() or {})
    
    def withdraw(self, vault_id: str) -> Dict[str, Any]:
        """
        POST /emporium/vault/<vault_id>/withdraw
        
        Withdraw $EXS from a vault.
        
        Request body:
        {
            "amount": "50.0"
        }
        
        Returns:
            JSON response with withdrawal result
        """
        return self._execute_withdraw(vault_id, request.get_json() or {})
    
    def record_forge(self, vault_id: str) -> Dict[str, Any]:
        """
        POST /emporium/vault/<vault_id>/forge
        
        Record a forge completion.
        
        Returns:
            JSON response with forge result
        """
        return self._execute_forge(vault_id)
    
    def record_prophecy(self, vault_id: str) -> Dict[str, Any]:
        """
        POST /emporium/vault/<vault_id>/prophecy
        
        Record a prophecy inscription.
        
        Returns:
            JSON response with prophecy result
        """
        return self._execute_prophecy(vault_id, {})
    
    def get_inscriptions(self) -> Dict[str, Any]:
        """
        GET /emporium/inscriptions?limit=100&confirmed_only=false
        
        Get prophecy inscriptions.
        
        Query params:
        - limit: Maximum number of inscriptions (default: 100)
        - confirmed_only: Only confirmed inscriptions (default: false)
        
        Returns:
            JSON response with inscriptions list
        """
        try:
            limit = int(request.args.get('limit', 100))
            confirmed_only = request.args.get('confirmed_only', 'false').lower() == 'true'
            
            inscriptions = self.blockchain_monitor.get_inscriptions(
                limit=limit,
                confirmed_only=confirmed_only
            )
            
            return jsonify({
                'success': True,
                'inscriptions': [i.to_dict() for i in inscriptions],
                'count': len(inscriptions),
            })
        except Exception as e:
            logger.error(f"Error getting inscriptions: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    def record_inscription(self) -> Dict[str, Any]:
        """
        POST /emporium/inscriptions/record
        
        Record a new prophecy inscription.
        
        Request body:
        {
            "axiom": "sword legend...",
            "vault_address": "bc1p...",
            "txid": "...",
            "block_height": 12345 (optional)
        }
        
        Returns:
            JSON response with inscription details
        """
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({'success': False, 'error': 'No data provided'}), 400
            
            axiom = data.get('axiom')
            vault_address = data.get('vault_address')
            txid = data.get('txid')
            block_height = data.get('block_height')
            
            if not all([axiom, vault_address, txid]):
                return jsonify({'success': False, 'error': 'Missing required fields'}), 400
            
            # Validate transaction
            if not self.blockchain_monitor.validate_transaction(txid):
                return jsonify({'success': False, 'error': 'Invalid transaction ID'}), 400
            
            # Record inscription
            inscription = self.blockchain_monitor.record_prophecy_inscription(
                axiom=axiom,
                vault_address=vault_address,
                txid=txid,
                block_height=block_height
            )
            
            return jsonify({
                'success': True,
                'inscription': inscription.to_dict(),
            })
        except Exception as e:
            logger.error(f"Error recording inscription: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    def get_events(self) -> Dict[str, Any]:
        """
        GET /emporium/events?limit=50
        
        Get recent blockchain events.
        
        Query params:
        - limit: Maximum number of events (default: 50)
        
        Returns:
            JSON response with events list
        """
        try:
            limit = int(request.args.get('limit', 50))
            
            events = self.blockchain_monitor.get_recent_events(limit=limit)
            
            return jsonify({
                'success': True,
                'events': [e.to_dict() for e in events],
                'count': len(events),
            })
        except Exception as e:
            logger.error(f"Error getting events: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    def get_leaderboard(self) -> Dict[str, Any]:
        """
        GET /emporium/leaderboard?metric=ergotropy&limit=10
        
        Get Grail leaderboard.
        
        Query params:
        - metric: Ranking metric (ergotropy, balance, forges, prophecies)
        - limit: Number of entries (default: 10)
        
        Returns:
            JSON response with leaderboard
        """
        try:
            metric = request.args.get('metric', 'ergotropy')
            limit = int(request.args.get('limit', 10))
            
            leaderboard = self.grail_logic.get_leaderboard(metric=metric, limit=limit)
            
            return jsonify({
                'success': True,
                'metric': metric,
                'leaderboard': leaderboard,
            })
        except Exception as e:
            logger.error(f"Error getting leaderboard: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500


def create_emporium_api(app, blockchain_monitor=None, grail_logic=None):
    """
    Create and register Emporium API endpoints with a Flask app.
    
    Args:
        app: Flask application instance
        blockchain_monitor: Optional BlockchainMonitor instance
        grail_logic: Optional GrailLogic instance
        
    Returns:
        EmporiumAPI instance
    """
    emporium_api = EmporiumAPI(blockchain_monitor, grail_logic)
    app.register_blueprint(emporium_api.get_blueprint())
    
    logger.info("Emporium API registered with Flask app")
    return emporium_api
