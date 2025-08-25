// Player skills
const playerSkills = {
    skill1: {
        cooldown: 0,
        maxCooldown: 8,
        isReady: true
    },
    skill2: {
        cooldown: 0,
        maxCooldown: 12,
        isReady: true
    },
    skill3: {
        cooldown: 0,
        maxCooldown: 17,
        isReady: true
    },
    skill4: {
        cooldown: 0,
        maxCooldown: 45,
        isReady: true,
        phase: 1 // 1 for freeze, 2 for burn
    }
};

// Skill 3 mark tracking
let skill3Mark = {
    active: false,
    target: null,
    duration: 0
};

// Update skill cooldowns
function updateSkills(deltaTime) {
    for (const skill in playerSkills) {
        if (playerSkills[skill].cooldown > 0) {
            playerSkills[skill].cooldown -= deltaTime;
            
            // Update UI
            const skillElement = document.getElementById(skill);
            const cooldownElement = skillElement.querySelector('.skill-cooldown');
            
            if (playerSkills[skill].cooldown > 0) {
                cooldownElement.style.display = 'flex';
                cooldownElement.textContent = Math.ceil(playerSkills[skill].cooldown);
                skillElement.style.opacity = '0.5';
            } else {
                cooldownElement.style.display = 'none';
                skillElement.style.opacity = '1';
                playerSkills[skill].isReady = true;
            }
        }
    }
    
    // Update skill 3 mark duration
    if (skill3Mark.active) {
        skill3Mark.duration -= deltaTime;
        if (skill3Mark.duration <= 0) {
            skill3Mark.active = false;
        }
    }
}

// Use skill 1
function useSkill1() {
    if (!playerSkills.skill1.isReady) return;
    
    // Check if enemy is in range
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const skillRange = 200;
    
    if (distance < skillRange) {
        // Calculate damage (650 + 65% AD + 80% AP)
        const damage = 650 + 
                      (player.attackDamage * 0.65) + 
                      (player.abilityPower * 0.8);
        
        // Apply damage to enemy
        const actualDamage = applyDamage(enemy, damage, 'magic');
        createDamageText(enemy.x, enemy.y - 30, actualDamage);
        
        // Apply stun effect
        applyStatusEffect(enemy, 'stunned', 1);
        
        // Move player behind enemy
        const angle = Math.atan2(dy, dx);
        player.x = enemy.x + Math.cos(angle) * 60;
        player.y = enemy.y + Math.sin(angle) * 60;
        
        // Apply attack speed buff
        player.attackSpeed += 0.3;
        setTimeout(() => {
            player.attackSpeed -= 0.3;
        }, 4000);
        
        // Create visual effect
        createSkillEffect(enemy.x, enemy.y, 'skill1');
        
        // Set cooldown
        playerSkills.skill1.cooldown = playerSkills.skill1.maxCooldown;
        playerSkills.skill1.isReady = false;
    }
}

// Use skill 2
function useSkill2() {
    if (!playerSkills.skill2.isReady) return;
    
    // Calculate skill direction based on player direction or towards enemy
    let angle;
    if (player.direction.x !== 0 || player.direction.y !== 0) {
        angle = Math.atan2(player.direction.y, player.direction.x);
    } else {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        angle = Math.atan2(dy, dx);
    }
    
    // Create skill area (rectangle)
    const skillLength = 300;
    const skillWidth = 100;
    const skillX = player.x + Math.cos(angle) * skillLength / 2;
    const skillY = player.y + Math.sin(angle) * skillLength / 2;
    
    // Initial damage (700 + 110% AD)
    const initialDamage = 700 + (player.attackDamage * 1.1);
    
    // Check if enemy is in skill area
    const enemyDx = enemy.x - skillX;
    const enemyDy = enemy.y - skillY;
    const enemyDistance = Math.sqrt(enemyDx * enemyDx + enemyDy * enemyDy);
    
    if (enemyDistance < skillWidth / 2) {
        // Apply initial damage to enemy
        const actualDamage = applyDamage(enemy, initialDamage, 'physical');
        createDamageText(enemy.x, enemy.y - 30, actualDamage);
        
        // Apply slow effect
        applyStatusEffect(enemy, 'slowed', 3);
    }
    
    // Create damage over time area
    const dotDamage = 90 + 
                     (player.attackDamage * 0.2) + 
                     (player.abilityPower * 0.25);
    
    // Apply damage over time for 5 seconds
    let dotTicks = 0;
    const dotInterval = setInterval(() => {
        if (dotTicks < 5) {
            // Check if enemy is still in area (simplified)
            const currentDx = enemy.x - skillX;
            const currentDy = enemy.y - skillY;
            const currentDistance = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
            
            if (currentDistance < skillWidth / 2) {
                const actualDamage = applyDamage(enemy, dotDamage, 'physical');
                createDamageText(enemy.x, enemy.y - 30, actualDamage);
            }
            
            dotTicks++;
        } else {
            clearInterval(dotInterval);
        }
    }, 1000);
    
    // Create visual effect
    createSkillEffect(skillX, skillY, 'skill2', skillLength, skillWidth);
    
    // Set cooldown
    playerSkills.skill2.cooldown = playerSkills.skill2.maxCooldown;
    playerSkills.skill2.isReady = false;
}

// Use skill 3
function useSkill3() {
    if (!playerSkills.skill3.isReady) return;
    
    // Check if enemy is in range
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const skillRange = 200;
    
    if (distance < skillRange) {
        // Calculate true damage (1200 + 85% AD + 8% target HP)
        const damage = 1200 + 
                      (player.attackDamage * 0.85) + 
                      (enemy.hp * 0.08);
        
        // Apply damage to enemy
        enemy.hp -= damage;
        createDamageText(enemy.x, enemy.y - 30, damage, false);
        updateHealthBars();
        
        // Check if target has mark
        if (!skill3Mark.active || skill3Mark.target !== enemy) {
            // Reset cooldown
            playerSkills.skill3.cooldown = 0;
            playerSkills.skill3.isReady = true;
            
            // Apply mark
            skill3Mark.active = true;
            skill3Mark.target = enemy;
            skill3Mark.duration = 4;
        } else {
            // Set normal cooldown
            playerSkills.skill3.cooldown = playerSkills.skill3.maxCooldown;
            playerSkills.skill3.isReady = false;
        }
        
        // Move player to enemy
        player.x = enemy.x - dx / distance * 40;
        player.y = enemy.y - dy / distance * 40;
    }
}

// Use skill 4
function useSkill4() {
    if (playerSkills.skill4.phase === 1) {
        // First phase - freeze
        if (!playerSkills.skill4.isReady) return;
        
        // Create freeze effect in front of player
        const angle = player.direction.x !== 0 || player.direction.y !== 0 ? 
                     Math.atan2(player.direction.y, player.direction.x) : 0;
        
        const skillX = player.x + Math.cos(angle) * 150;
        const skillY = player.y + Math.sin(angle) * 150;
        
        // Check if enemy is in skill area
        const dx = enemy.x - skillX;
        const dy = enemy.y - skillY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
            // Calculate damage (1800 + 130% AP)
            const damage = 1800 + (player.abilityPower * 1.3);
            
            // Apply damage to enemy
            const actualDamage = applyDamage(enemy, damage, 'magic');
            createDamageText(enemy.x, enemy.y - 30, actualDamage);
            
            // Apply freeze effect
            applyStatusEffect(enemy, 'frozen', 1.5);
            
            // Mark that enemy is frozen for phase 2
            enemy.isFrozen = true;
            setTimeout(() => {
                enemy.isFrozen = false;
            }, 1500);
        }
        
        // Create visual effect
        createSkillEffect(skillX, skillY, 'skill4-freeze');
        
        // Prepare for phase 2
        playerSkills.skill4.phase = 2;
        playerSkills.skill4.isReady = true; // Allow immediate use of phase 2
        
    } else {
        // Second phase - burn
        // Create burn effect in front of player
        const angle = player.direction.x !== 0 || player.direction.y !== 0 ? 
                     Math.atan2(player.direction.y, player.direction.x) : 0;
        
        const skillX = player.x + Math.cos(angle) * 150;
        const skillY = player.y + Math.sin(angle) * 150;
        
        // Check if enemy is in skill area
        const dx = enemy.x - skillX;
        const dy = enemy.y - skillY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
            // Calculate damage (2100 + 170% AD)
            let damage = 2100 + (player.attackDamage * 1.7);
            
            // Check if enemy was frozen
            if (enemy.isFrozen) {
                // Convert to true damage and end freeze early
                enemy.hp -= damage;
                createDamageText(enemy.x, enemy.y - 30, damage, false);
                
                // Apply heal reduction
                enemy.healReduction = 0.3;
                setTimeout(() => {
                    enemy.healReduction = 0;
                }, 3000);
                
                // End freeze effect
                const frozenIndex = enemy.statusEffects.findIndex(effect => effect.type === 'frozen');
                if (frozenIndex !== -1) {
                    enemy.statusEffects.splice(frozenIndex, 1);
                    const enemyElement = document.getElementById('enemy');
                    enemyElement.classList.remove('frozen');
                }
            } else {
                // Normal physical damage
                const actualDamage = applyDamage(enemy, damage, 'physical');
                createDamageText(enemy.x, enemy.y - 30, actualDamage);
            }
            
            // Apply burning effect
            applyStatusEffect(enemy, 'burning', 3);
        }
        
        // Create visual effect
        createSkillEffect(skillX, skillY, 'skill4-burn');
        
        // Reset skill
        playerSkills.skill4.phase = 1;
        playerSkills.skill4.cooldown = playerSkills.skill4.maxCooldown;
        playerSkills.skill4.isReady = false;
    }
            }
