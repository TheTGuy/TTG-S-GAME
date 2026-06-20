import { TILE } from './map.js';

export const TOWER_DEFS = {
  cannon:      { name:'Cannon',      cost:100, color:'#555', accentColor:'#888', range:3.5, damage:60,  rate:1.2,  proj:'ball',    aoe:0,    slow:0,    desc:'High damage, slow fire' },
  machinegun:  { name:'Machine Gun', cost:75,  color:'#446', accentColor:'#88a', range:2.5, damage:12,  rate:0.25, proj:'bullet',  aoe:0,    slow:0,    desc:'Rapid fire, shreds fast enemies' },
  sniper:      { name:'Sniper',      cost:125, color:'#354', accentColor:'#6a8', range:7,   damage:150, rate:2.5,  proj:'laser',   aoe:0,    slow:0,    desc:'Extreme range and damage' },
  freeze:      { name:'Freeze',      cost:90,  color:'#3af', accentColor:'#8df', range:3,   damage:0,   rate:1.5,  proj:'freeze',  aoe:1,    slow:0.5,  desc:'Slows all enemies in range' },
  flamethrower:{ name:'Flamethrower',cost:110, color:'#a42', accentColor:'#f84', range:2.2, damage:20,  rate:0.15, proj:'flame',   aoe:1,    slow:0,    desc:'Cone AOE, continuous damage' },
  tesla:       { name:'Tesla',       cost:140, color:'#84f', accentColor:'#ccf', range:3.2, damage:35,  rate:1,    proj:'chain',   aoe:0,    slow:0,    desc:'Chain lightning between enemies' },
  mortar:      { name:'Mortar',      cost:150, color:'#643', accentColor:'#a86', range:5,   damage:80,  rate:2.8,  proj:'shell',   aoe:1.5,  slow:0,    desc:'Lob shells, AOE splash' },
  laser:       { name:'Laser',       cost:160, color:'#f44', accentColor:'#f88', range:6,   damage:25,  rate:0.1,  proj:'beam',    aoe:0,    slow:0,    desc:'Continuous beam, pierces enemies' },
  poison:      { name:'Poison',      cost:95,  color:'#4a4', accentColor:'#8f8', range:3,   damage:8,   rate:1,    proj:'poison',  aoe:0,    slow:0,    desc:'DOT damage over time' },
  airstrike:   { name:'Airstrike',   cost:200, color:'#448', accentColor:'#88f', range:99,  damage:300, rate:5,   proj:'bomb',    aoe:3,    slow:0,    desc:'Global cooldown bombing run' }
};

export class Tower {
  constructor(col, row, type) {
    this.col = col;
    this.row = row;
    this.type = type;
    this.def = TOWER_DEFS[type];
    this.level = 1;
    this.cooldown = 0;
    this.target = null;
    this.angle = 0;
    this.x = col * TILE + TILE / 2;
    this.y = row * TILE + TILE / 2;
  }

  get range() { return this.def.range * (1 + (this.level - 1) * 0.15) * TILE; }
  get damage() { return this.def.damage * (1 + (this.level - 1) * 0.3); }
  get rate() { return this.def.rate * (1 - (this.level - 1) * 0.1); }
  get upgradeCost() { return Math.floor(this.def.cost * 0.6 * this.level); }
  get sellValue() { return Math.floor(this.def.cost * 0.5 + (this.level - 1) * this.def.cost * 0.3); }
  get maxLevel() { return 3; }

  update(dt, enemies, projectiles) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.cooldown > 0) return;
    if (this.def.aoe && this.def.slow > 0) {
      this.applyFreeze(enemies);
      this.cooldown = this.rate;
      return;
    }
    const t = this.findTarget(enemies);
    if (!t) return;
    this.target = t;
    const dx = t.x - this.x, dy = t.y - this.y;
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.angle += diff * 0.18;
    projectiles.push(this.createProjectile(t));
    this.cooldown = this.rate;
  }

  findTarget(enemies) {
    let best = null, bestDist = Infinity;
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = e.x - this.x, dy = e.y - this.y;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d <= this.range && e.pathIndex > (best ? best.pathIndex : -1)) {
        best = e;
      }
    }
    return best;
  }

  applyFreeze(enemies) {
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = e.x - this.x, dy = e.y - this.y;
      if (Math.sqrt(dx*dx+dy*dy) <= this.range) {
        e.slowTimer = 1.5;
        e.slowFactor = this.def.slow;
      }
    }
  }

  createProjectile(target) {
    return {
      x: this.x, y: this.y,
      target,
      tower: this,
      type: this.def.proj,
      damage: this.damage,
      aoe: this.def.aoe * TILE,
      slow: this.def.slow,
      color: this.def.accentColor,
      speed: this.def.proj === 'shell' ? 180 : this.def.proj === 'beam' ? 999 : 320,
      dead: false,
      pierced: new Set()
    };
  }

  draw(ctx, selected) {
    const x = this.x, y = this.y;
    const sz = TILE * 0.38;

    if (selected) {
      ctx.beginPath();
      ctx.arc(x, y, this.range, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fill();
    }

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#3a3020';
    ctx.beginPath();
    ctx.arc(0, 0, sz + 4, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = this.def.color;
    ctx.beginPath();
    ctx.arc(0, 0, sz, 0, Math.PI*2);
    ctx.fill();

    ctx.rotate(this.angle);
    ctx.fillStyle = this.def.accentColor;
    ctx.fillRect(0, -3, sz + 6, 6);

    ctx.restore();

    if (this.level > 1) {
      for (let i = 0; i < this.level - 1; i++) {
        ctx.fillStyle = '#f0c040';
        ctx.beginPath();
        ctx.arc(x - 6 + i * 7, y + sz + 4, 3, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }
}

export function drawHoverRange(ctx, col, row, type) {
  const def = TOWER_DEFS[type];
  const x = col * TILE + TILE/2, y = row * TILE + TILE/2;
  const range = def.range * TILE;
  ctx.beginPath();
  ctx.arc(x, y, range, 0, Math.PI*2);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fill();
}
