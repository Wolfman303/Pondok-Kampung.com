const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight * 0.6;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// ===== Karakter =====
let player = { x: canvas.width/2, y: canvas.height/2, size: 25, color: "cyan", speed: 3 };

// ===== Joystick =====
const joystick = document.getElementById("joystick");
const stick = document.getElementById("stick");
let joy = { active:false, dx:0, dy:0, max:40 };

joystick.addEventListener("touchstart", e => {
  joy.active = true;
});
joystick.addEventListener("touchend", e => {
  joy.active = false;
  stick.style.left = "40px";
  stick.style.top = "40px";
  joy.dx = 0; joy.dy = 0;
});
joystick.addEventListener("touchmove", e => {
  e.preventDefault();
  const rect = joystick.getBoundingClientRect();
  const touch = e.touches[0];
  let x = touch.clientX - rect.left - rect.width/2;
  let y = touch.clientY - rect.top - rect.height/2;

  const dist = Math.sqrt(x*x + y*y);
  if(dist > joy.max) {
    x = (x / dist) * joy.max;
    y = (y / dist) * joy.max;
  }

  stick.style.left = (40 + x) + "px";
  stick.style.top = (40 + y) + "px";

  joy.dx = x / joy.max;
  joy.dy = y / joy.max;
}, { passive:false });

// ===== Skill Buttons =====
const skillButtons = document.querySelectorAll(".btn[data-skill]");
let cooldowns = {};

skillButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    let skill = btn.dataset.skill;
    if(cooldowns[skill]) return; // masih cooldown

    // aktifkan skill (contoh: hanya log)
    console.log("Skill " + skill + " digunakan!");

    // kasih efek cooldown
    startCooldown(btn, skill, 3 + parseInt(skill)); // cooldown 4–7 detik
  });
});

function startCooldown(btn, skill, duration) {
  btn.classList.add("cooldown");
  cooldowns[skill] = duration;
  let cdText = document.createElement("div");
  cdText.className = "cooldown-text";
  cdText.innerText = duration;
  btn.appendChild(cdText);

  let interval = setInterval(() => {
    cooldowns[skill]--;
    if(cooldowns[skill] > 0) {
      cdText.innerText = cooldowns[skill];
    } else {
      clearInterval(interval);
      delete cooldowns[skill];
      btn.classList.remove("cooldown");
      btn.removeChild(cdText);
    }
  }, 1000);
}

// ===== Game Loop =====
function gameLoop() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Gerakkan player
  player.x += joy.dx * player.speed;
  player.y += joy.dy * player.speed;

  // Batas arena
  player.x = Math.max(player.size, Math.min(canvas.width-player.size, player.x));
  player.y = Math.max(player.size, Math.min(canvas.height-player.size, player.y));

  // Gambar player
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, Math.PI*2);
  ctx.fill();

  requestAnimationFrame(gameLoop);
}
gameLoop();
