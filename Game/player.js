// player.js
class Player {
    constructor() {
        this.x = 100;
        this.y = 100;
        this.speed = 200; // pixels per second
        this.moveX = 0;
        this.moveY = 0;
        
        // Stats
        this.maxHp = 20000;
        this.hp = this.maxHp;
        this.physicalDefense = 0.3;
        this.magicDefense = 0.25;
        this.hpRegen = 50; // per 2 seconds
        this.attackDamage = 700;
        this.abilityPower = 100;
        this.attackSpeed = 1.7; // attacks per second
        this.criticalChance = 0.6;
        this.criticalDamage = 1.5;
        this.lifestealChance = 0.6;
        this.lifestealPercent = 0.2;
        
        // Passive
        this.passiveStacks = 0;
        this.maxPassiveStacks = 30;
        this.passiveActive = false;
        this.passiveCooldown = 0;
        this.passiveDuration = 0;
        
        // Attack timer
        this.attackTimer = 0;
        this.attackInterval = 1000 / this.attackSpeed;
        
        // Regen timer
        this.regenTimer = 0;
        this.regenInterval = 2000;
        
        // Skills
        this.skills = [
            { cooldown: 9000, currentCooldown: 0 },
            { cooldown: 12000, currentCooldown: 0 },
            { cooldown: 18000, currentCooldown: 0 },
            { cooldown: 45000, currentCooldown: 0 }
        ];
        
        // Skill 1 buff
        this.skill1BuffActive = false;
        this.skill1BuffDuration = 0;
        
        // Skill 3 mark
        this.skill3Marked = false;
        this.skill3MarkDuration = 0;
        
        // Skill 4 phase
        this.skill4Phase = 1;
        this.skill4SecondCastAvailable = false;
        this.skill4SecondCastTimer = 0;
    }

    move(x, y) {
        this.moveX = x;
        this.moveY = y;
    }

    update(deltaTime, enemy) {
        // Convert deltaTime to seconds
        const deltaSeconds = deltaTime / 1000;
        
        // Movement
        const newX = this.x + this.moveX * this.speed * deltaSeconds;
        const newY = this.y + this.moveY * this.speed * deltaSeconds;
        
        // Check collision with walls
        if (!this.checkWallCollision(newX, newY)) {
            this.x = Math.max(0, Math.min(newX, 500 - 50)); // 500 is arena width, 50 is player size
            this.y = Math.max(0, Math.min(newY, 700 * 0.7 - 50)); // 70% of 700px is arena height
        }
        
        // Auto attack
        this.attackTimer += deltaTime;
        if (this.attackTimer >= this.attackInterval) {
            this.attackTimer = 0;
            this.basicAttack(enemy);
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
        
        // Update passive
        this.updatePassive(deltaTime);
        
        // Update skill buffs
        if (this.skill1BuffActive) {
            this.skill1BuffDuration -= deltaTime;
            if (this.skill1BuffDuration <= 0) {
                this.skill1BuffActive = false;
            }
        }
        
        if (this.skill3Marked) {
            this.skill3MarkDuration -= deltaTime;
            if (this.skill3MarkDuration <= 0) {
                this.skill3Marked = false;
            }
        }
        
        if (this.skill4SecondCastAvailable) {
            this.skill4SecondCastTimer -= deltaTime;
            if (this.skill4SecondCastTimer <= 0) {
                this.skill4SecondCastAvailable = false;
                this.skill4Phase = 1;
            }
        }
    }

    updatePassive(deltaTime) {
        // Calculate lost HP percentage
        const lostHpPercent = (this.maxHp - this.hp) / this.maxHp * 100;
        const newStacks = Math.min(this.maxPassiveStacks, Math.floor(lostHpPercent / 2));
        
        if (newStacks > this.passiveStacks) {
            this.passiveStacks = newStacks;
        }
        
        // Handle passive cooldown and activation
        if (this.passiveActive) {
            this.passiveDuration -= deltaTime;
            if (this.passiveDuration <= 0) {
                this.passiveActive = false;
                this.passiveCooldown = 15000; // 15 seconds cooldown
            }
        } else if (this.passiveCooldown > 0) {
            this.passiveCooldown -= deltaTime;
        } else if (this.passiveStacks >= this.maxPassiveStacks) {
            this.passiveActive = true;
            this.passiveDuration = 5000; // 5 seconds duration
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
        
        // Lifesteal
        if (Math.random() < (this.passiveActive ? this.lifestealChance * 1.2 : this.lifestealChance)) {
            const healAmount = Math.floor(damage * this.lifestealPercent);
            this.hp = Math.min(this.maxHp, this.hp + healAmount);
            game.showDamage(this.x + 25, this.y + 60, healAmount, false, true);
        }
        
        // Double attack chance from skill 1
        if (this.skill1BuffActive && Math.random() < 0.4) {
            setTimeout(() => {
                let doubleDamage = this.attackDamage;
                const isDoubleCritical = Math.random() < this.criticalChance;
                
                if (isDoubleCritical) {
                    doubleDamage *= this.criticalDamage;
                }
                
                doubleDamage *= (1 - target.physicalDefense);
                
                target.takeDamage(Math.floor(doubleDamage), 'physical');
                game.showDamage(target.x + 25, target.y + 60, Math.floor(doubleDamage), isDoubleCritical);
                
                // Lifesteal for double attack
                if (Math.random() < (this.passiveActive ? this.lifestealChance * 1.2 : this.lifestealChance)) {
                    const doubleHealAmount = Math.floor(doubleDamage * this.lifestealPercent);
                    this.hp = Math.min(this.maxHp, this.hp + doubleHealAmount);
                    game.showDamage(this.x + 25, this.y + 60, doubleHealAmount, false, true);
                }
            }, 200);
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
                // Skill 1: Dash to target, stun, and deal damage
                if (distance > 200) return; // Maximum dash range
                
                // Move to target
                this.x = target.x + 50;
                this.y = target.y;
                
                // Stun target (simplified as no action for 0.8s)
                // In a real game, we would have a stun mechanism
                
                // Deal damage
                const skill1Damage = 650 + (0.6 * this.attackDamage) + (0.8 * this.abilityPower);
                target.takeDamage(Math.floor(skill1Damage * (1 - target.magicDefense)), 'magic');
                game.showDamage(target.x + 25, target.y + 60, Math.floor(skill1Damage * (1 - target.magicDefense)), false);
                
                // Apply buff
                this.skill1BuffActive = true;
                this.skill1BuffDuration = 4000;
                
                // Show effect
                game.showAbilityEffect(target.x, target.y, 'skill1-effect');
                
                // Set cooldown
                this.skills[skillIndex].currentCooldown = this.skills[skillIndex].cooldown;
                break;
                
            case 2:
                // Skill 2: Area damage and slow
                // In a real game, we would have an area targeting system
                // For simplicity, we'll just damage the target if in range
                if (distance > 150) return;
                
                // Initial damage
                const skill2InitialDamage = 700 + this.attackDamage;
                target.takeDamage(Math.floor(skill2InitialDamage * (1 - target.physicalDefense)), 'physical');
                game.showDamage(target.x + 25, target.y + 60, Math.floor(skill2InitialDamage * (1 - target.physicalDefense)), false);
                
                // Show effect
                game.showAbilityEffect(target.x, target.y, 'skill2-effect');
                
                // DoT effect (simplified as instant additional damage)
                const skill2DotDamage = (80 + (0.2 * this.attackDamage) + (0.2 * this.abilityPower)) * 5;
                target.takeDamage(Math.floor(skill2DotDamage * (1 - target.physicalDefense)), 'physical');
                
                // Set cooldown
                this.skills[skillIndex].currentCooldown = this.skills[skillIndex].cooldown;
                break;
                
            case 3:
                // Skill 3: Jump to target and deal true damage
                if (distance > 150) return;
                
                // Move to target
                this.x = target.x;
                this.y = target.y;
                
                // Deal damage
                let skill3Damage = 1000 + (0.85 * this.attackDamage) + (0.05 * target.maxHp);
                
                if (!target.skill3Marked) {
                    // Reset cooldown if target doesn't have mark
                    this.skills[skillIndex].currentCooldown = 0;
                    target.skill3Marked = true;
                    target.skill3MarkDuration = 4000;
                } else {
                    // Set cooldown normally
                    this.skills[skillIndex].currentCooldown = this.skills[skillIndex].cooldown;
                }
                
                target.takeDamage(Math.floor(skill3Damage), 'true');
                game.showDamage(target.x + 25, target.y + 60, Math.floor(skill3Damage), false);
                
                // Show effect
                game.showAbilityEffect(target.x, target.y, 'skill3-effect');
                break;
                
            case 4:
                // Skill 4: Two-phase area attack
                if (this.skill4Phase === 1) {
                    // First phase: Freeze
                    if (distance > 200) return;
                    
                    const skill4FirstDamage = 1200 + (1.2 * this.abilityPower);
                    target.takeDamage(Math.floor(skill4FirstDamage * (1 - target.magicDefense)), 'magic');
                    game.showDamage(target.x + 25, target.y + 60, Math.floor(skill4FirstDamage * (1 - target.magicDefense)), false);
                    
                    // Show effect
                    game.showAbilityEffect(target.x, target.y, 'skill4-effect');
                    
                    // Enable second phase
                    this.skill4SecondCastAvailable = true;
                    this.skill4SecondCastTimer = 6000;
                    this.skill4Phase = 2;
                    
                    // Don't set cooldown yet, wait for second phase
                } else if (this.skill4Phase === 2 && this.skill4SecondCastAvailable) {
                    // Second phase: Burn
                    if (distance > 200) return;
                    
                    let skill4SecondDamage = 1800 + (1.5 * this.attackDamage);
                    
                    // If target was frozen, convert to true damage
                    // For simplicity, we'll just check if we recently used phase 1
                    if (this.skill4SecondCastTimer > 0) {
                        skill4SecondDamage = Math.floor(skill4SecondDamage);
                    } else {
                        skill4SecondDamage = Math.floor(skill4SecondDamage * (1 - target.physicalDefense));
                    }
                    
                    target.takeDamage(skill4SecondDamage, this.skill4SecondCastTimer > 0 ? 'true' : 'physical');
                    game.showDamage(target.x + 25, target.y + 60, skill4SecondDamage, false);
                    
                    // Burn DoT (simplified as instant additional damage)
                    const burnDamage = (0.015 * target.maxHp) * 6; // 1.5% max HP per 0.5s for 3s = 6 ticks
                    target.takeDamage(Math.floor(burnDamage), 'true');
                    
                    // Set cooldown
                    this.skills[skillIndex].currentCooldown = this.skills[skillIndex].cooldown;
                    this.skill4SecondCastAvailable = false;
                    this.skill4Phase = 1;
                }
                break;
        }
    }

    takeDamage(amount, type) {
        let damageTaken = amount;
        
        // Apply damage reduction based on type
        if (type === 'physical') {
            damageTaken *= (1 - this.physicalDefense);
            
            // Apply passive damage reduction
            if (this.passiveStacks > 0) {
                damageTaken *= (1 - (0.01 * this.passiveStacks));
            }
        } else if (type === 'magic') {
            damageTaken *= (1 - this.magicDefense);
            
            // Apply passive damage reduction
            if (this.passiveStacks > 0) {
                damageTaken *= (1 - (0.005 * this.passiveStacks));
            }
        }
        // True damage is not reduced
        
        this.hp -= Math.floor(damageTaken);
        
        // Ensure HP doesn't go below 0
        this.hp = Math.max(0, this.hp);
    }

    checkWallCollision(x, y) {
        // Simplified collision detection with walls
        const walls = document.querySelectorAll('.wall');
        const playerSize = 50;
        
        for (const wall of walls) {
            const wallRect = wall.getBoundingClientRect();
            const arenaRect = document.querySelector('.arena').getBoundingClientRect();
            
            const wallX = wallRect.left - arenaRect.left;
            const wallY = arenaRect.bottom - wallRect.bottom; // Convert to bottom-based coordinates
            const wallWidth = wallRect.width;
            const wallHeight = wallRect.height;
            
            if (x < wallX + wallWidth &&
                x + playerSize > wallX &&
                y < wallY + wallHeight &&
                y + playerSize > wallY) {
                return true;
            }
        }
        
        return false;
    }
        }
