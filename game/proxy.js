const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));

    const keys = [env.MISTRAL_KEY_1, env.MISTRAL_KEY_2, env.MISTRAL_KEY_3].filter(Boolean);
    const apiKey = keys[Math.floor(Math.random() * keys.length)];

    if (url.pathname === '/wave') return handleWave(body, apiKey);
    if (url.pathname === '/commentary') return handleCommentary(body, apiKey);

    return new Response('Not found', { status: 404 });
  }
};

async function handleWave(body, apiKey) {
  const { waveNum, playerStats } = body;
  const isBoss = waveNum % 5 === 0;

  const prompt = `You are the game master for a tower defense game. Generate wave ${waveNum} enemy data.

Player stats: gold=${playerStats.gold}, lives=${playerStats.lives}, towers=${playerStats.towersPlaced}, map=${playerStats.mapName}

Rules:
- Keep it challenging but fair. If lives < 8, ease off slightly. If lives = 20, ramp it up.
- Wave ${waveNum}, scale difficulty accordingly
- ${isBoss ? 'THIS IS A BOSS WAVE (every 5th wave). Include exactly 1 boss enemy.' : 'No boss this wave.'}
- Available types: grunt, speeder, tank, armored, swarm, healer, ghost, splitter${isBoss ? ', boss' : ''}

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "name": "wave name (creative, 2-4 words)",
  "enemies": [
    { "type": "grunt", "count": 8, "hpMult": 1.2, "speedMult": 1.0 }
  ],
  "bossName": null,
  "commentary": "one short punchy line for the commentator (max 60 chars)"
}`;

  return callMistral(apiKey, prompt);
}

async function handleCommentary(body, apiKey) {
  const { event, context } = body;

  const prompts = {
    waveEnd: `Tower defense commentator. Player just cleared a wave. Lives: ${context?.lives}, Gold: ${context?.gold}. ONE short punchy line (max 60 chars). No quotes.`,
    kill: `Tower defense commentator. Enemy just died. ONE short line (max 40 chars). No quotes.`,
    lifeLost: `Tower defense commentator. Enemy got through, player lost a life. Lives left: ${context?.lives}. ONE worried short line (max 60 chars). No quotes.`,
    bossEntry: `Tower defense commentator. A BOSS just appeared. ONE dramatic short line (max 60 chars). No quotes.`
  };

  const prompt = prompts[event] || 'Tower defense commentator. Give a short one-liner. No quotes.';
  const res = await callMistral(apiKey, prompt, 60);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim() || '';
  return new Response(JSON.stringify({ text }), { headers: { 'Content-Type': 'application/json', ...CORS } });
}

async function callMistral(apiKey, prompt, maxTokens = 300) {
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim() || '{}';

  try {
    const parsed = JSON.parse(content);
    return new Response(JSON.stringify(parsed), {
      headers: { 'Content-Type': 'application/json', ...CORS }
    });
  } catch {
    return new Response(content, {
      headers: { 'Content-Type': 'application/json', ...CORS }
    });
  }
}
