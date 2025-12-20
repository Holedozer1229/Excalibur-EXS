// The Knights' Round Table - Public Forge UI JavaScript

const CORRECT_AXIOM = "sword legend pull magic kingdom artist stone destroy forget fire steel honey question";

// DOM Elements
const axiomInput = document.getElementById('axiom-input');
const verifyAxiomBtn = document.getElementById('verify-axiom');
const axiomStatus = document.getElementById('axiom-status');
const drawSwordBtn = document.getElementById('draw-sword-btn');
const forgeStatus = document.getElementById('forge-status');
const excalibur = document.getElementById('excalibur');
const miningViz = document.getElementById('mining-viz');
const forgeResults = document.getElementById('forge-results');
const forgeAgainBtn = document.getElementById('forge-again-btn');

let axiomVerified = false;

// Axiom Verification
verifyAxiomBtn.addEventListener('click', () => {
    const userAxiom = axiomInput.value.trim().toLowerCase();
    const normalizedCorrectAxiom = CORRECT_AXIOM.toLowerCase();
    
    if (userAxiom === normalizedCorrectAxiom) {
        axiomVerified = true;
        axiomStatus.textContent = '✓ Prophecy Verified! You may now draw the sword.';
        axiomStatus.className = 'status-message success';
        drawSwordBtn.disabled = false;
        forgeStatus.textContent = 'Ready to Forge. Draw the Sword to begin!';
        forgeStatus.style.color = 'var(--success-green)';
    } else {
        axiomVerified = false;
        axiomStatus.textContent = '✗ Incorrect Prophecy. Speak the true Axiom to proceed.';
        axiomStatus.className = 'status-message error';
        drawSwordBtn.disabled = true;
    }
});

// Draw Sword (Start Mining)
drawSwordBtn.addEventListener('click', () => {
    if (!axiomVerified) return;
    
    // Animate sword drawing
    excalibur.classList.add('drawn');
    drawSwordBtn.style.display = 'none';
    forgeStatus.textContent = 'The sword has been drawn! Initiating Ω′ Δ18 mining...';
    
    // Start mining visualization after animation
    setTimeout(() => {
        startMining();
    }, 1500);
});

// Mining Process
function startMining() {
    // Hide forge section, show mining visualization
    document.querySelector('.forge-section').style.display = 'none';
    miningViz.style.display = 'block';
    
    // Initialize rounds grid
    initializeRoundsGrid();
    
    // Simulate mining process
    simulateMining();
}

function initializeRoundsGrid() {
    const roundsGrid = document.getElementById('rounds-grid');
    roundsGrid.innerHTML = '';
    
    for (let i = 0; i < 128; i++) {
        const cell = document.createElement('div');
        cell.className = 'round-cell';
        cell.id = `round-${i}`;
        roundsGrid.appendChild(cell);
    }
}

function simulateMining() {
    let currentRound = 0;
    const totalRounds = 128;
    const roundDuration = 100; // milliseconds per round
    
    const miningInterval = setInterval(() => {
        if (currentRound >= totalRounds) {
            clearInterval(miningInterval);
            completeMining();
            return;
        }
        
        // Update progress
        updateMiningProgress(currentRound, totalRounds);
        
        // Activate current round cell
        const cell = document.getElementById(`round-${currentRound}`);
        if (cell) {
            cell.classList.add('active');
            
            // Mark as complete after a short delay
            setTimeout(() => {
                cell.classList.remove('active');
                cell.classList.add('complete');
            }, roundDuration * 0.8);
        }
        
        currentRound++;
    }, roundDuration);
}

function updateMiningProgress(current, total) {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const currentRoundDisplay = document.getElementById('current-round');
    const hashRateDisplay = document.getElementById('hash-rate');
    
    const percentage = (current / total) * 100;
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${current} / ${total} Rounds`;
    currentRoundDisplay.textContent = current;
    
    // Simulate hash rate
    const hashRate = Math.floor(Math.random() * 1000) + 500;
    hashRateDisplay.textContent = `${hashRate} H/s`;
}

function completeMining() {
    // Final progress update
    updateMiningProgress(128, 128);
    
    // Wait a moment, then show results
    setTimeout(() => {
        showForgeResults();
    }, 1000);
}

function showForgeResults() {
    miningViz.style.display = 'none';
    forgeResults.style.display = 'block';
    
    // Generate random P2TR address (simplified for demo)
    const p2trAddress = generateP2TRAddress();
    document.getElementById('p2tr-address').textContent = p2trAddress;
    
    // Generate random block height
    const blockHeight = Math.floor(Math.random() * 100000) + 700000;
    document.getElementById('block-height').textContent = blockHeight.toLocaleString();
}

function generateP2TRAddress() {
    // Simplified P2TR address generation for demo
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    let address = 'bc1p';
    for (let i = 0; i < 58; i++) {
        address += chars[Math.floor(Math.random() * chars.length)];
    }
    return address;
}

// Forge Again
forgeAgainBtn.addEventListener('click', () => {
    // Reset everything
    resetForge();
});

function resetForge() {
    // Hide results
    forgeResults.style.display = 'none';
    
    // Show and reset forge section
    const forgeSection = document.querySelector('.forge-section');
    forgeSection.style.display = 'block';
    
    // Reset sword
    excalibur.classList.remove('drawn');
    
    // Reset button and status
    drawSwordBtn.style.display = 'inline-block';
    drawSwordBtn.disabled = false;
    forgeStatus.textContent = 'Ready to Forge. Draw the Sword to begin!';
    forgeStatus.style.color = 'var(--success-green)';
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Knights\' Round Table initialized');
    console.log('Axiom:', CORRECT_AXIOM);
});
