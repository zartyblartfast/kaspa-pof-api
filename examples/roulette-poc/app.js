import { createToccataApiClient } from 'kaspa-pof-api';

(() => {
  const apiClient = createToccataApiClient({ baseUrl: '' });
  const tableLayout = window.createRouletteTableLayout();
  const tableRenderer = window.RouletteTableRenderer;

  const stageOrder = ['boot', 'ready', 'chips', 'spinning', 'closed', 'entropy', 'revealed', 'verified'];

  const state = {
    stage: 'boot',
    roundId: null,
    round: null,
    proof: null,
    verification: null,
    entropy: null,
    selections: [],
    nextSelectionId: 1,
    serverSeed: '',
    clientSeed: '',
    busy: false,
    apiLog: {},
    flowchartSpec: null,
    operation: {
      label: 'Preparing live API connection',
      detail: 'Reset will check health, capabilities, live TN10 network status, then commit the round before chips open.',
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
    setOperation('Starting new committed round', 'Reset is clearing local chip selections, then the app will call the live API. No substitute path is used.', 'busy');
    setStatus('Creating committed API round…', null);
    state.stage = 'boot';
    state.roundId = null;
    state.round = null;
    state.proof = null;
    state.verification = null;
    state.entropy = null;
    state.selections = [];
    state.nextSelectionId = 1;
    state.serverSeed = `server-${randomHex(16)}`;
    state.clientSeed = `client-${randomHex(16)}`;
    state.apiLog = {};
    renderAll();

    try {
      await rememberStep('health', 'Checking API health', 'Quick local service check before a live round starts.', apiClient.health());
      await rememberStep('capabilities', 'Reading capability flags', 'Confirming signing/broadcast remain disabled by default before the game opens.', apiClient.capabilities());
      await rememberStep('networkStatus', 'Checking live TN10 network status', 'This can be the slow step on weak networks because the API is contacting TN10. Chips open only after this live status check completes.', apiClient.networkStatus());
      const created = await rememberStep('createRound', 'Creating API round', 'Allocating the round ID that all later proof evidence will reference.', apiClient.createRound({
        game: 'roulette',
        tableId: 'roulette-poc',
        metadata: { app: 'roulette-poc', tableVariant: tableLayout.roulette_variant },
      }));
      state.round = created.round;
      state.roundId = created.round.roundId;
      const committed = await rememberStep('commit', 'Recording pre-bet commitment', 'The API commits hidden server material before chip placement is enabled.', apiClient.commitRound(state.roundId, { serverSeed: state.serverSeed }));
      state.round = committed.round;
      state.stage = 'ready';
      setOperation('Chips open', 'Commitment is recorded. Table clicks are now local chip placement until Spin Wheel submits the ledger.', 'pass');
      setStatus('Committed round ready for chips', true);
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
    setOperation('Spin started', 'Submitting the visible chip ledger, then closing the round and waiting for live TN10 entropy. The browser will not choose the result.', 'busy');
    setStatus('Submitting chip ledger and closing round…', null);
    renderAll();

    try {
      const ledgerPayload = await rememberStep('betLedger', 'Submitting chip ledger', 'The selected chips are sent to the API as the round ledger before close.', apiClient.updateBetLedger(state.roundId, {
        bets: state.selections.map((entry) => ({
          playerId: 'roulette-poc-player',
          selection: `${entry.betType}:${entry.label}`,
          amount: entry.amount,
        })),
      }));
      state.round = ledgerPayload.round;

      const closed = await rememberStep('close', 'Closing round and fixing entropy target', 'Close locks the ledger and chooses a future TN10 blue-score before the entropy block hash is known. This live API step may take a moment.', apiClient.closeRound(state.roundId, {
        clientSeed: state.clientSeed,
        entropyMode: 'live_tn10_future',
      }));
      state.round = closed.round;
      state.stage = 'closed';
      renderAll();

      const entropy = await rememberStep('entropy', 'Waiting for live TN10 entropy', 'GET /entropy waits for the target future blue-score to have live block evidence. Slow waits here are expected; no local entropy substitute is used.', apiClient.getEntropy(state.roundId));
      state.entropy = entropy.entropy;
      if (entropy.round) state.round = entropy.round;
      state.stage = 'entropy';
      renderAll();

      const revealed = await rememberStep('reveal', 'Revealing API-derived result', 'The API reveals the server seed and derives the displayed roulette result from the committed inputs and live entropy.', apiClient.revealRound(state.roundId, { serverSeed: state.serverSeed }));
      state.round = revealed.round;
      state.stage = 'revealed';
      renderAll();

      const proofPayload = await rememberStep('proof', 'Fetching proof bundle', 'Fetching the full proof data behind the visible status strip and flowchart.', apiClient.getProof(state.roundId));
      state.proof = proofPayload.proof;
      const verification = await rememberStep('verification', 'Verifying proof replay', 'The API replays commitment, ledger, entropy, reveal, and result derivation for this claim level.', apiClient.verifyProof(state.proof));
      state.verification = verification;
      state.stage = 'verified';
      setStatus('Proof verified by API', true);
    } catch (error) {
      rememberError('spinError', error);
      setStatus(error.message, false);
    } finally {
      state.busy = false;
      renderAll();
    }
  }

  async function rememberStep(key, label, detail, promise) {
    const startedAt = performance.now();
    setOperation(label, detail, 'busy');
    setStatus(label, null);
    renderAll();
    try {
      const payload = await promise;
      const seconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      state.apiLog[`${key}Timing`] = { seconds: Number(seconds), label };
      setOperation(label, `${detail} Completed in ${seconds}s.`, 'busy');
      return remember(key, Promise.resolve(payload));
    } catch (error) {
      const seconds = ((performance.now() - startedAt) / 1000).toFixed(1);
      setOperation(`${label} failed`, `${error.message} after ${seconds}s.`, 'fail');
      throw error;
    }
  }

  async function remember(key, promise) {
    const payload = await promise;
    state.apiLog[key] = payload;
    return payload;
  }

  function rememberError(key, error) {
    state.apiLog[key] = {
      message: error.message,
      status: error.status,
      body: error.body,
    };
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
      id: state.nextSelectionId++ ,
      zoneId: zone.id,
      betType: zone.bet_type,
      label: tableRenderer.visibleZoneLabel(zone),
      amount,
      anchor,
    });
    if (state.stage === 'ready') state.stage = 'chips';
    setOperation('Chip placed locally', `${tableRenderer.visibleZoneLabel(zone)} · ${amount} units. Chips stay local until Spin Wheel submits the ledger to the API.`, 'idle');
    renderAll();
  }

  function removeLastSelection() {
    if (!canPlaceChips() || state.selections.length === 0) return;
    const removed = state.selections.pop();
    if (state.selections.length === 0) state.stage = 'ready';
    setOperation('Last chip removed', `${removed.label} was removed before ledger submission.`, 'idle');
    renderAll();
  }

  function clearSelections() {
    if (!canPlaceChips() || state.selections.length === 0) return;
    const count = state.selections.length;
    state.selections = [];
    state.stage = 'ready';
    setOperation('Chips cleared', `${count} chip selection${count === 1 ? '' : 's'} removed before ledger submission.`, 'idle');
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
    const claimLevel = (state.proof && state.proof.claimLevel) || (state.round && state.round.claimLevel) || 'pending';
    el.claimLevel.textContent = claimLevel;
  }

  function renderTable() {
    const chipStackCounts = new Map();
    const chips = state.selections.map((entry) => {
      const stackKey = `${entry.anchor.x}:${entry.anchor.y}`;
      const stackIndex = chipStackCounts.get(stackKey) || 0;
      chipStackCounts.set(stackKey, stackIndex + 1);
      return {
        id: `chip-${entry.id}`,
        x: entry.anchor.x,
        y: entry.anchor.y,
        stakeUnits: entry.amount,
        stackIndex,
      };
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
    const result = state.round && state.round.result;
    if (!result) {
      el.resultValue.textContent = 'hidden';
      el.resultNote.textContent = state.round && state.round.commitment
        ? 'Commitment recorded before chip placement.'
        : 'Preparing API commitment.';
      return;
    }
    el.resultValue.textContent = `${result.number} ${result.color}`;
    el.resultNote.textContent = state.verification && state.verification.verified
      ? 'Verified by API proof replay.'
      : 'Result returned by API reveal.';
  }

  function renderOperationStatus() {
    if (!el.operationStatus) return;
    const operation = state.operation || {};
    const tone = operation.tone || 'idle';
    el.operationStatus.innerHTML = `
      <div class="operation-card ${escapeHtml(tone)}">
        <span class="label">Current wait</span>
        <strong>${escapeHtml(operation.label || 'Ready')}</strong>
        <p>${escapeHtml(operation.detail || 'Live API status will appear here while the round is running.')}</p>
      </div>
    `;
  }

  function renderCompactStatus() {
    const spec = hydrateFlowSpec();
    if (!el.liveProofStatusRoot) return;
    if (!spec || !spec.compact || !Array.isArray(spec.compact.rows)) {
      el.liveProofStatusRoot.innerHTML = '<p class="compact-loading">Loading live proof status…</p>';
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
    if (!node) {
      return '<span class="compact-step compact-gap" aria-label="No matching proof step">—</span>';
    }
    const help = node.compactHelp || node.summary || node.title;
    const links = renderCompactHelpLinks(node.compactLinks || []);
    const edgeClass = index <= 1 ? 'tooltip-left' : index >= total - 2 ? 'tooltip-right' : 'tooltip-center';
    return `
      <span class="compact-step ${escapeHtml(node.status)} ${edgeClass}" tabindex="0" title="${escapeHtml(help)}" aria-label="${escapeHtml(`${node.title}: ${help}`)}" data-node-id="${escapeHtml(node.id)}">
        <span class="compact-step-label">${escapeHtml(node.compactLabel || node.badge || node.title)}</span>
        <span class="compact-info" aria-hidden="true">i</span>
        <span class="compact-help" role="tooltip">
          <span class="compact-help-text">${escapeHtml(help)}</span>
          ${links}
        </span>
      </span>
    `;
  }

  function renderCompactHelpLinks(links) {
    const safeLinks = links
      .filter((link) => link && typeof link.href === 'string' && /^https:\/\/github\.com\/zartyblartfast\/kaspa-toccata-api\//.test(link.href))
      .slice(0, 2);
    if (safeLinks.length === 0) return '';
    return `
      <span class="compact-help-links">
        ${safeLinks.map((link) => `<a href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label || 'Learn more')}</a>`).join('')}
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
    const edges = spec.edges.map((edge) => ({
      ...edge,
      fromNode: nodeById.get(edge.from),
      toNode: nodeById.get(edge.to),
    })).filter((edge) => edge.fromNode && edge.toNode);
    const compact = spec.compact ? {
      ...spec.compact,
      rows: (spec.compact.rows || []).map((row) => ({
        ...row,
        slots: (row.nodeIds || []).map((nodeId) => nodeId ? nodeById.get(nodeId) : null),
      })),
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
    if (spec.compact && Array.isArray(spec.compact.rows)) {
      for (const row of spec.compact.rows) {
        if (!Array.isArray(row.nodeIds)) throw new Error(`compact row ${row.id || row.label} requires nodeIds`);
        for (const nodeId of row.nodeIds) {
          if (nodeId !== null && !nodeIds.has(nodeId)) throw new Error(`compact row ${row.id || row.label} references missing node ${nodeId}`);
        }
      }
    }
    for (const node of spec.nodes) {
      if (node.compactLinks !== undefined) {
        if (!Array.isArray(node.compactLinks)) throw new Error(`flowchart node ${node.id} has invalid compactLinks`);
        for (const link of node.compactLinks) {
          if (!link || typeof link.label !== 'string' || typeof link.href !== 'string') throw new Error(`flowchart node ${node.id} has invalid compact link`);
          if (!/^https:\/\/github\.com\/zartyblartfast\/kaspa-toccata-api\//.test(link.href)) throw new Error(`flowchart node ${node.id} compact link must target project docs`);
        }
      }
    }
  }

  function renderLaneHeader(lane) {
    const column = lane.column === 1 ? 1 : 3;
    return `
      <header class="lane-title-card ${lane.theme === 'proof' ? 'proof-lane' : 'round-lane'}" style="grid-column: ${column}; grid-row: 1">
        <h3>${escapeHtml(lane.title)}</h3>
        <p>${escapeHtml(lane.subtitle)}</p>
      </header>
    `;
  }

  function renderEdgeConnector(edge) {
    const row = edge.fromNode.row;
    const direction = edge.fromNode.column < edge.toNode.column ? 'left-to-right' : 'right-to-left';
    return `
      <div class="edge-connector ${direction}" style="grid-column: 2; grid-row: ${row + 1}" data-edge-id="${escapeHtml(edge.id)}">
        <span>${escapeHtml(edge.label)}</span>
      </div>
    `;
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

  function renderEdge(edge, spec) {
    const leftToRight = edge.fromNode.column < edge.toNode.column;
    const startX = edge.fromNode.column === 1 ? 46 : 54;
    const endX = edge.toNode.column === 1 ? 46 : 54;
    const startY = rowCenterPercent(edge.fromNode.row, spec.layout.rowCount);
    const endY = rowCenterPercent(edge.toNode.row, spec.layout.rowCount);
    const midX = (startX + endX) / 2;
    const labelOffset = edge.labelOffset || { x: 0, y: -8 };
    const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
    const marker = leftToRight ? 'marker-end="url(#flow-arrowhead)"' : 'marker-start="url(#flow-arrowhead)"';
    return `
      <path class="edge-path" d="${path}" ${marker}></path>
      <text class="edge-label" x="${midX + Number(labelOffset.x || 0)}" y="${((startY + endY) / 2) + Number(labelOffset.y || 0)}" text-anchor="middle">${escapeHtml(edge.label)}</text>
    `;
  }

  function rowCenterPercent(row, rowCount) {
    return 12 + ((row - 0.5) / rowCount) * 82;
  }

  function boundText(binding, fallback = '') {
    const value = boundValue(binding);
    if (value === undefined || value === null || value === '') return fallback;
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  function boundValue(binding) {
    const writes = state.round && state.round.tn10Writes ? state.round.tn10Writes : {};
    const bindings = {
      roundSummary: () => ({ roundId: state.roundId, stage: state.stage }),
      roundId: () => state.roundId ? `roundId ${state.roundId}` : undefined,
      roundCommitmentGate: () => ({ commitmentExists: Boolean(state.round && state.round.commitment), chipsEnabled: canPlaceChips() }),
      commitment: () => state.round && state.round.commitment ? shortText(state.round.commitment) : undefined,
      selections: () => state.selections,
      chipSelections: () => `${state.selections.length} chip selection${state.selections.length === 1 ? '' : 's'} on the table. This is a player/table operation, not a Toccata proof step by itself.`,
      spinAction: () => ({ action: 'Spin Wheel button' }),
      'apiLog.createRound': () => state.apiLog.createRound,
      'apiLog.commit': () => state.apiLog.commit,
      'apiLog.betLedger': () => state.apiLog.betLedger,
      'apiLog.close': () => state.apiLog.close,
      'apiLog.entropy': () => state.apiLog.entropy,
      'apiLog.reveal': () => state.apiLog.reveal,
      ledgerHash: () => state.round && state.round.betLedger ? shortText(state.round.betLedger.ledgerHash) : undefined,
      entropyTarget: () => state.round && state.round.futureEntropyPlan ? `target ${state.round.futureEntropyPlan.targetBlueScore || state.round.futureEntropyPlan.targetDaaScore}` : undefined,
      entropy: () => state.entropy,
      entropyHash: () => state.entropy ? shortText(state.entropy.entropyHash || state.entropy.blockHash) : undefined,
      result: () => state.round && state.round.result ? `${state.round.result.number} ${state.round.result.color}` : undefined,
      revealSummary: () => state.round && state.round.result ? 'Reveal matches the earlier commitment.' : undefined,
      verification: () => state.verification && state.verification.verified ? 'verified: true' : undefined,
      verificationForPlayer: () => state.verification && state.verification.verified ? 'The displayed result has a verified API proof.' : undefined,
      proofVerificationBundle: () => ({ proof: state.proof, verification: state.verification, txEvidence: writes }),
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
