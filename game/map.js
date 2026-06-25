const TILE = 40;

const MAPS = {
  squiggle: {
    cols: 32,
    rows: 18,
    path: [
      [2,9],[3,9],[4,9],[5,9],[6,8],[7,7],[8,6],[9,5],[10,5],[11,5],[12,5],[13,6],[14,7],[15,8],[16,9],[17,10],[18,11],[19,12],[20,13],[21,13],[22,13],[23,12],[24,11],[25,10],[26,9],[27,8],[28,8],[29,8],[30,8],[31,8]
    ]
  },
  zigzag: {
    cols: 32,
    rows: 18,
    path: [
      [2,3],[3,3],[4,3],[5,3],[6,3],[7,4],[8,5],[9,6],[10,7],[11,8],[12,9],[13,10],[14,11],[15,12],[16,13],[17,14],[18,15],[19,16],[20,16],[21,15],[22,14],[23,13],[24,12],[25,11],[26,10],[27,9],[28,8],[29,7],[30,6],[31,5]
    ]
  },
  split: {
    cols: 32,
    rows: 18,
    pathUpper: [
      [2,9],[3,9],[4,9],[5,9],[6,8],[7,7],[8,6],[9,5],[10,5],[11,5],[12,5],[13,5],[14,5],[15,6],[16,7],[17,8],[18,9],[19,10],[20,11],[21,11],[22,11],[23,11],[24,11],[25,11],[26,11],[27,10],[28,9],[29,8],[30,8],[31,8]
    ],
    pathLower: [
      [2,9],[3,9],[4,9],[5,9],[6,10],[7,11],[8,12],[9,13],[10,13],[11,13],[12,13],[13,13],[14,13],[15,12],[16,11],[17,10],[18,9],[19,8],[20,7],[21,7],[22,7],[23,7],[24,7],[25,7],[26,7],[27,8],[28,9],[29,10],[30,10],[31,10]
    ]
  }
};

export function getMap(name) {
  return MAPS[name];
}

export function buildPathSet(path) {
  const s = new Set();
  for (const [c,r] of path) s.add(`${c},${r}`);
  return s;
}

export function drawMap(ctx, mapName, W, H) {
  const map = MAPS[mapName];
  let pathToUse = map.path;
  
  if (mapName === 'split') {
    const combined = new Set();
    for (const p of map.pathUpper) combined.add(`${p[0]},${p[1]}`);
    for (const p of map.pathLower) combined.add(`${p[0]},${p[1]}`);
    pathToUse = Array.from(combined).map(s => s.split(',').map(Number));
  }
  
  const pathSet = buildPathSet(pathToUse);

  ctx.fillStyle = '#4a7c3f';
  ctx.fillRect(0, 0, W, H);

  const grassVariants = ['#4a7c3f','#4e8042','#488040','#527844'];

  for (let r = 0; r < map.rows; r++) {
    for (let c = 0; c < map.cols; c++) {
      if (!pathSet.has(`${c},${r}`)) {
        const v = (c * 3 + r * 7) % grassVariants.length;
        ctx.fillStyle = grassVariants[v];
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      }
    }
  }

  drawCurvedPath(ctx, pathToUse);
  drawDecorations(ctx, map, pathSet);
}

function drawCurvedPath(ctx, path) {
  if (path.length < 2) return;

  ctx.strokeStyle = '#b89858';
  ctx.lineWidth = TILE * 0.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  const start = path[0];
  ctx.moveTo(start[0] * TILE + TILE / 2, start[1] * TILE + TILE / 2);

  for (let i = 1; i < path.length; i++) {
    const curr = path[i];
    const x = curr[0] * TILE + TILE / 2;
    const y = curr[1] * TILE + TILE / 2;
    
    if (i === 1) {
      ctx.lineTo(x, y);
    } else {
      const prev = path[i - 1];
      const prevX = prev[0] * TILE + TILE / 2;
      const prevY = prev[1] * TILE + TILE / 2;
      ctx.quadraticCurveTo(prevX, prevY, x, y);
    }
  }
  ctx.stroke();

  ctx.fillStyle = '#c8a96e';
  for (const [c, r] of path) {
    ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    ctx.fillStyle = '#b89858';
    ctx.fillRect(c * TILE + 1, r * TILE + 1, TILE - 2, TILE - 2);
    ctx.fillStyle = '#c8a96e';
  }
}

function drawDecorations(ctx, map, pathSet) {
  const rng = seededRng(42);
  for (let r = 0; r < map.rows; r++) {
    for (let c = 0; c < map.cols; c++) {
      if (pathSet.has(`${c},${r}`)) continue;
      const adj = [[c-1,r],[c+1,r],[c,r-1],[c,r+1]].some(([cc,rr]) => pathSet.has(`${cc},${rr}`));
      if (adj) continue;
      const roll = rng();
      if (roll < 0.12) drawTree(ctx, c * TILE + TILE/2, r * TILE + TILE/2, rng);
      else if (roll < 0.17) drawRock(ctx, c * TILE + TILE/2, r * TILE + TILE/2, rng);
    }
  }
}

function drawTree(ctx, x, y, rng) {
  const sz = 10 + rng() * 6;
  ctx.fillStyle = '#2d5a1f';
  ctx.beginPath();
  ctx.arc(x, y, sz, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#3a7028';
  ctx.beginPath();
  ctx.arc(x - sz*0.2, y - sz*0.2, sz * 0.7, 0, Math.PI*2);
  ctx.fill();
}

function drawRock(ctx, x, y, rng) {
  const sz = 5 + rng() * 4;
  ctx.fillStyle = '#888';
  ctx.beginPath();
  ctx.ellipse(x, y, sz * 1.3, sz, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#aaa';
  ctx.beginPath();
  ctx.ellipse(x - sz*0.2, y - sz*0.2, sz * 0.5, sz * 0.4, 0, 0, Math.PI*2);
  ctx.fill();
}

function seededRng(seed) {
  let s = seed;
  return function() {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export { TILE, MAPS };
