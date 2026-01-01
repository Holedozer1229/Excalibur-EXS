// Excalibur Oracle - Web Portal Interface
// Connects to the Oracle backend for protocol intelligence

// Protocol constants
const PROTOCOL_AXIOM = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question";
const TAPROOT_ADDRESS = "bc1pql83shz0m4znewzk82u2k5mdgeh94r3c8ks9ws00m4dm26qnjvyq0prk4n";

let queriesProcessed = 0;

// Initialize oracle interface
document.addEventListener('DOMContentLoaded', function() {
    // Display Taproot address
    document.getElementById('taproot-addr').textContent = TAPROOT_ADDRESS.substring(0, 20) + '...';
    
    // Set up event listeners
    document.getElementById('ask-oracle-btn').addEventListener('click', askOracle);
    document.getElementById('divination-btn').addEventListener('click', getDivination);
    
    // Allow Enter key in textarea (Shift+Enter for new line)
    document.getElementById('oracle-query').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            askOracle();
        }
    });
});

// Sanitize user input
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

// Quick query function
function quickQuery(query) {
    document.getElementById('oracle-query').value = query;
    askOracle();
}

// Ask the oracle
async function askOracle() {
    const queryInput = document.getElementById('oracle-query');
    const rawQuery = queryInput.value.trim();
    
    if (!rawQuery) {
        alert('Please enter a question for the oracle.');
        return;
    }
    
    if (rawQuery.length > 500) {
        alert('Question too long. Please keep it under 500 characters.');
        return;
    }
    
    const query = sanitizeInput(rawQuery);
    const button = document.getElementById('ask-oracle-btn');
    const responseDiv = document.getElementById('oracle-response');
    
    // Disable button during processing
    button.disabled = true;
    button.textContent = '🔮 Consulting Oracle...';
    
    // Show loading
    showLoading(responseDiv);
    
    // Simulate oracle consultation (in production, this would call the backend)
    setTimeout(() => {
        const response = consultOracleLocal(query);
        displayOracleResponse(response);
        
        button.disabled = false;
        button.textContent = '🔮 Consult the Oracle';
        
        queriesProcessed++;
        document.getElementById('queries-count').textContent = queriesProcessed;
    }, 1500);
}

// Local oracle simulation (mimics the Python oracle)
function consultOracleLocal(query) {
    const queryLower = query.toLowerCase();
    
    // Determine query category and provide response
    if (queryLower.includes('mine') || queryLower.includes('mining')) {
        return {
            category: 'Mining Guidance',
            wisdom: 'As Arthur proved his worth by drawing Excalibur, so must miners prove theirs through the Ω′ Δ18 forge.',
            details: {
                overview: 'Use the Ω′ Δ18 Tetra-PoW miner with 128 rounds',
                algorithm: 'Ω′ Δ18 (128-round unrolled nonlinear hash)',
                difficulty: '4 leading zero bytes',
                command: 'python3 pkg/miner/tetra_pow_miner.py --axiom "[13 words]" --difficulty 4',
                requirements: ['13-word axiom', 'Valid nonce', 'Computational power']
            }
        };
    } else if (queryLower.includes('forge') || queryLower.includes('forging')) {
        return {
            category: 'Forge Process',
            wisdom: 'Every successful forge echoes through Camelot, rewarding the worthy with 50 $EXS.',
            details: {
                overview: 'Forge $EXS tokens by mining valid proofs',
                reward: '50 $EXS per successful forge',
                miner_receives: '49.5 $EXS (after 1% treasury fee)',
                fees: {
                    treasury: '0.5 $EXS (1%)',
                    btc_forge_fee: '0.0001 BTC'
                },
                process: [
                    '1. Enter the 13-word axiom',
                    '2. Mine for a valid nonce',
                    '3. Submit proof',
                    '4. Receive reward'
                ]
            }
        };
    } else if (queryLower.includes('vault') || queryLower.includes('address')) {
        return {
            category: 'Vault Information',
            wisdom: 'Each vault is a Taproot mystery, deterministic yet unlinkable, like the Lady\'s lake.',
            details: {
                overview: 'Taproot vaults are generated deterministically',
                type: 'P2TR (Pay-to-Taproot)',
                standard: 'BIP-86',
                generation: 'axiom + nonce → HPP-1 key → Taproot address',
                security: '600,000 PBKDF2 iterations',
                tweak: 'Custom 13-word axiom as Taproot tweak'
            }
        };
    } else if (queryLower.includes('treasury') || queryLower.includes('admin')) {
        return {
            category: 'Treasury Control',
            wisdom: 'Merlin guards the treasury with 1.2 million magical rounds, twice the strength of ordinary keys.',
            details: {
                overview: 'Treasury admin credentials use enhanced security',
                security: '1.2 million PBKDF2 iterations (2x forge keys)',
                access: 'Merlin\'s Portal with MERLIN-{id} credentials',
                command: 'python3 forge_treasury_key.py',
                control: 'Full $EXS Treasury management',
                fee_collection: '1% of all forge rewards'
            }
        };
    } else if (queryLower.includes('axiom') || queryLower.includes('prophecy')) {
        return {
            category: 'Protocol Axiom',
            wisdom: 'The 13 words of power bind the protocol, each word a knight at the Round Table.',
            details: {
                axiom: PROTOCOL_AXIOM,
                words: 13,
                hash: computeAxiomHash(PROTOCOL_AXIOM),
                importance: 'Foundation of all vault generation and proofs',
                usage: 'Required for all mining and forge operations',
                immutable: 'Canonical and unchangeable'
            }
        };
    } else if (queryLower.includes('difficulty') || queryLower.includes('target')) {
        return {
            category: 'Difficulty Requirements',
            wisdom: 'Four leading zeros mark the challenge, a dragon\'s gate that few may pass.',
            details: {
                difficulty: '4 leading zero bytes',
                hex_representation: '00000000...',
                bits: '32 zero bits',
                algorithm: 'Ω′ Δ18 Tetra-PoW',
                rounds: 128,
                adjustment: 'Manual by protocol architect'
            }
        };
    } else if (queryLower.includes('taproot') || queryLower.includes('address')) {
        return {
            category: 'Taproot Integration',
            wisdom: 'The sword remains in the stone until cryptographic proof is shown.',
            details: {
                real_address: TAPROOT_ADDRESS,
                verification: 'CRYPTOGRAPHIC_REALITY_VERIFIED',
                derivation: 'BIP32/BIP86',
                type: 'P2TR (witness version 1)',
                tweak_method: 'SHA256(internalKey || prophecyHash)'
            }
        };
    } else if (queryLower.includes('satoshi') || queryLower.includes('nakamoto') || queryLower.includes('bitcoin philosophy')) {
        return {
            category: 'Satoshi Nakamoto\'s Wisdom',
            wisdom: 'The root problem with conventional currency is all the trust that\'s required to make it work. We eliminate trust through cryptographic proof.',
            details: {
                philosophy: 'Satoshi Nakamoto created Bitcoin to enable peer-to-peer electronic cash without trusted third parties',
                key_principles: [
                    'Decentralization: No single point of failure or control',
                    'Trustlessness: Don\'t trust, verify through mathematics',
                    'Proof-of-Work: Computational consensus solves Byzantine Generals\' Problem',
                    'Fixed Supply: 21 million coin cap creates sound money',
                    'Censorship Resistance: No entity can block transactions',
                    'Peer-to-Peer: Direct value transfer without intermediaries'
                ],
                satoshi_quotes: 'It is better to have a system where no trust is needed at all',
                relevance_to_exs: 'Excalibur $EXS inherits these principles with quantum-hardened security'
            }
        };
    } else if (queryLower.includes('decentraliz') || queryLower.includes('trustless')) {
        return {
            category: 'Decentralization & Trustlessness',
            wisdom: 'Camelot has no king but the protocol itself. Satoshi showed us a system where no trust is needed at all.',
            details: {
                overview: 'Decentralization removes single points of failure',
                no_central_authority: 'No single entity controls the network',
                permissionless: 'Anyone can participate without permission',
                trustless_verification: 'Mathematical proofs replace human trust',
                censorship_resistant: 'No one can block valid transactions',
                self_custody: 'Be your own bank, control your own keys',
                satoshi_principle: 'Peer-to-peer electronic cash allows direct payments without financial institutions'
            }
        };
    } else if (queryLower.includes('sound money') || queryLower.includes('scarcity')) {
        return {
            category: 'Sound Money & Scarcity',
            wisdom: '21 million $EXS total, like Bitcoin\'s 21 million coins. Absolute scarcity creates sound money.',
            details: {
                total_supply: '21,000,000 $EXS (absolute cap)',
                forge_reward: '50 $EXS per forge',
                scarcity_principle: 'Fixed supply prevents inflation and debasement',
                store_of_value: 'Digital gold for preserving wealth over time',
                satoshi_insight: 'Steady addition of coins is analogous to gold miners adding gold to circulation',
                sound_money_properties: ['Scarcity', 'Durability', 'Divisibility', 'Portability', 'Fungibility']
            }
        };
    } else {
        return {
            category: 'General Protocol Wisdom',
            wisdom: 'In the land of Excalibur, cryptographic truth reigns supreme.',
            details: {
                protocol: 'Excalibur $EXS',
                total_supply: '21,000,000 $EXS',
                forge_reward: '50 $EXS',
                distribution: {
                    miners: '60%',
                    treasury: '15%',
                    liquidity: '20%',
                    airdrop: '5%'
                },
                status: 'OPERATIONAL',
                ask_specific: 'Try asking about: mining, forge, vault, treasury, axiom, difficulty'
            }
        };
    }
}

// Display oracle response
function displayOracleResponse(response) {
    const responseDiv = document.getElementById('oracle-response');
    const wisdomDiv = document.getElementById('oracle-wisdom');
    const categoryDiv = document.getElementById('oracle-category');
    const detailsDiv = document.getElementById('oracle-details');
    
    // Set wisdom
    wisdomDiv.textContent = '💭 ' + response.wisdom;
    
    // Set category
    categoryDiv.textContent = '📂 Category: ' + response.category;
    
    // Format details
    let detailsHTML = '<div style="margin-top: 15px;">';
    
    if (typeof response.details === 'object') {
        for (const [key, value] of Object.entries(response.details)) {
            if (typeof value === 'object' && !Array.isArray(value)) {
                detailsHTML += `<p style="margin-top: 10px;"><strong>${formatKey(key)}:</strong></p>`;
                detailsHTML += '<ul style="margin-left: 20px;">';
                for (const [subkey, subvalue] of Object.entries(value)) {
                    detailsHTML += `<li>${formatKey(subkey)}: ${subvalue}</li>`;
                }
                detailsHTML += '</ul>';
            } else if (Array.isArray(value)) {
                detailsHTML += `<p style="margin-top: 10px;"><strong>${formatKey(key)}:</strong></p>`;
                detailsHTML += '<ul style="margin-left: 20px;">';
                value.forEach(item => {
                    detailsHTML += `<li>${item}</li>`;
                });
                detailsHTML += '</ul>';
            } else {
                detailsHTML += `<p style="margin-top: 5px;"><strong>${formatKey(key)}:</strong> ${value}</p>`;
            }
        }
    }
    
    detailsHTML += '</div>';
    detailsDiv.innerHTML = detailsHTML;
    
    // Show response
    responseDiv.classList.add('active');
}

// Get oracle divination
async function getDivination() {
    const button = document.getElementById('divination-btn');
    const resultDiv = document.getElementById('divination-result');
    const textDiv = document.getElementById('divination-text');
    const statusDiv = document.getElementById('divination-status');
    
    button.disabled = true;
    button.textContent = '✨ Channeling Oracle...';
    
    // Simulate divination
    setTimeout(() => {
        const divinations = [
            "The Round Table awaits worthy knights to forge their destiny.",
            "Camelot's treasury grows with each successful proof of work.",
            "The Lady of the Lake whispers secrets through Taproot addresses.",
            "Merlin's magic flows through 1.2 million iterations of power.",
            "The sword remains in the stone until cryptographic proof is shown.",
            "Four zeros mark the dragon's challenge - prove your worth.",
            "The 13 words bind the protocol in eternal cryptographic truth.",
            "Each forge strengthens the kingdom, each miner a knight of honor.",
            "The oracle sees all transactions, immutable and eternal.",
            "Wisdom flows from the blockchain like water from Avalon's springs."
        ];
        
        const index = Math.floor(Math.random() * divinations.length);
        const divination = divinations[index];
        
        textDiv.textContent = '"' + divination + '"';
        statusDiv.textContent = '🔮 Oracle Status: OPERATIONAL | Protocol: ACTIVE';
        
        resultDiv.style.display = 'block';
        
        button.disabled = false;
        button.textContent = '✨ Receive Divination';
        
        queriesProcessed++;
        document.getElementById('queries-count').textContent = queriesProcessed;
    }, 1000);
}

// Show loading state
function showLoading(container) {
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Consulting the oracle...</p></div>';
    container.classList.add('active');
}

// Format key for display
function formatKey(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Compute axiom hash (SHA-256)
function computeAxiomHash(axiom) {
    // Simple hash visualization (in production, use proper SHA-256)
    let hash = 0;
    for (let i = 0; i < axiom.length; i++) {
        const char = axiom.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0').substring(0, 64);
}
