const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const titleDisplay = document.getElementById('title');
const difficultyDisplay = document.getElementById('difficulty');
const clipboardMessage = document.getElementById('clipboardMessage');
const namePrompt = document.getElementById('namePrompt');
const playerNameInput = document.getElementById('playerName');
const startBtn = document.getElementById('startBtn');
const gameOverScreen = document.getElementById('gameOver');
const playerNameDisplay = document.getElementById('playerNameDisplay');
const finalScoreDisplay = document.getElementById('finalScore');
const shareBtn = document.getElementById('shareBtn');
const restartBtn = document.getElementById('restartBtn');

// Validate canvas context
if (!ctx) {
    console.error('Canvas context not supported');
    alert('Error: Canvas not supported in this browser.');
    throw new Error('Canvas context not initialized');
}

// Validate DOM elements
if (!canvas || !scoreDisplay || !titleDisplay || !difficultyDisplay || !clipboardMessage || !namePrompt || !playerNameInput || !startBtn || !gameOverScreen || !playerNameDisplay || !finalScoreDisplay || !shareBtn || !restartBtn) {
    console.error('Missing DOM elements');
    alert('Error: Game elements not found.');
    throw new Error('DOM elements not initialized');
}

// Set canvas size and create off-screen canvas
let offScreenCanvas = document.createElement('canvas');
let offScreenCtx = offScreenCanvas.getContext('2d');
function resizeCanvas() {
    canvas.width = Math.min(400, window.innerWidth);
    canvas.height = Math.min(600, window.innerHeight);
    offScreenCanvas.width = canvas.width;
    offScreenCanvas.height = canvas.height;
    drawBackgroundOffScreen();
    console.log(`Canvas resized to ${canvas.width}x${canvas.height}`);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game variables
let gameState = 'namePrompt';
let playerName = '';
let buffalo = {
    x: 100,
    y: canvas.height / 2,
    width: 64,
    height: 64,
    velocity: 0,
    gravity: 0.3,
    flap: -8
};
let hills = [];
let score = 0;
let frame = 0;
let hillGap = 200;
let hillSpeed = 1.5;
let hillInterval = 100;
const hillWidth = 60;
const minHillHeight = 50;
let maxHillHeight = canvas.height - hillGap - 50;
let difficultyLevel = 0;
let difficultyTimer = 0;
let clipboardTimer = 0;
let lastTime = performance.now();

// Load PNG
const buffaloImg = new Image();
buffaloImg.src = 'buff.png';
buffaloImg.onerror = () => {
    console.error('Failed to load vayupankhi_buffalo.png');
    buffaloImg.failed = true;
};
buffaloImg.onload = () => {
    console.log('Buffalo PNG loaded successfully');
};

// Retro color palette
const colors = {
    hill: '#228b22',
    hillTop: '#ffd700',
    sun: '#ffff00',
    cloud: 'rgba(255, 255, 255, 0.8)'
};

// Draw static day background to off-screen canvas
function drawBackgroundOffScreen() {
    try {
        console.log('Drawing off-screen background');
        const gradient = offScreenCtx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#FFFFFF');
        offScreenCtx.fillStyle = gradient;
        offScreenCtx.fillRect(0, 0, canvas.width, canvas.height);

        offScreenCtx.fillStyle = colors.sun;
        offScreenCtx.beginPath();
        offScreenCtx.arc(50, canvas.height / 3, 20, 0, Math.PI * 2);
        offScreenCtx.fill();

        offScreenCtx.fillStyle = colors.cloud;
        offScreenCtx.fillRect(100, canvas.height / 4, 40, 20);
        offScreenCtx.fillRect(250, canvas.height / 5, 50, 25);
    } catch (e) {
        console.error('Off-screen background rendering error:', e);
    }
}

// Draw background
function drawBackground() {
    try {
        ctx.drawImage(offScreenCanvas, 0, 0);
    } catch (e) {
        console.error('Background rendering error:', e);
    }
}

// Draw buffalo
function drawBuffalo() {
    try {
        console.log('Drawing buffalo at', Math.floor(buffalo.x), Math.floor(buffalo.y));
        if (buffaloImg.complete && !buffaloImg.failed) {
            ctx.drawImage(buffaloImg, Math.floor(buffalo.x), Math.floor(buffalo.y), buffalo.width, buffalo.height);
        } else {
            console.warn('Using fallback for buffalo sprite');
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(Math.floor(buffalo.x), Math.floor(buffalo.y), buffalo.width, buffalo.height);
        }
    } catch (e) {
        console.error('Buffalo rendering error:', e);
    }
}

// Draw triangular hills
function drawHills() {
    try {
        console.log('Drawing', hills.length, 'hills');
        ctx.fillStyle = colors.hill;
        hills.forEach(hill => {
            ctx.beginPath();
            ctx.moveTo(hill.x, canvas.height);
            ctx.lineTo(hill.x + hillWidth / 2, hill.bottom);
            ctx.lineTo(hill.x + hillWidth, canvas.height);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(hill.x, 0);
            ctx.lineTo(hill.x + hillWidth / 2, hill.top);
            ctx.lineTo(hill.x + hillWidth, 0);
            ctx.closePath();
            ctx.fill();
        });
        ctx.fillStyle = colors.hillTop;
        hills.forEach(hill => {
            ctx.fillRect(hill.x + hillWidth / 2 - 4, hill.top - 4, 8, 4);
            ctx.fillRect(hill.x + hillWidth / 2 - 4, hill.bottom, 8, 4);
        });
    } catch (e) {
        console.error('Hills rendering error:', e);
    }
}

// Update hills
function updateHills(deltaTime) {
    if (frame % hillInterval === 0) {
        const topHeight = minHillHeight + Math.random() * (maxHillHeight - minHillHeight);
        hills.push({
            x: canvas.width,
            top: topHeight,
            bottom: topHeight + hillGap
        });
        console.log('Added new hill, total:', hills.length);
    }
    hills.forEach(hill => {
        hill.x -= hillSpeed * deltaTime * 60;
    });
    hills = hills.filter(hill => hill.x > -hillWidth);
}

// Update difficulty
function updateDifficulty() {
    const newLevel = Math.floor(score / 100);
    if (newLevel > difficultyLevel) {
        difficultyLevel = newLevel;
        hillGap = Math.max(120, hillGap - 10);
        hillSpeed = Math.min(3, hillSpeed + 0.1);
        hillInterval = Math.max(60, hillInterval - 5);
        maxHillHeight = canvas.height - hillGap - 50;
        difficultyDisplay.classList.remove('hidden');
        difficultyTimer = 120;
        console.log(`Difficulty increased: gap=${hillGap}, speed=${hillSpeed}, interval=${hillInterval}`);
    }
    if (difficultyTimer > 0) {
        difficultyTimer--;
        if (difficultyTimer === 0) {
            difficultyDisplay.classList.add('hidden');
        }
    }
}

// Update clipboard message
function updateClipboardMessage() {
    if (clipboardTimer > 0) {
        clipboardTimer--;
        if (clipboardTimer === 0) {
            clipboardMessage.classList.add('hidden');
        }
    }
}

// Collision detection
function checkCollision() {
    try {
        if (buffalo.y < 0 || buffalo.y + buffalo.height > canvas.height) {
            console.log('Collision with screen bounds');
            return true;
        }
        for (let hill of hills) {
            if (
                buffalo.x + buffalo.width > hill.x &&
                buffalo.x < hill.x + hillWidth
            ) {
                const buffaloCenterX = buffalo.x + buffalo.width / 2 - hill.x;
                const topYAtBuffalo = hill.top * (1 - Math.abs(buffaloCenterX - hillWidth / 2) / (hillWidth / 2));
                if (buffalo.y < topYAtBuffalo) {
                    console.log('Collision with top hill');
                    return true;
                }
                const bottomYAtBuffalo = canvas.height - (canvas.height - hill.bottom) * (1 - Math.abs(buffaloCenterX - hillWidth / 2) / (hillWidth / 2));
                if (buffalo.y + buffalo.height > bottomYAtBuffalo) {
                    console.log('Collision with bottom hill');
                    return true;
                }
            }
        }
        return false;
    } catch (e) {
        console.error('Collision detection error:', e);
        return false;
    }
}

// Update game state
function update(deltaTime) {
    try {
        if (gameState === 'playing') {
            buffalo.velocity += buffalo.gravity * deltaTime * 60;
            buffalo.y += buffalo.velocity * deltaTime * 60;
            updateHills(deltaTime);
            updateDifficulty();
            updateClipboardMessage();
            if (frame % 10 === 0) {
                score++;
                scoreDisplay.textContent = `Score: ${score}`;
            }
            if (checkCollision()) {
                gameState = 'gameOver';
                gameOverScreen.classList.remove('hidden');
                playerNameDisplay.textContent = playerName || 'Player';
                finalScoreDisplay.textContent = score;
                console.log('Game over triggered');
            }
        }
    } catch (e) {
        console.error('Update error:', e);
    }
    frame++;
}

// Render game
function render() {
    try {
        drawBackground();
        drawHills();
        drawBuffalo();
    } catch (e) {
        console.error('Render error:', e);
    }
}

// Game loop
function gameLoop(currentTime) {
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    update(deltaTime);
    render();
    requestAnimationFrame(gameLoop);
}

// Event handlers
function flap() {
    if (gameState === 'playing') {
        buffalo.velocity = buffalo.flap;
        console.log('Flap triggered');
    } else if (gameState === 'start') {
        gameState = 'playing';
        console.log('Game started');
    }
}

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    flap();
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        flap();
    }
});

// Start game
startBtn.addEventListener('click', () => {
    playerName = playerNameInput.value.trim() || 'Player';
    namePrompt.classList.add('hidden');
    gameState = 'start';
    console.log(`Starting game for player: ${playerName}`);
});

// Share result
shareBtn.addEventListener('click', () => {
    try {
        const text = `${playerName} scored ${score} in Vayupankhi Buffalo! 🐃✈️ Fly to the theatre to catch the show! 🎭 #VayupankhiBuffalo`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                console.log('Text copied to clipboard');
                clipboardMessage.classList.remove('hidden');
                clipboardTimer = 120; // Show for 2 seconds
                if (navigator.share) {
                    navigator.share({
                        text: text,
                        url: window.location.href
                    }).catch(err => {
                        console.error('Share error:', err);
                        // Message already shown, no need for alert
                    });
                }
            }).catch(err => {
                console.error('Clipboard copy error:', err);
                prompt('Copy this to share:', text); // Fallback
            });
        } else {
            console.warn('Clipboard API unavailable, using prompt');
            prompt('Copy this to share:', text);
            clipboardMessage.classList.remove('hidden');
            clipboardTimer = 120; // Show message even for prompt
        }
        console.log('Share button clicked');
    } catch (e) {
        console.error('Share button error:', e);
    }
});

// Restart game
restartBtn.addEventListener('click', () => {
    buffalo.y = canvas.height / 2;
    buffalo.velocity = 0;
    hills = [];
    score = 0;
    frame = 0;
    hillGap = 200;
    hillSpeed = 1.5;
    hillInterval = 100;
    maxHillHeight = canvas.height - hillGap - 50;
    difficultyLevel = 0;
    scoreDisplay.textContent = 'Score: 0';
    gameOverScreen.classList.add('hidden');
    gameState = 'playing';
    console.log('Game restarted');
});

// Prevent scrolling
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

// Start game loop
console.log('Starting game loop');
lastTime = performance.now();
requestAnimationFrame(gameLoop);