#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Excalibur $EXS Protocol - Oracle API
-------------------------------------
Production-ready REST API for Oracle functionality

Provides endpoints for:
- Oracle queries and divination
- Forge validation
- Grail state management
- Blockchain monitoring

Author: Travis D. Jones <holedozer@icloud.com>
License: BSD 3-Clause
"""

from flask import Flask, request, jsonify, g
from flask_cors import CORS
import sys
import os
import logging
import time
from functools import wraps
from typing import Dict, Optional
import secrets
import hashlib
from datetime import datetime, timezone

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Import Oracle components
from pkg.oracle import (
    BlockchainLLM,
    ExcaliburOracle,
    DivinationEngine,
    OracleContext,
    GrailEnergyManager,
    BlockchainMonitor,
    EXCALIBUR_TRUTH
)

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s - %(pathname)s:%(lineno)d'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Configuration
app.config['JSON_SORT_KEYS'] = False
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max request size

# Configuration constants
MAX_QUERY_LENGTH = 500  # Maximum query length in characters

# Initialize Oracle components
oracle = ExcaliburOracle()
divination_engine = DivinationEngine()
grail_manager = GrailEnergyManager()
blockchain_monitor = BlockchainMonitor()
llm = BlockchainLLM()

# API Key management (in production, use env vars or secure storage)
# Default keys are only for development - in production, set via environment variables
_DEFAULT_DEV_KEY = 'dev_key_12345'
_DEFAULT_PUBLIC_KEY = 'public_key_67890'

if os.environ.get('ENV') == 'production':
    # In production, require API keys to be set via environment variables
    if not os.environ.get('ORACLE_API_KEY') or not os.environ.get('ORACLE_PUBLIC_KEY'):
        logger.error("Production mode requires ORACLE_API_KEY and ORACLE_PUBLIC_KEY environment variables")
        raise ValueError("API keys must be set via environment variables in production")

API_KEYS = {
    os.environ.get('ORACLE_API_KEY', _DEFAULT_DEV_KEY): 'admin',
    os.environ.get('ORACLE_PUBLIC_KEY', _DEFAULT_PUBLIC_KEY): 'public'
}

# Request tracking
request_count = 0
start_time = datetime.now(timezone.utc)


# ============================================================================
# Authentication & Rate Limiting
# ============================================================================

def require_api_key(required_role='public'):
    """Decorator to require API key authentication."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            api_key = request.headers.get('X-API-Key') or request.args.get('api_key')
            
            if not api_key:
                logger.warning(f"Missing API key for {request.path}")
                return jsonify({
                    'error': 'API key required',
                    'message': 'Please provide an API key via X-API-Key header or api_key parameter'
                }), 401
            
            if api_key not in API_KEYS:
                logger.warning(f"Invalid API key attempt: {api_key[:8]}...")
                return jsonify({'error': 'Invalid API key'}), 403
            
            user_role = API_KEYS[api_key]
            if required_role == 'admin' and user_role != 'admin':
                logger.warning(f"Insufficient permissions for {request.path}")
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            g.user_role = user_role
            g.api_key = api_key
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def log_request():
    """Log incoming request details."""
    global request_count
    request_count += 1
    
    logger.info(
        f"Request {request_count}: {request.method} {request.path} "
        f"from {request.remote_addr}"
    )


# ============================================================================
# Health & Status Endpoints
# ============================================================================

@app.route('/', methods=['GET'])
def root():
    """Root endpoint - welcome message and basic info."""
    log_request()
    return jsonify({
        'service': 'Excalibur $EXS Oracle API',
        'status': 'OPERATIONAL',
        'version': '1.0.0',
        'description': 'Production-ready REST API for Oracle functionality',
        'endpoints': {
            'health': '/health',
            'status': '/status (requires API key)',
            'oracle_query': '/oracle (POST, requires API key)',
            'divination': '/speak (POST, requires API key)',
            'forge_validation': '/validate (POST, requires API key)',
            'grail_state': '/grail (requires API key)',
            'blockchain_status': '/blockchain/status (requires API key)'
        },
        'documentation': 'Visit /health for service health check',
        'protocol': 'Excalibur $EXS',
        'timestamp': datetime.now(timezone.utc).isoformat()
    })


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    log_request()
    return jsonify({
        'status': 'healthy',
        'service': 'excalibur-oracle',
        'version': '1.0.0',
        'timestamp': datetime.now(timezone.utc).isoformat()
    })


@app.route('/status', methods=['GET'])
@require_api_key('public')
def status():
    """Get Oracle service status."""
    log_request()
    
    uptime = datetime.now(timezone.utc) - start_time
    
    return jsonify({
        'oracle_status': 'OPERATIONAL',
        'components': {
            'blockchain_llm': 'active',
            'oracle_operator': 'active',
            'divination_engine': 'active',
            'grail_manager': 'active',
            'blockchain_monitor': 'active'
        },
        'uptime_seconds': int(uptime.total_seconds()),
        'requests_processed': request_count,
        'taproot_address': EXCALIBUR_TRUTH['taproot_address'],
        'protocol_version': EXCALIBUR_TRUTH['protocol_version'],
        'timestamp': datetime.now(timezone.utc).isoformat()
    })


# ============================================================================
# Oracle Query Endpoints
# ============================================================================

@app.route('/oracle', methods=['POST'])
@require_api_key('public')
def oracle_query():
    """
    General oracle query endpoint.
    
    Request body:
    {
        "query": "How do I mine tokens?",
        "user_id": "optional_user_identifier"
    }
    """
    log_request()
    
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({'error': 'Query required'}), 400
        
        query = data['query']
        user_id = data.get('user_id')
        
        # Validate query length
        if len(query) > MAX_QUERY_LENGTH:
            return jsonify({'error': f'Query too long (max {MAX_QUERY_LENGTH} characters)'}), 400
        
        logger.info(f"Oracle query: {query[:50]}...")
        
        # Interpret query using divination engine
        interpretation = divination_engine.interpret_query(query)
        
        # Get additional protocol guidance if relevant
        context = interpretation['detected_context']
        guidance = None
        if context in ['mining', 'forge', 'vault', 'treasury', 'axiom']:
            guidance = oracle.get_protocol_guidance(context)
        
        response = {
            'query': query,
            'context': interpretation['detected_context'],
            'response': interpretation['response'],
            'wisdom': interpretation['wisdom'],
            'guidance': guidance,
            'timestamp': interpretation['timestamp']
        }
        
        logger.info(f"Oracle query processed: context={context}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error processing oracle query: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@app.route('/speak', methods=['POST'])
@require_api_key('public')
def speak():
    """
    Oracle divination endpoint - receive prophecy and wisdom.
    
    Request body:
    {
        "context": "mining|forge|quest|wisdom|prophecy|general",
        "user_id": "optional_user_identifier"
    }
    """
    log_request()
    
    try:
        data = request.get_json() or {}
        
        context_str = data.get('context', 'general')
        user_id = data.get('user_id')
        
        # Parse context
        try:
            context = OracleContext[context_str.upper()]
        except KeyError:
            context = OracleContext.GENERAL
        
        logger.info(f"Divination requested: context={context.value}, user={user_id}")
        
        # Generate divination
        divination = divination_engine.generate_divination(context, user_id)
        
        # Add oracle stats
        oracle_stats = oracle.get_oracle_stats()
        
        response = {
            'divination': divination,
            'oracle_status': oracle_stats['status'],
            'protocol_axiom_hash': oracle_stats['protocol_axiom_hash'],
            'message': 'The oracle has spoken'
        }
        
        logger.info(f"Divination delivered: prophecy_id={divination['prophecy_id']}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error generating divination: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


# ============================================================================
# Forge Validation Endpoints
# ============================================================================

@app.route('/validate', methods=['POST'])
@require_api_key('public')
def validate_forge():
    """
    Validate a forge attempt.
    
    Request body:
    {
        "axiom": "13-word axiom",
        "nonce": 12345,
        "hash": "forge hash result"
    }
    """
    log_request()
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        axiom = data.get('axiom')
        nonce = data.get('nonce')
        hash_result = data.get('hash')
        
        if not all([axiom, nonce is not None, hash_result]):
            return jsonify({
                'error': 'Missing required fields',
                'required': ['axiom', 'nonce', 'hash']
            }), 400
        
        logger.info(f"Forge validation: nonce={nonce}")
        
        # Validate forge using oracle
        validation_result = oracle.validate_forge(axiom, nonce, hash_result)
        
        # If valid, add energy to grail
        if validation_result['verdict'] == 'VALID':
            grail_result = grail_manager.add_forge_energy(nonce, hash_result)
            validation_result['grail_energy'] = grail_result
        
        logger.info(f"Forge validation complete: verdict={validation_result['verdict']}")
        return jsonify(validation_result)
        
    except Exception as e:
        logger.error(f"Error validating forge: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@app.route('/difficulty/check', methods=['POST'])
@require_api_key('public')
def check_difficulty():
    """
    Check if a hash meets difficulty requirements.
    
    Request body:
    {
        "hash": "hash to check",
        "difficulty": 4
    }
    """
    log_request()
    
    try:
        data = request.get_json()
        
        if not data or 'hash' not in data:
            return jsonify({'error': 'Hash required'}), 400
        
        hash_result = data['hash']
        difficulty = data.get('difficulty', 4)
        
        logger.info(f"Difficulty check: difficulty={difficulty}")
        
        # Check difficulty using oracle
        result = oracle.check_difficulty(hash_result, difficulty)
        
        logger.info(f"Difficulty check complete: verdict={result['verdict']}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error checking difficulty: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


# ============================================================================
# Grail Management Endpoints
# ============================================================================

@app.route('/grail', methods=['GET'])
@require_api_key('public')
def get_grail_state():
    """Get current Grail state."""
    log_request()
    
    try:
        logger.info("Grail state requested")
        
        state = grail_manager.get_grail_state()
        geometry = grail_manager.calculate_sacred_geometry()
        conditions = grail_manager.check_unlocking_conditions()
        
        response = {
            'grail_state': state,
            'sacred_geometry': geometry,
            'unlocking_conditions': conditions,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"Grail state delivered: state={state['state']}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error getting grail state: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@app.route('/grail/quest', methods=['POST'])
@require_api_key('public')
def advance_grail_quest():
    """
    Advance grail quest progression.
    
    Request body:
    {
        "quest_type": "knight_trial|dragon_slain",
        "user_id": "user_identifier"
    }
    """
    log_request()
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request body required'}), 400
        
        quest_type = data.get('quest_type')
        user_id = data.get('user_id', 'anonymous')
        
        if not quest_type:
            return jsonify({'error': 'quest_type required'}), 400
        
        logger.info(f"Quest advancement: type={quest_type}, user={user_id}")
        
        # Advance quest in grail manager
        grail_result = grail_manager.advance_quest(quest_type)
        
        # Also advance narrative in divination engine
        narrative_result = divination_engine.advance_quest_narrative(user_id, quest_type)
        
        response = {
            'grail_quest': grail_result,
            'narrative': narrative_result,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"Quest advanced: {quest_type}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error advancing quest: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


# ============================================================================
# Blockchain Monitoring Endpoints
# ============================================================================

@app.route('/blockchain/status', methods=['GET'])
@require_api_key('public')
def blockchain_status():
    """Get blockchain monitoring status."""
    log_request()
    
    try:
        logger.info("Blockchain status requested")
        
        stats = blockchain_monitor.get_monitoring_stats()
        recent_blocks = blockchain_monitor.get_recent_blocks(5)
        
        response = {
            'monitoring_stats': stats,
            'recent_blocks': [
                {
                    'height': b.height,
                    'hash': b.hash,
                    'inscriptions': b.inscriptions_found,
                    'prophecy': b.prophecy_detected
                }
                for b in recent_blocks
            ],
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        logger.info("Blockchain status delivered")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error getting blockchain status: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@app.route('/blockchain/inscriptions', methods=['GET'])
@require_api_key('public')
def search_inscriptions():
    """
    Search for inscriptions in a block range.
    
    Query parameters:
    - start_height: Starting block height
    - end_height: Ending block height
    """
    log_request()
    
    try:
        start_height = request.args.get('start_height', type=int)
        end_height = request.args.get('end_height', type=int)
        
        if not start_height or not end_height:
            return jsonify({
                'error': 'start_height and end_height required'
            }), 400
        
        if end_height - start_height > 1000:
            return jsonify({
                'error': 'Range too large (max 1000 blocks)'
            }), 400
        
        logger.info(f"Inscription search: {start_height} to {end_height}")
        
        inscriptions = blockchain_monitor.search_inscriptions(start_height, end_height)
        
        response = {
            'start_height': start_height,
            'end_height': end_height,
            'inscriptions_found': len(inscriptions),
            'inscriptions': inscriptions,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"Inscription search complete: found {len(inscriptions)}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error searching inscriptions: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


# ============================================================================
# Admin Endpoints
# ============================================================================

@app.route('/admin/stats', methods=['GET'])
@require_api_key('admin')
def admin_stats():
    """Get comprehensive admin statistics (requires admin API key)."""
    log_request()
    
    try:
        logger.info("Admin stats requested")
        
        oracle_stats = oracle.get_oracle_stats()
        divination_stats = divination_engine.get_divination_stats()
        grail_state = grail_manager.get_grail_state()
        blockchain_stats = blockchain_monitor.get_monitoring_stats()
        
        uptime = datetime.now(timezone.utc) - start_time
        
        response = {
            'service': {
                'uptime_seconds': int(uptime.total_seconds()),
                'requests_processed': request_count,
                'start_time': start_time.isoformat()
            },
            'oracle': oracle_stats,
            'divination': divination_stats,
            'grail': {
                'state': grail_state['state'],
                'energy_level': grail_state['energy_level'],
                'forges_witnessed': grail_state['forges_witnessed']
            },
            'blockchain': blockchain_stats,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        logger.info("Admin stats delivered")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error getting admin stats: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


# ============================================================================
# Error Handlers
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Endpoint not found',
        'message': 'The requested endpoint does not exist'
    }), 404


@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        'error': 'Method not allowed',
        'message': 'The HTTP method is not allowed for this endpoint'
    }), 405


@app.errorhandler(413)
def request_too_large(error):
    return jsonify({
        'error': 'Request too large',
        'message': 'Request body exceeds maximum size'
    }), 413


@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}", exc_info=True)
    return jsonify({
        'error': 'Internal server error',
        'message': 'An unexpected error occurred'
    }), 500


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == '__main__':
    # WARNING: This is for development/testing only!
    # In production, use gunicorn as specified in Dockerfile
    port = int(os.environ.get('PORT', 5001))
    host = os.environ.get('HOST', '127.0.0.1')
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    if os.environ.get('ENV') == 'production':
        logger.warning("Running Flask development server in production!")
        logger.warning("Use gunicorn instead: gunicorn --bind 0.0.0.0:5001 cmd.oracle-api.app:app")
    
    logger.info(f"Starting Oracle API on {host}:{port}")
    logger.info(f"Service start time: {start_time.isoformat()}")
    
    app.run(host=host, port=port, debug=debug)
