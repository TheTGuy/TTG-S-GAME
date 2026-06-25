import { drawMap, getMap, buildPathSet, TILE, MAPS } from './map.js';
import { Tower, TOWER_DEFS, drawHoverRange } from './towers.js';
import { updateProjectiles, drawProjectiles, updateParticles, drawParticles } from './projectiles.js';
import { WaveManager } from './waves.js';
import { buildTowerPanel, refreshTowerPanel, showTowerInfo, hideTowerInfo, updateHUD, setCommentary, showScreen } from './ui.js';

let state = null;

function initGame(mapName) {
  const canvas = document.getElementById('canvas');
  const map = getMap(mapName);
  const W = map.cols * TILE, H = map.rows * TILE;
  canvas.width = W;
  canvas.height = H;

  const pathSet = buildPathSet(map.path);

  let path = map.path;
  let path2 = null;
  
  if (map.splitAt !== undefined) {
    const splitIdx = map.splitAt;
    const totalLen = map.path.length;
    const base = map.path.slice(0, splitIdx + 1);
    const remaining = map.path.slice(splitIdx + 1);
    const midPoint = Math.floor(remaining.length / 2);
    
    path = [...base, ...remaining.slice(0, midPoint)];
    path2 = [...base, ...remaining.slice(midPoint)];
  }

  state = {
    mapName, map, pathSet, path, path2,
    canvas, ctx: canvas.getContext('2d'),
    W, H,
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    gold: 150,
    lives: 20,
    selectedType: null,
    selectedTower: null,
    hoverCol: -1,
    hoverRow: -1,
    paused: false,
    speed: 1,
    phase: 'prep',
    waveNum: 0,
    mapCache: null,
    wave: null,
    wave2: null,
    lastTime: null
  };

  state.wave = new WaveManager(mapName, path, (txt) => setCommentary(txt));
  if (mapName === 'split' && path2) {
    state.wave2 = new WaveManager(mapName, path2, () => {});
  }

  cacheMap();
  buildTowerPanel(
    document.getElementById('tower-list'),
    (type) => selectTowerType(type),
    () => state.gold
  );

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', onCanvasClick);
  canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); deselectAll(); });

  document.getElementById('btn-wave').addEventListener('click', startWave);
  document.getElementById('btn-pause').addEventListener('click', togglePause);
  document.getElementById('btn-speed').addEventListener('click', toggleSpeed);
  document.getElementById('btn-menu-back').addEventListener('click', goMenu);

  prepareNextWave();
  requestAnimationFrame(loop);
}

function cacheMap() {
  const off = document.createElement('canvas');
  off.width = state.W; off.height = state.H;
  drawMap(off.getContext('2d'), state.mapName, state.W, state.H);
  state.mapCache = off;
}

async function prepareNextWave() {
  document.getElementById('btn-wave').disabled = true;
  const stats = getPlayerStats();
  const data = await state.wave.prepareWave(stats);
  if (state.wave2) await state.wave2.prepareWave(stats);
  document.getElementById('btn-wave').disabled = false;
  setCommentary(`Next: ${data.name} — Ready when you are`);
}

function startWave() {
  if (state.phase !== 'prep') return;
  state.phase = 'wave';
  document.getElementById('btn-wave').disabled = true;
  state.wave.startWave(state.enemies);
  if (state.wave2) {
    state.wave2.waveData = state.wave.waveData;
    state.wave2.waveNum = state.wave.waveNum;
    state.wave2.startWave(state.enemies);
  }
}

function loop(ts) {
  if (!state) return;
  const dt = state.lastTime ? Math.min((ts - state.lastTime) / 1000, 0.05) * state.speed : 0;
  state.lastTime = ts;

  if (!state.paused) update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  if (state.phase === 'wave') {
    state.wave.update(dt, state.enemies);
    if (state.wave2) state.wave2.update(dt, state.enemies);
  }

  for (const e of state.enemies) {
    e.update(dt, state.enemies);
    if (e.reached && !e.dead) {
      e.dead = true;
      state.lives--;
      updateHUD(state.gold, state.lives, state.waveNum);
      if (state.lives <= 0) { gameOver(); return; }
    }
  }

  for (const t of state.towers) {
    t.update(dt, state.enemies, state.projectiles);
  }

  updateProjectiles(state.projectiles, state.enemies, state.particles, (enemy) => {
    state.gold += enemy.reward;
    updateHUD(state.gold, state.lives, state.waveNum);
    refreshTowerPanel(document.getElementById('tower-list'), state.selectedType, state.gold);
  });

  updateParticles(state.particles, dt);

  state.enemies = state.enemies.filter(e => !e.dead || e.hp > 0);

  if (state.phase === 'wave' && state.wave.isWaveComplete(state.enemies)) {
    state.phase = 'prep';
    state.waveNum = state.wave.waveNum;
    updateHUD(state.gold, state.lives, state.waveNum);
    state.wave.onWaveEnd(getPlayerStats());
    prepareNextWave();
    if (state.waveNum >= 20) gameWin();
  }
}

function draw() {
  const ctx = state.ctx;
  ctx.drawImage(state.mapCache, 0, 0);

  if (state.selectedType && state.hoverCol >= 0) {
    const valid = canPlace(state.hoverCol, state.hoverRow);
    ctx.fillStyle = valid ? 'rgba(100,200,100,0.3)' : 'rgba(200,60,60,0.3)';
    ctx.fillRect(state.hoverCol * TILE, state.hoverRow * TILE, TILE, TILE);
    drawHoverRange(ctx, state.hoverCol, state.hoverRow, state.selectedType);
  }

  for (const t of state.towers) t.draw(ctx, t === state.selectedTower);
  for (const e of state.enemies) e.draw(ctx);
  drawProjectiles(ctx, state.projectiles);
  drawParticles(ctx, state.particles);
}

function getCanvasPos(e) {
  const r = state.canvas.getBoundingClientRect();
  const scaleX = state.canvas.width / r.width;
  const scaleY = state.canvas.height / r.height;
  return {
    x: (e.clientX - r.left) * scaleX,
    y: (e.clientY - r.top) * scaleY
  };
}

function onMouseMove(e) {
  const {x, y} = getCanvasPos(e);
  state.hoverCol = Math.floor(x / TILE);
  state.hoverRow = Math.floor(y / TILE);
}

function onCanvasClick(e) {
  const {x, y} = getCanvasPos(e);
  const col = Math.floor(x / TILE), row = Math.floor(y / TILE);

  if (state.selectedType) {
    if (canPlace(col, row) && state.gold >= TOWER_DEFS[state.selectedType].cost) {
      placeTower(col, row, state.selectedType);
    }
    return;
  }

  const clicked = state.towers.find(t => t.col === col && t.row === row);
  if (clicked) {
    state.selectedTower = clicked;
    showTowerInfo(
      document.getElementById('tower-info'),
      clicked,
      () => upgradeTower(clicked),
      () => sellTower(clicked)
    );
  } else {
    deselectAll();
  }
}

function canPlace(col, row) {
  if (state.pathSet.has(`${col},${row}`)) return false;
  if (col < 0 || row < 0 || col >= state.map.cols || row >= state.map.rows) return false;
  if (state.towers.find(t => t.col === col && t.row === row)) return false;
  return true;
}

function getTowerCost(type) {
  const base = TOWER_DEFS[type].cost;
  const inflation = 1 + Math.floor(state.waveNum / 3) * 0.08;
  return Math.floor(base * inflation);
}

function updatePanelPrices() {
  const list = document.getElementById('tower-list');
  for (const btn of list.querySelectorAll('.tower-btn')) {
    const type = btn.dataset.type;
    const cost = getTowerCost(type);
    btn.querySelector('.tower-btn-cost').textContent = '💰' + cost;
    btn.classList.toggle('cant-afford', state.gold < cost);
  }
}

function placeTower(col, row, type) {
  const cost = getTowerCost(type);
  if (state.gold < cost) return;
  const t = new Tower(col, row, type);
  state.towers.push(t);
  state.gold -= cost;
  updateHUD(state.gold, state.lives, state.waveNum);
  updatePanelPrices();
}

function upgradeTower(tower) {
  if (tower.level >= tower.maxLevel) return;
  if (state.gold < tower.upgradeCost) return;
  state.gold -= tower.upgradeCost;
  tower.level++;
  updateHUD(state.gold, state.lives, state.waveNum);
  showTowerInfo(document.getElementById('tower-info'), tower,
    () => upgradeTower(tower), () => sellTower(tower));
}

function sellTower(tower) {
  state.gold += tower.sellValue;
  state.towers = state.towers.filter(t => t !== tower);
  deselectAll();
  updateHUD(state.gold, state.lives, state.waveNum);
}

function selectTowerType(type) {
  state.selectedType = state.selectedType === type ? null : type;
  state.selectedTower = null;
  hideTowerInfo(document.getElementById('tower-info'));
  refreshTowerPanel(document.getElementById('tower-list'), state.selectedType, state.gold);
}

function deselectAll() {
  state.selectedType = null;
  state.selectedTower = null;
  hideTowerInfo(document.getElementById('tower-info'));
  refreshTowerPanel(document.getElementById('tower-list'), null, state.gold);
}

function togglePause() {
  state.paused = !state.paused;
  document.getElementById('btn-pause').textContent = state.paused ? '▶ Resume' : '⏸ Pause';
}

function toggleSpeed() {
  state.speed = state.speed === 1 ? 2 : 1;
  document.getElementById('btn-speed').textContent = state.speed === 1 ? '⏩ 2x' : '⏪ 1x';
}

function getPlayerStats() {
  return {
    gold: state.gold,
    lives: state.lives,
    wave: state.waveNum,
    towersPlaced: state.towers.length,
    towerTypes: [...new Set(state.towers.map(t => t.type))],
    mapName: state.mapName
  };
}

function goMenu() {
  state = null;
  showScreen('screen-menu');
}

function gameOver() {
  state.phase = 'over';
  document.getElementById('over-title').textContent = 'Game Over';
  document.getElementById('over-sub').textContent = `You survived ${state.waveNum} waves`;
  showScreen('screen-over');
}

function gameWin() {
  document.getElementById('over-title').textContent = 'Victory!';
  document.getElementById('over-sub').textContent = `All 20 waves defeated on ${state.mapName}!`;
  const beaten = JSON.parse(localStorage.getItem('ttg_beaten') || '[]');
  if (!beaten.includes(state.mapName)) beaten.push(state.mapName);
  localStorage.setItem('ttg_beaten', JSON.stringify(beaten));
  showScreen('screen-over');
}

function setupMenu() {
  const beaten = JSON.parse(localStorage.getItem('ttg_beaten') || '[]');
  const order = ['squiggle','zigzag','split'];
  document.querySelectorAll('.map-card').forEach((card, i) => {
    const name = card.dataset.map;
    const prev = order[i - 1];
    const unlocked = i === 0 || beaten.includes(prev);
    if (unlocked) {
      card.classList.remove('locked');
      card.querySelector('.lock-label')?.remove();
      card.addEventListener('click', () => {
        showScreen('screen-game');
        initGame(name);
      });
    }
  });

  document.getElementById('btn-retry').addEventListener('click', () => {
    const name = state?.mapName || 'squiggle';
    showScreen('screen-game');
    initGame(name);
  });

  document.getElementById('btn-over-menu').addEventListener('click', () => {
    state = null;
    showScreen('screen-menu');
    setupMenu();
  });
}

setupMenu();
