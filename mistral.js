const WORKER_URL = 'https://your-worker.your-name.workers.dev';

export async function getWaveData(waveNum, playerStats) {
  try {
    const res = await fetch(WORKER_URL + '/wave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waveNum, playerStats })
    });
    const data = await res.json();
    return data;
  } catch(e) {
    return fallbackWave(waveNum);
  }
}

export async function getCommentary(event, context) {
  try {
    const res = await fetch(WORKER_URL + '/commentary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, context })
    });
    const data = await res.json();
    return data.text || '';
  } catch(e) {
    return fallbackCommentary(event);
  }
}

function fallbackWave(n) {
  const isBoss = n % 5 === 0;
  const scale = 1 + (n - 1) * 0.18;
  return {
    name: isBoss ? `Wave ${n} — Boss Assault` : `Wave ${n}`,
    enemies: isBoss
      ? [{ type:'boss', count:1, hpMult: scale * 1.5, speedMult:1 }, { type:'grunt', count:6, hpMult:scale, speedMult:1 }]
      : [
          { type:'grunt', count: Math.floor(4 + n * 1.5), hpMult:scale, speedMult: 1 + n*0.02 },
          n > 2 ? { type:'speeder', count: Math.floor(n * 0.8), hpMult:scale*0.8, speedMult:1.1 } : null,
          n > 4 ? { type:'tank', count: Math.floor(n * 0.3), hpMult:scale, speedMult:1 } : null,
          n > 6 ? { type:'armored', count: Math.floor(n * 0.4), hpMult:scale, speedMult:1 } : null,
        ].filter(Boolean),
    bossName: isBoss ? `Warlord of Wave ${n}` : null,
    commentary: `Wave ${n} incoming!`
  };
}

function fallbackCommentary(event) {
  const lines = {
    waveStart: ['Here they come!', 'Brace yourself!', 'Wave incoming!'],
    kill: ['Nice shot!', 'Got one!', 'They\'re falling!'],
    lifeLost: ['They got through!', 'Watch the gaps!', 'Stay focused!'],
    waveEnd: ['Wave cleared!', 'Nice work!', 'Hold the line!'],
    bossEntry: ['BOSS INCOMING!', 'Big one spotted!', 'That\'s a large enemy!']
  };
  const opts = lines[event] || ['...'];
  return opts[Math.floor(Math.random() * opts.length)];
}
