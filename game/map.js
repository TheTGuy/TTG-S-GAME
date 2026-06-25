const TILE = 40;

const MAPS = {
  squiggle: {
    cols: 22,
    rows: 14,
    path: [
      [0,6],[1,6],[2,6],[3,6],[3,5],[3,4],[4,4],[5,4],[6,4],[7,4],[7,5],[7,6],[7,7],[7,8],
      [8,8],[9,8],[10,8],[11,8],[11,7],[11,6],[11,5],[11,4],[12,4],[13,4],[14,4],[14,5],
      [14,6],[14,7],[14,8],[14,9],[15,9],[16,9],[17,9],[18,9],[18,8],[18,7],[19,7],[20,7],[21,7]
    ]
  },
  zigzag: {
    cols: 22,
    rows: 14,
    path: [
      [0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,10],[5,11],
      [6,11],[7,11],[8,11],[9,11],[10,11],[11,11],[11,10],[11,9],[11,8],[11,7],[11,6],[11,5],[11,4],[11,3],[11,2],
      [12,2],[13,2],[14,2],[15,2],[16,2],[16,3],[16,4],[16,5],[16,6],[16,7],[16,8],[16,9],[16,10],[16,11],
      [17,11],[18,11],[19,11],[20,11],[21,11]
    ]
  },
  split: {
    cols: 22,
    rows: 14,
    pathUpper: [
      [0,7],[1,7],[2,7],[3,7],[4,7],[5,7],[6,7],[7,7],[8,7],[9,7],[10,7],
      [11,6],[12,5],[13,4],[14,3],[15,3],[16,3],[17,3],[18,3],[19,3],[20,3],[21,3]
    ],
    pathLower: [
      [0,7],[1,7],[2,7],[3,7],[4,7],[5,7],[6,7],[7,7],[8,7],[9,7],[10,7],
      [11,8],[12,9],[13,10],[14,11],[15,11],[16,11],[17,11],[18,11],[19,11],[20,11],[21,11]
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

  for (const coord of pathToUse) {
    const [c, r] = Array.isArray(coord) ? coord : [parseInt(coord.split(',')[0]), parseInt(coord.split(',')[1])];
    ctx.fillStyle = '#c8a96e';
    ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    ctx.fillStyle = '#b89858';
    ctx.fillRect(c * TILE + 1, r * TILE + 1, TILE - 2, TILE - 2);
  }

  drawDecorations(ctx, map, pathSet);
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
