#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

pass() { printf '%s=PASS%s\n' "$1" "${2:+ # $2}"; }
fail() { printf '%s=FAIL%s\n' "$1" "${2:+ # $2}"; exit 1; }

for file in \
  package.json \
  README.md \
  docs/ARCHITECTURE.md \
  docs/HANDOVER_PROMPT.md \
  src/index.mjs \
  src/http-client.mjs \
  src/http-client.cjs \
  src/http-client.d.ts \
  examples/roulette-poc/index.html \
  examples/roulette-poc/app.js \
  examples/roulette-poc/styles.css \
  examples/roulette-poc/flowchart-spec.json \
  examples/roulette-poc/roulette-table-layout.js \
  examples/roulette-poc/roulette-table-renderer.js; do
  [ -f "$file" ] || fail KASPA_POF_REQUIRED_FILE "$file missing"
done
pass KASPA_POF_REQUIRED_FILES

node --check examples/roulette-poc/app.js >/dev/null
node --check examples/roulette-poc/roulette-table-layout.js >/dev/null
node --check examples/roulette-poc/roulette-table-renderer.js >/dev/null
pass KASPA_POF_ROULETTE_JS_SYNTAX

node --input-type=module - <<'NODE'
import { createToccataApiClient, ToccataApiClient } from './src/index.mjs';
if (typeof createToccataApiClient !== 'function') throw new Error('createToccataApiClient export missing');
if (typeof ToccataApiClient !== 'function') throw new Error('ToccataApiClient export missing');
const client = createToccataApiClient({ baseUrl: 'http://127.0.0.1:1', fetchImpl: async () => new Response('{}') });
if (!client || typeof client.health !== 'function') throw new Error('client.health missing');
NODE
pass KASPA_POF_PACKAGE_IMPORT

node - <<'NODE'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.name !== 'kaspa-pof-api') throw new Error(`unexpected package name ${pkg.name}`);
if (!pkg.exports || !pkg.exports['.']) throw new Error('package root export missing');
NODE
pass KASPA_POF_PACKAGE_METADATA

grep -q '"kaspa-pof-api": "/src/index.mjs"' examples/roulette-poc/index.html || fail KASPA_POF_IMPORT_MAP
! grep -q 'kaspa-toccata-api' examples/roulette-poc/index.html || fail KASPA_POF_NO_OLD_IMPORT_MAP
! grep -q "from 'kaspa-toccata-api'" examples/roulette-poc/app.js || fail KASPA_POF_NO_OLD_APP_IMPORT
grep -q "from 'kaspa-pof-api'" examples/roulette-poc/app.js || fail KASPA_POF_APP_IMPORT
pass KASPA_POF_ROULETTE_IMPORT_WIRING

! grep -R "sample-round\|toccata-fairness-proof\|proof\.json\|round\.json" examples/roulette-poc >/dev/null || fail KASPA_POF_NO_STATIC_PROOF_FIXTURES
! grep -Ri "mock" examples/roulette-poc >/dev/null || fail KASPA_POF_NO_MOCK_PATTERNS
! grep -Ri "dry[- ]run" examples/roulette-poc >/dev/null || fail KASPA_POF_NO_DRY_RUN_PATTERNS
pass KASPA_POF_NO_FIXTURE_TRAPS

pass KASPA_POF_SMOKE
