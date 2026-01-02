from flask import Flask, request, jsonify
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

try:
    from miners.tetra_pow_python.tetra_pow_miner import TetraPowMiner
except ImportError:
    # Fallback to legacy import path for compatibility
    from pkg.miner.tetra_pow_miner import TetraPowMiner

from pkg.foundry.exs_foundry import ExsFoundry
from pkg.revenue.revenue_manager import RevenueManager
from pkg.oracle.oracle_operator import ExcaliburOracle
from pkg.emporium.emporium_endpoints import create_emporium_api

app = Flask(__name__)

# Initialize components
miner = TetraPowMiner(difficulty=4)
foundry = ExsFoundry()
revenue_manager = RevenueManager()
oracle = ExcaliburOracle()  # Initialize Oracle

# Initialize Emporium of Man API
emporium_api = create_emporium_api(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'service': 'excalibur-forge'})

@app.route('/mine', methods=['POST'])
def mine():
    """Execute Ω′ Δ18 mining."""
    data = request.get_json()
    axiom = data.get('axiom', '')
    difficulty = data.get('difficulty', 4)
    
    if not axiom:
        return jsonify({'error': 'Axiom required'}), 400
    
    # Update difficulty if provided
    if difficulty != miner.difficulty:
        miner = TetraPowMiner(difficulty=difficulty)
    
    # Mine
    success, nonce, hash_value, states = miner.mine(axiom)
    
    if not success:
        return jsonify({'error': 'Mining failed'}), 500
    
    return jsonify({
        'success': True,
        'nonce': nonce,
        'hash': hash_value,
        'difficulty': difficulty,
        'rounds': len(states)
    })

@app.route('/forge', methods=['POST'])
def forge():
    """Process complete forge operation."""
    data = request.get_json()
    axiom = data.get('axiom', '')
    nonce = data.get('nonce')
    forge_hash = data.get('hash', '')
    
    if not all([axiom, nonce is not None, forge_hash]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Process forge
    result = foundry.process_forge(axiom, nonce, forge_hash)
    
    return jsonify(result)

@app.route('/treasury/stats', methods=['GET'])
def treasury_stats():
    """Get foundry treasury statistics."""
    return jsonify(foundry.get_treasury_stats())

@app.route('/revenue/stats', methods=['GET'])
def revenue_stats():
    """Get revenue operations statistics."""
    return jsonify(revenue_manager.get_revenue_stats())

@app.route('/revenue/calculate', methods=['POST'])
def calculate_revenue():
    """Calculate user rewards based on parameters."""
    from decimal import Decimal
    
    data = request.get_json()
    user_stake = Decimal(str(data.get('user_stake', '0')))
    total_staked = Decimal(str(data.get('total_staked', '1')))
    forge_count = int(data.get('forge_count', 0))
    holding_months = int(data.get('holding_months', 0))
    is_lp = bool(data.get('is_lp', False))
    
    reward = revenue_manager.calculate_user_rewards(
        user_stake, total_staked, forge_count, holding_months, is_lp
    )
    
    return jsonify({
        'user_stake': str(user_stake),
        'total_staked': str(total_staked),
        'forge_count': forge_count,
        'holding_months': holding_months,
        'is_lp': is_lp,
        'calculated_reward': str(reward)
    })

@app.route('/revenue/process', methods=['POST'])
def process_revenue():
    """Process revenue from a stream."""
    from decimal import Decimal
    
    data = request.get_json()
    stream_name = data.get('stream')
    amount = Decimal(str(data.get('amount', '0')))
    currency = data.get('currency', '$EXS')
    
    if not stream_name or amount <= 0:
        return jsonify({'error': 'Invalid stream or amount'}), 400
    
    try:
        result = revenue_manager.process_revenue(stream_name, amount, currency)
        return jsonify(result)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@app.route('/oracle', methods=['GET'])
def oracle_endpoint():
    """
    Get Oracle status, prophecies, and Grail information.
    
    Returns comprehensive Oracle state including ergotropy level,
    prophecy generation, and Grail achievement status.
    """
    try:
        # Generate a divine message
        prophecy = oracle.divine_message()
        
        # Get Oracle stats
        stats = oracle.get_oracle_stats()
        
        # Check Grail status
        grail_status = oracle.check_grail_status()
        
        # Monitor Genesis inscriptions
        genesis_monitoring = oracle.monitor_genesis_inscriptions()
        
        return jsonify({
            'oracle': {
                'name': stats['oracle_name'],
                'status': stats['status'],
                'ergotropy_state': stats['ergotropy_state'],
                'uptime': stats['uptime']
            },
            'prophecy': prophecy,
            'statistics': {
                'queries_processed': stats['queries_processed'],
                'prophecies_delivered': stats['prophecies_delivered'],
                'forges_validated': stats['forges_validated']
            },
            'grail': grail_status,
            'genesis_monitoring': genesis_monitoring,
            'timestamp': stats['timestamp']
        })
    except Exception as e:
        # Robust error handling
        return jsonify({
            'error': 'Oracle encountered an error',
            'message': str(e),
            'status': 'ERROR'
        }), 500

@app.route('/speak', methods=['GET', 'POST'])
def speak_endpoint():
    """
    Oracle speaks - delivers dynamic prophecy announcements.
    
    GET: Returns a random divine message
    POST: Allows for custom prophecy queries with optional context
    """
    try:
        if request.method == 'POST':
            data = request.get_json() or {}
            query = data.get('query', '')
            include_grail = data.get('include_grail', False)
            
            # Input validation - check before stripping
            if query:
                if len(query) > 1000:
                    return jsonify({
                        'error': 'Query must be less than 1000 characters'
                    }), 400
                if not query.strip():
                    return jsonify({
                        'error': 'Query cannot be empty or only whitespace'
                    }), 400
            
            # If query provided, interpret it
            if query:
                interpretation = oracle.interpret_prophecy(query.strip())
                response = {
                    'type': 'prophecy_interpretation',
                    'query': query.strip(),
                    'interpretation': interpretation
                }
            else:
                # Otherwise, provide a divine message
                response = {
                    'type': 'divine_message',
                    'message': oracle.divine_message()
                }
            
            # Add Grail status if requested
            if include_grail:
                grail_status = oracle.check_grail_status()
                response['grail'] = grail_status
                
                if grail_status['grail_unlocked']:
                    response['special_announcement'] = "🏆 The Holy Grail has been unlocked! The Oracle's power reaches its zenith!"
        else:
            # GET request - simple divine message
            response = {
                'type': 'divine_message',
                'message': oracle.divine_message(),
                'wisdom': oracle.llm.generate_wisdom('prophecy')
            }
        
        # Always include ergotropy state
        response['ergotropy_state'] = oracle.ergotropy_state
        response['timestamp'] = oracle.get_oracle_stats()['timestamp']
        
        return jsonify(response)
    except Exception as e:
        # Robust error handling
        return jsonify({
            'error': 'Oracle speech failed',
            'message': str(e),
            'status': 'ERROR'
        }), 500

@app.route('/oracle/validate', methods=['POST'])
def oracle_validate():
    """
    Validate a forge using Oracle intelligence.
    """
    try:
        data = request.get_json()
        axiom = data.get('axiom', '')
        nonce = data.get('nonce')
        hash_result = data.get('hash', '')
        
        if not all([axiom, nonce is not None, hash_result]):
            return jsonify({'error': 'Missing required fields: axiom, nonce, hash'}), 400
        
        # Validate using Oracle
        result = oracle.validate_forge(axiom, nonce, hash_result)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({
            'error': 'Validation failed',
            'message': str(e)
        }), 500

@app.route('/oracle/grail', methods=['GET'])
def grail_status():
    """
    Get detailed Grail quest status.
    """
    try:
        grail_status = oracle.check_grail_status()
        return jsonify(grail_status)
    except Exception as e:
        return jsonify({
            'error': 'Failed to retrieve Grail status',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    # WARNING: This is for development/testing only!
    # In production, use gunicorn as specified in Dockerfile.forge
    port = int(os.environ.get('PORT', 5000))
    host = '127.0.0.1' if os.environ.get('ENV') != 'production' else '0.0.0.0'
    
    if os.environ.get('ENV') == 'production':
        print("WARNING: Running Flask development server in production!")
        print("Use gunicorn instead: gunicorn --bind 0.0.0.0:5000 cmd.forge-api.app:app")
    
    app.run(host=host, port=port, debug=False)
