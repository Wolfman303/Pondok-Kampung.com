// Game constants and configuration
const GAME = {
    WIDTH: 1000,
    HEIGHT: 500,
    WALLS: [
        { x: 200, y: 100, width: 30, height: 200 },
        { x: 400, y: 200, width: 200, height: 30 },
        { x: 700, y: 100, width: 30, height: 200 },
        { x: 300, y: 350, width: 150, height: 30 },
        { x: 600, y: 350, width: 150, height: 30 }
    ]
};

// Game state
let gameState = {
    isRunning: false,
    gameOver: false,
    winner: null
};

// Initialize the game
function initGame() {
    // Create walls
    GAME.WALLS.forEach(wall => {
        const wallElement = document.createElement('div');
        wallElement.className = 'wall';
        wallElement.style.width = wall.width + 'px';
        wallElement.style.height = wall.height + 'px';
        wallElement.style.left = wall.x + 'px';
        wallElement.style.top = wall.y + 'px';
        document.getElementById('arena').appendChild(wallElement);
    });
    
    // Initialize player and enemy positions
    player.x = 100;
    player.y = 250;
    enemy.x = 800;
    enemy.y = 250;
    
    // Update UI
    updateHealthBars();
    
    // Reset game state
    gameState.isRunning = true;
    gameState.gameOver = false;
    gameState.winner = null;
    document.getElementById('game-over').style.display = 'none';
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Game loop
function gameLoop(timestamp) {
    if (!gameState.isRunning) return;
    
    // Calculate delta time
    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    
    // Update game objects
    updatePlayer(deltaTime);
    updateEnemy(deltaTime);
    updateSkills(deltaTime);
    
    // Check for collisions
    checkCollisions();
    
    // Check for game over
    checkGameOver();
    
    // Continue the game loop
    if (!gameState.gameOver) {
        requestAnimationFrame(gameLoop);
    }
}

// Check for game over condition
function checkGameOver() {
    if (player.hp <= 0) {
        gameState.gameOver = true;
        gameState.winner = 'Mahoraga';
        showGameOver();
    } else if (enemy.hp <= 0) {
        gameState.gameOver = true;
        gameState.winner = 'Player';
        showGameOver();
    }
}

// Show game over screen
function showGameOver() {
    const gameOverScreen = document.getElementById('game-over');
    const resultText = document.getElementById('result-text');
    
    resultText.textContent = gameState.winner === 'Player' ? 'Kamu Menang!' : 'Mahoraga Menang!';
    gameOverScreen.style.display = 'flex';
}

// Update health bars
function updateHealthBars() {
    const playerHealthBar = document.getElementById('player-health');
    const enemyHealthBar = document.getElementById('enemy-health');
    const playerHpText = document.getElementById('player-hp-text');
    const enemyHpText = document.getElementById('enemy-hp-text');
    
    playerHealthBar.style.width = (player.hp / player.maxHp * 100) + '%';
    enemyHealthBar.style.width = (enemy.hp / enemy.maxHp * 100) + '%';
    
    playerHpText.textContent = Math.max(0, Math.floor(player.hp));
    enemyHpText.textContent = Math.max(0, Math.floor(enemy.hp));
}

// Check collisions between objects
function checkCollisions() {
    // Check player collision with walls
    GAME.WALLS.forEach(wall => {
        if (isColliding(player, wall)) {
            resolveCollision(player, wall);
        }
    });
    
    // Check enemy collision with walls
    GAME.WALLS.forEach(wall => {
        if (isColliding(enemy, wall)) {
            resolveCollision(enemy, wall);
        }
    });
    
    // Check if player and enemy are colliding
    if (isColliding(player, enemy)) {
        resolveCharacterCollision(player, enemy);
    }
}

// Check if two objects are colliding
function isColliding(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

// Resolve collision with walls
function resolveCollision(character, wall) {
    // Calculate overlap on each axis
    const overlapX = Math.min(
        character.x + character.width - wall.x,
        wall.x + wall.width - character.x
    );
    
    const overlapY = Math.min(
        character.y + character.height - wall.y,
        wall.y + wall.height - character.y
    );
    
    // Resolve on the axis with least overlap
    if (overlapX < overlapY) {
        if (character.x < wall.x) {
            character.x = wall.x - character.width;
        } else {
            character.x = wall.x + wall.width;
        }
    } else {
        if (character.y < wall.y) {
            character.y = wall.y - character.height;
        } else {
            character.y = wall.y + wall.height;
        }
    }
}

// Resolve collision between characters
function resolveCharacterCollision(char1, char2) {
    // Simple resolution by moving characters apart
    const dx = char2.x - char1.x;
    const dy = char2.y - char1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = (char1.width + char2.width) / 2;
    
    if (distance < minDistance) {
        const angle = Math.atan2(dy, dx);
        const moveX = Math.cos(angle) * (minDistance - distance) / 2;
        const moveY = Math.sin(angle) * (minDistance - distance) / 2;
        
        char1.x -= moveX;
        char1.y -= moveY;
        char2.x += moveX;
        char2.y += moveY;
    }
}

// Create damage text effect
function createDamageText(x, y, damage, isCritical = false, isHeal = false) {
    const text = document.createElement('div');
    text.className = isHeal ? 'heal-text' : 'damage-text';
    text.textContent = (isHeal ? '+' : '-') + Math.floor(damage);
    text.style.left = x + 'px';
    text.style.top = y + 'px';
    
    if (isCritical) {
        text.style.color = '#ffd700';
        text.style.fontSize = '16px';
    }
    
    document.getElementById('arena').appendChild(text);
    
    // Remove after animation
    setTimeout(() => {
        document.getElementById('arena').removeChild(text);
    }, 1000);
}

// Create skill effect
function createSkillEffect(x, y, type, width, height) {
    const effect = document.createElement('div');
    effect.className = 'skill-effect';
    
    switch (type) {
        case 'skill1':
            effect.style.width = '80px';
            effect.style.height = '80px';
            effect.style.background = 'radial-gradient(circle, rgba(52,152,219,0.5) 0%, rgba(0,0,0,0) 70%)';
            effect.style.borderRadius = '50%';
            effect.style.left = (x - 40) + 'px';
            effect.style.top = (y - 40) + 'px';
            break;
        case 'skill2':
            effect.style.width = width + 'px';
            effect.style.height = height + 'px';
            effect.style.background = 'linear-gradient(to right, rgba(231,76,60,0.3), rgba(241,196,16,0.3))';
            effect.style.left = x + 'px';
            effect.style.top = y + 'px';
            break;
        case 'skill4-freeze':
            effect.style.width = '300px';
            effect.style.height = '200px';
            effect.style.background = 'radial-gradient(circle, rgba(52,152,219,0.5) 0%, rgba(0,0,0,0) 70%)';
            effect.style.clipPath = 'polygon(0% 0%, 100% 0%, 80% 100%, 20% 100%)';
            effect.style.left = (x - 150) + 'px';
            effect.style.top = (y - 100) + 'px';
            break;
        case 'skill4-burn':
            effect.style.width = '300px';
            effect.style.height = '200px';
            effect.style.background = 'radial-gradient(circle, rgba(231,76,60,0.5) 0%, rgba(0,0,0,0) 70%)';
            effect.style.clipPath = 'polygon(0% 0%, 100% 0%, 80% 100%, 20% 100%)';
            effect.style.left = (x - 150) + 'px';
            effect.style.top = (y - 100) + 'px';
            break;
    }
    
    document.getElementById('arena').appendChild(effect);
    
    // Remove after a short time
    setTimeout(() => {
        if (effect.parentNode) {
            document.getElementById('arena').removeChild(effect);
        }
    }, 2000);
}

// Initialize game when page loads
window.addEventListener('load', initGame);

// Restart game when button is clicked
document.getElementById('restart-button').addEventListener('click', initGame);

// Global variables
let lastTimestamp = 0;
