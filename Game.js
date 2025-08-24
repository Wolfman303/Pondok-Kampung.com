/* Aegis Path TD — JavaScript murni */
(()=>{
  // ===== Util =====
  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
  const dist = (a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const lerp = (a,b,t)=>a+(b-a)*t;
  const lerpPt=(p1,p2,t)=>({x:lerp(p1.x,p2.x,t), y:lerp(p1.y,p2.y,t)});

  // ===== Konstanta Peta & Grid =====
  const TILE = 32;
  const W = 960, H = 640; // 30x20 tiles
  const COLS = W / TILE, ROWS = H / TILE;

  // ===== State Global =====
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const ui = {
    moneyEl: document.getElementById('money'),
    livesEl: document.getElementById('lives'),
    waveEl: document.getElementById('wave'),
    speedEl: document.getElementById('speed'),
    noticeEl: document.getElementById('notice'),
    selPanel: document.getElementById('selPanel'),
    selInfo: document.getElementById('selInfo'),
    upgradeBtn: document.getElementById('upgradeBtn'),
    sellBtn: document.getElementById('sellBtn'),
  };

  const controls = {
    start: document.getElementById('startBtn'),
    pause: document.getElementById('pauseBtn'),
    speed1: document.getElementById('speed1'),
    speed2: document.getElementById('speed2'),
    speed4: document.getElementById('speed4'),
  };

  let gameSpeed = 1; // 1,2,4
  let paused = false;

  // ===== Ekonomi & Progress =====
  let money = 300;
  let lives = 20;
  let waveIndex = 0; // 0..19

  // ===== Peta & Path =====
  // Waypoints (titik tengah jalur). Disusun zig-zag ringan.
  const path = [
    {x:0, y: 4*TILE+TILE/2},
    {x:7*TILE, y:4*TILE+TILE/2},
    {x:7*TILE, y:10*TILE+TILE/2},
    {x:15*TILE, y:10*TILE+TILE/2},
    {x:15*TILE, y:6*TILE+TILE/2},
    {x:23*TILE, y:6*TILE+TILE/2},
    {x:23*TILE, y:14*TILE+TILE/2},
    {x:W, y:14*TILE+TILE/2},
  ];

  // Precompute path segments length
  const segments = [];
  let totalLen = 0;
  for(let i=0;i<path.length-1;i++){
    const a=path[i], b=path[i+1];
    const len = Math.hypot(b.x-a.x,b.y-a.y);
    segments.push({a,b,len});
    totalLen+=len;
  }

  function pointAtProgress(p){ // p: 0..1
    let d = p*totalLen;
    for(const s of segments){
      if(d<=s.len){
        const t = d/s.len;
        return lerpPt(s.a,s.b,t);
      }
      d-=s.len;
    }
    return {...path[path.length-1]};
  }

  // Buat grid buildable: true kecuali area jalur yang kita "cat" tebal 2 tile
  const buildGrid = Array.from({length:ROWS},()=>Array.from({length:COLS},()=>true));
  function carvePath(){
    // cat jalur menjadi unbuildable disekitar path (lebar 2 tile)
    const radius = TILE*1.0; // setengah lebar
    for(let y=0;y<ROWS;y++){
      for(let x=0;x<COLS;x++){
        const cx=x*TILE+TILE/2, cy=y*TILE+TILE/2;
        // cari jarak min ke segmen path
        let minD=Infinity;
        for(const s of segments){
          // proyeksi titik ke segmen
          const vx = s.b.x - s.a.x, vy = s.b.y - s.a.y;
          const wx = cx - s.a.x, wy = cy - s.a.y;
          const c1 = vx*wx + vy*wy;
          const c2 = vx*vx + vy*vy;
          let t = c1/c2; t = clamp(t,0,1);
          const px = s.a.x + t*vx, py = s.a.y + t*vy;
          const d = Math.hypot(cx-px, cy-py);
          if(d<minD) minD=d;
        }
        if(minD < radius) buildGrid[y][x]=false;
      }
    }
  }
  carvePath();

  // ===== Entity Systems =====
  const towers = []; // {x,y,type,level,...}
  const enemies = []; // {type,hp,maxHp,armor,speed,progress,alive,regen}
  const bullets = []; // projectiles

  // ===== Tower & Enemy Defs =====
  const TOWER_DEF = {
    gun: {
      name:'Gun', cost:100,
      stats:[
        {range:120, dmg:10, cd:0.5},
        {range:140, dmg:14, cd:0.45},
        {range:160, dmg:18, cd:0.4},
      ],
      target:'single'
    },
    cannon: {
      name:'Cannon', cost:150,
      stats:[
        {range:136, dmg:26, cd:1.2, splash:64},
        {range:152, dmg:34, cd:1.1, splash:72},
        {range:168, dmg:44, cd:1.0, splash:80},
      ],
      target:'splash'
    },
    frost: {
      name:'Frost', cost:120,
      stats:[
        {range:112, dmg:6, cd:0.8, slow:0.4, slowDur:1.3},
        {range:128, dmg:8, cd:0.75, slow:0.45, slowDur:1.6},
        {range:144, dmg:10, cd:0.7, slow:0.5, slowDur:2.0},
      ],
      target:'slow'
    },
    laser: {
      name:'Laser', cost:200,
      stats:[
        {range:152, dps:30},
        {range:168, dps:40},
        {range:184, dps:55},
      ],
      target:'beam'
    },
  };

  const ENEMY_DEF = {
    grunt:  {hp:70,  speed:40, armor:0, reward:8},
    fast:   {hp:45,  speed:70, armor:0, reward:7},
    tank:   {hp:220, speed:28, armor:2, reward:18},
    regen:  {hp:120, speed:38, armor:1, reward:14, regen:4}, // per detik
    swarm:  {hp:24,  speed:55, armor:0, reward:3},
  };

  // ===== Waves =====
  const WAVES = [
    // Setiap wave: array of {type, count, interval}
    [ {type:'grunt', count:8, interval:0.7} ],
    [ {type:'grunt', count:12, interval:0.6} ],
    [ {type:'fast', count:15, interval:0.5} ],
    [ {type:'grunt', count:10, interval:0.5}, {type:'fast', count:8, interval:0.4} ],
    [ {type:'tank', count:6, interval:0.9} ],
    [ {type:'regen', count:10, interval:0.7} ],
    [ {type:'swarm', count:24, interval:0.25} ],
    [ {type:'fast', count:15, interval:0.45}, {type:'grunt', count:10, interval:0.55} ],
    [ {type:'tank', count:8, interval:0.85}, {type:'swarm', count:20, interval:0.25} ],
    [ {type:'regen', count:12, interval:0.7}, {type:'fast', count:12, interval:0.45} ],
    [ {type:'grunt', count:22, interval:0.5} ],
    [ {type:'swarm', count:36, interval:0.22} ],
    [ {type:'tank', count:10, interval:0.8} ],
    [ {type:'regen', count:16, interval:0.65} ],
    [ {type:'fast', count:24, interval:0.4} ],
    [ {type:'tank', count:12, interval:0.75}, {type:'fast', count:12, interval:0.4} ],
    [ {type:'grunt', count:40, interval:0.45} ],
    [ {type:'regen', count:24, interval:0.6} ],
    [ {type:'swarm', count:60, interval:0.2} ],
    [ {type:'tank', count:16, interval:0.7}, {type:'fast', count:20, interval:0.35} ],
  ];

  // ===== Input =====
  let hover = {x:0,y:0};
  let placing = null; // {type}
  let selectedTower = null;

  canvas.addEventListener('mousemove', e=>{
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    hover = {x:Math.floor(mx/TILE), y:Math.floor(my/TILE)};
  });

  canvas.addEventListener('contextmenu', e=>{ e.preventDefault(); placing=null; showNotice('Batal build.'); });

  canvas.addEventListener('click', e=>{
    const gx = hover.x, gy = hover.y;
    if(placing){
      if(canPlace(gx,gy)){
        placeTower(gx,gy, placing.type);
        placing=null;
      } else {
        showNotice('Tidak bisa menaruh di sini.');
      }
      return;
    }
    // pilih tower jika ada
    const t = towers.find(t=>t.gx===gx && t.gy===gy);
    selectedTower = t||null;
    updateSelectionPanel();
  });

  // UI Buttons
  document.querySelectorAll('.tower-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const type = btn.dataset.type;
      if(money < TOWER_DEF[type].cost){ showNotice('Uang tidak cukup.'); return; }
      placing = {type};
      selectedTower=null; updateSelectionPanel();
      showNotice(`Menaruh ${TOWER_DEF[type].name}... Klik di grid.`);
    });
  });

  controls.start.onclick = ()=> startWave();
  controls.pause.onclick = ()=> { paused = !paused; controls.pause.textContent = paused? '▶ Resume':'⏸ Pause'; };
  controls.speed1.onclick = ()=> setSpeed(1);
  controls.speed2.onclick = ()=> setSpeed(2);
  controls.speed4.onclick = ()=> setSpeed(4);

  ui.upgradeBtn.onclick = ()=>{
    if(!selectedTower) return;
    const def = TOWER_DEF[selectedTower.type];
    if(selectedTower.level>=def.stats.length-1){ showNotice('Sudah level maks.'); return; }
    const price = Math.round(def.cost*0.7);
    if(money<price){ showNotice('Uang tidak cukup untuk upgrade.'); return; }
    money-=price; selectedTower.level++;
    selectedTower.cooldown=0; // reset cd
    showNotice(`${def.name} di-upgrade ke Lv${selectedTower.level+1}.`);
  };

  ui.sellBtn.onclick = ()=>{
    if(!selectedTower) return;
    const def = TOWER_DEF[selectedTower.type];
    const invested = def.cost + Math.round(def.cost*0.7)*selectedTower.level;
    const refund = Math.round(invested*0.6);
    money+=refund;
    // kosongkan grid
    buildGrid[selectedTower.gy][selectedTower.gx]=true;
    const idx = towers.indexOf(selectedTower);
    if(idx>=0) towers.splice(idx,1);
    selectedTower=null; updateSelectionPanel();
    showNotice(`Tower dijual (+${refund}).`);
  };

  function setSpeed(s){ gameSpeed=s; ui.speedEl.textContent = s+'×'; }

  function showNotice(msg){ ui.noticeEl.textContent = msg; setTimeout(()=>{ if(ui.noticeEl.textContent===msg) ui.noticeEl.textContent=''; }, 2000); }

  // ===== Placement =====
  function canPlace(gx,gy){
    if(gx<0||gy<0||gx>=COLS||gy>=ROWS) return false;
    if(!buildGrid[gy][gx]) return false;
    // tidak boleh menimpa tower
    if(towers.some(t=>t.gx===gx && t.gy===gy)) return false;
    return true;
  }

  function placeTower(gx,gy,type){
    const def = TOWER_DEF[type];
    if(money<def.cost) { showNotice('Uang tidak cukup.'); return; }
    money -= def.cost;
    towers.push({ gx, gy, x:gx*TILE+TILE/2, y:gy*TILE+TILE/2, type, level:0, cooldown:0, beamTarget:null });
    buildGrid[gy][gx]=false;
    showNotice(`${def.name} dibangun.`);
  }

  function updateSelectionPanel(){
    if(selectedTower){
      ui.selPanel.classList.add('active');
      const def = TOWER_DEF[selectedTower.type];
      ui.selInfo.textContent = `${def.name} Lv${selectedTower.level+1}`;
    } else {
      ui.selPanel.classList.remove('active');
    }
  }

  // ===== Wave Manager =====
  let spawning = null; // {wave, partIdx, left, timer, interval}

  function startWave(){
    if(spawning) { showNotice('Wave sedang berjalan.'); return; }
    if(waveIndex>=WAVES.length){ showNotice('Semua wave selesai!'); return; }
    spawning = { wave:WAVES[waveIndex], partIdx:0, left:WAVES[waveIndex][0].count, timer:0, interval:WAVES[waveIndex][0].interval };
    showNotice(`Wave ${waveIndex+1} dimulai!`);
  }

  function updateSpawning(dt){
    if(!spawning) return;
    const part = spawning.wave[spawning.partIdx];
    spawning.timer -= dt;
    if(spawning.timer<=0 && spawning.left>0){
      spawnEnemy(part.type);
      spawning.left--;
      spawning.timer += part.interval;
    }
    if(spawning.left<=0){
      // lanjut part
      if(spawning.partIdx < spawning.wave.length-1){
        spawning.partIdx++;
        const np = spawning.wave[spawning.partIdx];
        spawning.left = np.count; spawning.interval=np.interval; spawning.timer=0.5;
      } else {
        // selesai spawning; tunggu bersih
        if(enemies.length===0){
          waveIndex++;
          money+=40+waveIndex*3; // bonus wave
          spawning=null;
          if(waveIndex<WAVES.length) showNotice(`Wave ${waveIndex} selesai. Siap untuk berikutnya.`);
        }
      }
    }
  }

  function spawnEnemy(type){
    const d=ENEMY_DEF[type];
    enemies.push({ type, hp:d.hp, maxHp:d.hp, armor:d.armor||0, speed:d.speed, reward:d.reward, regen:d.regen||0, progress:0, slowMul:1, slowTimer:0, alive:true });
  }

  // ===== Combat =====
  function enemyPos(e){ return pointAtProgress(e.progress); }

  function dealDamage(e, rawDmg, opts={}){
    const ignoreArmor = opts.ignoreArmor||0; // 0..1
    const effArmor = Math.max(0, e.armor*(1-ignoreArmor));
    const final = Math.max(1, Math.round(rawDmg - effArmor));
    e.hp -= final;
    if(e.hp<=0){
      e.alive=false; money+=e.reward;
    }
  }

  function applySlow(e, mul, dur){
    e.slowMul = Math.min(e.slowMul, (1-mul)); // mul=0.4 => 60% speed; cap by min
    e.slowTimer = Math.max(e.slowTimer, dur);
  }

  // ===== Game Loop =====
  let last=performance.now();
  function loop(t){
    const now = performance.now();
    let dt = (now-last)/1000; last=now;
    dt *= paused?0:gameSpeed;

    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function update(dt){
    // Waves
    updateSpawning(dt);

    // Enemies
    for(const e of enemies){
      if(!e.alive) continue;
      // Regen
      if(e.regen) e.hp = Math.min(e.maxHp, e.hp + e.regen*dt);
      // Slow timer decay
      if(e.slowTimer>0){ e.slowTimer-=dt; if(e.slowTimer<=0){ e.slowMul=1; e.slowTimer=0; } }
      // Move
      const speed = Math.max(16, e.speed * e.slowMul); // cap min speed
      e.progress += (speed*dt)/totalLen;
      if(e.progress>=1){
        e.alive=false; lives--; if(lives<=0){ gameOver(); return; }
      }
    }
    // Remove dead/off
    for(let i=enemies.length-1;i>=0;i--) if(!enemies[i].alive || enemies[i].hp<=0) enemies.splice(i,1);

    // Towers: targeting & fire
    for(const t of towers){
      t.cooldown = Math.max(0, t.cooldown-dt);
      const def = TOWER_DEF[t.type];
      const s = def.stats[t.level];

      if(def.target==='beam'){
        // cari target terdepan dalam range
        const target = pickTarget(t, s.range);
        t.beamTarget = target||null;
        if(target){
          // laser DPS kontinu, ignore 50% armor
          dealDamage(target, s.dps*dt, {ignoreArmor:0.5});
        }
        continue;
      }

      if(t.cooldown>0) continue;
      const target = pickTarget(t, s.range);
      if(!target) continue;

      if(def.target==='single'){
        fireBullet(t, target, s.dmg, 0);
        t.cooldown = s.cd;
      } else if(def.target==='splash'){
        fireBullet(t, target, s.dmg, s.splash||0);
        t.cooldown = s.cd;
      } else if(def.target==='slow'){
        fireBullet(t, target, s.dmg, 0, {slow:s.slow, slowDur:s.slowDur});
        t.cooldown = s.cd;
      }
    }

    // Bullets
    for(const b of bullets){
      b.life-=dt; if(b.life<=0){ b.dead=true; continue; }
      const dx=b.tx-b.x, dy=b.ty-b.y; const d=Math.hypot(dx,dy);
      const step = b.speed*dt;
      if(step>=d){ // hit
        if(b.splash>0){
          for(const e of enemies){ if(!e.alive) continue; const p = enemyPos(e); if(Math.hypot(p.x-b.tx, p.y-b.ty)<=b.splash){ dealDamage(e,b.dmg); if(b.slow) applySlow(e,b.slow.mul,b.slow.dur); } }
        } else {
          if(b.target && b.target.alive){ dealDamage(b.target,b.dmg); if(b.slow) applySlow(b.target,b.slow.mul,b.slow.dur); }
        }
        b.dead=true; continue;
      }
      b.x += dx/d*step; b.y += dy/d*step;
    }
    for(let i=bullets.length-1;i>=0;i--) if(bullets[i].dead) bullets.splice(i,1);

    // UI
    ui.moneyEl.textContent = money;
    ui.livesEl.textContent = lives;
    ui.waveEl.textContent = Math.min(waveIndex+ (spawning?1:0), WAVES.length);
  }

  function pickTarget(t, range){
    const s = TOWER_DEF[t.type].stats[t.level];
    const r = s.range;
    let best=null, bestProg=-1;
    for(const e of enemies){ if(!e.alive) continue; const p=enemyPos(e); if(Math.hypot(p.x - t.x, p.y - t.y) <= r){ if(e.progress>bestProg){ bestProg=e.progress; best=e; } } }
    return best;
  }

  function fireBullet(t, target, dmg, splash=0, opts={}){
    const p = enemyPos(target);
    bullets.push({ x:t.x, y:t.y, tx:p.x, ty:p.y, target, dmg, splash, slow:opts.slow?{mul:opts.slow, dur:opts.slowDur}:null, speed:300, life:2.5 });
  }

  function gameOver(){
    paused=true; showNotice('Game Over');
  }

  // ===== Rendering =====
  function render(){
    ctx.clearRect(0,0,W,H);

    // Background grid
    for(let y=0;y<ROWS;y++){
      for(let x=0;x<COLS;x++){
        const bx = x*TILE, by = y*TILE;
        // base tile
        ctx.fillStyle = buildGrid[y][x] ? '#0e1534' : '#1b2a69';
        ctx.fillRect(bx,by,TILE,TILE);
      }
    }

    // Draw path glow (visual)
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#5bd4ff';
    ctx.lineWidth = TILE*1.2;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
    for(let i=1;i<path.length;i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
    ctx.restore();

    // Bullets
    for(const b of bullets){
      ctx.fillStyle = b.splash>0? '#ffd28a' : (b.slow? '#8ad0ff' : '#ffffff');
      ctx.beginPath(); ctx.arc(b.x,b.y, b.splash>0? 5:3, 0, Math.PI*2); ctx.fill();
      if(b.splash>0){ ctx.globalAlpha=0.15; ctx.beginPath(); ctx.arc(b.x,b.y,b.splash,0,Math.PI*2); ctx.fillStyle='#ffd28a'; ctx.fill(); ctx.globalAlpha=1; }
    }

    // Towers
    for(const t of towers){
      const def=TOWER_DEF[t.type]; const s=def.stats[t.level];
      // range circle jika dipilih atau saat placing hover di tile ini
      if(selectedTower===t){
        ctx.globalAlpha=0.12; ctx.fillStyle='#6ae1ff'; ctx.beginPath(); ctx.arc(t.x,t.y,s.range,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
      }
      ctx.fillStyle = ({gun:'#a9b8ff', cannon:'#ffb88a', frost:'#8ad0ff', laser:'#d7a6ff'})[t.type];
      ctx.strokeStyle = '#0a0f26';
      ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(t.x,t.y, 12, 0, Math.PI*2); ctx.fill(); ctx.stroke();

      // laser beam
      if(def.target==='beam' && t.beamTarget && t.beamTarget.alive){
        const p = enemyPos(t.beamTarget);
        ctx.strokeStyle='#ffd6ff'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(t.x,t.y); ctx.lineTo(p.x,p.y); ctx.stroke();
      }
    }

    // Enemies
    for(const e of enemies){
      const p = enemyPos(e);
      // body
      ctx.fillStyle = ({grunt:'#83ffa1', fast:'#a3fffd', tank:'#ffd48a', regen:'#baff83', swarm:'#ffffff'})[e.type] || '#fff';
      ctx.beginPath(); ctx.arc(p.x,p.y, 10, 0, Math.PI*2); ctx.fill();
      // hp bar
      const w=24, h=4; const hpw = clamp((e.hp/e.maxHp)*w,0,w);
      ctx.fillStyle='#1a1f3d'; ctx.fillRect(p.x-w/2, p.y-16, w, h);
      ctx.fillStyle='#62ff8a'; ctx.fillRect(p.x-w/2, p.y-16, hpw, h);
      if(e.slowMul<1){ ctx.fillStyle='#8ad0ff'; ctx.fillRect(p.x-w/2, p.y-12, w*(1-e.slowMul), 2); }
    }

    // Hover / Placing highlight
    if(hover){
      const bx=hover.x*TILE, by=hover.y*TILE;
      ctx.globalAlpha=0.3;
      ctx.fillStyle = (placing? (canPlace(hover.x,hover.y)? '#78ffba':'#ff8a8a') : '#ffffff');
      ctx.fillRect(bx,by,TILE,TILE);
      ctx.globalAlpha=1;
      if(placing){
        const def=TOWER_DEF[placing.type]; const s=def.stats[0];
        const cx=bx+TILE/2, cy=by+TILE/2;
        ctx.globalAlpha=0.12; ctx.fillStyle='#6ae1ff'; ctx.beginPath(); ctx.arc(cx,cy,s.range,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
      }
    }
  }

  // ===== Init =====
  function reset(){ money=300; lives=20; waveIndex=0; towers.length=0; enemies.length=0; bullets.length=0; paused=false; gameSpeed=1; ui.speedEl.textContent='1×'; }
  reset();
  ui.moneyEl.textContent=money; ui.livesEl.textContent=lives; ui.waveEl.textContent=0;
  requestAnimationFrame(loop);
})();
