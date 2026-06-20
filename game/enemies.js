import { TILE } from './map.js';

export const ENEMY_TYPES = {
  grunt:    { name:'Grunt',    hp:80,   speed:60,  reward:10, color:'#e05050', size:10, armor:0    },
  speeder:  { name:'Speeder',  hp:40,   speed:110, reward:12, color:'#e0a030', size:8,  armor:0    },
  tank:     { name:'Tank',     hp:400,  speed:35,  reward:25, color:'#8060a0', size:15, armor:0.2  },
  armored:  { name:'Armored',  hp:180,  speed:50,  reward:20, color:'#506080', size:12, armor:0.4  },
  swarm:    { name:'Swarm',    hp:25,   speed:90,  reward:6,  color:'#c0c020', size:7,  armor:0    },
  healer:   { name:'Healer',   hp:120,  speed:55,  reward:18, color:'#40c070', size:11, armor:0    },
  ghost:    { name:'Ghost',    hp:90,   speed:75,  reward:22, color:'#a0a0c0', size:10, armor:0,   invisible:true },
  splitter: { name:'Splitter', hp:150,  speed:50,  reward:15, color:'#e07040', size:13, armor:0    },
  boss:     { name:'Boss',     hp:1200, speed:40,  reward:80, color:'#cc2040', size:20, armor:0.25 }
};

export class Enemy {
  constructor(type, path, hpMult, speedMult, spawnOffset, isSplit) {
    this.type = type;
    const def = ENEMY_TYPES[type];
    this.maxHp = def.hp * (hpMult || 1);
    this.hp = this.maxHp;
    this.speed = def.speed * (speedMult || 1);
    this.reward = def.reward;
    this.color = def.color;
    this.size = def.size;
    this.armor = def.armor || 0;
    this.invisible = def.invisible || false;
    this.path = path;
    this.pathIndex = 0;
    this.x = path[0][0] * TILE + TILE/2;
    this.y = path[0][1] * TILE + TILE/2;
    this.dead = false;
    this.reached = false;
    this.slowTimer = 0;
    this.slowFactor = 0;
    this.poisonTimer = 0;
    this.poisonDmg = 0;
    this.healTimer = 0;
    this.spawnDelay = spawnOffset || 0;
    this.isSplit = isSplit || false;
    this.splitDone = false;
    this.dots = [];
  }

  update(dt, enemies) {
    if (this.spawnDelay > 0) { this.spawnDelay -= dt; return; }
    if (this.dead || this.reached) return;

    if (this.poisonTimer > 0) {
      this.poisonTimer -= dt;
      this.hp -= this.poisonDmg * dt;
      if (this.hp <= 0) { this.die(enemies); return; }
    }

    if (this.type === 'healer' && this.healTimer <= 0) {
      this.healNearby(enemies);
      this.healTimer = 2;
    }
    this.healTimer = Math.max(0, this.healTimer - dt);

    this.slowTimer = Math.max(0, this.slowTimer - dt);
    const spd = this.slowTimer > 0 ? this.speed * (1 - this.slowFactor) : this.speed;

    if (this.pathIndex >= this.path.length - 1) {
      this.reached = true;
      return;
    }

    const [tc, tr] = this.path[this.pathIndex + 1];
    const tx = tc * TILE + TILE/2, ty = tr * TILE + TILE/2;
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const step = spd * dt;

    if (step >= dist) {
      this.x = tx; this.y = ty;
      this.pathIndex++;
    } else {
      this.x += (dx/dist) * step;
      this.y += (dy/dist) * step;
    }
  }

  takeDamage(dmg, type, extras) {
    const actual = type === 'explosive' ? dmg : dmg * (1 - this.armor);
    this.hp -= actual;
    if (extras?.poison) {
      this.poisonTimer = 4;
      this.poisonDmg = extras.poison;
    }
    return actual;
  }

  die(enemies) {
    this.dead = true;
    if (this.type === 'splitter' && !this.splitDone) {
      this.splitDone = true;
      const remaining = this.path.slice(this.pathIndex);
      if (remaining.length > 1) {
        enemies.push(new Enemy('swarm', remaining, 1, 1, 0, true));
        enemies.push(new Enemy('swarm', remaining, 1, 1, 0, true));
      }
    }
  }

  healNearby(enemies) {
    for (const e of enemies) {
      if (e === this || e.dead) continue;
      const dx = e.x - this.x, dy = e.y - this.y;
      if (Math.sqrt(dx*dx+dy*dy) < 80) {
        e.hp = Math.min(e.maxHp, e.hp + 15);
      }
    }
  }

  draw(ctx) {
    if (this.spawnDelay > 0) return;
    const x = this.x, y = this.y;
    const alpha = (this.invisible && this.slowTimer <= 0) ? 0.35 : 1;
    ctx.globalAlpha = alpha;

    if (this.slowTimer > 0) {
      ctx.strokeStyle = '#8df';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, this.size + 3, 0, Math.PI*2);
      ctx.stroke();
    }

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(x, y, this.size, 0, Math.PI*2);
    ctx.fill();

    if (this.type === 'boss') {
      ctx.strokeStyle = '#ff4060';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    const barW = this.size * 2.2;
    const barH = 4;
    const bx = x - barW/2, by = y - this.size - 8;
    ctx.fillStyle = '#333';
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = this.hp / this.maxHp > 0.5 ? '#4c4' : this.hp / this.maxHp > 0.25 ? '#cc4' : '#c44';
    ctx.fillRect(bx, by, barW * (this.hp / this.maxHp), barH);

    ctx.globalAlpha = 1;
  }
}
