const DEFAULT_BASE_URL = 'http://127.0.0.1:8787';

class ToccataApiError extends Error {
  constructor(message, { status, method, path, body } = {}) {
    super(message);
    this.name = 'ToccataApiError';
    this.status = status;
    this.method = method;
    this.path = path;
    this.body = body;
  }
}

class ToccataApiClient {
  constructor({ baseUrl = DEFAULT_BASE_URL, fetchImpl = globalThis.fetch } = {}) {
    if (!fetchImpl) {
      throw new Error('ToccataApiClient requires fetch; use a runtime with fetch or pass fetchImpl');
    }
    this.baseUrl = String(baseUrl).replace(/\/+$/, '');
    this.fetchImpl = fetchImpl === globalThis.fetch ? fetchImpl.bind(globalThis) : fetchImpl;
  }

  async request(method, path, body) {
    const headers = { accept: 'application/json' };
    const init = { method, headers };
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, init);
    const text = await response.text();
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch (error) {
      throw new ToccataApiError(`Invalid JSON response from ${method} ${path}: ${error.message}`, {
        status: response.status,
        method,
        path,
        body: text
      });
    }

    if (!response.ok) {
      const message = parsed && parsed.message
        ? parsed.message
        : `${method} ${path} failed with HTTP ${response.status}`;
      throw new ToccataApiError(message, {
        status: response.status,
        method,
        path,
        body: parsed
      });
    }

    return parsed;
  }

  health() {
    return this.request('GET', '/v1/health');
  }

  capabilities() {
    return this.request('GET', '/v1/capabilities');
  }

  networkStatus() {
    return this.request('GET', '/v1/network/status');
  }

  createRound(input = {}) {
    return this.request('POST', '/v1/rounds', input);
  }

  getRound(roundId) {
    return this.request('GET', `/v1/rounds/${encodeURIComponent(requiredRoundId(roundId))}`);
  }

  commitRound(roundId, input) {
    return this.request('POST', `/v1/rounds/${encodeURIComponent(requiredRoundId(roundId))}/commit`, input);
  }

  updateBetLedger(roundId, input) {
    return this.request('POST', `/v1/rounds/${encodeURIComponent(requiredRoundId(roundId))}/bets/ledger`, input);
  }

  closeRound(roundId, input) {
    return this.request('POST', `/v1/rounds/${encodeURIComponent(requiredRoundId(roundId))}/close`, input);
  }

  getEntropy(roundId) {
    return this.request('GET', `/v1/rounds/${encodeURIComponent(requiredRoundId(roundId))}/entropy`);
  }

  revealRound(roundId, input) {
    return this.request('POST', `/v1/rounds/${encodeURIComponent(requiredRoundId(roundId))}/reveal`, input);
  }

  getProof(roundId) {
    return this.request('GET', `/v1/rounds/${encodeURIComponent(requiredRoundId(roundId))}/proof`);
  }

  verifyProof(proof) {
    return this.request('POST', '/v1/proofs/verify', { proof });
  }

  createCommitTx(roundId, input = {}) {
    return this.request('POST', `/v1/rounds/${encodeURIComponent(requiredRoundId(roundId))}/commit/tx`, input);
  }

  createCloseTx(roundId, input = {}) {
    return this.request('POST', `/v1/rounds/${encodeURIComponent(requiredRoundId(roundId))}/close/tx`, input);
  }

  createRevealTx(roundId, input = {}) {
    return this.request('POST', `/v1/rounds/${encodeURIComponent(requiredRoundId(roundId))}/reveal/tx`, input);
  }
}

function requiredRoundId(roundId) {
  const value = String(roundId || '').trim();
  if (!value) throw new Error('roundId is required');
  return value;
}

function createToccataApiClient(options) {
  return new ToccataApiClient(options);
}

export {
  ToccataApiClient,
  ToccataApiError,
  createToccataApiClient
};
