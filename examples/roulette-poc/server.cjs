#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');

const {
  deriveEntropyHash,
  deriveOutcome,
  hashCommitment,
  hashLedger,
  verifyFairnessProof,
} = require('../../src/index.cjs');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8123);
const NETWORK_ID = process.env.KASPA_NETWORK_ID || 'testnet-10';
const KASPA_WASM_PKG = process.env.KASPA_WASM_PKG || '/tmp/kaspa-toccata-api-spikes/rusty-kaspa-toccata/wasm/nodejs/kaspa';
const WRPC_TIMEOUT_MS = Number(process.env.KASPA_WRPC_TIMEOUT_MS || 45000);
const TN10_TARGET_OFFSET_DAA_SCORE = BigInt(process.env.ROULETTE_TN10_TARGET_OFFSET_DAA_SCORE || '2');
const TN10_MAX_ATTEMPTS = Number(process.env.ROULETTE_TN10_MAX_ATTEMPTS || 90);
const TN10_POLL_MS = Number(process.env.ROULETTE_TN10_POLL_MS || 500);
const ROOT = path.resolve(__dirname, '../..');
const APP_ROOT = path.resolve(__dirname);
const rounds = new Map();

const rouletteOutcomeDerivers = {
  'roulette-poc:number-v1': deriveRouletteOutcome,
};

function createRoulettePocServer() {
  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') return sendJson(res, 204, {});
      const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
      if (req.method === 'GET' && url.pathname === '/examples/roulette-poc/health') {
        return sendJson(res, 200, {
          ok: true,
          service: 'kaspa-pof-api-roulette-poc',
          claimLevel: 'tn10_future_entropy',
          networkId: NETWORK_ID,
        });
      }
      if (req.method === 'POST' && url.pathname === '/examples/roulette-poc/rounds') {
        return sendJson(res, 201, await createRound());
      }
      const spinMatch = url.pathname.match(/^\/examples\/roulette-poc\/rounds\/([^/]+)\/spin$/);
      if (req.method === 'POST' && spinMatch) {
        const input = await readJson(req);
        return sendJson(res, 200, await spinRound(decodeURIComponent(spinMatch[1]), input));
      }
      if (req.method === 'GET') return sendStatic(res, url.pathname);
      sendJson(res, 404, { error: 'not found' });
    } catch (error) {
      sendJson(res, error.statusCode || 500, { error: error.message, code: error.code });
    }
  });
}

async function createRound() {
  const serverSeed = `server-${randomHex(32)}`;
  const commitment = hashCommitment(serverSeed);
  const round = {
    roundId: `roulette-${Date.now()}-${randomHex(4)}`,
    appId: 'examples/roulette-poc',
    claimLevel: 'tn10_future_entropy',
    network: { family: 'kaspa', networkId: NETWORK_ID, label: 'kaspa-tn10' },
    commitment,
    serverSeed,
    status: 'chips_open',
    createdAt: new Date().toISOString(),
  };
  rounds.set(round.roundId, round);
  return { round: publicRound(round) };
}

async function spinRound(roundId, input = {}) {
  const round = rounds.get(roundId);
  if (!round) throw httpError(404, `round ${roundId} not found`);
  if (round.status !== 'chips_open') throw httpError(409, `round ${roundId} is already closed`);
  const entries = sanitizeBets(input.bets);
  const clientSeed = requiredText(input.clientSeed, 'clientSeed');
  const ledgerHash = hashLedger(entries);
  round.status = 'waiting_for_tn10_entropy';
  round.clientSeed = clientSeed;
  round.ledger = { algorithm: 'stable-json-sha256', entries, ledgerHash };
  round.target = await chooseFutureTn10Target();

  const block = await fetchFutureTn10BlockEvidence(round.target);
  const entropy = deriveEntropyHash({
    roundId: round.roundId,
    commitment: round.commitment,
    clientSeed,
    ledgerHash,
    blockEvidence: block,
  });
  const outcome = deriveOutcome({
    entropyHash: entropy.entropyHash,
    spec: {
      deriver: 'roulette-poc:number-v1',
      params: { wheel: 'european-single-zero', modulo: 37 },
    },
    derivers: rouletteOutcomeDerivers,
  });
  const proof = {
    schema: 'kaspa-pof-api/proof/v1',
    claimLevel: 'tn10_future_entropy',
    network: round.network,
    round: { roundId: round.roundId, appId: round.appId },
    commitment: { algorithm: 'sha256', serverSeedHash: round.commitment },
    ledger: round.ledger,
    entropy: {
      algorithm: 'sha256',
      target: round.target,
      block,
      entropyHash: entropy.entropyHash,
      source: entropy.source,
    },
    reveal: { serverSeed: round.serverSeed, clientSeed },
    outcome: {
      deriver: outcome.deriver,
      params: { wheel: 'european-single-zero', modulo: 37 },
      inputHash: outcome.inputHash,
      result: outcome.result,
    },
  };
  const packageCheck = verifyFairnessProof(proof, { outcomeDerivers: rouletteOutcomeDerivers });
  if (!packageCheck.ok) {
    const message = packageCheck.errors.map((entry) => entry.message).join('; ') || 'package verification failed';
    throw httpError(500, message);
  }
  round.status = 'proof_bundle_ready';
  round.entropy = proof.entropy;
  round.result = outcome.result;
  round.proof = proof;
  round.packageCheck = packageCheck;
  return {
    round: publicRound(round),
    proof,
    serverPackageCheck: {
      ok: packageCheck.ok,
      claimLevel: packageCheck.claimLevel,
      checks: packageCheck.checks,
    },
  };
}

async function chooseFutureTn10Target() {
  return withKaspaRpc(async (rpc) => {
    const dag = await withTimeout('rpc.getBlockDagInfo', rpc.getBlockDagInfo(), WRPC_TIMEOUT_MS);
    const current = BigInt(dag.virtualDaaScore);
    return { metric: 'daaScore', score: (current + TN10_TARGET_OFFSET_DAA_SCORE).toString() };
  });
}

async function fetchFutureTn10BlockEvidence(target) {
  return withKaspaRpc(async (rpc) => {
    const targetScore = BigInt(target.score);
    let lastDag;
    for (let attempt = 0; attempt < TN10_MAX_ATTEMPTS; attempt += 1) {
      const dag = await withTimeout('rpc.getBlockDagInfo', rpc.getBlockDagInfo(), WRPC_TIMEOUT_MS);
      lastDag = dag;
      if (BigInt(dag.virtualDaaScore) >= targetScore) {
        const hashes = [...(dag.virtualParentHashes || []), ...(dag.tipHashes || [])];
        for (const candidateHash of hashes) {
          const blockResponse = await withTimeout('rpc.getBlock', rpc.getBlock({ hash: candidateHash, includeTransactions: false }), WRPC_TIMEOUT_MS);
          const header = blockResponse && blockResponse.block && blockResponse.block.header;
          if (!header) continue;
          const daaScore = String(header.daaScore);
          if (BigInt(daaScore) >= targetScore) {
            return {
              networkId: NETWORK_ID,
              blockHash: String(header.hash || candidateHash),
              daaScore,
              blueScore: String(header.blueScore),
              timestamp: header.timestamp === undefined ? undefined : String(header.timestamp),
            };
          }
        }
      }
      await delay(TN10_POLL_MS);
    }
    const current = lastDag && lastDag.virtualDaaScore !== undefined ? String(lastDag.virtualDaaScore) : 'unknown';
    throw httpError(504, `TN10 target daaScore ${target.score} not reached; current ${current}`);
  });
}

async function withKaspaRpc(fn) {
  const { RpcClient, Resolver, Encoding } = requireKaspaWasm();
  const resolver = new Resolver();
  const rpc = new RpcClient({ resolver, networkId: NETWORK_ID, encoding: Encoding.Borsh });
  let connected = false;
  try {
    await withTimeout('rpc.connect', rpc.connect(), WRPC_TIMEOUT_MS);
    connected = true;
    return await fn(rpc);
  } finally {
    if (connected) await withTimeout('rpc.disconnect', rpc.disconnect(), 10000).catch(() => undefined);
  }
}

function requireKaspaWasm() {
  const kaspa = require(KASPA_WASM_PKG);
  if (!kaspa.RpcClient || !kaspa.Resolver || !kaspa.Encoding) {
    throw new Error(`KASPA_WASM_PKG at ${KASPA_WASM_PKG} missing RpcClient, Resolver, or Encoding`);
  }
  return kaspa;
}

function deriveRouletteOutcome({ entropyHash }) {
  const number = Number(BigInt(`0x${entropyHash.slice(0, 16)}`) % 37n);
  return { number, color: rouletteColor(number), wheel: 'european-single-zero' };
}

function rouletteColor(number) {
  if (number === 0) return 'green';
  return new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]).has(number) ? 'red' : 'black';
}

function publicRound(round) {
  return {
    roundId: round.roundId,
    appId: round.appId,
    status: round.status,
    claimLevel: round.claimLevel,
    network: round.network,
    commitment: round.commitment,
    ledger: round.ledger,
    target: round.target,
    entropy: round.entropy,
    result: round.result,
    createdAt: round.createdAt,
  };
}

function sanitizeBets(bets) {
  if (!Array.isArray(bets) || bets.length === 0) throw httpError(400, 'bets must be a non-empty array');
  return bets.map((bet, index) => ({
    playerId: requiredText(bet && bet.playerId, `bets[${index}].playerId`),
    selection: requiredText(bet && bet.selection, `bets[${index}].selection`),
    amount: requiredPositiveNumber(bet && bet.amount, `bets[${index}].amount`),
  }));
}

function requiredText(value, fieldName) {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'bigint') throw httpError(400, `${fieldName} is required`);
  const text = String(value).trim();
  if (!text) throw httpError(400, `${fieldName} is required`);
  return text;
}

function requiredPositiveNumber(value, fieldName) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw httpError(400, `${fieldName} must be positive`);
  return number;
}

function sendStatic(res, pathname) {
  const routes = new Map([
    ['/examples/roulette-poc/', path.join(APP_ROOT, 'index.html')],
    ['/examples/roulette-poc/index.html', path.join(APP_ROOT, 'index.html')],
    ['/examples/roulette-poc/app.js', path.join(APP_ROOT, 'app.js')],
    ['/examples/roulette-poc/styles.css', path.join(APP_ROOT, 'styles.css')],
    ['/examples/roulette-poc/flowchart-spec.json', path.join(APP_ROOT, 'flowchart-spec.json')],
    ['/examples/roulette-poc/roulette-table-layout.js', path.join(APP_ROOT, 'roulette-table-layout.js')],
    ['/examples/roulette-poc/roulette-table-renderer.js', path.join(APP_ROOT, 'roulette-table-renderer.js')],
    ['/src/browser.mjs', path.join(ROOT, 'src/browser.mjs')],
    ['/src/commitment.mjs', path.join(ROOT, 'src/commitment.mjs')],
    ['/src/ledger.mjs', path.join(ROOT, 'src/ledger.mjs')],
    ['/src/entropy.mjs', path.join(ROOT, 'src/entropy.mjs')],
    ['/src/outcome.mjs', path.join(ROOT, 'src/outcome.mjs')],
    ['/src/proof/verify.mjs', path.join(ROOT, 'src/proof/verify.mjs')],
    ['/src/proof/root.mjs', path.join(ROOT, 'src/proof/root.mjs')],
    ['/src/networks/claim-levels.mjs', path.join(ROOT, 'src/networks/claim-levels.mjs')],
    ['/src/networks/kaspa-evidence.mjs', path.join(ROOT, 'src/networks/kaspa-evidence.mjs')],
    ['/src/anchoring/evidence.mjs', path.join(ROOT, 'src/anchoring/evidence.mjs')],
  ]);
  const filePath = routes.get(pathname);
  if (!filePath) return sendJson(res, 404, { error: 'not found' });
  const extension = path.extname(filePath);
  const type = extension === '.html' ? 'text/html; charset=utf-8'
    : extension === '.css' ? 'text/css; charset=utf-8'
      : extension === '.json' ? 'application/json; charset=utf-8'
        : 'text/javascript; charset=utf-8';
  res.writeHead(200, commonHeaders(type));
  res.end(fs.readFileSync(filePath));
}

function sendJson(res, statusCode, body) {
  if (statusCode === 204) {
    res.writeHead(204, commonHeaders('application/json; charset=utf-8'));
    return res.end();
  }
  res.writeHead(statusCode, commonHeaders('application/json; charset=utf-8'));
  res.end(`${JSON.stringify(body, null, 2)}\n`);
}

function commonHeaders(contentType) {
  return {
    'content-type': contentType,
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(httpError(413, 'request body too large'));
    });
    req.on('end', () => {
      try {
        resolve(raw.trim() ? JSON.parse(raw) : {});
      } catch (error) {
        reject(httpError(400, `invalid JSON: ${error.message}`));
      }
    });
    req.on('error', reject);
  });
}

function withTimeout(label, promise, timeoutMs) {
  let timeout;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timeout));
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString('hex');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (require.main === module) {
  const server = createRoulettePocServer();
  server.listen(PORT, HOST, () => {
    console.log(`Roulette PoC server listening on http://${HOST}:${PORT}/examples/roulette-poc/`);
  });
}

module.exports = {
  createRoulettePocServer,
  deriveRouletteOutcome,
};
