(() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const EUROPEAN_WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
  ];
  const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

  // One tuning surface for the wheel's visual proportions and animation feel.
  const WHEEL_TUNING = {
    viewBoxSize: 420,
    center: 210,
    outerRadius: 192,
    pocketOuterRadius: 166,
    pocketInnerRadius: 118,
    numberRadius: 145,
    bowlRadius: 106,
    hubRadius: 38,
    idleAngleDeg: -8,
    fastSpinMs: 900,
    settleMs: 1250,
    settleTurns: 4,
  };

  const hostState = new WeakMap();

  function renderRouletteWheel(host, input = {}) {
    if (!host) return;
    const phase = input.phase || 'idle';
    const result = normalizeResult(input.result);
    const status = wheelStatus(phase, result);
    const previous = hostState.get(host) || { angle: WHEEL_TUNING.idleAngleDeg, phase: 'idle' };
    const targetAngle = result ? targetAngleForNumber(result.number, previous.angle) : WHEEL_TUNING.idleAngleDeg;
    const displayAngle = phase === 'settling' || phase === 'stopped' ? targetAngle : previous.angle;

    host.innerHTML = `
      <section class="roulette-wheel-card ${escapeAttr(phase)}" aria-label="Roulette wheel simulation">
        <div class="wheel-copy">
          <span class="label">Wheel simulation</span>
          <strong>${escapeHtml(status.title)}</strong>
          <p>${escapeHtml(status.detail)}</p>
        </div>
        <div class="wheel-stage" style="--wheel-target-angle: ${displayAngle}deg; --wheel-fast-spin-ms: ${WHEEL_TUNING.fastSpinMs}ms; --wheel-settle-ms: ${WHEEL_TUNING.settleMs}ms;">
          ${wheelSvg(result, phase)}
          <div class="wheel-pointer" aria-hidden="true"></div>
          <div class="wheel-ball-orbit" aria-hidden="true"><span class="wheel-ball"></span></div>
        </div>
      </section>
    `;

    const rotor = host.querySelector('.wheel-rotor');
    if (rotor && phase === 'settling') {
      rotor.animate(
        [
          { transform: `rotate(${previous.angle}deg)` },
          { transform: `rotate(${targetAngle}deg)` },
        ],
        { duration: WHEEL_TUNING.settleMs, easing: 'cubic-bezier(.12,.72,.08,1)', fill: 'forwards' }
      );
    }
    hostState.set(host, {
      angle: phase === 'spinning' ? previous.angle + 720 : displayAngle,
      phase,
    });
  }

  function targetAngleForNumber(number, previousAngle = 0) {
    const index = EUROPEAN_WHEEL_ORDER.indexOf(Number(number));
    if (index < 0) return WHEEL_TUNING.idleAngleDeg;
    const pocketArc = 360 / EUROPEAN_WHEEL_ORDER.length;
    const desired = -index * pocketArc;
    const baseTurns = Math.ceil((previousAngle - desired) / 360) + WHEEL_TUNING.settleTurns;
    return desired + Math.max(WHEEL_TUNING.settleTurns, baseTurns) * 360;
  }

  function wheelSvg(result, phase) {
    const t = WHEEL_TUNING;
    const pocketArc = 360 / EUROPEAN_WHEEL_ORDER.length;
    const wedges = EUROPEAN_WHEEL_ORDER.map((number, index) => {
      const start = -90 + (index * pocketArc) - (pocketArc / 2);
      const end = start + pocketArc;
      const color = wheelColor(number);
      const active = result && Number(result.number) === number;
      const labelAngle = -90 + (index * pocketArc);
      const label = polar(t.center, t.center, t.numberRadius, labelAngle);
      return `
        <path class="wheel-pocket ${color}${active ? ' winning-pocket' : ''}" d="${annularSectorPath(t.center, t.center, t.pocketInnerRadius, t.pocketOuterRadius, start, end)}" />
        <text class="wheel-number${active ? ' winning-number' : ''}" x="${label.x.toFixed(2)}" y="${label.y.toFixed(2)}" transform="rotate(${(labelAngle + 90).toFixed(2)} ${label.x.toFixed(2)} ${label.y.toFixed(2)})">${number}</text>
      `;
    }).join('');

    return `
      <svg class="roulette-wheel-svg" viewBox="0 0 ${t.viewBoxSize} ${t.viewBoxSize}" role="img" aria-label="European roulette wheel${result ? ` stopped on ${result.number} ${result.color}` : ''}">
        <defs>
          <radialGradient id="wheelMetal" cx="50%" cy="45%" r="64%">
            <stop offset="0%" stop-color="#fff5cf" />
            <stop offset="32%" stop-color="#d4a536" />
            <stop offset="68%" stop-color="#6b4b16" />
            <stop offset="100%" stop-color="#241609" />
          </radialGradient>
          <radialGradient id="wheelBowl" cx="48%" cy="42%" r="62%">
            <stop offset="0%" stop-color="#27523b" />
            <stop offset="58%" stop-color="#10291f" />
            <stop offset="100%" stop-color="#06140f" />
          </radialGradient>
          <filter id="wheelGlow" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle class="wheel-shadow" cx="${t.center}" cy="${t.center + 8}" r="${t.outerRadius}" />
        <circle class="wheel-rim" cx="${t.center}" cy="${t.center}" r="${t.outerRadius}" />
        <circle class="wheel-rim-inner" cx="${t.center}" cy="${t.center}" r="${t.pocketOuterRadius + 8}" />
        <g class="wheel-rotor ${escapeAttr(phase)}" style="transform-origin: ${t.center}px ${t.center}px;">
          <circle class="wheel-pocket-bed" cx="${t.center}" cy="${t.center}" r="${t.pocketOuterRadius}" />
          ${wedges}
          <circle class="wheel-pocket-divider" cx="${t.center}" cy="${t.center}" r="${t.pocketInnerRadius}" />
        </g>
        <circle class="wheel-bowl" cx="${t.center}" cy="${t.center}" r="${t.bowlRadius}" />
        <circle class="wheel-hub" cx="${t.center}" cy="${t.center}" r="${t.hubRadius}" />
        <circle class="wheel-hub-cap" cx="${t.center}" cy="${t.center}" r="${Math.round(t.hubRadius * 0.42)}" />
      </svg>
    `;
  }

  function annularSectorPath(cx, cy, rInner, rOuter, startDeg, endDeg) {
    const outerStart = polar(cx, cy, rOuter, startDeg);
    const outerEnd = polar(cx, cy, rOuter, endDeg);
    const innerEnd = polar(cx, cy, rInner, endDeg);
    const innerStart = polar(cx, cy, rInner, startDeg);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return [
      `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
      `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
      `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
      `A ${rInner} ${rInner} 0 ${largeArc} 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
      'Z',
    ].join(' ');
  }

  function polar(cx, cy, radius, angleDeg) {
    const radians = angleDeg * Math.PI / 180;
    return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
  }

  function normalizeResult(result) {
    if (!result || !Number.isInteger(Number(result.number))) return null;
    const number = Number(result.number);
    if (number < 0 || number > 36) return null;
    return { number, color: result.color || wheelColor(number) };
  }

  function wheelStatus(phase, result) {
    if (phase === 'spinning') {
      return {
        title: 'Wheel spinning',
        detail: 'The wheel is theatrical only; browser package verification still decides the result.',
      };
    }
    if (phase === 'settling' && result) {
      return {
        title: 'Verified result landing',
        detail: `Browser verification completed. The wheel is settling on ${result.number} ${result.color}.`,
      };
    }
    if (phase === 'stopped' && result) {
      return {
        title: `${result.number} ${result.color}`,
        detail: 'Highlighted pocket reflects the browser-verified proof outcome.',
      };
    }
    if (phase === 'error') {
      return {
        title: 'Spin unresolved',
        detail: 'The wheel cannot land because browser package proof verification failed.',
      };
    }
    return {
      title: 'Ready to spin',
      detail: 'Place chips, then Spin Wheel. The visual wheel will wait for the verified package result.',
    };
  }

  function wheelColor(number) {
    if (Number(number) === 0) return 'green';
    return RED_NUMBERS.has(Number(number)) ? 'red' : 'black';
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

  function escapeAttr(value) {
    return String(value || '').replace(/[^a-z0-9_-]/gi, '');
  }

  window.RouletteWheelRenderer = {
    renderRouletteWheel,
    targetAngleForNumber,
    EUROPEAN_WHEEL_ORDER,
    WHEEL_TUNING,
  };
})();
