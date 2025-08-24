const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- UI refs
const playerFill = document.getElementById("playerFill");
const enemyFill  = document.getElementById("enemyFill");
const playerTxt  = document.getElementById("playerTxt");
const enemyTxt   = document.getElementById("enemyTxt");
const statusTray = document.getElementById("statusTray");

// Skill buttons
const btnS1 = document.getElementById("skill1");
const btnS2 = document.getElementById("skill2");
const btnS3 = document.getElementById("skill3");
const btnS4 = document.getElementById("skill4");
const btnBA = document.getElementById("basic");

// Joystick
const joy = document.getElementById("joystick");
const stick = document.getElementById("stick");

function now() { return performance.now() / 1000; } // seconds

/* ========== CONSTANTS / HELPERS ========== */
const TWO_PI = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a, b, t) => a + (b - a) * t;

function circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
  const testX = clamp(cx, rx, rx + rw);
  const testY = clamp(cy, ry, ry + rh);
  const dx = cx - testX;
  const dy = cy - testY;
  return (dx*dx + dy*dy) <= (cr*cr);
}

/* ========== ARENA / WALLS ========== */
const walls = [
  { x: 100, y: 280, width: 400, height: 26 },
  { x: 60,  y: 520, width: 480, height: 26 },
  { x: 220, y: 720, width: 160, height: 26 },
];

/* ========== ENTITY BLUEPRINTS ========== */

const player = {
  name: "Player",
  x: 300, y: 820, r: 26, color: "#33d1ff",
  maxHp: 20000, hp: 20000,
  basePhysicalRed: 0.30, baseMagicRed: 0.25,
  regenEvery: 2.0, baseRegen: 50,

  atk: 700, ap: 100,
  baseAS: 1.7, // attacks per second
  critChance: 0.60, critDmg: 1.5,
  lifestealChance: 0.60, lifestealPct: 0.20,
  range: 52, // melee reach
  speed: 220, // px/s

  // derived
  vx: 0, vy: 0,
  nextAttackAt: 0,
  buffs: [],
  debuffs: [],
  states: { stunnedUntil: 0, frozenUntil: 0, slowedUntil: 0, slowPct: 0 },

  // passive stacks
  frenzyReady: true,
  frenzyUntil: 0,
  frenzyCooldownUntil: 0, // 15s cd after frenzy ends

  // skill states
  cds: { s1: 0, s2: 0, s3: 0, s4a: 0, s4b: 0 },
  cdMax: { s1: 9, s2: 12, s3: 18, s4a: 45, s4bWindow: 6, s4b: 0 },

  // S1 temporary buffs
  s1_ASUntil: 0,
  s1_doubleBasicUntil: 0,

  // S3 mark
  blackMarkUntil: 0, // on enemy, tracked globally

  // S2 ground effects
  grounds: [], // {rect, until, dpsTimer}

  damageLog: [], // for floating texts
};

const enemy = {
  name: "Mahoraga",
  x: 300, y: 160, r: 34, color: "#ff4040",
  maxHp: 80000, hp: 80000,
  basePhysicalRed: 0.55, baseMagicRed: 0.48,
  regenEvery: 2.0, baseRegen: 130,

  atk: 740, ap: 200,
  baseAS: 1.1,
  critChance: 0.10, critDmg: 1.2,
  lifestealChance: 0, lifestealPct: 0.20, // 0% chance anyway
  range: 60,
  speed: 170,

  vx: 0, vy: 0,
  nextAttackAt: 0,
  buffs: [],
  debuffs: [],
  states: { stunnedUntil: 0, frozenUntil: 0, slowedUntil: 0, slowPct: 0, knockback: null },

  // AI
  thinkEvery: 0.2, nextThinkAt: 0,
  cds: { s1: 0, s2: 0, s3: 0, s4: 0 },
  cdMax: { s1: 22, s2: 9, s3: 12, s4: 70 },

  // Passive: Adaptation
  stacks: 0,
  dmgWindow: [], // [{t,amount}] within last 3s
  stackLockUntil: 0,
  regenHot: null, // {until, perSec, tickAt}

  // S4 enlarge
  enlargedUntil: 0,
  enlargeMaxHpBonusPct: 0.20,
  s4Hot: null, // {until, total, duration, perTick, tickEvery, tickAt}
};

/* ========== FLOATING TEXTS ========== */
const floats = []; // {x,y,text,color,alpha,vy}

/* ========== STATUS BADGES UI ========== */
function setBadges() {
  statusTray.innerHTML = "";
  const items = [];

  // Player passive stack info
  const missingPct = (1 - player.hp / player.maxHp) * 100;
  const stacks = clamp(Math.floor(missingPct / 2), 0, 30);
  if (stacks > 0) items.push(`Player Passive: ${stacks} stack`);

  if (player.frenzyUntil > t) items.push("Frenzy +AS +Lifesteal");
  if (player.s1_ASUntil > t) items.push("S1: +30% AS");
  if (player.s1_doubleBasicUntil > t) items.push("S1: 40% double hit");

  if (enemy.regenHot) items.push(`Mahoraga Regen (${enemy.stacks} st)`);
  if (enemy.enlargedUntil > t) items.push("Mahoraga: Enlarge");
  if (player.states.frozenUntil > t) items.push("Player Frozen");
  if (enemy.states.frozenUntil > t) items.push("Mahoraga Frozen");
  if (player.states.stunnedUntil > t) items.push("Player Stunned");
  if (enemy.states.stunnedUntil > t) items.push("Mahoraga Stunned");

  items.forEach(txt => {
    const el = document.createElement("div");
    el.className = "badge"; el.textContent = txt;
    statusTray.appendChild(el);
  });
}

/* ========== DAMAGE / HEAL CORE ========== */
function applyReductions(amount, type, target) {
  let dmg = amount;
  const baseRed = type === "physical" ? target.basePhysicalRed
               : type === "magic"    ? target.baseMagicRed
               : 0;
  dmg *= (1 - baseRed);

  // Player passive: extra reduction AFTER base reductions
  if (target === player) {
    const missingPct = (1 - player.hp / player.maxHp) * 100;
    const stacks = clamp(Math.floor(missingPct / 2), 0, 30);
    if (stacks > 0) {
      const extra =
        (type === "physical") ? (1 - 0.01 * stacks) :
        (type === "magic")    ? (1 - 0.005 * stacks) : 1;
      dmg *= extra;
    }
  }
  return dmg;
}

function addFloating(x, y, text, color) {
  floats.push({ x, y, text, color, alpha: 1, vy: -24 });
}

function dealDamage(attacker, target, base, type) {
  // crit
  let crit = false;
  if (Math.random() < attacker.critChance) { base *= attacker.critDmg; crit = true; }

  // reductions
  const dmg = (type === "true") ? base : applyReductions(base, type, target);

  // apply
  target.hp = Math.max(0, target.hp - dmg);
  addFloating(target.x, target.y - target.r - 6, `-${Math.floor(dmg)}`, type === "magic" ? "#66aaff" :
                                                  type === "true"  ? "#ffd166" : "#ff6b6b");
  if (crit) addFloating(target.x, target.y - target.r - 22, "CRIT!", "#ffd54f");

  // lifesteal (on player basic only, and also we allow on skill if you want? Spec: lifesteal via basic attack. We'll tie it to a flag set by caller.)
  return dmg;
}

function heal(target, amount, tag="+") {
  const prev = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  const gain = target.hp - prev;
  if (gain > 0) addFloating(target.x, target.y - target.r - 6, `${tag}${Math.floor(gain)}`, "#7dfc7d");
}

/* ========== BASIC ATTACKS ========== */
function currentAS(entity) {
  let as = entity.baseAS;

  // Player frenzy buff
  if (entity === player && player.frenzyUntil > t) as *= 1.20;

  // Player S1 buff
  if (entity === player && player.s1_ASUntil > t) as *= 1.30;

  return as;
}
function inRange(a, b) { return dist(a, b) <= a.range + b.r; }

function tryBasicAttack(attacker, target) {
  if (t < attacker.nextAttackAt) return;
  if (!inRange(attacker, target)) return;
  if (isDisabled(attacker)) return;

  const as = currentAS(attacker);
  attacker.nextAttackAt = t + 1 / as;

  // Hit
  const base = attacker.atk;
  const dealt = dealDamage(attacker, target, base, "physical");

  // Player lifesteal rules: 60% chance to heal 20% of damage on basic
  if (attacker === player) {
    let lsChance = player.lifestealChance;
    if (player.frenzyUntil > t) lsChance += 0.20; // +20% chance in frenzy
    if (Math.random() < lsChance) {
      heal(player, dealt * player.lifestealPct);
    }

    // S1: window where 40% chance double basic
    if (player.s1_doubleBasicUntil > t && Math.random() < 0.40) {
      const extra = dealDamage(attacker, target, base, "physical");
      if (Math.random() < lsChance) heal(player, extra * player.lifestealPct);
    }
  }
}

/* ========== DISABLES / STATES ========== */
function isDisabled(e) {
  return t < e.states.stunnedUntil || t < e.states.frozenUntil;
}
function applyStun(target, dur) {
  target.states.stunnedUntil = Math.max(target.states.stunnedUntil, t + dur);
}
function applyFreeze(target, dur) {
  target.states.frozenUntil = Math.max(target.states.frozenUntil, t + dur);
}
function applySlow(target, pct, dur) {
  target.states.slowedUntil = Math.max(target.states.slowedUntil, t + dur);
  target.states.slowPct = Math.max(target.states.slowPct, pct);
}

/* ========== PLAYER SKILLS ========== */

// Helper: dash/jump movement with collision bypass simple
function moveInstantBehind(attacker, target, gap=24) {
  const ang = Math.atan2(target.y - attacker.y, target.x - attacker.x);
  const bx = target.x - Math.cos(ang) * (target.r + attacker.r + gap);
  const by = target.y - Math.sin(ang) * (target.r + attacker.r + gap);
  attacker.x = clamp(bx, attacker.r+2, canvas.width - attacker.r-2);
  attacker.y = clamp(by, attacker.r+2, canvas.height - attacker.r-2);
}

function coneHit(origin, target, dirAngle, spreadRad, range) {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const d = Math.hypot(dx, dy);
  if (d > range + target.r) return false;
  const ang = Math.atan2(dy, dx);
  let diff = Math.abs(((ang - dirAngle + Math.PI) % (2*Math.PI)) - Math.PI);
  return diff <= spreadRad/2;
}

function rectFromVector(x, y, angle, length, width) {
  // centered width, forward length; return polygon points
  const hw = width/2;
  const nx = Math.cos(angle), ny = Math.sin(angle);
  const px = -ny, py = nx;
  const p1 = {x: x + px*hw, y: y + py*hw};
  const p2 = {x: p1.x + nx*length, y: p1.y + ny*length};
  const p3 = {x: x - px*hw + nx*length, y: y - py*hw + ny*length};
  const p4 = {x: x - px*hw, y: y - py*hw};
  return [p1,p2,p3,p4];
}
function pointInPoly(pt, poly) {
  // ray-casting
  let c = false;
  for (let i=0, j=poly.length-1; i<poly.length; j=i++) {
    const xi=poly[i].x, yi=poly[i].y, xj=poly[j].x, yj=poly[j].y;
    const intersect = ((yi>pt.y)!=(yj>pt.y)) &&
                      (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi + 1e-9) + xi);
    if (intersect) c = !c;
  }
  return c;
}

function playerSkill1() {
  if (t < player.cds.s1) return;
  // dash to behind target, stun 0.8s, deal magic 650 + .6AD + .8AP
  moveInstantBehind(player, enemy, 14);
  applyStun(enemy, 0.8);
  const base = 650 + 0.6*player.atk + 0.8*player.ap;
  dealDamage(player, enemy, base, "magic");

  // +30% AS 4s and basic attacks 40% chance double within window
  player.s1_ASUntil = t + 4;
  player.s1_doubleBasicUntil = t + 4;

  player.cds.s1 = t + player.cdMax.s1;
}

function playerSkill2() {
  if (t < player.cds.s2) return;

  // Slash rectangle forward from player
  const dir = Math.atan2(enemy.y - player.y, enemy.x - player.x);
  const poly = rectFromVector(player.x, player.y, dir, 220, 80);

  // Immediate hit + slow
  if (pointInPoly(enemy, poly)) {
    const base = 700 + 1.0*player.atk;
    const dealt = dealDamage(player, enemy, base, "physical");
    applySlow(enemy, 0.20, 3);
  }

  // Ground effect persists 3s: slow 20% inside; DoT 80 + 20% AD + 20% AP per 1s tick while inside
  const ground = {
    poly, until: t + 3, tickAt: t + 1,
    dps: 80 + 0.2*player.atk + 0.2*player.ap,
  };
  player.grounds.push(ground);

  player.cds.s2 = t + player.cdMax.s2;
}

function playerSkill3() {
  if (t < player.cds.s3) return;

  // Jump to target, true damage 1000 + 85% AD + 5% of target max HP
  moveInstantBehind(player, enemy, 10);
  const base = 1000 + 0.85*player.atk + 0.05*enemy.maxHp;
  dealDamage(player, enemy, base, "true");

  // If enemy has no black mark, reset CD and apply mark 4s
  if (player.blackMarkUntil < t) {
    player.blackMarkUntil = t + 4;
    player.cds.s3 = t; // reset
  } else {
    player.cds.s3 = t + player.cdMax.s3;
  }
}

function playerSkill4() {
  // Two-stage: Stage A then within 6s Stage B
  // We multiplex on cds.s4a for stage A availability; cds.s4b holds end-of-window for B
  if (player.cds.s4a <= t) {
    // Stage A: cone freeze
    // Determine facing towards enemy
    const dir = Math.atan2(enemy.y - player.y, enemy.x - player.x);
    const hit = coneHit(player, enemy, dir, Math.PI * 0.9, 260);
    if (hit) {
      const base = 1200 + 1.20 * player.ap;
      dealDamage(player, enemy, base, "magic");
      applyFreeze(enemy, 1.2);
    }
    player.cds.s4a = t + player.cdMax.s4a;
    player.cds.s4b = t + 6; // window to recast
  } else if (player.cds.s4b >= t) {
    // Stage B (recast) available in window
    const dir = Math.atan2(enemy.y - player.y, enemy.x - player.x);
    const hit = coneHit(player, enemy, dir, Math.PI * 0.9, 260);
    if (hit) {
      const base = 1800 + 1.50 * player.atk;
      // If enemy still frozen from stage A, freeze ends immediately and damage becomes TRUE
      let type = "physical";
      if (enemy.states.frozenUntil > t) {
        enemy.states.frozenUntil = t; // end early
        type = "true";
      }
      const dealt = dealDamage(player, enemy, base, type);
      // Burn: 1.5% max HP per 0.5s for 3s
      const burn = {
        until: t + 3, tickEvery: 0.5, tickAt: t + 0.5,
        perTick: 0.015 * enemy.maxHp,
        type: "true" // burn is %maxHP true-like (stated physical DoT, but spec: "efek bakar sebesar 1,5% max HP per 0,5s" — we can treat as true to be impactful)
      };
      enemy.debuffs.push({ kind: "burn", data: burn });
    }
    player.cds.s4b = 0; // consume window
  } else {
    // Neither available
  }
}

/* ========== ENEMY SKILLS (AI) ========== */
function enemySkill1() {
  if (t < enemy.cds.s1) return false;
  // Semicircle in front
  const dir = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  const hit = coneHit(enemy, player, dir, Math.PI, 120);
  if (hit) {
    const base = 500 + 0.03 * enemy.maxHp;
    dealDamage(enemy, player, base, "physical");
    applySlow(player, 0.30, 1);
  }
  enemy.cds.s1 = t + enemy.cdMax.s1;
  return true;
}

function enemySkill2() {
  if (t < enemy.cds.s2) return false;
  const d = dist(enemy, player);
  if (d <= 140) {
    const base = 600 + 0.60 * enemy.atk;
    dealDamage(enemy, player, base, "physical");
    // Knockback + slow 40% decaying 2s
    const ang = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    const kb = { vx: Math.cos(ang)*380, vy: Math.sin(ang)*380, until: t + 0.18 };
    player.states.knockback = kb;
    // slow decays
    applySlow(player, 0.40, 2);
    enemy.cds.s2 = t + enemy.cdMax.s2;
    return true;
  }
  return false;
}
function enemySkill3() {
  if (t < enemy.cds.s3) return false;
  // Laser line
  const dir = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  // Check if player is near the line within width
  const range = 500, width = 36;
  const dx = Math.cos(dir), dy = Math.sin(dir);
  const relx = player.x - enemy.x, rely = player.y - enemy.y;
  const proj = relx*dx + rely*dy; // along the beam
  const perp = Math.abs(relx*(-dy) + rely*(dx)); // distance from line
  if (proj > -player.r && proj < range && perp < (width/2 + player.r)) {
    const base = 400 + 0.80*enemy.atk + 1.40*enemy.ap + 0.005*enemy.maxHp;
    dealDamage(enemy, player, base, "magic");
  }
  enemy.cds.s3 = t + enemy.cdMax.s3;
  return true;
}
function enemySkill4() {
  if (t < enemy.cds.s4) return false;
  // Enlarge: +20% max HP 10s, HoT 35% max HP over 12s
  enemy.enlargedUntil = t + 10;
  const bonus = enemy.enlargeMaxHpBonusPct * enemy.maxHp;
  enemy.maxHp += bonus;
  enemy.hp += bonus; // keep same ratio + bonus pool

  // Heal over time
  const totalHeal = 0.35 * enemy.maxHp; // based on current (enlarged) pool
  const duration = 12, tickEvery = 0.5;
  enemy.s4Hot = {
    until: t + duration, perTick: totalHeal / (duration / tickEvery),
    tickEvery, tickAt: t + tickEvery
  };

  enemy.cds.s4 = t + enemy.cdMax.s4;
  return true;
}

/* ========== ENEMY PASSIVE: ADAPTATION ========== */
function enemyRecordDamage(amount) {
  // track damage events for last 3s
  enemy.dmgWindow.push({ t, amount });
}
function enemyCheckStack() {
  // remove old
  enemy.dmgWindow = enemy.dmgWindow.filter(e => t - e.t <= 3);
  if (t < enemy.stackLockUntil) return;
  const recent = enemy.dmgWindow.reduce((a,b)=>a+b.amount, 0);
  const threshold = 0.05 * enemy.maxHp;
  if (recent >= threshold) {
    // gain stack
    enemy.stacks += 1;
    enemy.maxHp += 250;
    // do not auto-heal missing when increasing maxHP
    // Regen starts (override previous)
    const perSec = 20 + 2 * enemy.stacks;
    enemy.regenHot = { until: t + 5, perSec, tickAt: t + 1 };
    enemy.stackLockUntil = t + 3;
  }
}

/* ========== TICK / TIMERS ========== */
let last = now();
let t = last;

let regenTickP = t + player.regenEvery;
let regenTickE = t + enemy.regenEvery;

function updateTimers(dt) {
  // Player base regen
  if (t >= regenTickP) {
    heal(player, player.baseRegen);
    regenTickP = t + player.regenEvery;
  }
  // Enemy base regen
  if (t >= regenTickE) {
    heal(enemy, enemy.baseRegen);
    regenTickE = t + enemy.regenEvery;
  }

  // Player frenzy trigger (when stacks reach 30)
  if (player.frenzyReady && player.frenzyUntil < t && player.frenzyCooldownUntil < t) {
    const missingPct = (1 - player.hp / player.maxHp) * 100;
    const stacks = Math.floor(missingPct / 2);
    if (stacks >= 30) {
      player.frenzyUntil = t + 5;
      player.frenzyCooldownUntil = t + 20; // 5s active + 15s cd = 20 from start
      addFloating(player.x, player.y - 48, "FRENZY!", "#b3ff66");
    }
  }
  if (player.frenzyUntil < t && player.frenzyCooldownUntil > t) {
    // during cooldown, nothing special to do
  }

  // Player S2 grounds
  player.grounds = player.grounds.filter(g => g.until > t);
  for (const g of player.grounds) {
    // slow if inside
    if (pointInPoly(enemy, g.poly)) {
      applySlow(enemy, 0.20, 0.15); // keep refreshing
      if (t >= g.tickAt) {
        const dealt = dealDamage(player, enemy, g.dps, "physical");
        g.tickAt = t + 1;
      }
    }
  }

  // Enemy HoT from passive
  if (enemy.regenHot) {
    if (t >= enemy.regenHot.until) {
      enemy.regenHot = null;
    } else if (t >= enemy.regenHot.tickAt) {
      heal(enemy, enemy.regenHot.perSec, "+");
      enemy.regenHot.tickAt = t + 1;
    }
  }

  // Enemy S4 HoT
  if (enemy.s4Hot) {
    if (t >= enemy.s4Hot.until) {
      enemy.s4Hot = null;
    } else if (t >= enemy.s4Hot.tickAt) {
      heal(enemy, enemy.s4Hot.perTick, "+");
      enemy.s4Hot.tickAt = t + enemy.s4Hot.tickEvery;
    }
  }

  // Enemy debuffs (burn)
  enemy.debuffs = enemy.debuffs.filter(d => d.data.until > t);
  for (const d of enemy.debuffs) {
    const B = d.data;
    if (!B.tickAt) B.tickAt = t + B.tickEvery;
    if (t >= B.tickAt) {
      // burn damage (true by design)
      dealDamage(player, enemy, B.perTick, B.type || "physical");
      B.tickAt = t + B.tickEvery;
    }
  }

  // End enlarge reverting maxHp
  if (enemy.enlargedUntil > 0 && t >= enemy.enlargedUntil) {
    // remove bonus 20% added earlier
    const bonus = enemy.enlargeMaxHpBonusPct / (1 + enemy.enlargeMaxHpBonusPct) * enemy.maxHp;
    const newMax = enemy.maxHp - bonus;
    // clamp current hp
    enemy.maxHp = newMax;
    enemy.hp = Math.min(enemy.hp, enemy.maxHp);
    enemy.enlargedUntil = 0;
  }

  // Clear slows after time and decay
  for (const e of [player, enemy]) {
    if (t >= e.states.slowedUntil) e.states.slowPct = 0;
  }

  setBadges();
}

/* ========== MOVEMENT / COLLISION ========== */
function effectiveSpeed(e) {
  let sp = e.speed;
  if (e.states.slowPct > 0) sp *= (1 - e.states.slowPct);
  return sp;
}
function moveEntity(e, dt) {
  // knockback (only used on player)
  if (e.states.knockback && t < e.states.knockback.until) {
    e.x += e.states.knockback.vx * dt;
    e.y += e.states.knockback.vy * dt;
  } else {
    e.states.knockback = null;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }

  // borders
  e.x = clamp(e.x, e.r+2, canvas.width  - e.r-2);
  e.y = clamp(e.y, e.r+2, canvas.height - e.r-2);

  // wall collision (simple push-out)
  for (const w of walls) {
    if (circleRectCollide(e.x, e.y, e.r, w.x, w.y, w.width, w.height)) {
      // push the entity out towards least-penetration axis
      // compute nearest point
      const nearestX = clamp(e.x, w.x, w.x + w.width);
      const nearestY = clamp(e.y, w.y, w.y + w.height);
      const dx = e.x - nearestX, dy = e.y - nearestY;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx/len, uy = dy/len;
      e.x = nearestX + ux * (e.r + 0.1);
      e.y = nearestY + uy * (e.r + 0.1);
    }
  }
}

/* ========== AI ========== */
function enemyThink() {
  if (t < enemy.nextThinkAt) return;
  enemy.nextThinkAt = t + enemy.thinkEvery;

  // face / move towards player unless disabled
  if (!isDisabled(enemy)) {
    const ang = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    const sp = effectiveSpeed(enemy);
    const d = dist(enemy, player);
    if (d > enemy.range * 0.9) {
      enemy.vx = Math.cos(ang)*sp;
      enemy.vy = Math.sin(ang)*sp;
    } else {
      enemy.vx = 0; enemy.vy = 0;
    }

    // try skills by priority
    if (enemy.hp / enemy.maxHp < 0.65) {
      if (enemySkill4()) return; // enlarge if hurt
    }
    if (dist(enemy, player) < 160 && enemySkill2()) return;
    if (enemySkill1()) return;
    if (enemySkill3()) return;
  } else {
    enemy.vx = 0; enemy.vy = 0;
  }
}

/* ========== RENDER ========== */
function drawArena() {
  // grid
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,.05)";
  ctx.lineWidth = 1;
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
  }
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
  }
  ctx.restore();

  // walls
  ctx.fillStyle = "#3b4256";
  walls.forEach(w => ctx.fillRect(w.x, w.y, w.width, w.height));

  // S2 ground effects
  for (const g of player.grounds) {
    ctx.save();
    ctx.fillStyle = "rgba(80,180,255,.18)";
    ctx.beginPath();
    ctx.moveTo(g.poly[0].x, g.poly[0].y);
    for (let i=1;i<g.poly.length;i++) ctx.lineTo(g.poly[i].x, g.poly[i].y);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
function drawEntity(e) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(e.x, e.y, e.r, 0, TWO_PI);
  ctx.fillStyle = e.color; ctx.fill();
  // outline
  ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.5)"; ctx.stroke();

  // status rings
  if (isDisabled(e)) {
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r+6, 0, TWO_PI);
    ctx.strokeStyle = e.states.frozenUntil > t ? "#9ad0ff" : "#ffd166";
    ctx.lineWidth = 2; ctx.stroke();
  }
  if (e.states.slowPct > 0) {
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r+10, 0, TWO_PI);
    ctx.strokeStyle = "rgba(140,160,255,.6)"; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.restore();
}
function drawFloats(dt) {
  for (const f of floats) {
    f.y += f.vy * dt;
    f.alpha -= 0.8 * dt;
  }
  // render
  for (const f of floats) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, f.alpha);
    ctx.fillStyle = f.color; ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }
  // prune
  for (let i=floats.length-1;i>=0;i--) if (floats[i].alpha <= 0) floats.splice(i,1);
}

function drawUI() {
  // HP bars
  playerFill.style.width = `${(player.hp/player.maxHp*100).toFixed(2)}%`;
  enemyFill.style.width  = `${(enemy.hp/enemy.maxHp*100).toFixed(2)}%`;
  playerTxt.textContent = `Player: ${Math.floor(player.hp)} / ${Math.floor(player.maxHp)}`;
  enemyTxt.textContent  = `Mahoraga: ${Math.floor(enemy.hp)} / ${Math.floor(enemy.maxHp)}`;

  // Cooldown overlays
  function setCD(el, readyAt, maxCd) {
    const cd = el.querySelector(".cd");
    const remain = Math.max(0, readyAt - t);
    if (remain > 0) {
      cd.classList.add("active");
      cd.textContent = Math.ceil(remain).toString();
    } else cd.classList.remove("active");
  }
  setCD(btnS1, player.cds.s1, player.cdMax.s1);
  setCD(btnS2, player.cds.s2, player.cdMax.s2);
  setCD(btnS3, player.cds.s3, player.cdMax.s3);
  // Skill 4 shows stage A CD; stage B window shows countdown too
  const cd4 = btnS4.querySelector(".cd");
  if (player.cds.s4b >= t) {
    cd4.classList.add("active");
    cd4.textContent = (player.cds.s4b - t).toFixed(1);
  } else {
    setCD(btnS4, player.cds.s4a, player.cdMax.s4a);
  }
}

/* ========== GAME LOOP ========== */
function update(dt) {
  // speeds -> vx/vy from joystick (player)
  if (!isDisabled(player)) {
    const sp = effectiveSpeed(player);
    player.vx = joyState.dx * sp;
    player.vy = joyState.dy * sp;
  } else {
    player.vx = 0; player.vy = 0;
  }

  // Move
  moveEntity(player, dt);
  moveEntity(enemy, dt);

  // AI
  enemyThink();

  // Basic attacks
  tryBasicAttack(player, enemy);
  tryBasicAttack(enemy, player);

  // Timers, HoTs/DoTs
  updateTimers(dt);

  // Death / win
  if (player.hp <= 0 || enemy.hp <= 0) {
    const txt = player.hp <= 0 ? "KALAH!" : "MENANG!";
    addFloating(canvas.width/2, canvas.height/2, txt, "#fff");
    // stop movement
    player.vx = player.vy = enemy.vx = enemy.vy = 0;
  }
}

function render(dt) {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawArena();
  drawEntity(player);
  drawEntity(enemy);
  drawFloats(dt);
  drawUI();
}

function loop() {
  const n = now();
  const dt = Math.min(0.033, n - last);
  last = t = n;

  update(dt);
  render(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ========== INPUT: JOYSTICK & SKILLS ========== */
// Joystick logic
const joyRect = joy.getBoundingClientRect();
let joyState = { active:false, dx:0, dy:0 };

function setStick(dx, dy) {
  // clamp to radius 56
  const len = Math.hypot(dx, dy);
  const max = 56;
  let ux = 0, uy = 0, mag = 0;
  if (len > 0) { ux = dx/len; uy = dy/len; mag = Math.min(max, len); }
  stick.style.left = (40 + ux*mag) + "px";
  stick.style.top  = (40 + uy*mag) + "px";
  // normalized velocity
  joyState.dx = (ux * (mag/max));
  joyState.dy = (uy * (mag/max));
}

function joyStart(clientX, clientY) {
  joyState.active = true;
  const r = joy.getBoundingClientRect();
  setStick(clientX - (r.left + r.width/2), clientY - (r.top + r.height/2));
}
function joyMove(clientX, clientY) {
  if (!joyState.active) return;
  const r = joy.getBoundingClientRect();
  setStick(clientX - (r.left + r.width/2), clientY - (r.top + r.height/2));
}
function joyEnd() {
  joyState.active = false; setStick(0,0);
}

joy.addEventListener("touchstart", e => { const t=e.changedTouches[0]; joyStart(t.clientX,t.clientY); e.preventDefault(); }, {passive:false});
joy.addEventListener("touchmove",  e => { const t=e.changedTouches[0]; joyMove(t.clientX,t.clientY); e.preventDefault(); }, {passive:false});
joy.addEventListener("touchend",   e => { joyEnd(); e.preventDefault(); }, {passive:false});
joy.addEventListener("mousedown", e => { joyStart(e.clientX,e.clientY); });
window.addEventListener("mousemove", e => { joyMove(e.clientX,e.clientY); });
window.addEventListener("mouseup", () => joyEnd());

// Skill bindings
btnS1.addEventListener("click", playerSkill1);
btnS2.addEventListener("click", playerSkill2);
btnS3.addEventListener("click", playerSkill3);
btnS4.addEventListener("click", playerSkill4);
// optional basic button to force swing if in range
btnBA.addEventListener("click", () => tryBasicAttack(player, enemy));

/* ========== EXTRA: DAMAGE TAP / DEBUG ==========
   Tap canvas to make player face/step toward enemy quickly (no teleport)
   Also logs damage to enemy for passive tracking
=============================================== */
canvas.addEventListener("click", () => {
  // Nudge towards enemy (for fun)
  const ang = Math.atan2(enemy.y - player.y, enemy.x - player.x);
  player.x += Math.cos(ang)*8;
  player.y += Math.sin(ang)*8;
});

/* ========== HOOK DAMAGE EVENTS FOR ENEMY PASSIVE ========== */
// Wrap dealDamage to record vs enemy for adaptation check
const _dealDamage = dealDamage;
function dealDamageWrapper(attacker, target, base, type) {
  // compute pre-reduction to get actual final for logs
  // done inside _dealDamage; but we need final value for enemy passive threshold
  const prevHp = target.hp;
  const res = _dealDamage(attacker, target, base, type);
  const delta = prevHp - target.hp;
  if (target === enemy && delta > 0) {
    enemyRecordDamage(delta);
    enemyCheckStack();
  }
  return res;
}
// replace
dealDamage = dealDamageWrapper;

/* ========== QUALITY OF LIFE: ORIENTATION LOCK HINT ========== */
// (Tip only; browsers may ignore programmatic lock.)
if (screen.orientation && screen.orientation.lock) {
  screen.orientation.lock("portrait").catch(()=>{});
}
