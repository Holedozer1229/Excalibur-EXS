/**
 * Merlin's Sanctum - Dashboard JavaScript
 * Cryptic Arthurian Admin Portal Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    initializeArcaneCanvas();
    initializeSanctumNavigation();
    initializeTreasuryScrying();
    initializeForgeWeight();
    initializeAnomalyMap();
    initializeAuthentication();
});

// Arcane Sigils Canvas
function initializeArcaneCanvas() {
    const canvas = document.getElementById('arcane-sigils');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const sigils = ['◈', '⚒', '🗺', '☿', '🜔', '⚚', '🜏'];
    const particles = [];
    
    class SigilParticle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.sigil = sigils[Math.floor(Math.random() * sigils.length)];
            this.speed = 0.1 + Math.random() * 0.3;
            this.opacity = 0.1 + Math.random() * 0.15;
            this.rotation = Math.random() * Math.PI * 2;
        }
        
        update() {
            this.y -= this.speed;
            this.rotation += 0.01;
            
            if (this.y < -30) {
                this.y = canvas.height + 30;
                this.x = Math.random() * canvas.width;
            }
        }
        
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.font = '24px serif';
            ctx.fillStyle = `rgba(74, 20, 140, ${this.opacity})`;
            ctx.fillText(this.sigil, 0, 0);
            ctx.restore();
        }
    }
    
    for (let i = 0; i < 20; i++) {
        particles.push(new SigilParticle());
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animate);
    }
    
    animate();
    
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// Navigation between scrying panels
function initializeSanctumNavigation() {
    const buttons = document.querySelectorAll('.sigil-btn');
    const panels = document.querySelectorAll('.scry-panel');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-scry');
            
            // Update active states
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            panels.forEach(p => p.classList.remove('active'));
            document.getElementById(`${target}-scry`).classList.add('active');
        });
    });
}

// Treasury Scrying
function initializeTreasuryScrying() {
    // Simulate treasury data
    updateTreasuryOrbs();
    drawTreasuryFlow();
    
    setInterval(updateTreasuryOrbs, 5000);
}

function updateTreasuryOrbs() {
    // Simulated data (replace with real API calls)
    const vaultValue = (Math.random() * 10).toFixed(8);
    const exsValue = Math.floor(Math.random() * 50000);
    const satoshiValue = Math.floor(Math.random() * 1000000);
    
    document.getElementById('total-vault').textContent = vaultValue;
    document.getElementById('exs-vault').textContent = exsValue.toLocaleString();
    document.getElementById('satoshi-flow').textContent = satoshiValue.toLocaleString();
}

function drawTreasuryFlow() {
    const canvas = document.getElementById('treasury-flow');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Generate flow data
    const dataPoints = 50;
    const data = [];
    for (let i = 0; i < dataPoints; i++) {
        data.push(Math.random() * 100 + 50);
    }
    
    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (height / 10) * i);
        ctx.lineTo(width, (height / 10) * i);
        ctx.stroke();
    }
    
    // Draw flow line
    ctx.beginPath();
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    
    const stepX = width / (dataPoints - 1);
    data.forEach((value, i) => {
        const x = i * stepX;
        const y = height - (value / 200) * height;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Draw glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#d4af37';
    ctx.stroke();
}

// Forge Weight Adjustment
function initializeForgeWeight() {
    const slider = document.getElementById('weight-slider');
    const indicator = document.getElementById('weight-indicator');
    const applyBtn = document.getElementById('apply-weight');
    
    if (!slider) return;
    
    slider.addEventListener('input', (e) => {
        indicator.textContent = e.target.value;
    });
    
    applyBtn.addEventListener('click', () => {
        const newWeight = slider.value;
        
        // Mystical confirmation
        const confirmation = confirm(
            `⚒ Cast the adjustment?\n\nNew Difficulty: ${newWeight} leading zeros\n\n"This will alter the flow of digital steel across the realm."`
        );
        
        if (confirmation) {
            document.getElementById('current-weight').textContent = newWeight;
            document.getElementById('last-adjustment').textContent = 'Just now';
            
            // Show success message
            showMysticalMessage('✓ The forge weight has been adjusted', 'emerald');
        }
    });
}

// Anomaly Map
function initializeAnomalyMap() {
    drawAnomalyMap();
    populateForgeChronicle();
    
    // Filter buttons
    const filters = document.querySelectorAll('.vision-filter');
    filters.forEach(btn => {
        btn.addEventListener('click', () => {
            filters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.getAttribute('data-filter');
            filterForgeChronicle(filter);
        });
    });
    
    setInterval(populateForgeChronicle, 10000);
}

function drawAnomalyMap() {
    const canvas = document.getElementById('anomaly-map');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Draw world map silhouette
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw forge locations
    const forges = [];
    for (let i = 0; i < 30; i++) {
        forges.push({
            x: Math.random() * width,
            y: Math.random() * height,
            active: Math.random() > 0.5,
        });
    }
    
    forges.forEach(forge => {
        ctx.beginPath();
        ctx.arc(forge.x, forge.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = forge.active ? '#50c878' : '#666';
        ctx.fill();
        
        if (forge.active) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#50c878';
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    });
}

function populateForgeChronicle() {
    const chronicle = document.getElementById('forge-chronicle');
    if (!chronicle) return;
    
    chronicle.innerHTML = '';
    
    // Generate simulated forge entries
    const statuses = ['⚔', '✓', '⏳'];
    const statusClasses = ['active', 'complete', 'pending'];
    
    for (let i = 0; i < 10; i++) {
        const statusIndex = Math.floor(Math.random() * statuses.length);
        const entry = document.createElement('div');
        entry.className = `chronicle-entry ${statusClasses[statusIndex]}`;
        
        const time = Math.floor(Math.random() * 60);
        const round = Math.floor(Math.random() * 128);
        
        entry.innerHTML = `
            <span class="entry-status">${statuses[statusIndex]}</span>
            <span class="entry-id">Forge #${String(i + 1).padStart(3, '0')}</span>
            <span class="entry-time">${time}m ago</span>
            <span class="entry-progress">Round ${round}/128</span>
        `;
        
        chronicle.appendChild(entry);
    }
}

function filterForgeChronicle(filter) {
    // Filter forge chronicle entries based on the selected filter
    const chronicle = document.getElementById('forge-chronicle');
    if (!chronicle) return;
    
    const entries = chronicle.querySelectorAll('.chronicle-entry');
    entries.forEach(entry => {
        if (filter === 'all') {
            entry.style.display = 'flex';
        } else {
            // Add filtering logic based on filter type
            entry.style.display = 'flex';
        }
    });
}

// Authentication
function initializeAuthentication() {
    const authVeil = document.getElementById('auth-veil');
    const authForm = document.getElementById('auth-form');
    const authKey = document.getElementById('auth-key');
    
    if (!authVeil || !authForm) return;
    
    // Check if already authenticated
    const isAuth = localStorage.getItem('merlin_auth');
    if (isAuth === 'true') {
        authVeil.classList.add('hidden');
        return;
    }
    
    // Show auth veil
    authVeil.classList.remove('hidden');
    
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const key = authKey.value.toLowerCase().trim();
        
        // Simple check (first word of axiom)
        if (key === 'sword') {
            localStorage.setItem('merlin_auth', 'true');
            authVeil.style.animation = 'fadeOut 0.5s';
            setTimeout(() => {
                authVeil.classList.add('hidden');
            }, 500);
        } else {
            authKey.value = '';
            authKey.style.borderColor = '#8b0000';
            setTimeout(() => {
                authKey.style.borderColor = '#4a148c';
            }, 1000);
        }
    });
}

// Utility: Show mystical message
function showMysticalMessage(message, color = 'gold') {
    const colors = {
        gold: '#d4af37',
        emerald: '#50c878',
        blood: '#8b0000',
    };
    
    const msg = document.createElement('div');
    msg.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.95);
        border: 3px solid ${colors[color]};
        padding: 30px 50px;
        color: ${colors[color]};
        font-size: 1.5em;
        z-index: 99999;
        text-align: center;
        box-shadow: 0 0 50px ${colors[color]};
        animation: fadeIn 0.3s;
    `;
    msg.textContent = message;
    
    document.body.appendChild(msg);
    
    setTimeout(() => {
        msg.style.animation = 'fadeOut 0.5s';
        setTimeout(() => msg.remove(), 500);
    }, 2000);
}

// Production Note: This admin portal requires proper server-side authentication
// The current client-side auth is for demonstration purposes only
