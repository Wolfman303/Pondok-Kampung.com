const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight * 0.6;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Buat arena, player, bot
const arena = new Arena();
const player = new Player(100, 100);
const bot = new Bot(600, 600);

// Kamera
let camera = { x:0, y:0 };

function gameLoop() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Update
  player.update(joy, arena.width, arena.height);

  // Kamera follow player
  camera.x = clamp(player.x - canvas.width/2, 0, arena.width - canvas.width);
  camera.y = clamp(player.y - canvas.height/2, 0, arena.height - canvas.height);

  // Draw
  arena.draw(ctx, camera);
  player.draw(ctx, camera);
  bot.draw(ctx, camera);

  requestAnimationFrame(gameLoop);
}
gameLoop();
