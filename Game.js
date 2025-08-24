const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// === Player & Enemy Stats ===
let player = {
  name: "Rendra",
  x: 300, y: 800,
  radius: 25,
  color: "cyan",
  hp: 20000,
  maxHp: 20000,
  atk: 700,
  ap: 100,
  speed: 4,
  critChance: 0.6,
  critDmg: 1.5,
  lifestealChance: 0.6,
  lifestealPercent: 0.2,
  cooldowns: { s1:0, s2:0, s3:0, s4:0 }
};

let enemy = {
  name: "Mahoraga",
  x: 300, y: 200,
  radius: 35,
  color: "red",
  hp: 80000,
  maxHp: 80000,
  atk: 740,
  ap: 200,
  speed: 2,
  critChance: 0.1,
  critDmg: 1.2,
  cooldowns: { s1:0, s2:0, s3:0, s4:0 }
};

// === Arena Obstacle ===
let walls = [
  {x:150,y:400,width:300,height:20},
  {x:100,y:600,width:400,height:20}
];

// === Utility ===
function drawHPBars() {
  document.getElementById("playerHP").style.width = (player.hp/player.maxHp*100)+"%";
  document.getElementById("enemyHP").style.width = (enemy.hp/enemy.maxHp*100)+"%";
}

function damage(attacker, target, amount, type="physical") {
  let dmg = amount;
  // apply reduction
  if(type==="physical") {
    dmg *= (1 - (target===enemy?0.55:0.30));
  } else if(type==="magic") {
    dmg *= (1 - (target===enemy?0.48:0.25));
  }
  // crit
  if(Math.random()<attacker.critChance) dmg *= attacker.critDmg;
  // apply
  target.hp -= dmg;
  if(target.hp<0) target.hp=0;
  showFloatingText("-"+Math.floor(dmg), target.x, target.y, "red");
  // lifesteal
  if(attacker===player && Math.random()<attacker.lifestealChance) {
    let heal = dmg*attacker.lifestealPercent;
    attacker.hp = Math.min(attacker.maxHp, attacker.hp+heal);
    showFloatingText("+"+Math.floor(heal), attacker.x, attacker.y, "lime");
  }
}

let texts = [];
function showFloatingText(text,x,y,color) {
  texts.push({text,x,y,color,alpha:1});
}

// === Drawing ===
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // walls
  ctx.fillStyle="#666";
  for(let w of walls) {
    ctx.fillRect(w.x,w.y,w.width,w.height);
  }

  // player
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2);
  ctx.fill();

  // enemy
  ctx.fillStyle = enemy.color;
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI*2);
  ctx.fill();

  // floating texts
  for(let t of texts) {
    ctx.globalAlpha = t.alpha;
    ctx.fillStyle = t.color;
    ctx.font="20px Arial";
    ctx.fillText(t.text, t.x, t.y);
    t.y -= 1;
    t.alpha -= 0.02;
  }
  ctx.globalAlpha=1;
  texts = texts.filter(t=>t.alpha>0);

  drawHPBars();
}

// === Game Loop ===
function gameLoop() {
  draw();
  requestAnimationFrame(gameLoop);
}
gameLoop();
