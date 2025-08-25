// UI controls initialization
function initUI() {
    // Joystick setup
    const joystickBase = document.getElementById('joystick-base');
    const joystick = document.getElementById('joystick');
    let joystickActive = false;
    const joystickRadius = 35;
    
    // Touch events for mobile
    joystickBase.addEventListener('touchstart', handleJoystickStart);
    document.addEventListener('touchmove', handleJoystickMove);
    document.addEventListener('touchend', handleJoystickEnd);
    
    // Mouse events for desktop
    joystickBase.addEventListener('mousedown', handleJoystickStart);
    document.addEventListener('mousemove', handleJoystickMove);
    document.addEventListener('mouseup', handleJoystickEnd);
    
    // Skill buttons
    document.getElementById('skill1').addEventListener('click', useSkill1);
    document.getElementById('skill2').addEventListener('click', useSkill2);
    document.getElementById('skill3').addEventListener('click', useSkill3);
    document.getElementById('skill4').addEventListener('click', useSkill4);
    
    // Basic attack button
    document.getElementById('basic-attack').addEventListener('click', performBasicAttack);
    
    function handleJoystickStart(e) {
        e.preventDefault();
        joystickActive = true;
        updateJoystickPosition(e);
    }
    
    function handleJoystickMove(e) {
        if (!joystickActive) return;
        e.preventDefault();
        updateJoystickPosition(e);
    }
    
    function handleJoystickEnd(e) {
        joystickActive = false;
        resetJoystick();
    }
    
    function updateJoystickPosition(e) {
        const rect = joystickBase.getBoundingClientRect();
        const baseX = rect.left + rect.width / 2;
        const baseY = rect.top + rect.height / 2;
        
        let clientX, clientY;
        
        if (e.type.includes('touch')) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        const dx = clientX - baseX;
        const dy = clientY - baseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        if (distance > joystickRadius) {
            // Limit joystick to its base
            const limitedX = Math.cos(angle) * joystickRadius;
            const limitedY = Math.sin(angle) * joystickRadius;
            joystick.style.transform = `translate(-50%, -50%) translate(${limitedX}px, ${limitedY}px)`;
            
            // Set player direction
            player.direction.x = Math.cos(angle);
            player.direction.y = Math.sin(angle);
        } else {
            // Move joystick to touch position
            joystick.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
            
            // Set player direction proportional to joystick position
            player.direction.x = dx / joystickRadius;
            player.direction.y = dy / joystickRadius;
        }
        
        player.isMoving = true;
    }
    
    function resetJoystick() {
        joystick.style.transform = 'translate(-50%, -50%)';
        player.direction.x = 0;
        player.direction.y = 0;
        player.isMoving = false;
    }
}

// Initialize UI when page loads
window.addEventListener('load', initUI);
