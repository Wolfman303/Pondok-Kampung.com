// game.js
class Game {
    constructor() {
        this.player = new Player();
        this.enemy = new Enemy();
        this.gameRunning = true;
        this.lastTime = 0;
        this.animationId = null;
        this.setupEventListeners();
        this.init();
    }

    init() {
        this.updateHealthBars();
        this.gameLoop(0);
    }

    setupEventListeners() {
        // Joystick movement
        const joystickArea = document.querySelector('.joystick-area');
        const joystick = document.querySelector('.joystick');
        
        let joystickActive = false;
        const joystickRadius = 60;
        const joystickCenter = { x: joystickRadius, y: joystickRadius };

        joystickArea.addEventListener('touchstart', (e) => {
            e.preventDefault();
            joystickActive = true;
            moveJoystick(e.touches[0]);
        });

        joystickArea.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (joystickActive) {
                moveJoystick(e.touches[0]);
            }
        });

        joystickArea.addEventListener('touchend', (e) => {
            e.preventDefault();
            joystickActive = false;
            resetJoystick();
        });

        function moveJoystick(touch) {
            const rect = joystickArea.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            const distance = Math.sqrt(Math.pow(x - joystickCenter.x, 2) + Math.pow(y - joystickCenter.y, 2));
            const angle = Math.atan2(y - joystickCenter.y, x - joystickCenter.x);
            
            if (distance < joystickRadius) {
                joystick.style.transform = `translate(${x - joystickCenter.x}px, ${y - joystickCenter.y}px)`;
            } else {
                const limitedX = joystickCenter.x + Math.cos(angle) * joystickRadius;
                const limitedY = joystickCenter.y + Math.sin(angle) * joystickRadius;
                joystick.style.transform = `translate(${limitedX - joystickCenter.x}px, ${limitedY - joystickCenter.y}px)`;
            }
            
            // Calculate movement direction
            const moveX = Math.cos(angle) * (distance < joystickRadius ? distance / joystickRadius : 1);
            const moveY = Math.sin(angle) * (distance < joystickRadius ? distance / joystickRadius : 1);
            
            // Move player
            game.player.move(moveX, moveY);
        }

        function resetJoystick() {
            joystick.style.transform = 'translate(-50%, -50%)';
            game.player.move(0, 0);
        }

        // Basic attack
        document.getElementById('basic-attack').addEventListener('touchstart', (e) => {
            e.preventDefault();
            game.player.basicAttack(game.enemy);
        });

        // Skills
        document.getElementById('skill1').addEventListener('touchstart', (e) => {
            e.preventDefault();
            game.player.useSkill(1, game.enemy);
        });

        document.getElementById('skill2').addEventListener('touchstart', (e) => {
            e.preventDefault();
            game.player.useSkill(2, game.enemy);
        });

        document.getElementById('skill3').addEventListener('touchstart', (e) => {
            e.preventDefault();
            game.player.useSkill(3, game.enemy);
        });

        document.getElementById('skill4').addEventListener('touchstart', (e) => {
            e.preventDefault();
            game.player.useSkill(4, game.enemy);
        });
    }

    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (this.gameRunning) {
            this.update(deltaTime);
            this.render();
            this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
        }
    }

    update(deltaTime) {
        this.player.update(deltaTime, this.enemy);
        this.enemy.update(deltaTime, this.player);
        
        this.updateHealthBars();
        this.updateCooldownDisplays();
        
        // Check win/lose conditions
        if (this.player.hp <= 0) {
            this.endGame("Kalah! Mahoraga terlalu kuat!");
        } else if (this.enemy.hp <= 0) {
            this.endGame("Menang! Kamu mengalahkan Mahoraga!");
        }
    }

    render() {
        // Update character positions
        const playerElement = document.querySelector('.player');
        const enemyElement = document.querySelector('.enemy');
        
        playerElement.style.left = `${this.player.x}px`;
        playerElement.style.bottom = `${this.player.y}px`;
        
        enemyElement.style.left = `${this.enemy.x}px`;
        enemyElement.style.bottom = `${this.enemy.y}px`;
    }

    updateHealthBars() {
        const playerHealthFill = document.getElementById('player-health');
        const enemyHealthFill = document.getElementById('enemy-health');
        const playerHpText = document.getElementById('player-hp-text');
        
        playerHealthFill.style.width = `${(this.player.hp / this.player.maxHp) * 100}%`;
        enemyHealthFill.style.width = `${(this.enemy.hp / this.enemy.maxHp) * 100}%`;
        
        playerHpText.textContent = `${Math.max(0, Math.floor(this.player.hp))}/${this.player.maxHp}`;
    }

    updateCooldownDisplays() {
        document.getElementById('skill1-cd').textContent = Math.max(0, Math.ceil(this.player.skills[0].currentCooldown / 1000)).toFixed(1);
        document.getElementById('skill2-cd').textContent = Math.max(0, Math.ceil(this.player.skills[1].currentCooldown / 1000)).toFixed(1);
        document.getElementById('skill3-cd').textContent = Math.max(0, Math.ceil(this.player.skills[2].currentCooldown / 1000)).toFixed(1);
        document.getElementById('skill4-cd').textContent = Math.max(0, Math.ceil(this.player.skills[3].currentCooldown / 1000)).toFixed(1);
        
        // Update skill cooldown visuals
        this.player.skills.forEach((skill, index) => {
            const skillElement = document.getElementById(`skill${index + 1}`);
            const cooldownElement = skillElement.querySelector('.skill-cooldown');
            
            if (skill.currentCooldown > 0) {
                const cooldownPercent = (skill.currentCooldown / skill.cooldown) * 100;
                cooldownElement.style.height = `${cooldownPercent}%`;
                cooldownElement.textContent = Math.ceil(skill.currentCooldown / 1000);
            } else {
                cooldownElement.style.height = '0%';
                cooldownElement.textContent = '';
            }
        });
    }

    endGame(message) {
        this.gameRunning = false;
        cancelAnimationFrame(this.animationId);
        
        const gameStatus = document.getElementById('game-status');
        gameStatus.textContent = message;
        gameStatus.style.opacity = '1';
        
        setTimeout(() => {
            if (confirm(`${message} Main lagi?`)) {
                location.reload();
            }
        }, 1000);
    }

    showDamage(x, y, amount, isCritical = false, isHeal = false) {
        const damageText = document.createElement('div');
        damageText.className = isHeal ? 'heal-text' : 'damage-text';
        damageText.textContent = isHeal ? `+${amount}` : (isCritical ? `CRIT! ${amount}` : amount);
        damageText.style.left = `${x}px`;
        damageText.style.bottom = `${y}px`;
        
        document.querySelector('.arena').appendChild(damageText);
        
        setTimeout(() => {
            damageText.remove();
        }, 1000);
    }

    showAbilityEffect(x, y, type) {
        const effect = document.createElement('div');
        effect.className = `ability-effect ${type}`;
        effect.style.left = `${x}px`;
        effect.style.bottom = `${y}px`;
        
        document.querySelector('.arena').appendChild(effect);
        
        setTimeout(() => {
            effect.remove();
        }, 1000);
    }
}

const game = new Game();
