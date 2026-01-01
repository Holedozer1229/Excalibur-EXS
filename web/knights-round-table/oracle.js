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
    } else if (queryLower.includes('jolly roger') || queryLower.includes('pirate flag')) {
        return {
            category: 'The Jolly Roger - Symbol of Freedom',
            wisdom: 'The Jolly Roger flew as a symbol of freedom from tyranny. Like pirates who rejected empire, crypto rejects central banking control.',
            details: {
                symbol: 'Skull and crossbones - the famous black flag of pirates',
                meaning: 'Symbol of freedom, sovereignty, and defiance of central authority',
                history: 'Pirates operated outside government control, creating their own economies and rules',
                parallel_to_crypto: 'Like pirates who rejected nation-state authority, crypto rejects central banking control',
                freedom: 'The black flag represented freedom from tyranny and oppressive maritime law',
                democratic_crews: 'Pirate ships were surprisingly democratic - crews voted on major decisions',
                treasure_seeking: 'Pirates sought treasure freely, much like miners seek cryptographic gold',
                sovereignty: 'Pirates were sovereign individuals on the high seas, crypto provides financial sovereignty',
                legend: 'The Jolly Roger struck fear in centralized naval powers, just as Bitcoin challenges central banks',
                crypto_connection: 'Both pirates and crypto enthusiasts value freedom, self-governance, and resistance to authority'
            }
        };
    } else if (queryLower.includes('pirate') || queryLower.includes('blackbeard') || queryLower.includes('anne bonny')) {
        return {
            category: 'Famous Pirates & Their Money-Making Strategies',
            wisdom: 'Pirates created democratic, sovereign economies on the high seas. Crypto creates sovereign financial systems in cyberspace.',
            details: {
                overview: 'Famous pirates who mastered wealth creation outside government control',
                bartholomew_roberts: 'Black Bart Roberts - Most successful pirate ever, captured over 400 ships worth millions. STRATEGY: Systematic approach to piracy - targeted richest shipping lanes, efficient operations.',
                ching_shih: 'Ching Shih - Commanded 1,800 ships and 80,000 pirates. MONEY STRATEGY: Created organized pirate confederation with taxation system, protection rackets, controlled entire South China Sea trade, negotiated amnesty keeping fortune.',
                henry_avery: 'Henry Avery - Pulled off richest pirate raid ever worth $200+ million today. STRATEGY: Captured Mughal treasure ship with gems, gold, silver - vanished with fortune, never caught.',
                henry_morgan: 'Henry Morgan - Amassed fortune of £100,000+, became Lieutenant Governor. STRATEGY: Raided Spanish treasure fleets, reinvested in legitimate businesses and real estate, retired wealthy.',
                blackbeard: 'Edward Teach (Blackbeard) - MONEY STRATEGY: Built terrifying reputation with smoking beard fuses - targets surrendered without fight, preserving cargo value. Made fortune through intimidation over combat.',
                jean_lafitte: 'Jean Lafitte - MONEY STRATEGY: Ran sophisticated smuggling operation avoiding customs duties, sold goods below legal prices, made fortune in black market trade.',
                money_lessons: [
                    'Prize Capture: Pirates captured merchant vessels with valuable cargo - gold, silver, spices, weapons',
                    'Protection Rackets: Charged merchant ships fees to sail safely through controlled waters',
                    'Ransom Operations: Held wealthy passengers for ransom, blockaded ports demanding payment',
                    'Reputation as Asset: Fearsome reputation reduced resistance, preserved cargo value',
                    'Diversification: Successful pirates invested in legitimate businesses and land',
                    'Low Overhead: No taxes, no regulations - high profit margins',
                    'Risk Management: Smart pirates knew when to fight, intimidate, or negotiate'
                ],
                crypto_parallel: 'Like pirates who created profitable alternative economies outside government control, crypto creates wealth outside central banking systems through mining, DeFi, and sovereign finance.'
            }
        };
    } else if (queryLower.includes('pirate money') || queryLower.includes('pirate wealth') || queryLower.includes('pirate treasure')) {
        return {
            category: 'Pirate Money-Making Strategies',
            wisdom: 'Pirates made fortunes through prize capture, protection rackets, and alternative economies. Crypto creates wealth through mining, staking, and decentralized finance.',
            details: {
                overview: 'How pirates created wealth outside traditional economic systems',
                prize_capture: 'Captured merchant vessels loaded with valuable cargo - gold, silver, spices, cloth, rum, weapons',
                treasure_fleets: 'Targeted Spanish treasure fleets carrying New World gold and silver to Europe',
                ransom_operations: 'Held wealthy passengers for ransom, blockaded ports demanding payment',
                protection_rackets: 'Charged merchant ships protection fees to sail safely through pirate-controlled waters',
                smuggling_networks: 'Operated sophisticated smuggling operations avoiding customs duties and taxes',
                port_raids: 'Raided wealthy coastal towns and settlements for gold, jewels, and supplies',
                ship_resale: 'Captured ships were sold or added to pirate fleets, multiplying earning potential',
                insider_information: 'Paid informants in ports revealed richest cargo ships and their routes',
                economies_of_scale: 'Pirate confederations like Ching Shih\'s created large-scale organized economies',
                low_overhead: 'No taxes, no regulations, minimal crew wages - high profit margins',
                diversification: 'Successful pirates invested in legitimate businesses, land, and trading operations',
                reputation_value: 'Fearsome reputation reduced resistance, preserved cargo value, saved ammunition',
                profit_sharing: 'Democratic treasure division kept crews loyal and motivated',
                crypto_lessons: [
                    'Alternative Economies: Pirates created economies outside government control, like crypto creates finance outside central banks',
                    'Decentralized Operations: Pirate crews were democratic and self-governing, like DAOs',
                    'Value Capture: Pirates captured value from monopolistic trade routes, crypto captures value from monopolistic financial systems',
                    'Network Effects: Larger pirate confederations were more powerful, like larger crypto networks',
                    'Smart Contracts: Pirate codes and articles were binding agreements, like smart contracts on blockchain'
                ]
            }
        };
    } else if (queryLower.includes('pirate code') || queryLower.includes('pirate philosophy')) {
        return {
            category: 'Pirate Code & Philosophy',
            wisdom: 'Pirates governed themselves by code and consensus. Crypto governance flows from protocol and community.',
            details: {
                overview: 'Pirates created surprisingly democratic and fair systems at sea',
                democracy: 'Pirate crews voted on major decisions, captains could be deposed by vote',
                equality: 'All crew members were equal - rank determined by skill, not birthright',
                profit_sharing: 'Treasure divided fairly among crew based on agreed shares',
                code_of_conduct: 'Pirates had written articles governing behavior and compensation',
                mutual_aid: 'Pirates provided insurance for injuries - wounded members received compensation',
                meritocracy: 'Skill and courage determined rank and respect',
                freedom: 'Pirates chose freedom over exploitation by merchant companies and navies',
                autonomy: 'Ships operated as independent sovereign entities on the high seas',
                parallel: 'Pirate self-governance mirrors crypto\'s decentralized governance and consensus mechanisms',
                legend: 'The pirate code was their protocol, enforced by consensus - much like blockchain protocols today'
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
                ask_specific: 'Try asking about: mining, forge, vault, treasury, axiom, difficulty, Satoshi Nakamoto, Jolly Roger, pirates, pirate money-making, pirate wealth, pirate treasure'
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
            "Wisdom flows from the blockchain like water from Avalon's springs.",
            "The Jolly Roger flies over decentralized seas - freedom reigns supreme.",
            "Like pirates of old, crypto sailors navigate beyond the reach of empire.",
            "Pirates governed by code and consensus, as does the blockchain.",
            "The treasure of sovereignty lies in controlling your own keys.",
            "Blackbeard's legend lives on in every sovereign transaction.",
            "Ching Shih commanded 80,000 pirates - DeFi commands millions of participants.",
            "Pirates captured value from monopolistic trade routes - crypto captures value from monopolistic banks.",
            "Bartholomew Roberts took 400 ships - blockchain takes infinite value from centralized systems.",
            "Henry Avery's $200 million heist was legendary - Bitcoin's market cap is legendary.",
            "Pirates made fortunes outside the system - so do crypto miners and HODLers."
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
