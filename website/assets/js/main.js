// EXCALIBUR $EXS - Axiomatically Arthurian & Cryptic JavaScript

document.addEventListener('DOMContentLoaded', () => {
    initializeRunicCanvas();
    initializeMysticalEffects();
    initializeScrollRevelations();
    initializeAxiomInteraction();
});

// Runic Canvas Background
function initializeRunicCanvas() {
    const canvas = document.getElementById('rune-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Elder Futhark runes for the 13 words
    const runes = ['ᛋ', 'ᛚ', 'ᛈ', 'ᛗ', 'ᚲ', 'ᚨ', 'ᛊ', 'ᛞ', 'ᚠ', 'ᚠ', 'ᛊ', 'ᚺ', 'ᚲ'];
    const particles = [];
    
    class RuneParticle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.rune = runes[Math.floor(Math.random() * runes.length)];
            this.speed = 0.2 + Math.random() * 0.5;
            this.opacity = 0.1 + Math.random() * 0.2;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.02;
        }
        
        update() {
            this.y -= this.speed;
            this.rotation += this.rotationSpeed;
            
            if (this.y < -50) {
                this.y = canvas.height + 50;
                this.x = Math.random() * canvas.width;
            }
        }
        
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.font = '30px "UnifrakturCook", serif';
            ctx.fillStyle = `rgba(212, 175, 55, ${this.opacity})`;
            ctx.fillText(this.rune, 0, 0);
            ctx.restore();
        }
    }
    
    // Create particles
    for (let i = 0; i < 30; i++) {
        particles.push(new RuneParticle());
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
    
    // Resize handler
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// Mystical Effects
function initializeMysticalEffects() {
    // Smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Navigation transformation on scroll
    const nav = document.querySelector('.ethereal-nav');
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            nav.style.background = 'linear-gradient(180deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.7) 100%)';
            nav.style.boxShadow = '0 5px 30px rgba(212, 175, 55, 0.3)';
        } else {
            nav.style.background = 'linear-gradient(180deg, rgba(0, 0, 0, 0.9) 0%, transparent 100%)';
            nav.style.boxShadow = 'none';
        }
        
        lastScroll = currentScroll;
    });
    
    // Cursor trail effect
    createMysticalCursor();
}

// Mystical cursor trail
function createMysticalCursor() {
    const trail = [];
    const trailLength = 12;
    
    document.addEventListener('mousemove', (e) => {
        trail.push({
            x: e.clientX,
            y: e.clientY,
            life: trailLength
        });
        
        if (trail.length > trailLength) {
            trail.shift();
        }
    });
    
    function drawTrail() {
        const existingTrails = document.querySelectorAll('.cursor-trail');
        existingTrails.forEach(el => el.remove());
        
        trail.forEach((point, index) => {
            if (point.life > 0) {
                const dot = document.createElement('div');
                dot.className = 'cursor-trail';
                dot.style.cssText = `
                    position: fixed;
                    width: 4px;
                    height: 4px;
                    background: rgba(212, 175, 55, ${point.life / trailLength});
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 9999;
                    left: ${point.x}px;
                    top: ${point.y}px;
                    box-shadow: 0 0 10px rgba(212, 175, 55, ${point.life / trailLength});
                `;
                document.body.appendChild(dot);
                
                point.life--;
                
                setTimeout(() => dot.remove(), 50);
            }
        });
        
        requestAnimationFrame(drawTrail);
    }
    
    drawTrail();
}

// Scroll-based revelations
function initializeScrollRevelations() {
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                
                // Trigger word rune animations
                if (entry.target.classList.contains('word-rune')) {
                    const delay = parseInt(entry.target.getAttribute('data-word')) * 100;
                    setTimeout(() => {
                        entry.target.style.animation = 'reveal-rune 0.8s ease-out forwards';
                    }, delay);
                }
            }
        });
    }, observerOptions);
    
    // Observe elements
    const elements = document.querySelectorAll(`
        .alchemical-process,
        .portal-gateway,
        .codex-entry,
        .word-rune
    `);
    
    elements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(50px)';
        el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        observer.observe(el);
    });
    
    // Add rune reveal animation
    if (!document.getElementById('reveal-animation')) {
        const style = document.createElement('style');
        style.id = 'reveal-animation';
        style.textContent = `
            @keyframes reveal-rune {
                0% {
                    transform: rotateY(90deg) scale(0.8);
                    opacity: 0;
                }
                50% {
                    transform: rotateY(0deg) scale(1.1);
                }
                100% {
                    transform: rotateY(0deg) scale(1);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Axiom Interaction
function initializeAxiomInteraction() {
    const wordRunes = document.querySelectorAll('.word-rune');
    const axiomSequence = [];
    
    wordRunes.forEach(rune => {
        rune.addEventListener('click', function() {
            const word = this.textContent;
            const wordNum = parseInt(this.getAttribute('data-word'));
            
            // Add to sequence
            axiomSequence.push({ word, wordNum });
            
            // Visual feedback
            this.style.border = '2px solid rgba(255, 215, 0, 0.8)';
            this.style.boxShadow = '0 0 30px rgba(255, 215, 0, 0.6)';
            this.style.transform = 'scale(1.05)';
            
            // Check if complete
            if (axiomSequence.length === 13) {
                verifyAxiomSequence(axiomSequence);
            }
            
            // Reset after delay
            setTimeout(() => {
                if (axiomSequence.length < 13) {
                    this.style.border = '2px solid var(--bronze-aged)';
                    this.style.boxShadow = 'none';
                    this.style.transform = 'scale(1)';
                }
            }, 2000);
        });
        
        // Hover effect showing cipher
        rune.addEventListener('mouseenter', function() {
            const cipher = this.getAttribute('data-cipher');
            showCipherTooltip(this, cipher);
        });
        
        rune.addEventListener('mouseleave', function() {
            hideCipherTooltip();
        });
    });
}

function showCipherTooltip(element, cipher) {
    const tooltip = document.createElement('div');
    tooltip.id = 'cipher-tooltip';
    tooltip.style.cssText = `
        position: fixed;
        background: rgba(0, 0, 0, 0.95);
        border: 2px solid #d4af37;
        padding: 15px 25px;
        font-size: 2em;
        color: #d4af37;
        pointer-events: none;
        z-index: 10000;
        font-family: "UnifrakturCook", cursive;
        box-shadow: 0 0 30px rgba(212, 175, 55, 0.6);
        transition: opacity 0.3s;
    `;
    tooltip.textContent = cipher;
    document.body.appendChild(tooltip);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
}

function hideCipherTooltip() {
    const tooltip = document.getElementById('cipher-tooltip');
    if (tooltip) {
        tooltip.style.opacity = '0';
        setTimeout(() => tooltip.remove(), 300);
    }
}

function verifyAxiomSequence(sequence) {
    // Check if words are in correct order
    const correctOrder = sequence.every((item, index) => item.wordNum === index + 1);
    
    if (correctOrder) {
        showAxiomSuccess();
    } else {
        showAxiomFailure();
    }
}

function showAxiomSuccess() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        animation: fadeIn 0.5s;
    `;
    
    overlay.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 8em; color: #ffd700; text-shadow: 0 0 50px rgba(255, 215, 0, 0.8); margin-bottom: 30px;">
                ⚔️
            </div>
            <h2 style="font-family: 'UnifrakturCook', cursive; font-size: 3em; color: #d4af37; margin-bottom: 20px; letter-spacing: 0.2em;">
                THE AXIOM IS TRUE
            </h2>
            <p style="font-size: 1.5em; color: #c0c0c0; font-style: italic; margin-bottom: 40px;">
                The XIII words have been spoken in sequence.<br/>
                The vault opens. The forge awaits.
            </p>
            <a href="/web/knights-round-table/" style="
                display: inline-block;
                padding: 20px 50px;
                border: 3px solid #d4af37;
                background: rgba(212, 175, 55, 0.2);
                color: #ffd700;
                text-decoration: none;
                font-size: 1.3em;
                letter-spacing: 0.2em;
                margin-top: 20px;
            ">
                ENTER THE ROUND TABLE
            </a>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add close on click
    overlay.addEventListener('click', () => {
        overlay.style.animation = 'fadeOut 0.5s';
        setTimeout(() => overlay.remove(), 500);
    });
    
    // Add animations
    if (!document.getElementById('overlay-animations')) {
        const style = document.createElement('style');
        style.id = 'overlay-animations';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

function showAxiomFailure() {
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(139, 0, 0, 0.95);
        border: 3px solid #8b0000;
        padding: 40px;
        z-index: 99999;
        text-align: center;
        font-size: 1.5em;
        color: #c0c0c0;
        box-shadow: 0 0 50px rgba(139, 0, 0, 0.8);
    `;
    
    message.innerHTML = `
        <p style="font-family: 'UnifrakturCook', cursive; font-size: 1.5em; margin-bottom: 20px; color: #ff6b6b;">
            The sequence is broken.
        </p>
        <p style="font-style: italic;">
            Speak the XIII words in their true order.
        </p>
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.style.animation = 'fadeOut 0.5s';
        setTimeout(() => message.remove(), 500);
    }, 3000);
}

// Portal effects
document.querySelectorAll('.portal-gateway').forEach(portal => {
    portal.addEventListener('mouseenter', function() {
        const sigil = this.querySelector('.sigil-ring');
        if (sigil) {
            sigil.style.animationDuration = '10s';
        }
    });
    
    portal.addEventListener('mouseleave', function() {
        const sigil = this.querySelector('.sigil-ring');
        if (sigil) {
            sigil.style.animationDuration = '30s';
        }
    });
});

// Track mystical events
function trackMysticalEvent(eventName, data) {
    console.log(`⚔️ Mystical Event: ${eventName}`, data);
    // Analytics integration would go here
}

// Track portal entries
document.querySelectorAll('.portal-enter').forEach(link => {
    link.addEventListener('click', function(e) {
        const portalName = this.closest('.portal-gateway').classList.contains('knights-gate')
            ? 'Knights Round Table'
            : 'Merlins Sanctum';
        trackMysticalEvent('portal_crossed', { portal: portalName });
    });
});

// Konami code easter egg - reveals hidden rune
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-10);
    
    if (konamiCode.join(',') === konamiSequence.join(',')) {
        revealSecretRune();
    }
});

function revealSecretRune() {
    const secret = document.createElement('div');
    secret.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 10em;
        color: #d4af37;
        text-shadow: 0 0 100px rgba(212, 175, 55, 1);
        font-family: "UnifrakturCook", cursive;
        z-index: 99999;
        animation: rotate-slow 20s linear infinite, fadeOut 5s ease-out forwards;
    `;
    secret.textContent = 'ᛟ'; // Othala - the hidden rune of inheritance
    document.body.appendChild(secret);
    
    setTimeout(() => secret.remove(), 5000);
}

console.log('%c⚔️ EXCALIBUR $EXS ⚔️', 'font-size: 24px; color: #d4af37; font-weight: bold;');
console.log('%cThe XIII Words: sword legend pull magic kingdom artist stone destroy forget fire steel honey question', 'font-size: 14px; color: #c0c0c0; font-style: italic;');
console.log('%cΩ′ Δ18 Tetra-PoW • HPP-1 • 128 Rounds', 'font-size: 12px; color: #4a148c;');
