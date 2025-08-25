const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Sesuaikan ukuran canvas dengan layar
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight * 0.6;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Render arena game
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Arena Game (tempat karakter & map)", 50, 50);
  requestAnimationFrame(gameLoop);
}
gameLoop();
