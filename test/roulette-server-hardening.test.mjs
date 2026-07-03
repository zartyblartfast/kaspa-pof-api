import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
import { afterEach, describe, it } from 'node:test';

const require = createRequire(import.meta.url);
const SERVER_MODULE_PATH = require.resolve('../examples/roulette-poc/server.cjs');
const originalEnv = { ...process.env };

function loadServerWithEnv(env = {}) {
  Object.assign(process.env, env);
  delete require.cache[SERVER_MODULE_PATH];
  return require(SERVER_MODULE_PATH);
}

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
  delete require.cache[SERVER_MODULE_PATH];
});

describe('roulette public-demo operational hardening', () => {
  it('serves health over HEAD without a response body', async () => {
    const { createRoulettePocServer } = loadServerWithEnv();
    await withServer(createRoulettePocServer(), async (baseUrl) => {
      const response = await request(`${baseUrl}/examples/roulette-poc/health`, { method: 'HEAD' });
      assert.equal(response.statusCode, 200);
      assert.equal(response.body, '');
      assert.match(response.headers['content-type'] || '', /application\/json/);
    });
  });

  it('does not expose server filesystem log paths in spin responses or SSE events', async () => {
    const { createRoulettePocServer } = loadServerWithEnv({
      ROULETTE_RUNTIME_LOG_ROOT: '/tmp/kaspa-pof-roulette-test-logs',
      KASPA_WASM_PKG: 'nonexistent-kaspa-wasm-for-hardening-test',
    });
    await withServer(createRoulettePocServer(), async (baseUrl) => {
      const roundResponse = await jsonRequest(`${baseUrl}/examples/roulette-poc/rounds`, { method: 'POST' });
      const spinResponse = await jsonRequest(`${baseUrl}/examples/roulette-poc/rounds/${encodeURIComponent(roundResponse.body.round.roundId)}/spins`, {
        method: 'POST',
        body: JSON.stringify({ clientSeed: 'client-hardening-test', bets: [{ playerId: 'alice', selection: 'red', amount: 1 }] }),
      });

      assert.equal(spinResponse.statusCode, 202);
      assert.equal(Object.hasOwn(spinResponse.body, 'logPath'), false);
      assert.equal(JSON.stringify(spinResponse.body).includes('/tmp/kaspa-pof-roulette-test-logs'), false);

      const sseResponse = await request(`${baseUrl}${spinResponse.body.eventsUrl}`);
      assert.equal(sseResponse.statusCode, 200);
      assert.equal(sseResponse.body.includes('logPath'), false);
      assert.equal(sseResponse.body.includes('/tmp/kaspa-pof-roulette-test-logs'), false);
    });
  });

  it('bounds retained rounds and spins by configured maximums', async () => {
    const { createRoulettePocServer } = loadServerWithEnv({
      ROULETTE_MAX_RETAINED_ROUNDS: '1',
      ROULETTE_MAX_RETAINED_SPINS: '1',
      KASPA_WASM_PKG: '/tmp/nonexistent-kaspa-wasm-for-hardening-test',
    });
    await withServer(createRoulettePocServer(), async (baseUrl) => {
      const firstRound = await jsonRequest(`${baseUrl}/examples/roulette-poc/rounds`, { method: 'POST' });
      const firstSpin = await jsonRequest(`${baseUrl}/examples/roulette-poc/rounds/${encodeURIComponent(firstRound.body.round.roundId)}/spins`, {
        method: 'POST',
        body: JSON.stringify({ clientSeed: 'client-1', bets: [{ playerId: 'alice', selection: 'red', amount: 1 }] }),
      });
      assert.equal(firstSpin.statusCode, 202);

      const secondRound = await jsonRequest(`${baseUrl}/examples/roulette-poc/rounds`, { method: 'POST' });
      const secondSpin = await jsonRequest(`${baseUrl}/examples/roulette-poc/rounds/${encodeURIComponent(secondRound.body.round.roundId)}/spins`, {
        method: 'POST',
        body: JSON.stringify({ clientSeed: 'client-2', bets: [{ playerId: 'bob', selection: 'black', amount: 1 }] }),
      });
      assert.equal(secondSpin.statusCode, 202);

      const prunedRoundSpin = await jsonRequest(`${baseUrl}/examples/roulette-poc/rounds/${encodeURIComponent(firstRound.body.round.roundId)}/spins`, {
        method: 'POST',
        body: JSON.stringify({ clientSeed: 'client-pruned', bets: [{ playerId: 'eve', selection: 'green', amount: 1 }] }),
      });
      assert.equal(prunedRoundSpin.statusCode, 404);

      const prunedSpinEvents = await request(`${baseUrl}${firstSpin.body.eventsUrl}`);
      assert.equal(prunedSpinEvents.statusCode, 404);
    });
  });
});

async function withServer(server, fn) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try {
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

function jsonRequest(url, options = {}) {
  return request(url, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  }).then((response) => ({ ...response, body: response.body ? JSON.parse(response.body) : null }));
}

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: 'GET', ...options }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}
