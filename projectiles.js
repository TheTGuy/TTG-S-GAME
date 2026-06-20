export function updateProjectiles(projectiles, enemies, particles, onKill) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (p.dead) { projectiles.splice(i, 1); continue; }
    updateProjectile(p, enemies, particles, onKill);
    if (p.dead) projectiles.splice(i, 1);
  }
}

function updateProjectile(p, enemies, particles, onKill) {
  if (p.target.dead) { p.dead = true; return; }

  if (p.type === 'beam') {
    applyBeam(p, enemies, particles, onKill);
    p.dead = true;
    return;
  }

  if (p.type === 'freeze') {
    p.dead = true;
    return;
  }

  const dx = p.target.x - p.x, dy = p.target.y - p.y;
  const dist = Math.sqrt(dx*dx + dy*dy);

  if (dist < 8) {
    hit(p, enemies, particles, onKill);
    return;
  }

  const step = p.speed * (1/60);
  p.x += (dx/dist) * step;
  p.y += (dy/dist) * step;
}

function hit(p, enemies, particles, onKill) {
  p.dead = true;

  if (p.aoe > 0) {
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = e.x - p.target.x, dy = e.y - p.target.y;
      if (Math.sqrt(dx*dx+dy*dy) <= p.aoe) {
        applyDamage(p, e, onKill);
      }
    }
    spawnExplosion(particles, p.target.x, p.target.y, p.color, p.aoe);
  } else if (p.type === 'chain') {
    applyChain(p, enemies, particles, onKill);
  } else {
    applyDamage(p, p.target, onKill);
    spawnHitParticle(particles, p.target.x, p.target.y, p.color);
  }

  if (p.type === 'poison') {
    p.target.poisonTimer = 4;
    p.target.poisonDmg = p.damage * 0.5;
  }
}

function applyDamage(p, enemy, onKill) {
  if (enemy.dead) return;
  enemy.takeDamage(p.damage);
  if (enemy.hp <= 0) {
    enemy.die([]);
    onKill(enemy);
  }
}

function applyChain(p, enemies, particles, onKill) {
  applyDamage(p, p.target, onKill);
  let last = p.target;
  let chainCount = 3;
  const hit = new Set([last]);
  while (chainCount-- > 0) {
    let next = null, bestD = 120;
    for (const e of enemies) {
      if (e.dead || hit.has(e)) continue;
      const dx = e.x - last.x, dy = e.y - last.y;
      const d = Math.sqrt(dx*dx+dy*dy);
      if (d < bestD) { bestD = d; next = e; }
    }
    if (!next) break;
    hit.add(next);
    spawnLightning(particles, last.x, last.y, next.x, next.y);
    applyDamage(p, next, onKill);
    last = next;
  }
}

function applyBeam(p, enemies, particles, onKill) {
  const sorted = [...enemies].filter(e => !e.dead).sort((a,b) => b.pathIndex - a.pathIndex);
  let pierced = 0;
  for (const e of sorted) {
    if (pierced >= 5) break;
    const dx = e.x - p.tower.x, dy = e.y - p.tower.y;
    const dist = Math.sqrt(dx*dx+dy*dy);
    if (dist <= p.tower.range) {
      applyDamage(p, e, onKill);
      pierced++;
      spawnHitParticle(particles, e.x, e.y, p.color);
    }
  }
}

function spawnExplosion(particles, x, y, color, radius) {
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const spd = 60 + Math.random() * 120;
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 0.5 + Math.random() * 0.3,
      maxLife: 0.8,
      size: 3 + Math.random() * 4,
      color
    });
  }
}

function spawnHitParticle(particles, x, y, color) {
  for (let i = 0; i < 5; i++) {
    particles.push({
      x: x + (Math.random()-0.5)*8,
      y: y + (Math.random()-0.5)*8,
      vx: (Math.random()-0.5)*80,
      vy: (Math.random()-0.5)*80,
      life: 0.3,
      maxLife: 0.3,
      size: 2,
      color
    });
  }
}

function spawnLightning(particles, x1, y1, x2, y2) {
  particles.push({ x:x1, y:y1, x2, y2, life:0.15, maxLife:0.15, type:'lightning', color:'#ccf' });
}

export function drawProjectiles(ctx, projectiles) {
  for (const p of projectiles) {
    if (p.dead) continue;
    ctx.fillStyle = p.color;
    const sz = p.type === 'ball' || p.type === 'shell' ? 6 : p.type === 'bomb' ? 10 : 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, sz, 0, Math.PI*2);
    ctx.fill();
  }
}

export function updateParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    if (!p.type) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
    }
  }
}

export function drawParticles(ctx, particles) {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    if (p.type === 'lightning') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x2, p.y2);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI*2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
