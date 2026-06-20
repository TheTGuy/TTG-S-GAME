import { TOWER_DEFS } from './towers.js';

let tooltip = null;

function getTooltip() {
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'tower-tooltip';
    tooltip.style.cssText = 'position:fixed;background:#1a1a1a;border:1px solid #444;border-radius:5px;padding:8px 10px;font-size:0.76rem;color:#ddd;pointer-events:none;display:none;z-index:999;line-height:1.7;min-width:140px;';
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

export function buildTowerPanel(container, onSelect, getGold) {
  container.innerHTML = '';
  for (const [key, def] of Object.entries(TOWER_DEFS)) {
    const btn = document.createElement('button');
    btn.className = 'tower-btn';
    btn.dataset.type = key;
    btn.innerHTML = `
      <canvas class="tower-btn-icon" width="28" height="28"></canvas>
      <div class="tower-btn-info">
        <span class="tower-btn-name">${def.name}</span>
        <span class="tower-btn-cost">💰${def.cost}</span>
      </div>`;
    const cv = btn.querySelector('canvas');
    drawTowerIcon(cv, def);
    btn.addEventListener('click', () => onSelect(key));

    btn.addEventListener('mouseenter', (e) => {
      const tt = getTooltip();
      const reloadTime = def.rate === 0.1 ? 'Continuous' : def.rate >= 20 ? '20s cooldown' : def.rate.toFixed(1) + 's reload';
      const dmgText = def.damage === 0 ? 'No damage' : def.damage + (def.aoe ? ' (AOE)' : '');
      tt.innerHTML = `<b>${def.name}</b><br>💰 ${def.cost}<br>⚔️ ${dmgText}<br>🔄 ${reloadTime}<br>📏 Range: ${def.range}<br><span style="color:#888">${def.desc}</span>`;
      tt.style.display = 'block';
      positionTooltip(tt, e);
    });

    btn.addEventListener('mousemove', (e) => positionTooltip(getTooltip(), e));
    btn.addEventListener('mouseleave', () => { getTooltip().style.display = 'none'; });

    container.appendChild(btn);
  }
}

function positionTooltip(tt, e) {
  tt.style.left = (e.clientX - 160) + 'px';
  tt.style.top = (e.clientY - 10) + 'px';
}

export function refreshTowerPanel(container, selectedType, gold) {
  for (const btn of container.querySelectorAll('.tower-btn')) {
    const t = btn.dataset.type;
    btn.classList.toggle('selected', t === selectedType);
    btn.classList.toggle('cant-afford', gold < TOWER_DEFS[t].cost);
  }
}

export function showTowerInfo(panel, tower, onUpgrade, onSell) {
  panel.classList.remove('hidden');
  const def = tower.def;
  const reloadText = def.rate >= 20 ? '20s cooldown' : (1/tower.rate).toFixed(1) + '/s';
  panel.querySelector('.ti-name').textContent = `${def.name} (Lv${tower.level})`;
  panel.querySelector('.ti-stats').innerHTML =
    `Range: ${(def.range * (1 + (tower.level-1)*0.15)).toFixed(1)}<br>` +
    `Damage: ${Math.floor(tower.damage)}<br>` +
    `Fire rate: ${reloadText}<br>` +
    `${def.desc}`;
  const upBtn = panel.querySelector('.ti-upgrade');
  const maxed = tower.level >= tower.maxLevel;
  upBtn.disabled = maxed;
  upBtn.querySelector('.ti-upgrade-cost').textContent = maxed ? '(max)' : `💰${tower.upgradeCost}`;
  panel.querySelector('.ti-sell-val').textContent = `💰${tower.sellValue}`;
  upBtn.onclick = onUpgrade;
  panel.querySelector('.ti-sell').onclick = onSell;
}

export function hideTowerInfo(panel) {
  panel.classList.add('hidden');
}

export function updateHUD(gold, lives, wave) {
  document.getElementById('hud-gold').textContent = gold;
  document.getElementById('hud-lives').textContent = lives;
  document.getElementById('hud-wave').textContent = wave;
}

export function setCommentary(text) {
  const el = document.getElementById('commentary-text');
  el.textContent = text;
}

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function drawTowerIcon(canvas, def) {
  const ctx = canvas.getContext('2d');
  const cx = 14, cy = 14, r = 10;
  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = def.accentColor;
  ctx.fillRect(cx, cy - 2, r + 2, 4);
}
