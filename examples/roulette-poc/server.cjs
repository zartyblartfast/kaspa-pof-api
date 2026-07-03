#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { URL } = require('node:url');

const {
  deriveEntropyHash,
  deriveOutcome,
  hashCommitment,
  hashLedger,
  verifyFairnessProof,
} = require('kaspa-pof-api');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8123);
const NETWORK_ID = process.env.KASPA_NETWORK_ID || 'testnet-10';
const KASPA_WASM_PKG = process.env.KASPA_WASM_PKG || '/tmp/kaspa-pof-api-spikes/rusty-kaspa/wasm/nodejs/kaspa';
const WRPC_TIMEOUT_MS = Number(process.env.KASPA_WRPC_TIMEOUT_MS || 45000);
const WRPC_CONNECT_RACE_MS = Number(process.env.ROULETTE_KASPA_WRPC_CONNECT_RACE_MS || 3000);
const WRPC_ENDPOINT_PENALTY_MS = Number(process.env.ROULETTE_KASPA_WRPC_ENDPOINT_PENALTY_MS || 120000);
const DEFAULT_TN10_WRPC_ENDPOINTS = [
  'wss://muon-10.kaspa.blue/kaspa/testnet-10/wrpc/borsh',
  'wss://quark-10.kaspa.red/kaspa/testnet-10/wrpc/borsh',
  'wss://vector-10.kaspa.green/kaspa/testnet-10/wrpc/borsh',
];
const WRPC_ENDPOINTS = parseEndpointList(process.env.ROULETTE_KASPA_WRPC_ENDPOINTS || process.env.KASPA_WRPC_ENDPOINTS)
  || (NETWORK_ID === 'testnet-10' ? DEFAULT_TN10_WRPC_ENDPOINTS : []);
const TN10_TARGET_OFFSET_DAA_SCORE = BigInt(process.env.ROULETTE_TN10_TARGET_OFFSET_DAA_SCORE || '2');
const TN10_MAX_ATTEMPTS = Number(process.env.ROULETTE_TN10_MAX_ATTEMPTS || 90);
const TN10_POLL_MS = Number(process.env.ROULETTE_TN10_POLL_MS || 500);
const APP_ROOT = path.resolve(__dirname);
const RUNTIME_LOG_ROOT = process.env.ROULETTE_RUNTIME_LOG_ROOT || path.join(APP_ROOT, '.runtime', 'spins');
const ROUND_RETENTION_TTL_MS = nonNegativeNumber(process.env.ROULETTE_ROUND_RETENTION_TTL_MS, 60 * 60 * 1000);
const SPIN_RETENTION_TTL_MS = nonNegativeNumber(process.env.ROULETTE_SPIN_RETENTION_TTL_MS, 60 * 60 * 1000);
const MAX_RETAINED_ROUNDS = positiveInteger(process.env.ROULETTE_MAX_RETAINED_ROUNDS, 1000);
const MAX_RETAINED_SPINS = positiveInteger(process.env.ROULETTE_MAX_RETAINED_SPINS, 1000);
const rounds = new Map();
const spins = new Map();
const endpointPenaltyUntil = new Map();

const rouletteOutcomeDerivers = {
  'roulette-poc:number-v1': deriveRouletteOutcome,
};

function createRoulettePocServer() {
  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') return sendJson(res, 204, {});
      const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);
      if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/examples/roulette-poc/health') {
        const health = {
          ok: true,
          service: 'kaspa-pof-api-roulette-poc',
          claimLevel: 'tn10_future_entropy',
          networkId: NETWORK_ID,
        };
        if (req.method === 'HEAD') return sendHead(res, 200, 'application/json; charset=utf-8');
        return sendJson(res, 200, health);
      }
      if (req.method === 'POST' && url.pathname === '/examples/roulette-poc/rounds') {
        return sendJson(res, 201, await createRound());
      }
      const spinCreateMatch = url.pathname.match(/^\/examples\/roulette-poc\/rounds\/([^/]+)\/spins$/);
      if (req.method === 'POST' && spinCreateMatch) {
        const input = await readJson(req);
        return sendJson(res, 202, startSpinSession(decodeURIComponent(spinCreateMatch[1]), input));
      }
      const spinEventsMatch = url.pathname.match(/^\/examples\/roulette-poc\/rounds\/([^/]+)\/spins\/([^/]+)\/events$/);
      if (req.method === 'GET' && spinEventsMatch) {
        return streamSpinEvents(res, decodeURIComponent(spinEventsMatch[1]), decodeURIComponent(spinEventsMatch[2]));
      }
      if (req.method === 'GET') return sendStatic(res, url.pathname);
      sendJson(res, 404, { error: 'not found' });
    } catch (error) {
      sendJson(res, error.statusCode || 500, { error: error.message, code: error.code });
    }
  });
}

async function createRound() {
  pruneRetainedState();
  const serverSeed = `server-${randomHex(32)}`;
  const commitment = hashCommitment(serverSeed);
  const nowMs = Date.now();
  const round = {
    roundId: `roulette-${nowMs}-${randomHex(4)}`,
    appId: 'examples/roulette-poc',
    claimLevel: 'tn10_future_entropy',
    network: { family: 'kaspa', networkId: NETWORK_ID, label: 'kaspa-tn10' },
    commitment,
    serverSeed,
    status: 'chips_open',
    createdAt: new Date().toISOString(),
    createdAtMs: nowMs,
  };
  rounds.set(round.roundId, round);
  pruneRetainedState();
  return { round: publicRound(round) };
}

function startSpinSession(roundId, input = {}) {
  pruneRetainedState();
  const round = rounds.get(roundId);
  if (!round) throw httpError(404, `round ${roundId} not found`);
  if (round.status !== 'chips_open') throw httpError(409, `round ${roundId} is already closed`);
  const entries = sanitizeBets(input.bets);
  const clientSeed = requiredText(input.clientSeed, 'clientSeed');
  const ledgerHash = hashLedger(entries);
  const spinId = `spin-${Date.now()}-${randomHex(4)}`;
  const diagnostics = {
    spinId,
    roundId,
    networkId: NETWORK_ID,
    targetOffsetDaaScore: TN10_TARGET_OFFSET_DAA_SCORE.toString(),
    maxAttempts: TN10_MAX_ATTEMPTS,
    pollMs: TN10_POLL_MS,
    wrpcTimeoutMs: WRPC_TIMEOUT_MS,
    startedAt: new Date().toISOString(),
    status: 'accepted',
  };
  const spin = {
    spinId,
    roundId,
    events: [],
    clients: new Set(),
    emitter: new EventEmitter(),
    diagnostics,
    logPath: path.join(RUNTIME_LOG_ROOT, `${spinId}.jsonl`),
    startedAtMs: Date.now(),
    finalPayload: null,
    error: null,
  };
  spins.set(spinId, spin);
  pruneRetainedState();
  fs.mkdirSync(RUNTIME_LOG_ROOT, { recursive: true });

  round.status = 'waiting_for_tn10_entropy';
  round.clientSeed = clientSeed;
  round.ledger = { algorithm: 'stable-json-sha256', entries, ledgerHash };

  emitSpinEvent(spin, 'spin_accepted', {
    round: publicRound(round),
    diagnostics,
    diagnosticId: spin.spinId,
  });
  emitSpinEvent(spin, 'ledger_locked', {
    ledgerHash,
    entries: entries.map((entry) => ({ playerId: entry.playerId, selection: entry.selection, amount: entry.amount })),
    diagnostics: updateDiagnostics(spin, { status: 'ledger_locked', ledgerLockedAt: new Date().toISOString() }),
  });

  runSpinSession(spin, round, clientSeed, ledgerHash).catch((error) => {
    spin.error = { message: error.message, code: error.code, statusCode: error.statusCode || 500 };
    round.status = 'spin_failed';
    emitSpinEvent(spin, 'error', {
      error: spin.error,
      diagnostics: updateDiagnostics(spin, {
        status: 'error',
        completedAt: new Date().toISOString(),
        totalElapsedMs: Date.now() - spin.startedAtMs,
      }),
    });
  });

  return {
    spinId,
    diagnosticId: spinId,
    eventsUrl: `/examples/roulette-poc/rounds/${encodeURIComponent(roundId)}/spins/${encodeURIComponent(spinId)}/events`,
    diagnostics: publicDiagnostics(spin.diagnostics),
  };
}

async function runSpinSession(spin, round, clientSeed, ledgerHash) {
  const { target, block } = await withKaspaRpc(spin, 'spin', async (rpc) => {
    const selectedTarget = await chooseFutureTn10Target(spin, rpc);
    round.target = selectedTarget;
    const blockEvidence = await fetchFutureTn10BlockEvidence(selectedTarget, spin, rpc);
    return { target: selectedTarget, block: blockEvidence };
  });
  round.target = target;

  emitSpinEvent(spin, 'proof_assembling', {
    diagnostics: updateDiagnostics(spin, { status: 'proof_assembling' }),
  });
  const proofAssemblyStarted = Date.now();
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
  updateDiagnostics(spin, { proofAssemblyMs: Date.now() - proofAssemblyStarted });

  const serverCheckStarted = Date.now();
  const packageCheck = verifyFairnessProof(proof, { outcomeDerivers: rouletteOutcomeDerivers });
  const serverPackageCheckMs = Date.now() - serverCheckStarted;
  updateDiagnostics(spin, { serverPackageCheckMs });
  if (!packageCheck.ok) {
    const message = packageCheck.errors.map((entry) => entry.message).join('; ') || 'package verification failed';
    throw httpError(500, message);
  }
  const serverPackageCheck = {
    ok: packageCheck.ok,
    claimLevel: packageCheck.claimLevel,
    checks: packageCheck.checks,
    durationMs: serverPackageCheckMs,
  };
  emitSpinEvent(spin, 'server_package_check_complete', {
    serverPackageCheck,
    diagnostics: publicDiagnostics(spin.diagnostics),
  });

  round.status = 'proof_bundle_ready';
  round.entropy = proof.entropy;
  round.result = outcome.result;
  round.proof = proof;
  round.packageCheck = packageCheck;
  const finalDiagnostics = updateDiagnostics(spin, {
    status: 'proof_bundle_ready',
    completedAt: new Date().toISOString(),
    totalElapsedMs: Date.now() - spin.startedAtMs,
  });
  spin.finalPayload = {
    round: publicRound(round),
    proof,
    serverPackageCheck,
    diagnostics: finalDiagnostics,
    diagnosticId: spin.spinId,
  };
  emitSpinEvent(spin, 'proof_bundle_ready', spin.finalPayload);
}

async function chooseFutureTn10Target(spin, rpc) {
  emitSpinEvent(spin, 'tn10_target_selecting', {
    diagnostics: updateDiagnostics(spin, { status: 'tn10_target_selecting' }),
  });
  const started = Date.now();
  const rpcStarted = Date.now();
  const dag = await withTimeout('rpc.getBlockDagInfo', rpc.getBlockDagInfo(), WRPC_TIMEOUT_MS);
  const rpcMs = Date.now() - rpcStarted;
  const current = BigInt(dag.virtualDaaScore);
  const target = { metric: 'daaScore', score: (current + TN10_TARGET_OFFSET_DAA_SCORE).toString() };
  emitSpinEvent(spin, 'tn10_target_selected', {
    currentDaaScore: current.toString(),
    target,
    rpcMs,
    diagnostics: updateDiagnostics(spin, {
      status: 'tn10_target_selected',
      target,
      startingDaaScore: current.toString(),
      targetSelectionMs: Date.now() - started,
      lastRpcMs: rpcMs,
    }),
  });
  return target;
}

async function fetchFutureTn10BlockEvidence(target, spin, rpc) {
  const waitStarted = Date.now();
  const targetScore = BigInt(target.score);
  let lastDag;
  for (let attempt = 1; attempt <= TN10_MAX_ATTEMPTS; attempt += 1) {
      const rpcStarted = Date.now();
      const dag = await withTimeout('rpc.getBlockDagInfo', rpc.getBlockDagInfo(), WRPC_TIMEOUT_MS);
      const rpcMs = Date.now() - rpcStarted;
      lastDag = dag;
      const currentDaaScore = String(dag.virtualDaaScore);
      emitSpinEvent(spin, 'tn10_poll', {
        attempt,
        currentDaaScore,
        targetDaaScore: target.score,
        elapsedMs: Date.now() - waitStarted,
        rpcMs,
        diagnostics: updateDiagnostics(spin, {
          status: 'tn10_polling',
          pollAttempts: attempt,
          currentDaaScore,
          targetDaaScore: target.score,
          tn10WaitElapsedMs: Date.now() - waitStarted,
          lastRpcMs: rpcMs,
          lastRpcStep: 'getBlockDagInfo',
        }),
      });
      if (Date.now() - waitStarted > 5000 && attempt % 10 === 0) {
        emitSpinEvent(spin, 'tn10_slow', {
          attempt,
          elapsedMs: Date.now() - waitStarted,
          currentDaaScore,
          targetDaaScore: target.score,
          diagnostics: updateDiagnostics(spin, { status: 'tn10_slow' }),
        });
      }
      if (BigInt(dag.virtualDaaScore) >= targetScore) {
        const hashes = [...(dag.virtualParentHashes || []), ...(dag.tipHashes || [])];
        for (const candidateHash of hashes) {
          const blockStarted = Date.now();
          const blockResponse = await withTimeout('rpc.getBlock', rpc.getBlock({ hash: candidateHash, includeTransactions: false }), WRPC_TIMEOUT_MS);
          const blockFetchMs = Date.now() - blockStarted;
          const header = blockResponse && blockResponse.block && blockResponse.block.header;
          if (!header) continue;
          const daaScore = String(header.daaScore);
          if (BigInt(daaScore) >= targetScore) {
            const block = {
              networkId: NETWORK_ID,
              blockHash: String(header.hash || candidateHash),
              daaScore,
              blueScore: String(header.blueScore),
              timestamp: header.timestamp === undefined ? undefined : String(header.timestamp),
            };
            emitSpinEvent(spin, 'tn10_block_found', {
              block,
              blockFetchMs,
              diagnostics: updateDiagnostics(spin, {
                status: 'tn10_block_found',
                blockHash: block.blockHash,
                blockDaaScore: block.daaScore,
                blockBlueScore: block.blueScore,
                blockFetchMs,
                tn10WaitElapsedMs: Date.now() - waitStarted,
                lastRpcMs: blockFetchMs,
                lastRpcStep: 'getBlock',
              }),
            });
            return block;
          }
        }
      }
      await delay(TN10_POLL_MS);
    }
  const current = lastDag && lastDag.virtualDaaScore !== undefined ? String(lastDag.virtualDaaScore) : 'unknown';
  throw httpError(504, `TN10 target daaScore ${target.score} not reached; current ${current}`);
}

async function withKaspaRpc(spin, phase, fn) {
  const sessionId = `rpc-${phase}-${Date.now()}-${randomHex(3)}`;
  const sessionStarted = Date.now();
  let connection;
  emitSpinEvent(spin, 'rpc_session_starting', {
    phase,
    sessionId,
    diagnostics: updateRpcDiagnostics(spin, phase, {
      status: `${phase}_rpc_starting`,
      sessionId,
      networkId: NETWORK_ID,
      encoding: 'borsh',
      endpointCount: WRPC_ENDPOINTS.length,
      raceTimeoutMs: WRPC_CONNECT_RACE_MS,
      startedAt: new Date().toISOString(),
    }),
  });
  try {
    const connectStarted = Date.now();
    emitSpinEvent(spin, 'rpc_connecting', {
      phase,
      sessionId,
      timeoutMs: WRPC_TIMEOUT_MS,
      raceTimeoutMs: WRPC_CONNECT_RACE_MS,
      endpoints: publicEndpointDialPlan(),
      diagnostics: updateRpcDiagnostics(spin, phase, {
        status: `${phase}_rpc_connecting`,
        connectStartedAt: new Date().toISOString(),
        dialPlan: publicEndpointDialPlan(),
      }),
    });
    connection = await dialKaspaRpc(spin, phase, sessionId);
    const connectMs = Date.now() - connectStarted;
    emitSpinEvent(spin, 'rpc_connected', {
      phase,
      sessionId,
      connectMs,
      endpoint: connection.endpoint,
      strategy: connection.strategy,
      attemptCount: connection.attempts.length,
      attempts: connection.attempts.map(publicDialAttempt),
      diagnostics: updateRpcDiagnostics(spin, phase, {
        status: `${phase}_rpc_connected`,
        connectMs,
        endpoint: connection.endpoint,
        strategy: connection.strategy,
        attempts: connection.attempts.map(publicDialAttempt),
        connectedAt: new Date().toISOString(),
        lastRpcLifecycleStep: 'connect',
        lastRpcLifecycleMs: connectMs,
      }),
    });
    return await fn(connection.rpc);
  } finally {
    if (connection && connection.rpc) {
      const disconnectStarted = Date.now();
      emitSpinEvent(spin, 'rpc_disconnecting', {
        phase,
        sessionId,
        endpoint: connection.endpoint,
        diagnostics: updateRpcDiagnostics(spin, phase, {
          status: `${phase}_rpc_disconnecting`,
          disconnectStartedAt: new Date().toISOString(),
        }),
      });
      let disconnectError;
      await withTimeout('rpc.disconnect', connection.rpc.disconnect(), 10000).catch((error) => {
        disconnectError = error;
      });
      const disconnectMs = Date.now() - disconnectStarted;
      emitSpinEvent(spin, 'rpc_disconnected', {
        phase,
        sessionId,
        endpoint: connection.endpoint,
        disconnectMs,
        error: disconnectError ? disconnectError.message : undefined,
        diagnostics: updateRpcDiagnostics(spin, phase, {
          status: disconnectError ? `${phase}_rpc_disconnect_error` : `${phase}_rpc_disconnected`,
          disconnectMs,
          disconnectError: disconnectError ? disconnectError.message : undefined,
          sessionTotalMs: Date.now() - sessionStarted,
          lastRpcLifecycleStep: 'disconnect',
          lastRpcLifecycleMs: disconnectMs,
        }),
      });
    }
  }
}

async function dialKaspaRpc(spin, phase, sessionId) {
  const explicitEndpoints = activeEndpoints();
  if (explicitEndpoints.length > 0) {
    const explicit = await raceExplicitEndpoints(spin, phase, sessionId, explicitEndpoints);
    if (explicit) return explicit;
  }
  return connectViaResolver(spin, phase, sessionId);
}

async function raceExplicitEndpoints(spin, phase, sessionId, endpoints) {
  const { RpcClient, Encoding } = requireKaspaWasm();
  const started = Date.now();
  const attempts = [];
  let settled = false;
  const racers = endpoints.map((endpoint, index) => new Promise((resolve) => {
    const rpc = new RpcClient({ url: endpoint, networkId: NETWORK_ID, encoding: Encoding.Borsh });
    const attempt = {
      endpoint,
      index,
      strategy: 'explicit_endpoint_race',
      startedAt: new Date().toISOString(),
      startedOffsetMs: Date.now() - started,
      status: 'connecting',
    };
    attempts.push(attempt);
    emitSpinEvent(spin, 'rpc_endpoint_connecting', {
      phase,
      sessionId,
      endpoint,
      strategy: attempt.strategy,
      raceTimeoutMs: WRPC_CONNECT_RACE_MS,
      diagnostics: updateRpcDiagnostics(spin, phase, { activeEndpointAttempt: publicDialAttempt(attempt) }),
    });
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      attempt.status = 'timeout';
      attempt.connectMs = Date.now() - started - attempt.startedOffsetMs;
      penalizeEndpoint(endpoint);
      emitSpinEvent(spin, 'rpc_endpoint_timeout', {
        phase,
        sessionId,
        endpoint,
        connectMs: attempt.connectMs,
        penaltyMs: WRPC_ENDPOINT_PENALTY_MS,
        diagnostics: updateRpcDiagnostics(spin, phase, { activeEndpointAttempt: publicDialAttempt(attempt) }),
      });
      resolve(null);
    }, WRPC_CONNECT_RACE_MS);
    rpc.connect().then(() => {
      clearTimeout(timeout);
      attempt.connectMs = Date.now() - started - attempt.startedOffsetMs;
      attempt.status = timedOut ? 'late_connected' : 'connected';
      if (timedOut || settled) {
        withTimeout('rpc.disconnect.loser', rpc.disconnect(), 10000).catch(() => undefined);
        return resolve(null);
      }
      settled = true;
      emitSpinEvent(spin, 'rpc_endpoint_connected', {
        phase,
        sessionId,
        endpoint,
        connectMs: attempt.connectMs,
        strategy: attempt.strategy,
        diagnostics: updateRpcDiagnostics(spin, phase, { activeEndpointAttempt: publicDialAttempt(attempt) }),
      });
      resolve({ rpc, endpoint, strategy: attempt.strategy, connectMs: attempt.connectMs, attempts });
    }).catch((error) => {
      clearTimeout(timeout);
      attempt.connectMs = Date.now() - started - attempt.startedOffsetMs;
      attempt.status = 'error';
      attempt.error = error.message;
      penalizeEndpoint(endpoint);
      emitSpinEvent(spin, 'rpc_endpoint_error', {
        phase,
        sessionId,
        endpoint,
        connectMs: attempt.connectMs,
        error: error.message,
        penaltyMs: WRPC_ENDPOINT_PENALTY_MS,
        diagnostics: updateRpcDiagnostics(spin, phase, { activeEndpointAttempt: publicDialAttempt(attempt) }),
      });
      resolve(null);
    });
  }));
  const winner = await firstResolvedConnection(racers);
  if (winner) return winner;
  emitSpinEvent(spin, 'rpc_endpoint_race_exhausted', {
    phase,
    sessionId,
    attempts: attempts.map(publicDialAttempt),
    diagnostics: updateRpcDiagnostics(spin, phase, { endpointRaceAttempts: attempts.map(publicDialAttempt) }),
  });
  return null;
}

async function firstResolvedConnection(promises) {
  const pending = new Set(promises);
  while (pending.size > 0) {
    const tagged = [...pending].map((promise) => promise.then((result) => ({ promise, result })));
    const { promise, result } = await Promise.race(tagged);
    pending.delete(promise);
    if (result) return result;
  }
  return null;
}

async function connectViaResolver(spin, phase, sessionId) {
  const { RpcClient, Resolver, Encoding } = requireKaspaWasm();
  const started = Date.now();
  const resolver = new Resolver();
  const rpc = new RpcClient({ resolver, networkId: NETWORK_ID, encoding: Encoding.Borsh });
  emitSpinEvent(spin, 'rpc_resolver_connecting', {
    phase,
    sessionId,
    timeoutMs: WRPC_TIMEOUT_MS,
    diagnostics: updateRpcDiagnostics(spin, phase, { status: `${phase}_resolver_connecting` }),
  });
  await withTimeout('rpc.connect', rpc.connect(), WRPC_TIMEOUT_MS);
  const endpoint = describeRpcEndpoint(rpc);
  const connectMs = Date.now() - started;
  const attempt = { endpoint, strategy: 'resolver_fallback', status: 'connected', connectMs };
  return { rpc, endpoint, strategy: 'resolver_fallback', connectMs, attempts: [attempt] };
}

function activeEndpoints() {
  const now = Date.now();
  const active = WRPC_ENDPOINTS.filter((endpoint) => (endpointPenaltyUntil.get(endpoint) || 0) <= now);
  return active.length > 0 ? active : WRPC_ENDPOINTS;
}

function penalizeEndpoint(endpoint) {
  endpointPenaltyUntil.set(endpoint, Date.now() + WRPC_ENDPOINT_PENALTY_MS);
}

function publicEndpointDialPlan() {
  const now = Date.now();
  return WRPC_ENDPOINTS.map((endpoint) => ({
    endpoint,
    penalizedForMs: Math.max(0, (endpointPenaltyUntil.get(endpoint) || 0) - now),
  }));
}

function publicDialAttempt(attempt) {
  return {
    endpoint: attempt.endpoint,
    index: attempt.index,
    strategy: attempt.strategy,
    status: attempt.status,
    connectMs: attempt.connectMs,
    error: attempt.error,
  };
}

function updateRpcDiagnostics(spin, phase, patchData) {
  const key = `${phase}Rpc`;
  const current = spin.diagnostics[key] || {};
  spin.diagnostics[key] = { ...current, ...patchData };
  spin.diagnostics.lastRpcPhase = phase;
  if (patchData.lastRpcLifecycleStep) spin.diagnostics.lastRpcLifecycleStep = `${phase}.${patchData.lastRpcLifecycleStep}`;
  if (patchData.lastRpcLifecycleMs !== undefined) spin.diagnostics.lastRpcLifecycleMs = patchData.lastRpcLifecycleMs;
  if (patchData.connectMs !== undefined) {
    spin.diagnostics[`${phase}RpcConnectMs`] = patchData.connectMs;
  }
  if (patchData.disconnectMs !== undefined) {
    spin.diagnostics[`${phase}RpcDisconnectMs`] = patchData.disconnectMs;
  }
  if (patchData.sessionTotalMs !== undefined) {
    spin.diagnostics[`${phase}RpcSessionTotalMs`] = patchData.sessionTotalMs;
  }
  return publicDiagnostics(spin.diagnostics);
}

function describeRpcEndpoint(rpc) {
  const candidates = [
    rpc && rpc.url,
    rpc && rpc.endpoint,
    rpc && rpc.address,
    rpc && rpc.currentUrl,
    rpc && rpc.currentEndpoint,
    rpc && rpc.options && rpc.options.url,
    rpc && rpc.options && rpc.options.endpoint,
  ].filter(Boolean);
  return candidates.length ? String(candidates[0]) : 'not exposed by rusty-kaspa RpcClient';
}

function parseEndpointList(value) {
  if (!value) return null;
  const endpoints = value.split(',').map((entry) => entry.trim()).filter(Boolean);
  return endpoints.length > 0 ? endpoints : null;
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
    ['/examples/roulette-poc/roulette-wheel-renderer.js', path.join(APP_ROOT, 'roulette-wheel-renderer.js')],
  ]);
  const filePath = routes.get(pathname) || resolveInstalledPackageAsset(pathname);
  if (!filePath) return sendJson(res, 404, { error: 'not found' });
  const extension = path.extname(filePath);
  const type = extension === '.html' ? 'text/html; charset=utf-8'
    : extension === '.css' ? 'text/css; charset=utf-8'
      : extension === '.json' ? 'application/json; charset=utf-8'
        : 'text/javascript; charset=utf-8';
  res.writeHead(200, commonHeaders(type));
  res.end(fs.readFileSync(filePath));
}

function resolveInstalledPackageAsset(pathname) {
  const prefix = '/examples/roulette-poc/node_modules/kaspa-pof-api/';
  if (!pathname.startsWith(prefix)) return null;
  const relative = pathname.slice(prefix.length);
  if (!relative || relative.includes('\0')) return null;
  const packageRoot = path.join(APP_ROOT, 'node_modules', 'kaspa-pof-api');
  const filePath = path.resolve(packageRoot, relative);
  if (!filePath.startsWith(`${packageRoot}${path.sep}`)) return null;
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;
  return filePath;
}

function sendJson(res, statusCode, body) {
  if (statusCode === 204) {
    res.writeHead(204, commonHeaders('application/json; charset=utf-8'));
    return res.end();
  }
  res.writeHead(statusCode, commonHeaders('application/json; charset=utf-8'));
  res.end(`${JSON.stringify(body, null, 2)}\n`);
}

function sendHead(res, statusCode, contentType) {
  res.writeHead(statusCode, commonHeaders(contentType));
  res.end();
}

function pruneRetainedState(nowMs = Date.now()) {
  pruneMapByAgeAndLimit(rounds, {
    nowMs,
    ttlMs: ROUND_RETENTION_TTL_MS,
    maxEntries: MAX_RETAINED_ROUNDS,
    timestamp: (round) => round.createdAtMs || Date.parse(round.createdAt) || 0,
  });
  pruneMapByAgeAndLimit(spins, {
    nowMs,
    ttlMs: SPIN_RETENTION_TTL_MS,
    maxEntries: MAX_RETAINED_SPINS,
    timestamp: (spin) => spin.startedAtMs || 0,
    onDelete: closeRetainedSpin,
  });
}

function pruneMapByAgeAndLimit(map, { nowMs, ttlMs, maxEntries, timestamp, onDelete }) {
  for (const [key, value] of map) {
    if (ttlMs > 0 && nowMs - timestamp(value) > ttlMs) deleteRetainedEntry(map, key, value, onDelete);
  }
  if (map.size <= maxEntries) return;
  const overflow = [...map.entries()]
    .sort(([, left], [, right]) => timestamp(left) - timestamp(right))
    .slice(0, map.size - maxEntries);
  for (const [key, value] of overflow) deleteRetainedEntry(map, key, value, onDelete);
}

function deleteRetainedEntry(map, key, value, onDelete) {
  if (!map.delete(key)) return;
  if (onDelete) onDelete(value);
}

function closeRetainedSpin(spin) {
  for (const client of spin.clients || []) {
    client.res.end();
  }
  if (spin.clients) spin.clients.clear();
}

function positiveInteger(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function nonNegativeNumber(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function streamSpinEvents(res, roundId, spinId) {
  const spin = spins.get(spinId);
  if (!spin || spin.roundId !== roundId) return sendJson(res, 404, { error: `spin ${spinId} not found` });
  res.writeHead(200, {
    ...commonHeaders('text/event-stream; charset=utf-8'),
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  res.write(': connected\n\n');
  for (const event of spin.events) writeSseEvent(res, event);
  if (spin.events.some((event) => event.event === 'proof_bundle_ready' || event.event === 'error')) {
    res.end();
    return;
  }
  const client = { res };
  spin.clients.add(client);
  reqSafeClose(res, () => spin.clients.delete(client));
}

function reqSafeClose(res, onClose) {
  res.on('close', onClose);
  res.on('error', onClose);
}

function emitSpinEvent(spin, event, data = {}) {
  const payload = {
    id: `${spin.events.length + 1}`,
    event,
    data: {
      ts: new Date().toISOString(),
      spinId: spin.spinId,
      roundId: spin.roundId,
      elapsedMs: Date.now() - spin.startedAtMs,
      ...data,
    },
  };
  spin.events.push(payload);
  appendSpinLog(spin, payload);
  for (const client of spin.clients) writeSseEvent(client.res, payload);
  if (event === 'proof_bundle_ready' || event === 'error') {
    for (const client of spin.clients) client.res.end();
    spin.clients.clear();
  }
}

function writeSseEvent(res, payload) {
  res.write(`id: ${payload.id}\n`);
  res.write(`event: ${payload.event}\n`);
  res.write(`data: ${JSON.stringify(payload.data)}\n\n`);
}

function appendSpinLog(spin, payload) {
  const line = JSON.stringify(sanitizeSpinLogEvent(payload)) + '\n';
  fs.appendFileSync(spin.logPath, line);
}

function sanitizeSpinLogEvent(payload) {
  const data = { ...payload.data };
  if (data.proof) {
    data.proofSummary = {
      claimLevel: data.proof.claimLevel,
      round: data.proof.round,
      ledgerHash: data.proof.ledger && data.proof.ledger.ledgerHash,
      entropyHash: data.proof.entropy && data.proof.entropy.entropyHash,
      blockHash: data.proof.entropy && data.proof.entropy.block && data.proof.entropy.block.blockHash,
      outcome: data.proof.outcome && data.proof.outcome.result,
      revealIncludedInSse: true,
      revealServerSeedLogged: false,
    };
    delete data.proof;
  }
  if (data.round && data.round.proof) delete data.round.proof;
  return { id: payload.id, event: payload.event, ...data };
}

function updateDiagnostics(spin, patchData) {
  Object.assign(spin.diagnostics, patchData);
  return publicDiagnostics(spin.diagnostics);
}

function publicDiagnostics(diagnostics) {
  return JSON.parse(JSON.stringify(diagnostics));
}

function commonHeaders(contentType) {
  return {
    'content-type': contentType,
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,HEAD,POST,OPTIONS',
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
