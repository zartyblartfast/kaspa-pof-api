import {
  deriveOutcome,
  verifyFairnessProof,
} from 'kaspa-pof-api/browser';

(() => {
  const tableLayout = window.createRouletteTableLayout();
  const tableRenderer = window.RouletteTableRenderer;
  const wheelRenderer = window.RouletteWheelRenderer;
  const stageOrder = ['boot', 'ready', 'chips', 'spinning', 'closed', 'entropy', 'revealed', 'verified'];
  const ROULETTE_CLAIM_LEVEL = 'tn10_future_entropy';
  const MIN_WHEEL_SPIN_MS = 3000;
  const rouletteOutcomeDerivers = {
    'roulette-poc:number-v1': deriveRouletteOutcome,
  };

  const state = {
    stage: 'boot',
    roundId: null,
    round: null,
    proof: null,
    verification: null,
    entropy: null,
    selections: [],
    nextSelectionId: 1,
    clientSeed: '',
    roundAccounting: null,
    sessionProfitLoss: 0,
    settledRoundIds: new Set(),
    pendingOutcome: null,
    wheel: {
      phase: 'idle',
      startedAt: null,
      result: null,
      revealReady: false,
    },
    busy: false,
    trace: {},
    diagnostics: null,
    diagnosticEvents: [],
    spinEventSource: null,
    flowchartSpec: null,
    operation: {
      label: 'Preparing TN10 proof runtime',
      detail: 'Reset asks the roulette PoC server to create a committed TN10 future-entropy round. Verification happens in this browser through kaspa-pof-api.',
      tone: 'idle',
    },
  };

  const el = {
    serviceStatus: document.getElementById('serviceStatus'),
    roundId: document.getElementById('roundId'),
    roundStage: document.getElementById('roundStage'),
    tableHost: document.getElementById('tableHost'),
    wheelHost: document.getElementById('wheelHost'),
    stake: document.getElementById('stake'),
    chipPresets: [...document.querySelectorAll('[data-chip-amount]')],
    undoChipButton: document.getElementById('undoChipButton'),
    clearChipsButton: document.getElementById('clearChipsButton'),
    selectionList: document.getElementById('selectionList'),
    demoAccountingCard: document.getElementById('demoAccountingCard'),
    resultValue: document.getElementById('resultValue'),
    resultNote: document.getElementById('resultNote'),
    spinButton: document.getElementById('spinButton'),
    resetButton: document.getElementById('resetButton'),
    liveProofStatusRoot: document.getElementById('liveProofStatusRoot'),
    diagnosticsPanel: document.getElementById('diagnosticsPanel'),
    claimLevel: document.getElementById('claimLevel'),
    flowchartRoot: document.getElementById('flowchartRoot'),
    operationStatus: document.getElementById('operationStatus'),
  };

  boot();

  function boot() {
    el.spinButton.addEventListener('click', () => runSpin());
    el.resetButton.addEventListener('click', () => resetRound());
    el.chipPresets.forEach((button) => {
      button.addEventListener('click', () => {
        el.stake.value = button.dataset.chipAmount || el.stake.value;
        renderAll();
      });
    });
    el.undoChipButton.addEventListener('click', () => removeLastSelection());
    el.clearChipsButton.addEventListener('click', () => clearSelections());
    renderAll();
    loadFlowchartSpec()
      .catch((error) => {
        rememberError('flowchartSpecError', error);
        setStatus(`Flowchart spec failed: ${error.message}`, false);
      })
      .finally(() => resetRound());
  }

  async function loadFlowchartSpec() {
    const response = await fetch('/examples/roulette-poc/flowchart-spec.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`flowchart-spec.json HTTP ${response.status}`);
    const spec = await response.json();
    validateFlowchartSpec(spec);
    state.flowchartSpec = spec;
    renderAll();
  }

  async function resetRound() {
    if (state.busy) return;
    state.busy = true;
    setOperation('Starting committed TN10 round', 'Requesting a roulette-specific server round. The server owns hidden seed material; the browser receives only the commitment until proof reveal.', 'busy');
    setStatus('Creating TN10 future-entropy round…', null);
    state.stage = 'boot';
    state.roundId = null;
    state.round = null;
    state.proof = null;
    state.verification = null;
    state.entropy = null;
    state.roundAccounting = null;
    state.pendingOutcome = null;
    state.wheel = { phase: 'idle', startedAt: null, result: null, revealReady: false };
    state.selections = [];
    state.nextSelectionId = 1;
    state.clientSeed = `client-${randomHex(32)}`;
    closeSpinEventSource();
    state.trace = {};
    state.diagnostics = null;
    state.diagnosticEvents = [];
    renderAll();

    try {
      await rememberStep('health', 'Checking roulette PoC server', 'The server supplies round state and TN10 evidence, not a trusted proof verdict.', fetchJson('/examples/roulette-poc/health'));
      const created = await rememberStep('createRound', 'Creating committed round', 'The server commits hidden seed material before chip placement opens.', fetchJson('/examples/roulette-poc/rounds', { method: 'POST' }));
      state.round = created.round;
      state.roundId = created.round.roundId;
      state.stage = 'ready';
      setOperation('Chips open', 'Commitment is fixed. Chip placement is local UI state until Spin Wheel locks and submits the ledger.', 'pass');
      setStatus('Committed TN10 round ready for chips', true);
    } catch (error) {
      state.stage = 'boot';
      rememberError('resetError', error);
      setOperation('Round setup failed', error.message, 'fail');
      setStatus(error.message, false);
    } finally {
      state.busy = false;
      renderAll();
    }
  }

  async function runSpin() {
    if (state.busy || !state.roundId || !canPlaceChips()) return;
    state.busy = true;
    state.stage = 'spinning';
    state.pendingOutcome = null;
    state.wheel = { phase: 'spinning', startedAt: performance.now(), result: null, revealReady: false };
    closeSpinEventSource();
    state.diagnostics = null;
    state.diagnosticEvents = [];
    setOperation('Spin session starting', 'Submitting the locked chip ledger. The next status updates will stream from the roulette PoC server over SSE while it waits for real TN10 evidence.', 'busy');
    setStatus('Starting TN10 diagnostic stream…', null);
    renderAll();

    try {
      const bets = state.selections.map((entry) => ({
        playerId: 'roulette-poc-player',
        selection: `${entry.betType}:${entry.label}`,
        amount: entry.amount,
      }));
      state.trace.betLedger = { entries: bets };
      state.stage = 'closed';
      renderAll();

      const spinStart = performance.now();
      const createdSpin = await rememberStep(
        'spinSession',
        'Creating SSE spin session',
        'The server locks the chip ledger and starts a diagnostic TN10 proof workflow. The browser subscribes to streamed status events, not a proof verdict.',
        fetchJson(`/examples/roulette-poc/rounds/${encodeURIComponent(state.roundId)}/spins`, {
          method: 'POST',
          body: JSON.stringify({ bets, clientSeed: state.clientSeed }),
        })
      );
      state.diagnostics = createdSpin.diagnostics;
      appendDiagnosticEvent('spin_session_created', createdSpin);
      setOperation('Diagnostic stream connected', `Spin ${createdSpin.spinId} started. Server runtime logs stay private; public diagnostics use event id ${createdSpin.diagnosticId || createdSpin.spinId}.`, 'busy');
      renderAll();

      const payload = await consumeSpinEvents(createdSpin.eventsUrl);
      state.round = payload.round;
      state.proof = payload.proof;
      state.entropy = payload.proof.entropy;
      state.trace.proofBundle = payload;
      state.trace.serverPackageCheck = payload.serverPackageCheck;
      state.trace.proofBundleTiming = { seconds: Number(((performance.now() - spinStart) / 1000).toFixed(1)), label: 'SSE proof bundle ready' };
      state.stage = 'entropy';
      renderAll();

      const independentlyDerivedOutcome = deriveOutcome({
        entropyHash: state.proof.entropy.entropyHash,
        spec: state.proof.outcome,
        derivers: rouletteOutcomeDerivers,
      });
      state.pendingOutcome = independentlyDerivedOutcome;

      const browserVerifyStarted = performance.now();
      const verification = verifyFairnessProof(state.proof, { outcomeDerivers: rouletteOutcomeDerivers });
      const browserVerificationMs = Math.round(performance.now() - browserVerifyStarted);
      state.verification = verification;
      state.diagnostics = { ...(state.diagnostics || {}), browserVerificationMs, browserStatus: verification.ok ? 'verified' : 'failed' };
      appendDiagnosticEvent('browser_package_verification', { ok: verification.ok, browserVerificationMs });
      if (!verification.ok) {
        state.wheel = { ...state.wheel, phase: 'error', result: null, revealReady: false };
        settleRoundAccounting(verification);
        state.stage = 'revealed';
        setOperation('Browser proof verification failed', verification.errors.map((entry) => entry.message).join('; '), 'fail');
        setStatus('Browser package proof failed', false);
        return;
      }

      await completeWheelReveal(independentlyDerivedOutcome.result, browserVerificationMs);
      state.trace.browserOutcome = independentlyDerivedOutcome;
      settleRoundAccounting(verification);
      state.stage = 'verified';
      setOperation(
        'TN10 proof verified in browser',
        `kaspa-pof-api replayed the proof locally, then the visual wheel landed on ${independentlyDerivedOutcome.result.number} ${independentlyDerivedOutcome.result.color}. Browser verification took ${browserVerificationMs}ms.`,
        'pass'
      );
      setStatus('Browser package verified TN10 proof', true);
    } catch (error) {
      rememberError('spinError', error);
      appendDiagnosticEvent('spin_error', { message: error.message });
      setOperation('Spin failed', error.message, 'fail');
      setStatus(error.message, false);
    } finally {
      closeSpinEventSource();
      state.busy = false;
      renderAll();
    }
  }

  async function completeWheelReveal(result, browserVerificationMs) {
    const elapsed = state.wheel && Number.isFinite(state.wheel.startedAt) ? performance.now() - state.wheel.startedAt : 0;
    const remainingMs = Math.max(0, MIN_WHEEL_SPIN_MS - elapsed);
    setOperation(
      'Wheel spinning to verified result',
      `Browser package verification passed in ${browserVerificationMs}ms. Holding player-facing result reveal until the wheel simulation completes.`,
      'busy'
    );
    setStatus('Wheel settling to browser-verified result…', null);
    renderAll();
    if (remainingMs > 0) await delay(remainingMs);

    state.wheel = { ...state.wheel, phase: 'settling', result, revealReady: false };
    renderAll();
    await delay(wheelSettleMs());
    state.wheel = { ...state.wheel, phase: 'stopped', result, revealReady: true };
    renderAll();
  }

  function wheelSettleMs() {
    const configured = wheelRenderer && wheelRenderer.WHEEL_TUNING && wheelRenderer.WHEEL_TUNING.settleMs;
    return Number.isFinite(Number(configured)) ? Number(configured) : 1200;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
  }

  function consumeSpinEvents(eventsUrl) {
    return new Promise((resolve, reject) => {
      const source = new EventSource(eventsUrl);
      state.spinEventSource = source;
      let settled = false;
      let lastEventAt = performance.now();
      const stallTimer = setInterval(() => {
        if (settled) return;
        const silentMs = performance.now() - lastEventAt;
        if (silentMs > 20000) {
          appendDiagnosticEvent('sse_stalled', { message: `No diagnostic event for ${formatMs(silentMs)}.` });
          setOperation('Diagnostic stream quiet', `No SSE event has arrived for ${formatMs(silentMs)}. The browser is still connected; this can indicate RPC stall or transport delay.`, 'warn');
          renderAll();
          lastEventAt = performance.now();
        }
      }, 5000);
      const settle = (fn, value) => {
        if (settled) return;
        settled = true;
        clearInterval(stallTimer);
        source.close();
        if (state.spinEventSource === source) state.spinEventSource = null;
        fn(value);
      };
      const handleEvent = (eventName, event) => {
        lastEventAt = performance.now();
        const data = JSON.parse(event.data);
        if (data.diagnostics) state.diagnostics = data.diagnostics;
        appendDiagnosticEvent(eventName, data);
        updateOperationFromSpinEvent(eventName, data);
        if (eventName === 'proof_bundle_ready') settle(resolve, data);
        if (eventName === 'error') settle(reject, new Error(data.error && data.error.message ? data.error.message : 'spin diagnostic stream failed'));
        renderAll();
      };
      [
        'spin_accepted',
        'ledger_locked',
        'tn10_target_selecting',
        'tn10_target_selected',
        'tn10_poll',
        'tn10_slow',
        'tn10_block_found',
        'proof_assembling',
        'rpc_session_starting',
        'rpc_connecting',
        'rpc_endpoint_connecting',
        'rpc_endpoint_connected',
        'rpc_endpoint_timeout',
        'rpc_endpoint_error',
        'rpc_endpoint_race_exhausted',
        'rpc_resolver_connecting',
        'rpc_connected',
        'rpc_disconnecting',
        'rpc_disconnected',
        'server_package_check_complete',
        'proof_bundle_ready',
        'error',
      ].forEach((eventName) => source.addEventListener(eventName, (event) => handleEvent(eventName, event)));
      source.onerror = () => {
        if (!settled) {
          appendDiagnosticEvent('sse_transport_error', { message: 'SSE connection interrupted before final proof bundle.' });
          renderAll();
        }
      };
    });
  }

  function updateOperationFromSpinEvent(eventName, data) {
    const diagnostics = data.diagnostics || state.diagnostics || {};
    const elapsed = diagnostics.totalElapsedMs || data.elapsedMs;
    const suffix = Number.isFinite(Number(elapsed)) ? ` Elapsed ${formatMs(elapsed)}.` : '';
    const messages = {
      spin_accepted: ['Spin accepted', 'Server accepted the spin session and opened diagnostic logging.'],
      ledger_locked: ['Ledger locked', `Chip ledger hash ${shortText(data.ledgerHash)} is fixed before TN10 evidence is fetched.`],
      tn10_target_selecting: ['Selecting TN10 target', 'Server is reading current TN10 DAA score before choosing the future entropy target.'],
      tn10_target_selected: ['TN10 target selected', `Starting DAA ${data.currentDaaScore}; target DAA ${data.target && data.target.score}.`],
      tn10_poll: ['Polling TN10', `Attempt ${data.attempt}: current DAA ${data.currentDaaScore}, target ${data.targetDaaScore}, RPC ${data.rpcMs}ms.${suffix}`],
      tn10_slow: ['TN10 evidence slower than usual', `Polling is still active at attempt ${data.attempt}; current DAA ${data.currentDaaScore}, target ${data.targetDaaScore}.${suffix}`],
      tn10_block_found: ['TN10 block found', `Block ${shortText(data.block && data.block.blockHash)} reached DAA ${data.block && data.block.daaScore}.`],
      proof_assembling: ['Assembling proof bundle', 'Server is deriving entropy, roulette outcome evidence, and the portable proof bundle.'],
      rpc_endpoint_connecting: ['Trying Kaspa endpoint', `${shortText(data.endpoint, 54)} has ${data.raceTimeoutMs}ms to connect.`],
      rpc_endpoint_connected: ['Kaspa endpoint connected', `${shortText(data.endpoint, 54)} connected in ${data.connectMs}ms.`],
      rpc_endpoint_timeout: ['Kaspa endpoint timed out', `${shortText(data.endpoint, 54)} exceeded ${data.connectMs}ms and is temporarily penalized.`],
      rpc_endpoint_error: ['Kaspa endpoint failed', `${shortText(data.endpoint, 54)} failed: ${data.error || 'unknown error'}.`],
      rpc_endpoint_race_exhausted: ['Endpoint race exhausted', 'No configured endpoint connected inside the bounded race; resolver fallback is next.'],
      rpc_resolver_connecting: ['Resolver fallback connecting', 'Configured endpoints did not connect quickly; falling back to rusty-kaspa resolver.'],
      server_package_check_complete: ['Server sanity-check complete', `Server package check passed in ${data.serverPackageCheck && data.serverPackageCheck.durationMs}ms; browser verification still decides the displayed result.`],
      proof_bundle_ready: ['Proof bundle received', 'Browser is replaying the returned proof bundle locally with kaspa-pof-api.'],
    };
    const [label, detail] = messages[eventName] || [eventName, 'Diagnostic event received.'];
    setOperation(label, detail, eventName === 'tn10_slow' ? 'warn' : 'busy');
    setStatus(label, null);
  }


  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: { 'content-type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const text = await response.text();
    const payload = text.trim() ? JSON.parse(text) : {};
    if (!response.ok) throw new Error(payload.error || `${url} HTTP ${response.status}`);
    return payload;
  }

  async function rememberStep(key, label, detail, promise) {
    const startedAt = performance.now();
    setOperation(label, detail, 'busy');
    setStatus(label, null);
    renderAll();
    try {
      const payload = await promise;
      const seconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      state.trace[`${key}Timing`] = { seconds: Number(seconds), label };
      state.trace[key] = payload;
      setOperation(label, `${detail} Completed in ${seconds}s.`, 'busy');
      return payload;
    } catch (error) {
      const seconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      setOperation(`${label} failed`, `${error.message} after ${seconds}s.`, 'fail');
      throw error;
    }
  }

  function deriveRouletteOutcome({ entropyHash }) {
    const number = Number(BigInt(`0x${entropyHash.slice(0, 16)}`) % 37n);
    return { number, color: rouletteColor(number), wheel: 'european-single-zero' };
  }

  function rouletteColor(number) {
    if (number === 0) return 'green';
    return new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]).has(number) ? 'red' : 'black';
  }

  function rememberError(key, error) {
    state.trace[key] = { message: error.message, status: error.status, body: error.body };
  }

  function randomHex(bytes) {
    const buffer = new Uint8Array(bytes);
    crypto.getRandomValues(buffer);
    return [...buffer].map((value) => value.toString(16).padStart(2, '0')).join('');
  }

  function addSelection(zone) {
    if (!canPlaceChips()) return;
    const amount = Number(el.stake.value);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const anchor = tableRenderer.getZoneAnchor(zone);
    if (!anchor) return;
    state.selections.push({
      id: state.nextSelectionId++,
      zoneId: zone.id,
      betType: zone.bet_type,
      label: tableRenderer.visibleZoneLabel(zone),
      amount,
      coveredNumbers: Array.isArray(zone.covered_numbers) ? [...zone.covered_numbers] : [],
      payoutMultiplier: Number(zone.payout_multiplier),
      anchor,
    });
    if (state.stage === 'ready') state.stage = 'chips';
    setOperation('Chip placed locally', `${tableRenderer.visibleZoneLabel(zone)} · ${amount} units. Chips stay local until Spin Wheel submits the locked ledger.`, 'idle');
    renderAll();
  }

  function removeLastSelection() {
    if (!canPlaceChips() || state.selections.length === 0) return;
    const removed = state.selections.pop();
    if (state.selections.length === 0) state.stage = 'ready';
    setOperation('Last chip removed', `${removed.label} was removed before ledger lock.`, 'idle');
    renderAll();
  }

  function clearSelections() {
    if (!canPlaceChips() || state.selections.length === 0) return;
    const count = state.selections.length;
    state.selections = [];
    state.stage = 'ready';
    setOperation('Chips cleared', `${count} chip selection${count === 1 ? '' : 's'} removed before ledger lock.`, 'idle');
    renderAll();
  }

  function canPlaceChips() {
    return !state.busy && ['ready', 'chips'].includes(state.stage);
  }

  function stageReached(stage) {
    return stageOrder.indexOf(state.stage) >= stageOrder.indexOf(stage);
  }

  function renderAll() {
    renderHeader();
    renderTable();
    renderWheel();
    renderSelections();
    renderDemoAccounting();
    renderResult();
    renderOperationStatus();
    renderDiagnosticsPanel();
    renderCompactStatus();
    renderFlowchart();
    el.spinButton.disabled = state.busy || !state.roundId || !['chips'].includes(state.stage) || state.selections.length === 0;
    el.resetButton.disabled = state.busy;
    el.stake.disabled = !canPlaceChips();
    el.chipPresets.forEach((button) => {
      button.disabled = !canPlaceChips();
      button.classList.toggle('selected', button.dataset.chipAmount === String(el.stake.value));
    });
    el.undoChipButton.disabled = !canPlaceChips() || state.selections.length === 0;
    el.clearChipsButton.disabled = !canPlaceChips() || state.selections.length === 0;
  }

  function renderHeader() {
    el.roundId.textContent = state.roundId || 'not started';
    el.roundStage.textContent = labelForStage(state.stage);
    el.claimLevel.textContent = (state.proof && state.proof.claimLevel) || (state.round && state.round.claimLevel) || 'pending';
  }

  function renderTable() {
    const chipStackCounts = new Map();
    const chips = state.selections.map((entry) => {
      const stackKey = `${entry.anchor.x}:${entry.anchor.y}`;
      const stackIndex = chipStackCounts.get(stackKey) || 0;
      chipStackCounts.set(stackKey, stackIndex + 1);
      return { id: `chip-${entry.id}`, x: entry.anchor.x, y: entry.anchor.y, stakeUnits: entry.amount, stackIndex };
    });
    const resultNumber = resultRevealReady() && state.proof && state.proof.outcome ? state.proof.outcome.result.number : null;
    tableRenderer.renderRouletteTable(el.tableHost, tableLayout, {
      chips,
      highlightedNumber: resultNumber,
      allowBetPlacement: canPlaceChips(),
      onZoneClick: addSelection,
    });
  }

  function renderWheel() {
    if (!el.wheelHost || !wheelRenderer) return;
    wheelRenderer.renderRouletteWheel(el.wheelHost, state.wheel || { phase: 'idle' });
  }

  function renderSelections() {
    el.selectionList.innerHTML = '';
    if (state.selections.length === 0) {
      const item = document.createElement('li');
      item.innerHTML = '<strong>No chips placed yet.</strong><span>Click the table after reset finishes.</span>';
      el.selectionList.appendChild(item);
      return;
    }
    state.selections.forEach((entry) => {
      const item = document.createElement('li');
      item.innerHTML = `<strong>${escapeHtml(entry.label)}</strong><span>${escapeHtml(entry.betType)} · ${escapeHtml(String(entry.amount))} demo units</span>`;
      el.selectionList.appendChild(item);
    });
  }

  function settleRoundAccounting(verification) {
    const roundId = state.roundId || (state.proof && state.proof.round && state.proof.round.roundId);
    if (!roundId) return;
    if (!verification || !verification.ok) {
      state.roundAccounting = {
        status: 'unsettled_verification_failed',
        stake: totalRoundStake(state.selections),
        returned: null,
        net: null,
        roundId,
      };
      return;
    }
    if (state.settledRoundIds.has(roundId)) return;
    const result = state.proof && state.proof.outcome && state.proof.outcome.result;
    const accounting = calculateRoulettePayout(state.selections, result);
    state.roundAccounting = { status: 'settled', roundId, ...accounting };
    state.sessionProfitLoss += accounting.net;
    state.settledRoundIds.add(roundId);
  }

  function calculateRoulettePayout(selections, result) {
    const resultNumber = Number(result && result.number);
    const settledSelections = (Array.isArray(selections) ? selections : []).map((entry) => {
      const amount = Number(entry.amount) || 0;
      const payoutMultiplier = Number.isFinite(Number(entry.payoutMultiplier)) ? Number(entry.payoutMultiplier) : 0;
      const coveredNumbers = Array.isArray(entry.coveredNumbers) ? entry.coveredNumbers.map(Number) : [];
      const won = Number.isInteger(resultNumber) && coveredNumbers.includes(resultNumber);
      const returned = won ? amount * (payoutMultiplier + 1) : 0;
      const net = won ? amount * payoutMultiplier : -amount;
      return { ...entry, amount, payoutMultiplier, won, returned, net };
    });
    return {
      stake: totalRoundStake(settledSelections),
      returned: settledSelections.reduce((sum, entry) => sum + entry.returned, 0),
      net: settledSelections.reduce((sum, entry) => sum + entry.net, 0),
      winningSelections: settledSelections.filter((entry) => entry.won).length,
      selections: settledSelections,
    };
  }

  function totalRoundStake(selections) {
    return (Array.isArray(selections) ? selections : []).reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  }

  function renderDemoAccounting() {
    if (!el.demoAccountingCard) return;
    const stake = state.roundAccounting ? state.roundAccounting.stake : totalRoundStake(state.selections);
    // Fixed three-row layout (stake/returned/net) so this card never changes height
    // during a round; rows without a real value yet render as an inactive placeholder.
    const roundRows = [
      ['Round stake', `${formatDemoUnits(stake)} demo units`, false],
      ['Returned', '—', true],
      ['Round net', '—', true],
    ];
    let statusText = 'Place chips to set the round stake.';
    let tone = 'idle';
    if (state.roundAccounting && state.roundAccounting.status === 'settled') {
      roundRows[1] = ['Returned', `${formatDemoUnits(state.roundAccounting.returned)} demo units`, false];
      roundRows[2] = ['Round net', formatSignedDemoUnits(state.roundAccounting.net), false];
      statusText = `${state.roundAccounting.winningSelections} winning selection${state.roundAccounting.winningSelections === 1 ? '' : 's'} after browser package verification.`;
      tone = state.roundAccounting.net > 0 ? 'win' : state.roundAccounting.net < 0 ? 'loss' : 'push';
    } else if (state.roundAccounting && state.roundAccounting.status === 'unsettled_verification_failed') {
      roundRows[1] = ['Returned', 'not settled', false];
      roundRows[2] = ['Round net', 'not settled', false];
      statusText = 'Round was not settled because browser proof verification failed.';
      tone = 'fail';
    } else if (state.busy || ['spinning', 'closed', 'entropy', 'revealed'].includes(state.stage)) {
      roundRows[1] = ['Returned', 'pending browser verification', false];
      roundRows[2] = ['Round net', 'pending browser verification', false];
      statusText = 'Settlement waits for successful browser/package proof replay.';
      tone = 'pending';
    } else if (stake > 0) {
      statusText = 'Round stake is ready; settlement waits until after Spin Wheel and browser verification.';
      tone = 'pending';
    }
    el.demoAccountingCard.innerHTML = `
      <div class="accounting-heading">
        <span class="label">Demo unit accounting</span>
        <strong class="session-pl ${sessionTone(state.sessionProfitLoss)}">${formatSignedDemoUnits(state.sessionProfitLoss)}</strong>
      </div>
      <div class="accounting-grid ${escapeHtml(tone)}">
        ${roundRows.map(([label, value, inactive]) => `<div${inactive ? ' class="accounting-inactive"' : ''}><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}
        <div><span>Session P/L</span><strong>${escapeHtml(formatSignedDemoUnits(state.sessionProfitLoss))}</strong></div>
      </div>
      <p>${escapeHtml(statusText)}</p>
      <p class="accounting-note">Demo units only. TN10/mainnet fees are proof/evidence costs, not player wager or payout currency.</p>
    `;
  }

  function renderResult() {
    const result = resultRevealReady() && state.proof && state.proof.outcome ? state.proof.outcome.result : null;
    if (!result) {
      el.resultValue.textContent = 'hidden';
      el.resultNote.textContent = state.wheel && ['spinning', 'settling'].includes(state.wheel.phase)
        ? 'Wheel simulation is waiting to reveal the browser-verified package result.'
        : state.round && state.round.commitment
        ? 'Commitment recorded before chip placement.'
        : 'Preparing package commitment.';
      return;
    }
    el.resultValue.textContent = `${result.number} ${result.color}`;
    el.resultNote.textContent = state.verification && state.verification.ok
      ? 'Verified in this browser by kaspa-pof-api proof replay.'
      : 'Result included in the portable TN10 proof bundle.';
  }

  function resultRevealReady() {
    return Boolean(state.wheel && state.wheel.revealReady && state.wheel.result && state.verification && state.verification.ok);
  }

  function renderOperationStatus() {
    if (!el.operationStatus) return;
    const operation = state.operation || {};
    const tone = operation.tone || 'idle';
    el.operationStatus.innerHTML = `
      <div class="operation-card ${escapeHtml(tone)}">
        <span class="label">Current step</span>
        <strong>${escapeHtml(operation.label || 'Ready')}</strong>
        <p>${escapeHtml(operation.detail || 'TN10 package-runtime status will appear here while the round is running.')}</p>
      </div>
    `;
  }

  function renderDiagnosticsPanel() {
    if (!el.diagnosticsPanel) return;
    const diagnostics = state.diagnostics;
    const events = state.diagnosticEvents.slice(-8).reverse();
    const active = Boolean(diagnostics || events.length > 0);
    const summaryItems = diagnosticSummaryItems(diagnostics);
    const rows = [
      ['State', active ? 'active' : 'standing by'],
      ['Spin ID', diagnostics && diagnostics.spinId],
      ['Status', diagnostics && diagnostics.status],
      ['Spin total', diagnostics && spinTotalMs(diagnostics) !== undefined ? formatMs(spinTotalMs(diagnostics)) : undefined],
      ['TN10 wait', diagnostics && diagnostics.tn10WaitElapsedMs !== undefined ? formatMs(diagnostics.tn10WaitElapsedMs) : undefined],
      ['Server total', diagnostics && diagnostics.totalElapsedMs !== undefined ? formatMs(diagnostics.totalElapsedMs) : undefined],
      ['Target DAA', diagnostics && diagnostics.targetDaaScore],
      ['Current DAA', diagnostics && diagnostics.currentDaaScore],
      ['Poll attempts', diagnostics && diagnostics.pollAttempts],
      ['Last RPC step', diagnostics && diagnostics.lastRpcStep],
      ['Last RPC latency', diagnostics && diagnostics.lastRpcMs !== undefined ? `${diagnostics.lastRpcMs}ms` : undefined],
      ['Last RPC lifecycle', diagnostics && diagnostics.lastRpcLifecycleStep],
      ['Last lifecycle time', diagnostics && diagnostics.lastRpcLifecycleMs !== undefined ? `${diagnostics.lastRpcLifecycleMs}ms` : undefined],
      ['Spin RPC connect', diagnostics && diagnostics.spinRpcConnectMs !== undefined ? `${diagnostics.spinRpcConnectMs}ms` : undefined],
      ['Spin RPC session', diagnostics && diagnostics.spinRpcSessionTotalMs !== undefined ? formatMs(diagnostics.spinRpcSessionTotalMs) : undefined],
      ['RPC endpoint', diagnostics && diagnostics.spinRpc && diagnostics.spinRpc.endpoint ? shortText(diagnostics.spinRpc.endpoint, 54) : undefined],
      ['RPC strategy', diagnostics && diagnostics.spinRpc && diagnostics.spinRpc.strategy],
      ['Target RPC connect', diagnostics && diagnostics.targetSelectionRpcConnectMs !== undefined ? `${diagnostics.targetSelectionRpcConnectMs}ms` : undefined],
      ['Target RPC session', diagnostics && diagnostics.targetSelectionRpcSessionTotalMs !== undefined ? formatMs(diagnostics.targetSelectionRpcSessionTotalMs) : undefined],
      ['Block RPC connect', diagnostics && diagnostics.blockEvidenceRpcConnectMs !== undefined ? `${diagnostics.blockEvidenceRpcConnectMs}ms` : undefined],
      ['Block RPC session', diagnostics && diagnostics.blockEvidenceRpcSessionTotalMs !== undefined ? formatMs(diagnostics.blockEvidenceRpcSessionTotalMs) : undefined],
      ['Browser verify', diagnostics && diagnostics.browserVerificationMs !== undefined ? `${diagnostics.browserVerificationMs}ms` : undefined],
    ].filter(([, value]) => value !== undefined && value !== null && value !== '');
    el.diagnosticsPanel.innerHTML = `
      <details class="diagnostics-card${active ? '' : ' inactive'}">
        <summary>
          <span class="diagnostics-title">Live diagnostics</span>
          <span class="diagnostics-summary-strip">
            ${summaryItems.map(([label, value]) => `<span class="diagnostics-summary-item"><b>${escapeHtml(label)}</b>${escapeHtml(value)}</span>`).join('')}
          </span>
        </summary>
        <div class="diagnostics-grid">
          ${rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}
        </div>
        <ol class="diagnostic-events">
          ${events.length > 0
            ? events.map((entry) => `<li><strong>${escapeHtml(entry.event)}</strong><span>${escapeHtml(entry.detail)}</span></li>`).join('')
            : '<li><strong>idle</strong><span>Diagnostics will stream here after Spin Wheel locks the chip ledger.</span></li>'}
        </ol>
      </details>
    `;
  }

  function appendDiagnosticEvent(event, data = {}) {
    const elapsed = data.elapsedMs !== undefined ? ` · ${formatMs(data.elapsedMs)}` : '';
    const detail = diagnosticEventDetail(event, data) + elapsed;
    state.diagnosticEvents.push({ event, detail, ts: data.ts || new Date().toISOString() });
    if (state.diagnosticEvents.length > 80) state.diagnosticEvents.splice(0, state.diagnosticEvents.length - 80);
  }

  function diagnosticEventDetail(event, data) {
    if (event === 'tn10_poll') return `attempt ${data.attempt}, DAA ${data.currentDaaScore}/${data.targetDaaScore}, RPC ${data.rpcMs}ms`;
    if (event === 'tn10_target_selected') return `target ${data.target && data.target.score}, current ${data.currentDaaScore}`;
    if (event === 'tn10_block_found') return `block ${shortText(data.block && data.block.blockHash)}, DAA ${data.block && data.block.daaScore}`;
    if (event === 'ledger_locked') return `ledger ${shortText(data.ledgerHash)}`;
    if (event === 'server_package_check_complete') return `server check ${data.serverPackageCheck && data.serverPackageCheck.durationMs}ms`;
    if (event === 'rpc_session_starting') return `${data.phase} ${data.sessionId}`;
    if (event === 'rpc_connecting') return `${data.phase} connect timeout ${data.timeoutMs}ms`;
    if (event === 'rpc_endpoint_connecting') return `${shortText(data.endpoint, 42)} race ${data.raceTimeoutMs}ms`;
    if (event === 'rpc_endpoint_connected') return `${shortText(data.endpoint, 42)} ${data.connectMs}ms`;
    if (event === 'rpc_endpoint_timeout') return `${shortText(data.endpoint, 42)} timed out ${data.connectMs}ms`;
    if (event === 'rpc_endpoint_error') return `${shortText(data.endpoint, 42)} error ${data.error || 'unknown'}`;
    if (event === 'rpc_endpoint_race_exhausted') return `${(data.attempts || []).length} endpoint attempts exhausted`;
    if (event === 'rpc_resolver_connecting') return `${data.phase} resolver fallback`;
    if (event === 'rpc_connected') return `${data.phase} connected in ${data.connectMs}ms (${data.endpoint || 'endpoint unavailable'})`;
    if (event === 'rpc_disconnecting') return `${data.phase} disconnecting`;
    if (event === 'rpc_disconnected') return `${data.phase} disconnected in ${data.disconnectMs}ms${data.error ? `, ${data.error}` : ''}`;
    if (event === 'browser_package_verification') return `browser check ${data.browserVerificationMs}ms, ok ${data.ok}`;
    if (event === 'spin_session_created') return `diagnostic id ${data.diagnosticId || data.spinId || 'pending'}`;
    if (event === 'spin_error') return data.message || 'spin failed';
    if (event === 'sse_stalled') return data.message || 'no diagnostic event received';
    if (event === 'sse_transport_error') return data.message || 'SSE transport error';
    return data.diagnostics && data.diagnostics.status ? data.diagnostics.status : 'event received';
  }

  function diagnosticSummaryItems(diagnostics) {
    if (!diagnostics) return [['Status', 'waiting for spin session']];
    const items = [
      ['Status', diagnosticSummary(diagnostics)],
      ['Spin total', spinTotalMs(diagnostics) !== undefined ? formatMs(spinTotalMs(diagnostics)) : 'running'],
      ['TN10 wait', diagnostics.tn10WaitElapsedMs !== undefined ? formatMs(diagnostics.tn10WaitElapsedMs) : 'pending'],
      ['Polls', diagnostics.pollAttempts !== undefined ? String(diagnostics.pollAttempts) : '0'],
      ['RPC call', diagnostics.lastRpcMs !== undefined ? `${diagnostics.lastRpcMs}ms` : 'pending'],
      ['RPC life', diagnostics.lastRpcLifecycleMs !== undefined ? `${diagnostics.lastRpcLifecycleMs}ms` : 'pending'],
    ];
    return items;
  }

  function diagnosticSummary(diagnostics) {
    if (!diagnostics) return 'waiting for spin session';
    if (diagnostics.status === 'tn10_polling' || diagnostics.status === 'tn10_slow') {
      return `DAA ${diagnostics.currentDaaScore || '?'} / ${diagnostics.targetDaaScore || '?'}`;
    }
    return diagnostics.status || 'diagnostics active';
  }

  function spinTotalMs(diagnostics) {
    if (!diagnostics) return undefined;
    if (diagnostics.totalElapsedMs !== undefined) return diagnostics.totalElapsedMs;
    if (!diagnostics.startedAt) return undefined;
    const startedMs = Date.parse(diagnostics.startedAt);
    if (!Number.isFinite(startedMs)) return undefined;
    return Date.now() - startedMs;
  }


  function renderCompactStatus() {
    const spec = hydrateFlowSpec();
    if (!el.liveProofStatusRoot) return;
    if (!spec || !spec.compact || !Array.isArray(spec.compact.rows)) {
      el.liveProofStatusRoot.innerHTML = '<p class="compact-loading">Loading proof status…</p>';
      return;
    }
    el.liveProofStatusRoot.innerHTML = `
      <div class="compact-status-card">
        <div class="compact-status-grid" style="--compact-columns: ${spec.compact.maxSlots || 1}">
          ${spec.compact.rows.map(renderCompactRow).join('')}
        </div>
      </div>
    `;
  }

  function renderCompactRow(row) {
    return `
      <div class="compact-row-label">${escapeHtml(row.label)}</div>
      <div class="compact-row-track">
        ${row.slots.map((node, index) => renderCompactSlot(node, index, row.slots.length)).join('')}
      </div>
    `;
  }

  function renderCompactSlot(node, index = 0, total = 1) {
    if (!node) return '<span class="compact-step compact-gap" aria-label="No matching proof step">—</span>';
    const help = node.compactHelp || node.summary || node.title;
    const edgeClass = index <= 1 ? 'tooltip-left' : index >= total - 2 ? 'tooltip-right' : 'tooltip-center';
    return `
      <span class="compact-step ${escapeHtml(node.status)} ${edgeClass}" tabindex="0" title="${escapeHtml(help)}" aria-label="${escapeHtml(`${node.title}: ${help}`)}" data-node-id="${escapeHtml(node.id)}">
        <span class="compact-step-label">${escapeHtml(node.compactLabel || node.badge || node.title)}</span>
        <span class="compact-info" aria-hidden="true">i</span>
        <span class="compact-help" role="tooltip"><span class="compact-help-text">${escapeHtml(help)}</span></span>
      </span>
    `;
  }

  function renderFlowchart() {
    const spec = hydrateFlowSpec();
    if (!spec) {
      el.flowchartRoot.innerHTML = '<p class="flow-loading">Loading flowchart design…</p>';
      return;
    }
    el.flowchartRoot.innerHTML = `
      <div class="flowchart-grid" style="--flow-row-count: ${spec.layout.rowCount}; --flow-row-min: ${spec.layout.rowMinHeightPx}px; --flow-column-gap: ${spec.layout.columnGapPx}px; --edge-label-font-size: ${spec.layout.edgeLabelFontSize}px">
        ${spec.lanes.map(renderLaneHeader).join('')}
        ${spec.edges.map(renderEdgeConnector).join('')}
        ${spec.nodes.map(renderFlowNode).join('')}
      </div>
    `;
  }

  function hydrateFlowSpec() {
    const spec = state.flowchartSpec;
    if (!spec) return null;
    const lanes = spec.lanes.map((lane, index) => ({ ...lane, column: index + 1 }));
    const laneColumnById = new Map(lanes.map((lane) => [lane.id, lane.column]));
    const nodes = spec.nodes.map((node) => ({
      ...node,
      column: laneColumnById.get(node.lane),
      status: stageStatus(node.stage),
      summary: node.summaryBinding ? boundText(node.summaryBinding, node.waitingSummary) : node.summary,
      details: node.detailsBinding ? boundValue(node.detailsBinding) : undefined,
    }));
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const edges = spec.edges.map((edge) => ({ ...edge, fromNode: nodeById.get(edge.from), toNode: nodeById.get(edge.to) })).filter((edge) => edge.fromNode && edge.toNode);
    const compact = spec.compact ? {
      ...spec.compact,
      rows: (spec.compact.rows || []).map((row) => ({ ...row, slots: (row.nodeIds || []).map((nodeId) => nodeId ? nodeById.get(nodeId) : null) })),
      maxSlots: Math.max(1, ...(spec.compact.rows || []).map((row) => (row.nodeIds || []).length)),
    } : null;
    return { ...spec, lanes, nodes, edges, compact };
  }

  function validateFlowchartSpec(spec) {
    if (!spec || spec.flowchartVersion !== 3) throw new Error('unsupported flowchart spec version');
    if (!Array.isArray(spec.lanes) || spec.lanes.length !== 2) throw new Error('flowchart spec requires two lanes');
    if (!Array.isArray(spec.nodes) || !Array.isArray(spec.edges)) throw new Error('flowchart spec requires nodes and edges');
    const laneIds = new Set(spec.lanes.map((lane) => lane.id));
    const nodeIds = new Set(spec.nodes.map((node) => node.id));
    for (const node of spec.nodes) {
      if (!laneIds.has(node.lane)) throw new Error(`flowchart node ${node.id} references missing lane`);
      if (!Number.isInteger(node.row) || node.row < 1) throw new Error(`flowchart node ${node.id} has invalid row`);
      if (!stageOrder.includes(node.stage)) throw new Error(`flowchart node ${node.id} has invalid stage`);
    }
    for (const edge of spec.edges) {
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) throw new Error(`flowchart edge ${edge.id} references missing node`);
    }
  }

  function renderLaneHeader(lane) {
    const column = lane.column === 1 ? 1 : 3;
    return `<header class="lane-title-card ${lane.theme === 'proof' ? 'proof-lane' : 'round-lane'}" style="grid-column: ${column}; grid-row: 1"><h3>${escapeHtml(lane.title)}</h3><p>${escapeHtml(lane.subtitle)}</p></header>`;
  }

  function renderEdgeConnector(edge) {
    const row = edge.fromNode.row;
    const direction = edge.fromNode.column < edge.toNode.column ? 'left-to-right' : 'right-to-left';
    return `<div class="edge-connector ${direction}" style="grid-column: 2; grid-row: ${row + 1}" data-edge-id="${escapeHtml(edge.id)}"><span>${escapeHtml(edge.label)}</span></div>`;
  }

  function renderFlowNode(node) {
    const hasDetails = node.details !== undefined && node.details !== null;
    const column = node.column === 1 ? 1 : 3;
    const laneTheme = node.column === 1 ? 'round' : 'proof';
    return `
      <article class="flow-card ${laneTheme === 'proof' ? 'proof-card' : 'round-card'} ${node.status}" style="grid-column: ${column}; grid-row: ${node.row + 1}" data-node-id="${escapeHtml(node.id)}">
        <span class="badge">${escapeHtml(node.badge)} · ${escapeHtml(statusLabel(node.status))}</span>
        <h3>${escapeHtml(node.title)}</h3>
        <p>${escapeHtml(node.summary || '')}</p>
        ${hasDetails ? `<details><summary>More info</summary><pre>${escapeHtml(JSON.stringify(node.details, null, 2))}</pre></details>` : ''}
      </article>
    `;
  }

  function boundText(binding, fallback = '') {
    const value = boundValue(binding);
    if (value === undefined || value === null || value === '') return fallback;
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  function boundValue(binding) {
    const bindings = {
      roundSummary: () => ({ roundId: state.roundId, stage: state.stage, claimLevel: state.round && state.round.claimLevel }),
      roundId: () => state.roundId ? `roundId ${state.roundId}` : undefined,
      roundCommitmentGate: () => ({ commitmentExists: Boolean(state.round && state.round.commitment), chipsEnabled: canPlaceChips() }),
      commitment: () => state.round && state.round.commitment ? shortText(state.round.commitment) : undefined,
      selections: () => state.selections,
      chipSelections: () => `${state.selections.length} chip selection${state.selections.length === 1 ? '' : 's'} on the table.`,
      spinAction: () => ({ action: 'Spin Wheel button' }),
      'trace.createRound': () => state.trace.createRound,
      'trace.betLedger': () => state.trace.betLedger,
      'trace.proofBundle': () => state.trace.proofBundle,
      'trace.serverPackageCheck': () => state.trace.serverPackageCheck,
      'trace.browserOutcome': () => state.trace.browserOutcome,
      ledgerHash: () => state.proof && state.proof.ledger ? shortText(state.proof.ledger.ledgerHash) : undefined,
      entropyTarget: () => state.proof && state.proof.entropy ? state.proof.entropy.target : undefined,
      entropy: () => state.entropy,
      entropyHash: () => state.entropy ? shortText(state.entropy.entropyHash) : undefined,
      result: () => resultRevealReady() && state.proof && state.proof.outcome ? `${state.proof.outcome.result.number} ${state.proof.outcome.result.color}` : undefined,
      revealSummary: () => state.proof && state.proof.reveal ? 'Reveal matches the earlier commitment.' : undefined,
      verification: () => state.verification ? `ok: ${state.verification.ok}` : undefined,
      verificationForPlayer: () => state.verification && state.verification.ok ? 'The displayed result passed browser package proof replay.' : undefined,
      proofVerificationBundle: () => ({ proof: state.proof, verification: state.verification }),
    };
    const getter = bindings[binding];
    return getter ? getter() : undefined;
  }

  function stageStatus(stage) {
    if (state.stage === stage) return 'current';
    return stageReached(stage) ? 'done' : 'waiting';
  }

  function statusLabel(status) {
    if (status === 'done') return 'Done';
    if (status === 'current') return 'Current';
    return 'Waiting';
  }

  function labelForStage(stage) {
    const labels = {
      boot: 'starting',
      ready: 'chips open',
      chips: 'chips open',
      spinning: 'spinning',
      closed: 'closed',
      entropy: 'entropy ready',
      revealed: 'revealed',
      verified: 'verified',
    };
    return labels[stage] || stage;
  }

  function shortText(value, maxLength = 22) {
    const text = String(value || '');
    if (text.length <= maxLength) return text;
    const front = Math.max(8, Math.floor(maxLength * 0.55));
    const back = Math.max(6, maxLength - front - 1);
    return `${text.slice(0, front)}…${text.slice(-back)}`;
  }

  function setOperation(label, detail, tone = 'idle') {
    state.operation = { label, detail, tone };
  }

  function setStatus(text, passed) {
    el.serviceStatus.textContent = text;
    el.serviceStatus.className = `status-pill ${passed === true ? 'pass' : passed === false ? 'fail' : ''}`;
  }

  function closeSpinEventSource() {
    if (state.spinEventSource) {
      state.spinEventSource.close();
      state.spinEventSource = null;
    }
  }

  function formatMs(ms) {
    const number = Number(ms);
    if (!Number.isFinite(number)) return 'n/a';
    if (number < 1000) return `${Math.round(number)}ms`;
    return `${(number / 1000).toFixed(1)}s`;
  }

  function formatDemoUnits(value) {
    const number = Number(value) || 0;
    return Number.isInteger(number) ? String(number) : number.toFixed(2);
  }

  function formatSignedDemoUnits(value) {
    const number = Number(value) || 0;
    const prefix = number > 0 ? '+' : '';
    return `${prefix}${formatDemoUnits(number)} demo units`;
  }

  function sessionTone(value) {
    const number = Number(value) || 0;
    if (number > 0) return 'win';
    if (number < 0) return 'loss';
    return 'push';
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }
})();
