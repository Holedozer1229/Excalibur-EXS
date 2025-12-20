// Merlin's Portal - Admin Dashboard JavaScript

// Panel Navigation
const navButtons = document.querySelectorAll('.nav-btn');
const panels = document.querySelectorAll('.panel');

navButtons.forEach(button => {
    button.addEventListener('click', () => {
        const targetPanel = button.getAttribute('data-panel');
        
        // Remove active class from all buttons and panels
        navButtons.forEach(btn => btn.classList.remove('active'));
        panels.forEach(panel => panel.classList.remove('active'));
        
        // Add active class to clicked button and corresponding panel
        button.classList.add('active');
        document.getElementById(`${targetPanel}-panel`).classList.add('active');
    });
});

// Treasury Monitoring
function updateTreasuryStats() {
    // Simulated data - in production, this would fetch from backend API
    const treasury = {
        totalBTC: (Math.random() * 10).toFixed(8),
        exsReserved: Math.floor(Math.random() * 1000000),
        satoshiFees: Math.floor(Math.random() * 100000000)
    };
    
    document.getElementById('total-treasury').textContent = treasury.totalBTC;
    document.getElementById('exs-reserved').textContent = treasury.exsReserved.toLocaleString();
    document.getElementById('satoshi-fees').textContent = treasury.satoshiFees.toLocaleString();
}

// Difficulty Adjustment
const difficultySlider = document.getElementById('difficulty-slider');
const difficultyDisplay = document.getElementById('difficulty-display');
const applyDifficultyBtn = document.getElementById('apply-difficulty');
const currentDifficultyValue = document.getElementById('current-difficulty');

difficultySlider.addEventListener('input', (e) => {
    difficultyDisplay.textContent = e.target.value;
});

applyDifficultyBtn.addEventListener('click', () => {
    const newDifficulty = difficultySlider.value;
    currentDifficultyValue.textContent = newDifficulty;
    
    // Simulate API call to update difficulty
    alert(`Difficulty adjusted to ${newDifficulty}. This change will affect all new forges.`);
    
    // Update average forge time based on difficulty
    const forgeTimeMinutes = newDifficulty * 2.5;
    document.getElementById('avg-forge-time').textContent = `~${forgeTimeMinutes.toFixed(1)} minutes`;
});

// Anomaly Map Filters
const filterButtons = document.querySelectorAll('.filter-btn');

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        const filter = button.getAttribute('data-filter');
        filterForgeActivity(filter);
    });
});

function filterForgeActivity(filter) {
    // In production, this would filter the forge list based on status
    console.log(`Filtering forge activity by: ${filter}`);
}

// Forge Activity Simulation
function generateForgeActivity() {
    const forgeList = document.getElementById('forge-activity-list');
    const statuses = ['active', 'completed'];
    const randomForges = [];
    
    for (let i = 1; i <= 10; i++) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const timeAgo = Math.floor(Math.random() * 60);
        
        randomForges.push(`
            <li class="forge-item">
                <span class="forge-status ${status}">●</span>
                <span class="forge-id">Forge #${String(i).padStart(3, '0')}</span>
                <span class="forge-time">${timeAgo}m ago</span>
            </li>
        `);
    }
    
    forgeList.innerHTML = randomForges.join('');
}

// Canvas Initialization for Charts
function initializeCharts() {
    // Treasury Chart
    const treasuryCanvas = document.getElementById('treasury-chart');
    if (treasuryCanvas) {
        const ctx = treasuryCanvas.getContext('2d');
        ctx.fillStyle = '#4682b4';
        ctx.fillText('Treasury growth chart would be rendered here', 20, 150);
        // In production, integrate with Chart.js or similar library
    }
    
    // Anomaly Map Canvas
    const anomalyCanvas = document.getElementById('anomaly-canvas');
    if (anomalyCanvas) {
        const ctx = anomalyCanvas.getContext('2d');
        ctx.fillStyle = '#00ff88';
        ctx.fillText('Global forge map visualization would be rendered here', 20, 200);
        // In production, implement interactive forge tracking visualization
    }
}

// Initialize Dashboard
function initializeDashboard() {
    updateTreasuryStats();
    generateForgeActivity();
    initializeCharts();
    
    // Auto-refresh treasury stats every 10 seconds
    setInterval(updateTreasuryStats, 10000);
}

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeDashboard);
