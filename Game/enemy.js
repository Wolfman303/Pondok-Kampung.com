// enemy.js
class Enemy {
    constructor() {
        this.x = 350;
        this.y = 300;
        this.speed = 150; // pixels per second
        this.moveX = 0;
        this.moveY = 0;
        
        // Stats
        this.maxHp = 80000;
        this.hp = this.maxHp;
        this.physicalDefense = 0.55;
        this.magicDefense = 0.48;
        this.hpRegen = 130; // per 2 seconds
        this.attackDamage = 740;
        this.abilityPower = 200;
        this.attackSpeed = 1.1; // attacks per second
        this.criticalChance = 0.1;
        this.criticalDamage = 1.2;
        this.lifestealChance = 0;
        this.lifestealPercent = 0.2;
        
        // Passive
        this.adaptationStacks = 0;
        this.adaptationActive = false;
        this.adaptationCooldown = 0;
        this.adaptationDuration = 0;
        this.lastHpLossTime = 0;
        this.lastHpLossAmount = 0;
        
        // Attack timer
        this.attackTimer = 0;
        this.attackInterval = 1000 / this.attackSpeed;
        
        // Regen timer
        this.regenTimer = 0;
        this.regenInterval = 2000;
        
        // Skills
        this.skills = [
            { cooldown: 22000, currentCooldown: 0 },
            { cooldown: 9000, currentCooldown: 0 },
            { cooldown: 12000, currentCooldown: 0 },
            { cooldown: 70000, currentCooldown: 0 }
        ];
        
        // AI state
        this.aiState = 'chase'; // 'chase', 'attack', 'flee'
        this.aiTimer = 0;
        this.aiInterval = 1000;
        
        // Skill 3 mark
        this.skill3Marked = false;
        this.skill3MarkDuration = 0;
    }

    update(deltaTime, player) {
        // Convert deltaTime to seconds
        const deltaSeconds = deltaTime / 1000;
        
        // AI decision making
        this.aiTimer += deltaTime;
        if (this.aiTimer >= this.aiInterval) {
            this.aiTimer = 0;
            this.decideAction(player);
        }
        
        // Execute AI action
        this.executeAction(player, deltaSeconds);
        
        // Auto attack
        this.attackTimer += deltaTime;
        if (this.attackTimer >= this.attackInterval) {
            this.attackTimer = 0;
            this.basicAttack(player);
        }
        
        // HP regen
        this.regenTimer += deltaTime;
        if (this.regenTimer >= this.regenInterval) {
            this.regenTimer = 0;
            this.hp = Math.min(this.maxHp, this.hp + this.hpRegen);
        }
        
        // Update skill cooldowns
        this.skills.forEach(skill => {
            if (skill.currentCooldown > 0) {
                skill.currentCooldown -= deltaTime;
            }
        });
        
        // Update adaptation
        this.updateAdaptation(deltaTime);
        
        if (this.skill3Marked) {
            this.skill3MarkDuration -= deltaTime;
            if (this.skill3MarkDuration <= 0) {
                this.skill3Marked = false;
            }
        }
    }

    decideAction(player) {
        if (player.hp <= 0) return;
        
        const distance = Math.sqrt(Math.pow(this.x - player.x, 2) + Math.pow(this.y - player.y, 2));
        
        if (this.hp < this.maxHp * 0.3) {
            // Low HP, try to flee
            this.aiState = 'flee';
        } else if (distance < 100) {
            // Close to player, attack
            this.aiState = 'attack';
            
            // Randomly use skills when in attack range
            const randomSkill = Math.floor(Math.random() * 4) + 1;
            if (this.skills[randomSkill - 1].currentCooldown <= 0) {
                this.useSkill(randomSkill, player);
            }
        } else {
            // Chase player
            this.aiState = 'chase';
        }
    }

    executeAction(player, deltaSeconds) {
        if (player.hp <= 0) return;
        
        const distance = Math.sqrt(Math.pow(this.x - player.x, 2) + Math.pow(this.y - player.y, 2));
        
        switch (this.aiState) {
            case 'chase':
                // Move toward player
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                this.moveX = Math.cos(angle);
                this.moveY = Math.sin(angle);
                break;
                
            case 'attack':
                // Stop moving when attacking
                this.moveX = 0;
                this.moveY = 0;
                break;
                
            case 'flee':
                // Move away from player
                const fleeAngle = Math.atan2(player.y - this.y, player.x - this.x);
                this.moveX = -Math.cos(fleeAngle);
                this.moveY = -Math.sin(fleeAngle);
                break;
        }
        
        // Apply movement
        const newX = this.x + this.moveX * this.speed * deltaSeconds;
        const newY = this.y + this.moveY * this.speed * deltaSeconds;
        
        // Check collision with walls
        if (!this.checkWallCollision(newX, newY)) {
            this.x = Math.max(0, Math.min(newX, 500 - 60)); // 500 is arena width, 60 is enemy size
            this.y = Math.max(0, Math.min(newY, 700 * 0.7 - 60)); // 70% of 700px is arena height
        }
    }

    updateAdaptation(deltaTime) {
        // Handle adaptation cooldown and activation
        if (this.adaptationActive) {
            this.adaptationDuration -= deltaTime;
            if (this.adaptationDuration <= 0) {
                this.adaptationActive = false;
            }
        } else if (this.adaptationCooldown > 0) {
            this.adaptationCooldown -= deltaTime;
        }
    }

    basicAttack(target) {
        if (!target || target.hp <= 0) return;
        
        // Calculate distance to target
        const distance = Math.sqrt(Math.pow(this.x - target.x, 2) + Math.pow(this.y - target.y, 2));
        
        // Check if target is in range (80 pixels)
        if (distance > 80) return;
        
        // Calculate damage
        let damage = this.attackDamage;
        const isCritical = Math.random() < this.criticalChance;
        
        if (isCritical) {
            damage *= this.criticalDamage;
        }
        
        // Apply damage reduction
        damage *= (1 - target.physicalDefense);
        
        // Deal damage
        target.takeDamage(Math.floor(damage), 'physical');
        
        // Show damage text
        game.showDamage(target.x + 25, target.y + 60, Math.floor(damage), isCritical);
        
        // Track HP loss for adaptation passive
        this.lastHpLossAmount += Math.floor(damage);
        this.lastHpLossTime = Date.now();
        
        // Check for adaptation trigger (5% HP loss in 3 seconds)
        if (this.lastHpLossAmount >= this.maxHp * 0.05 && 
            Date.now() - this.lastHpLossTime < 3000 &&
            this.adaptationCooldown <= 0) {
            this.adaptationStacks++;
            this.maxHp += 250;
            this.adaptationActive = true;
            this.adaptationDuration = 5000;
            this.adaptationCooldown = 3000;
            this.lastHpLossAmount = 0;
        }
        
        // Lifesteal (0% chance based on stats)
        if (Math.random() < this.lifestealChance) {
            const healAmount = Math.floor(damage * this.lifestealPercent);
            this.hp = Math.min(this.maxHp, this.hp + healAmount);
            game.showDamage(this.x + 25, this.y + 60, healAmount, false, true);
        }
    }

    useSkill(skillNumber, target) {
        const skillIndex = skillNumber - 1;
        
        // Check if skill is on cooldown
        if (this.skills[skillIndex].currentCooldown > 0) return;
        
        // Check if target exists and is alive
        if (!target || target.hp <= 0) return;
        
        // Calculate distance to target
        const distance = Math.sqrt(Math.pow(this.x - target.x, 2) + Math.pow(this.y - target.y, 2));
        
        // Use the selected skill
        switch (skillNumber) {
            case 1:
                // Skill 1: Area damage and slow
                if (distance > 150) return;
                
                const skill1Damage = 500 + (0.03 * this.maxHp);
                target.takeDamage(Math.floor(skill1Damage * (1 - target.physicalDefense)), 'physical');
                game.showDamage(target.x + 25, target.y + 60, Math.floor(skill1Damage * (1 - target.physicalDefense)), false);
                
                // Set cooldown
                this.skills[skillIndex].currentCooldown = this.skills[skillIndex].cooldown;
                break;
                
            case 2:
                // Skill 2: Knockback and slow
                if (distance > 100) return;
                
                const skill2Damage = 600 + (0.6 * this.attackDamage);
                target.takeDamage(Math.floor(skill2Damage * (1 - target.physicalDefense)), 'physical');
                game.showDamage(target.x + 25, target.y + 60, Math.floor(skill2Damage * (1 - target.physicalDefense)), false);
                
                // Knockback (simplified as moving player away)
                const knockbackAngle = Math.atan2(target.y - this.y, target.x - this.x);
                target.x += Math.cos(knockbackAngle) * 50;
                target.y += Math.sin(knockbackAngle) * 50;
                
                // Ensure player stays in bounds
                target.x = Math.max(0, Math.min(target.x, 500 - 50));
                target.y = Math.max(0, Math.min(target.y, 700 * 0.7 - 50));
                
                // Set cooldown
                this.skills[skillIndex].currentCooldown = this.skills[skillIndex].cooldown;
                break;
                
            case 3:
                // Skill 3: Laser damage
                if (distance > 200) return;
                
                const skill3Damage = 400 + (0.8 * this.attackDamage) + (1.4 * this.abilityPower) + (0.005 * this.maxHp);
                target.takeDamage(Math.floor(skill3Damage * (1 - target.magicDefense)), 'magic');
                game.showDamage(target.x + 25, target.y + 60, Math.floor(skill3Damage * (1 - target.magicDefense)), false);
                
                // Set cooldown
                this.skills[skillIndex].currentCooldown = this.skills[skillIndex].cooldown;
                break;
                
            case 4:
                // Skill 4: Increase HP and heal
                this.maxHp *= 1.2;
                this.hp += this.maxHp * 0.35;
                
                // Set cooldown
                this.skills[skillIndex].currentCooldown = this.skills[skillIndex].cooldown;
                break;
        }
    }

    takeDamage(amount, type) {
        let damageTaken = amount;
        
        // Apply damage reduction based on type
        if (type === 'physical') {
            damageTaken *= (1 - this.physicalDefense);
        } else if (type === 'magic') {
            damageTaken *= (1 - this.magicDefense);
        }
        // True damage is not reduced
        
        this.hp -= Math.floor(damageTaken);
        
        // Ensure HP doesn't go below 0
        this.hp = Math.max(0, this.hp);
        
        // Track HP loss for adaptation passive
        this.lastHpLossAmount += Math.floor(damageTaken);
        this.lastHpLossTime = Date.now();
        
        // Check for adaptation trigger (5% HP loss in 3 seconds)
        if (this.lastHpLossAmount >= this.maxHp * 0.05 && 
            Date.now() - this.lastHpLossTime < 3000 &&
            this.adaptationCooldown <= 0) {
            this.adaptationStacks++;
            this.maxHp += 250;
            this.adaptationActive = true;
            this.adaptationDuration = 5000;
            this.adaptationCooldown = 3000;
            this.lastHpLossAmount = 0;
        }
    }

    checkWallCollision(x, y) {
        // Simplified collision detection with walls
        const walls = document.querySelectorAll('.wall');
        const enemySize = 60;
        
        for (const wall of walls) {
            const wallRect = wall.getBoundingClientRect();
            const arenaRect = document.querySelector('.arena').getBoundingClientRect();
            
            const wallX = wallRect.left - arenaRect.left;
            const wallY = arenaRect.bottom - wallRect.bottom; // Convert to bottom-based coordinates
            const wallWidth = wallRect.width;
            const wallHeight = wallRect.height;
            
            if (x < wallX + wallWidth &&
                x + enemySize > wallX &&
                y < wallY + wallHeight &&
                y + enemySize > wallY) {
                return true;
            }
        }
        
        return false;
    }
    }
