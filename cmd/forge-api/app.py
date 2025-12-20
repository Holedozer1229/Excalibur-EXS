from flask import Flask, request, jsonify
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from pkg.miner.tetra_pow_miner import TetraPowMiner
from pkg.foundry.exs_foundry import ExsFoundry
from pkg.revenue.revenue_manager import RevenueManager

app = Flask(__name__)

# Initialize components
miner = TetraPowMiner(difficulty=4)
foundry = ExsFoundry()
revenue_manager = RevenueManager()

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

if __name__ == '__main__':
    # WARNING: This is for development/testing only!
    # In production, use gunicorn as specified in Dockerfile.forge
    port = int(os.environ.get('PORT', 5000))
    host = '127.0.0.1' if os.environ.get('ENV') != 'production' else '0.0.0.0'
    
    if os.environ.get('ENV') == 'production':
        print("WARNING: Running Flask development server in production!")
        print("Use gunicorn instead: gunicorn --bind 0.0.0.0:5000 cmd.forge-api.app:app")
    
    app.run(host=host, port=port, debug=False)
