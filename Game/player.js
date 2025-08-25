// Player character
const player = {
    x: 100,
    y: 250,
    width: 50,
    height: 50,
    maxHp: 23000,
    hp: 23000,
    physicalDefense: 0.34,
    magicDefense: 0.27,
    hpRegen: 60,
    attackDamage: 850,
    abilityPower: 160,
    attackSpeed: 1.9,
    critChance: 0.7,
    critDamage: 1.6,
    lifestealChance: 0.6,
    lifestealPercent: 0.25,
    movementSpeed: 1.15, // 15% faster than Mahoraga
    direction: { x: 0, y: 0 },
    isMoving: false,
    passiveStacks: 0,
    passiveActive: false,
    passiveCooldown: 0,
    statusEffects: [],
    lastAttackTime: 0,
    lastHpLossTime: 0,
    lastHpLossAmount: 0
};

// Update player state
function updatePlayer(deltaTime) {
    // Handle movement
    if (player.isMoving) {
        const speed = 200 * player.movementSpeed;
        player.x += player.direction.x * speed * deltaTime;
        player.y += player.direction.y * speed * deltaTime;
        
        // Keep player within bounds
        player.x = Math.max(0, Math.min(GAME.WIDTH - player.width, player.x));
        player.y = Math.max(0, Math.min(GAME.HEIGHT - player.height, player.y));
    }
    
    // Update position in DOM
    const playerElement = document.getElementById('player');
    playerElement.style.left = player.x + 'px';
    playerElement.style.top = player.y + 'px';
    
    // Handle HP regeneration
    if (performance.now() - player.lastHpLossTime > 2000) {
        player.hp = Math.min(player.maxHp, player.hp + player.hpRegen * deltaTime / 2);
        updateHealthBars();
    }
    
    // Handle passive ability
    updatePassiveAbility(deltaTime);
    
    // Handle status effects
    updateStatusEffects(deltaTime, player);
    
    // Handle basic attacks
    if (performance.now() - player.lastAttackTime > 1000 / player.attackSpeed) {
        performBasicAttack();
        player.lastAttackTime = performance.now();
    }
}

// Update passive ability
function updatePassiveAbility(deltaTime) {
    if (player.passiveCooldown > 0) {
        player.passiveCooldown -= deltaTime;
        if (player.passiveCooldown <= 0) {
            player.passiveActive = false;
            player.passiveStacks = 0;
        }
    }
    
    // Check if we should add stacks based on HP loss
    if (performance.now() - player.lastHpLossTime < 3000 && player.lastHpLossAmount > 0) {
        const hpLossPercent = player.lastHpLossAmount / player.maxHp;
        const newStacks = Math.min(30, Math.floor(hpLossPercent / 0.02));
        
        if (newStacks > player.passiveStacks) {
            player.passiveStacks = newStacks;
            
            if (player.passiveStacks >= 30) {
                player.passiveActive = true;
                player.attackSpeed += 0.2;
                player.movementSpeed += 0.2;
                player.lifestealChance += 0.2;
                player.passiveCooldown = 12;
                
                // Reset after 5 seconds
                setTimeout(() => {
                    player.attackSpeed -= 0.2;
                    player.movementSpeed -= 0.2;
                    player.lifestealChance -= 0.2;
                }, 5000);
            }
        }
    }
}

// Perform basic attack
function performBasicAttack() {
    // Check if enemy is in range
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const attackRange = 80; // Melee range
    
    if (distance < attackRange) {
        // Calculate damage
        let damage = player.attackDamage;
        let isCritical = Math.random() < player.critChance;
        
        if (isCritical) {
            damage *= player.critDamage;
        }
        
        // Apply damage to enemy
        const actualDamage = applyDamage(enemy, damage, 'physical');
        createDamageText(enemy.x, enemy.y - 30, actualDamage, isCritical);
        
        // Check for lifesteal
        if (Math.random() < player.lifestealChance) {
            const healAmount = actualDamage * player.lifestealPercent;
            player.hp = Math.min(player.maxHp, player.hp + healAmount);
            createDamageText(player.x, player.y - 30, healAmount, false, true);
            updateHealthBars();
        }
    }
}

// Apply damage to a target with defense calculation
function applyDamage(target, damage, type) {
    let defense = 0;
    
    if (type === 'physical') {
        defense = target.physicalDefense;
        // Apply player passive damage reduction if active
        if (target === enemy && player.passiveActive) {
            defense += player.passiveStacks * 0.01;
        }
    } else if (type === 'magic') {
        defense = target.magicDefense;
        // Apply player passive damage reduction if active
        if (target === enemy && player.passiveActive) {
            defense += player.passiveStacks * 0.005;
        }
    }
    
    const actualDamage = damage * (1 - defense);
    target.hp -= actualDamage;
    
    // Record HP loss for passive ability
    if (target === player) {
        player.lastHpLossAmount += actualDamage;
        player.lastHpLossTime = performance.now();
    }
    
    updateHealthBars();
    return actualDamage;
}

// Update status effects
function updateStatusEffects(deltaTime, character) {
    for (let i = character.statusEffects.length - 1; i >= 0; i--) {
        const effect = character.statusEffects[i];
        effect.duration -= deltaTime;
        
        if (effect.duration <= 0) {
            // Remove effect
            character.statusEffects.splice(i, 1);
            
            // Remove visual effect
            const element = document.getElementById(character === player ? 'player' : 'enemy');
            element.classList.remove(effect.type);
            
            // Reset any stat modifications
            if (effect.type === 'stunned') {
                // Resume normal activity
            } else if (effect.type === 'slowed') {
                if (character === player) {
                    player.movementSpeed /= 0.75;
                } else {
                    enemy.movementSpeed /= 0.6;
                }
            } else if (effect.type === 'frozen') {
                // Resume normal activity
            } else if (effect.type === 'burning') {
                // Stop damage over time
            }
        } else if (effect.type === 'burning') {
            // Apply damage over time
            if (effect.lastTickTime === undefined || performance.now() - effect.lastTickTime > 500) {
                const burnDamage = character.maxHp * 0.015;
                character.hp -= burnDamage;
                createDamageText(character.x, character.y - 30, burnDamage, false);
                effect.lastTickTime = performance.now();
                updateHealthBars();
            }
        }
    }
}

// Apply status effect to character
function applyStatusEffect(character, type, duration) {
    // Check if effect already exists
    const existingEffect = character.statusEffects.find(effect => effect.type === type);
    
    if (existingEffect) {
        // Refresh duration
        existingEffect.duration = duration;
    } else {
        // Add new effect
        character.statusEffects.push({
            type: type,
            duration: duration
        });
        
        // Apply visual effect
        const element = document.getElementById(character === player ? 'player' : 'enemy');
        element.classList.add(type);
        
        // Apply stat modifications
        if (type === 'slowed') {
            if (character === player) {
                player.movementSpeed *= 0.75;
            } else {
                enemy.movementSpeed *= 0.6;
            }
        }
    }
}
