import {
  deriveOutcome,
  verifyFairnessProof,
} from 'kaspa-pof-api';

(() => {
  const tableLayout = window.createRouletteTableLayout();
  const tableRenderer = window.RouletteTableRenderer;
  const stageOrder = ['boot', 'ready', 'chips', 'spinning', 'closed', 'entropy', 'revealed', 'verified'];
  const ROULETTE_CLAIM_LEVEL = 'tn10_future_entropy';
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
    busy: false,
    trace: {},
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
    stake: document.getElementById('stake'),
    chipPresets: [...document.querySelectorAll('[data-chip-amount]')],
    undoChipButton: document.getElementById('undoChipButton'),
    clearChipsButton: document.getElementById('clearChipsButton'),
    selectionList: document.getElementById('selectionList'),
    resultValue: document.getElementById('resultValue'),
    resultNote: document.getElementById('resultNote'),
    spinButton: document.getElementById('spinButton'),
    resetButton: document.getElementById('resetButton'),
    liveProofStatusRoot: document.getElementById('liveProofStatusRoot'),
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
    state.selections = [];
    state.nextSelectionId = 1;
    state.clientSeed = `client-${randomHex(32)}`;
    state.trace = {};
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
    setOperation('Spin started', 'Submitting the locked chip ledger, then waiting for real TN10 future block evidence. The browser will verify the returned proof bundle itself.', 'busy');
    setStatus('Waiting for TN10-backed proof bundle…', null);
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

      const payload = await rememberStep(
        'proofBundle',
        'Fetching TN10 evidence bundle',
        'The server is fetching a future TN10 block and assembling the portable proof bundle. It does not return a proof-authority verdict for the browser to trust.',
        fetchJson(`/examples/roulette-poc/rounds/${encodeURIComponent(state.roundId)}/spin`, {
          method: 'POST',
          body: JSON.stringify({ bets, clientSeed: state.clientSeed }),
        })
      );
      state.round = payload.round;
      state.proof = payload.proof;
      state.entropy = payload.proof.entropy;
      state.trace.serverPackageCheck = payload.serverPackageCheck;
      state.stage = 'entropy';
      renderAll();

      const independentlyDerivedOutcome = deriveOutcome({
        entropyHash: state.proof.entropy.entropyHash,
        spec: state.proof.outcome,
        derivers: rouletteOutcomeDerivers,
      });
      state.trace.browserOutcome = independentlyDerivedOutcome;
      state.stage = 'revealed';
      renderAll();

      const verification = verifyFairnessProof(state.proof, { outcomeDerivers: rouletteOutcomeDerivers });
      state.verification = verification;
      state.stage = verification.ok ? 'verified' : 'revealed';
      setOperation(
        verification.ok ? 'TN10 proof verified in browser' : 'Browser proof verification failed',
        verification.ok
          ? 'kaspa-pof-api replayed commitment, ledger, TN10 block evidence, entropy, reveal, and roulette outcome in this browser.'
          : verification.errors.map((entry) => entry.message).join('; '),
        verification.ok ? 'pass' : 'fail'
      );
      setStatus(verification.ok ? 'Browser package verified TN10 proof' : 'Browser package proof failed', verification.ok);
    } catch (error) {
      rememberError('spinError', error);
      setOperation('Spin failed', error.message, 'fail');
      setStatus(error.message, false);
    } finally {
      state.busy = false;
      renderAll();
    }
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
    renderSelections();
    renderResult();
    renderOperationStatus();
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
    const resultNumber = state.round && state.round.result ? state.round.result.number : null;
    tableRenderer.renderRouletteTable(el.tableHost, tableLayout, {
      chips,
      highlightedNumber: resultNumber,
      allowBetPlacement: canPlaceChips(),
      onZoneClick: addSelection,
    });
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
      item.innerHTML = `<strong>${escapeHtml(entry.label)}</strong><span>${escapeHtml(entry.betType)} · ${escapeHtml(String(entry.amount))} units</span>`;
      el.selectionList.appendChild(item);
    });
  }

  function renderResult() {
    const result = state.proof && state.proof.outcome ? state.proof.outcome.result : state.round && state.round.result;
    if (!result) {
      el.resultValue.textContent = 'hidden';
      el.resultNote.textContent = state.round && state.round.commitment
        ? 'Commitment recorded before chip placement.'
        : 'Preparing package commitment.';
      return;
    }
    el.resultValue.textContent = `${result.number} ${result.color}`;
    el.resultNote.textContent = state.verification && state.verification.ok
      ? 'Verified in this browser by kaspa-pof-api proof replay.'
      : 'Result included in the portable TN10 proof bundle.';
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
      result: () => state.proof && state.proof.outcome ? `${state.proof.outcome.result.number} ${state.proof.outcome.result.color}` : undefined,
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

  function shortText(value) {
    const text = String(value || '');
    return text.length > 22 ? `${text.slice(0, 12)}…${text.slice(-8)}` : text;
  }

  function setOperation(label, detail, tone = 'idle') {
    state.operation = { label, detail, tone };
  }

  function setStatus(text, passed) {
    el.serviceStatus.textContent = text;
    el.serviceStatus.className = `status-pill ${passed === true ? 'pass' : passed === false ? 'fail' : ''}`;
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
