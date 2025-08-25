// Main game initialization
function main() {
    // Initialize game
    initGame();
    
    // Initialize UI
    initUI();
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Start the game when the page is loaded
window.addEventListener('load', main);
