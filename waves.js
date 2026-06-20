import { Enemy } from './enemies.js';
import { getWaveData, getCommentary } from './mistral.js';

export class WaveManager {
  constructor(mapName, path, onCommentary) {
    this.mapName = mapName;
    this.path = path;
    this.onCommentary = onCommentary;
    this.waveNum = 0;
    this.active = false;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveData = null;
    this.allSpawned = false;
  }

  async prepareWave(playerStats) {
    this.waveNum++;
    this.waveData = await getWaveData(this.waveNum, playerStats);
    return this.waveData;
  }

  startWave(enemies) {
    this.active = true;
    this.allSpawned = false;
    this.spawnQueue = buildSpawnQueue(this.waveData.enemies);
    this.spawnTimer = 0;
    this.onCommentary(this.waveData.commentary || `Wave ${this.waveNum} — ${this.waveData.name}`);
    if (this.waveData.bossName) {
      setTimeout(() => this.onCommentary(`⚠ BOSS: ${this.waveData.bossName}`), 3000);
    }
  }

  update(dt, enemies) {
    if (!this.active || this.allSpawned) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.spawnQueue.length > 0) {
      const spawn = this.spawnQueue.shift();
      enemies.push(new Enemy(spawn.type, this.path, spawn.hpMult, spawn.speedMult));
      this.spawnTimer = spawn.delay || 0.7;
      if (this.spawnQueue.length === 0) this.allSpawned = true;
    }
  }

  isWaveComplete(enemies) {
    return this.allSpawned && enemies.every(e => e.dead || e.reached);
  }

  async onWaveEnd(playerStats) {
    this.active = false;
    const text = await getCommentary('waveEnd', playerStats);
    this.onCommentary(text);
  }
}

function buildSpawnQueue(enemyGroups) {
  const queue = [];
  for (const group of enemyGroups) {
    for (let i = 0; i < group.count; i++) {
      queue.push({
        type: group.type,
        hpMult: group.hpMult || 1,
        speedMult: group.speedMult || 1,
        delay: group.type === 'swarm' ? 0.25 : group.type === 'boss' ? 1.5 : 0.65
      });
    }
  }
  return queue;
}
