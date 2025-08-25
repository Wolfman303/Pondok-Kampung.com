// Enemy character (Mahoraga)
const enemy = {
    x: 800,
    y: 250,
    width: 60,
    height: 60,
    maxHp: 80000,
    hp: 80000,
    physicalDefense: 0.55,
    magicDefense: 0.48,
    hpRegen: 130,
    attackDamage: 740,
    abilityPower: 200,
    attackSpeed: 1.1,
    critChance: 0.1,
    critDamage: 1.2,
    lifestealChance: 0,
    lifestealPercent: 0.25,
    movementSpeed: 1.0,
    direction: { x: 0, y: 0 },
    isMoving: false,
    adaptationStacks: 0,
    lastAdaptationTime: 0,
    statusEffects: [],
    lastAttackTime: 0,
    lastHpLossTime: 0,
    lastHpLossAmount: 0,
    skillCooldowns: {
        skill1: 0,
        skill2: 0,
        skill3: 0,
        skill4: 0
    }
};

// Update enemy state
function updateEnemy(deltaTime) {
    // Simple AI to move towards player
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 100) {
        // Move towards player
        enemy.direction.x = dx / distance;
        enemy.direction.y = dy / distance;
        enemy.isMoving = true;
    } else {
        // Stop when close to player
        enemy.isMoving = false;
    }
    
    // Handle movement
    if (enemy.isMoving) {
        const speed = 200 * enemy.movementSpeed;
        enemy.x += enemy.direction.x * speed * deltaTime;
        enemy.y += enemy.direction.y * speed * deltaTime;
        
        // Keep enemy within bounds
        enemy.x = Math.max(0, Math.min(GAME.WIDTH - enemy.width, enemy.x));
        enemy.y = Math.max(0, Math.min(GAME.HEIGHT - enemy.height, enemy.y));
    }
    
    // Update position in DOM
    const enemyElement = document.getElementById('enemy');
    enemyElement.style.left = enemy.x + 'px';
    enemyElement.style.top = enemy.y + 'px';
    
    // Handle HP regeneration
    if (performance.now() - enemy.lastHpLossTime > 2000) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.hpRegen * deltaTime / 2);
        updateHealthBars();
    }
    
    // Handle adaptation passive
    updateAdaptationPassive(deltaTime);
    
    // Handle status effects
    updateStatusEffects(deltaTime, enemy);
    
    // Update skill cooldowns
    for (const skill in enemy.skillCooldowns) {
        if (enemy.skillCooldowns[skill] > 0) {
            enemy.skillCooldowns[skill] -= deltaTime;
        }
    }
    
    // Handle basic attacks
    if (performance.now() - enemy.lastAttackTime > 1000 / enemy.attackSpeed) {
        performEnemyBasicAttack();
        enemy.lastAttackTime = performance.now();
    }
    
    // Use skills randomly
    if (Math.random() < 0.01) useEnemySkill1();
    if (Math.random() < 0.007) useEnemySkill2();
    if (Math.random() < 0.005) useEnemySkill3();
    if (Math.random() < 0.001) useEnemySkill4();
}

// Update adaptation passive
function updateAdaptationPassive(deltaTime) {
    // Check if we should add adaptation stacks
    if (performance.now() - enemy.lastHpLossTime < 3000 && 
        enemy.lastHpLossAmount > 0 &&
        performance.now() - enemy.lastAdaptationTime > 3000) {
        
        const hpLossPercent = enemy.lastHpLossAmount / enemy.maxHp;
        
        if (hpLossPercent >= 0.05) {
            enemy.adaptationStacks++;
            enemy.maxHp += 250;
            enemy.lastAdaptationTime = performance.now();
            
            // Start regeneration effect
            const regenInterval = setInterval(() => {
                if (enemy.hp < enemy.maxHp) {
                    enemy.hp += 20 + (2 * enemy.adaptationStacks);
                    updateHealthBars();
                } else {
                    clearInterval(regenInterval);
                }
            }, 1000);
            
            // Stop regeneration after 5 seconds
            setTimeout(() => {
                clearInterval(regenInterval);
            }, 5000);
        }
    }
}

// Perform enemy basic attack
function performEnemyBasicAttack() {
    // Check if player is in range
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const attackRange = 80; // Melee range
    
    if (distance < attackRange) {
        // Calculate damage
        let damage = enemy.attackDamage;
        let isCritical = Math.random() < enemy.critChance;
        
        if (isCritical) {
            damage *= enemy.critDamage;
        }
        
        // Apply damage to player
        const actualDamage = applyDamage(player, damage, 'physical');
        createDamageText(player.x, player.y - 30, actualDamage, isCritical);
        
        // Check for lifesteal (though Mahoraga has 0% lifesteal chance)
        if (Math.random() < enemy.lifestealChance) {
            const healAmount = actualDamage * enemy.lifestealPercent;
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + healAmount);
            createDamageText(enemy.x, enemy.y - 30, healAmount, false, true);
            updateHealthBars();
        }
        
        // Record HP loss for passive ability
        player.lastHpLossAmount += actualDamage;
        player.lastHpLossTime = performance.now();
    }
}

// Enemy skill 1
function useEnemySkill1() {
    if (enemy.skillCooldowns.skill1 > 0) return;
    
    // Check if player is in front (simple implementation)
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 200) {
        // Calculate damage (500 + 2.5% max HP)
        const damage = 500 + (enemy.maxHp * 0.025);
        
        // Apply damage to player
        const actualDamage = applyDamage(player, damage, 'physical');
        createDamageText(player.x, player.y - 30, actualDamage);
        
        // Apply slow effect
        applyStatusEffect(player, 'slowed', 1);
        
        // Set cooldown
        enemy.skillCooldowns.skill1 = 22;
    }
}

// Enemy skill 2
function useEnemySkill2() {
    if (enemy.skillCooldowns.skill2 > 0) return;
    
    // Check if player is close
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 150) {
        // Calculate damage (600 + 60% AD)
        const damage = 600 + (enemy.attackDamage * 0.6);
        
        // Apply damage to player
        const actualDamage = applyDamage(player, damage, 'physical');
        createDamageText(player.x, player.y - 30, actualDamage);
        
        // Knockback effect (simple implementation)
        const knockbackDistance = 50;
        const angle = Math.atan2(dy, dx);
        player.x -= Math.cos(angle) * knockbackDistance;
        player.y -= Math.sin(angle) * knockbackDistance;
        
        // Apply slow effect
        applyStatusEffect(player, 'slowed', 2);
        
        // Set cooldown
        enemy.skillCooldowns.skill2 = 9;
    }
}

// Enemy skill 3
function useEnemySkill3() {
    if (enemy.skillCooldowns.skill3 > 0) return;
    
    // Check if player is in front
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 250) {
        // Calculate damage (400 + 80% AD + 140% AP + 0.5% max HP)
        const damage = 400 + 
                      (enemy.attackDamage * 0.8) + 
                      (enemy.abilityPower * 1.4) + 
                      (enemy.maxHp * 0.005);
        
        // Apply damage to player
        const actualDamage = applyDamage(player, damage, 'magic');
        createDamageText(player.x, player.y - 30, actualDamage);
        
        // Set cooldown
        enemy.skillCooldowns.skill3 = 12;
    }
}

// Enemy skill 4
function useEnemySkill4() {
    if (enemy.skillCooldowns.skill4 > 0) return;
    
    // Increase max HP temporarily by 20%
    const originalMaxHp = enemy.maxHp;
    enemy.maxHp *= 1.2;
    enemy.hp *= 1.2;
    
    // Heal over time
    const healPerSecond = enemy.maxHp * 0.35 / 12;
    const healInterval = setInterval(() => {
        if (enemy.hp < enemy.maxHp) {
            enemy.hp = Math.min(enemy.maxHp, enemy.hp + healPerSecond);
            updateHealthBars();
        }
    }, 1000);
    
    // Stop healing after 12 seconds and revert max HP
    setTimeout(() => {
        clearInterval(healInterval);
        enemy.hp = Math.min(originalMaxHp, enemy.hp);
        enemy.maxHp = originalMaxHp;
        updateHealthBars();
    }, 12000);
    
    // Set cooldown
    enemy.skillCooldowns.skill4 = 75;
}
