# Session Handover: Remaining Tasks

Date: 2026-07-02
Project root: `/root/kaspa-pof-api`

## Current state

`kaspa-pof-api` is a runtime-first npm package for generalized proof-of-fairness applications using Kaspa/TN10/mainnet evidence.

The package root exports reusable proof/fairness primitives, not the legacy HTTP client. `src/http-client.*` is absent from source and package exports.

Current package version:

```text
0.1.0-alpha.1
```

Latest committed/pushed baseline before the current uncommitted diagnostics refinements:

```text
8cfe36b feat: verify roulette runtime consumer
c37d211 Prepare alpha.1 publish readiness docs
b15c773 Add runtime proof-root anchored verification
```

## Implemented root API direction

The root package exports app-agnostic local/runtime primitives, including:

```text
hashCommitment()
verifyCommitment()
hashLedger()
verifyLedger()
deriveEntropyHash()
verifyEntropyHash()
deriveOutcome()
verifyOutcome()
validateClaimLevel()
validateKaspaBlockEvidence()
validateAnchorEvidence()
validateSubmittedAnchorTransactionEvidence()
estimateTn10AnchorFee()
validateTn10BroadcastPolicy()
submitTn10AnchorTransaction()
computeProofRoot()
buildProofRootAnchorPayload()
verifyFairnessProof()
verifyProofBundle()
verifyProofOfFairness()
```

The package core must remain generalized and must not depend on roulette.

## Roulette PoC work completed in this milestone

The in-repo `examples/roulette-poc/` has been adapted structurally into a TN10-backed package-runtime consumer.

Implemented trust boundary:

```text
roulette-specific Node server creates/coordinates round and supplies evidence
        ↓
server returns portable tn10_future_entropy proof bundle
        ↓
browser imports kaspa-pof-api through /src/browser.mjs
        ↓
browser calls verifyFairnessProof() with roulette outcome deriver
        ↓
UI displays browser/package verifier result
```

Important files added or changed:

```text
examples/roulette-poc/server.cjs
examples/roulette-poc/app.js
examples/roulette-poc/index.html
examples/roulette-poc/flowchart-spec.json
examples/roulette-poc/README.md
examples/roulette-poc/roulette-table-layout.js
src/browser.mjs
src/anchoring/submit.mjs
test/package-root-runtime.test.mjs
test/roulette-runtime-consumer.test.mjs
scripts/smoke.sh
README.md
docs/ARCHITECTURE.md
docs/PACKAGE_SPEC.md
docs/NEXT_PHASE_PLAN.md
docs/HANDOVER_PROMPT.md
docs/SESSION_HANDOVER_REMAINING_TASKS.md
```

Roulette PoC details:

- `examples/roulette-poc/server.cjs` is roulette-specific infrastructure, not package core.
- It creates committed rounds, holds hidden server seed material, accepts locked chip ledgers, chooses a TN10 future entropy target, fetches real TN10 block evidence through rusty-kaspa WASM, races bounded TN10 WRPC endpoints with resolver fallback, streams SSE diagnostics, writes per-spin JSONL logs, assembles a portable `tn10_future_entropy` proof bundle, and sanity-checks it with `verifyFairnessProof()`.
- `examples/roulette-poc/app.js` imports `kaspa-pof-api`, receives the proof bundle, supplies `roulette-poc:number-v1` as the app-specific outcome deriver, and verifies the proof in the browser.
- The previous `local_bundle_only` browser-local entropy path was removed from the roulette PoC.
- No trusted proof-verdict endpoint should be reintroduced.
- Service/fetch paths are evidence plumbing only.
- Endpoint racing is an availability/UX adapter concern and does not change the proof authority.
- The diagnostics tile is always present, collapsed by default, greyed while idle, and keeps the roulette table from shifting when a spin starts.

Run the example server from the repo root:

```bash
cd /root/kaspa-pof-api
node examples/roulette-poc/server.cjs
```

Default live WASM path used by the server:

```text
/tmp/kaspa-toccata-api-spikes/rusty-kaspa-toccata/wasm/nodejs/kaspa
```

If needed:

```bash
KASPA_WASM_PKG=/tmp/kaspa-toccata-api-spikes/rusty-kaspa-toccata/wasm/nodejs/kaspa \
node examples/roulette-poc/server.cjs
```

Optional live RPC tuning:

```text
ROULETTE_KASPA_WRPC_ENDPOINTS=<comma-separated WRPC/Borsh endpoint URLs>
ROULETTE_KASPA_WRPC_CONNECT_RACE_MS=3000
ROULETTE_KASPA_WRPC_ENDPOINT_PENALTY_MS=120000
```

Open locally or through SSH forwarding:

```text
http://127.0.0.1:8123/examples/roulette-poc/
```

Live browser spins have reached `Browser package verified TN10 proof` with the package verifier result displayed in the UI. Recent endpoint-race diagnostics show sub-second to ~1.4s spin totals after avoiding slow single-endpoint connect paths.

## Latest verification evidence

After the roulette runtime-consumer, SSE diagnostics, bounded endpoint race, and diagnostics-tile stabilization work:

```bash
npm run test
npm run smoke
```

Results:

```text
npm run test: PASS
77 tests
22 suites
0 failures

npm run smoke: PASS
KASPA_POF_REQUIRED_FILES=PASS
KASPA_POF_ROULETTE_JS_SYNTAX=PASS
KASPA_POF_PACKAGE_IMPORT=PASS
KASPA_POF_COMMITMENT_VERIFY=PASS
KASPA_POF_LEDGER_HASH=PASS
KASPA_POF_ENTROPY_DERIVE=PASS
KASPA_POF_OUTCOME_DERIVE=PASS
KASPA_POF_KASPA_EVIDENCE_VALIDATE=PASS
KASPA_POF_ANCHOR_EVIDENCE_VALIDATE=PASS
KASPA_POF_SUBMITTED_ANCHOR_TX_EVIDENCE=PASS
KASPA_POF_TN10_BROADCAST_POLICY=PASS
KASPA_POF_PROOF_VERIFY_LOCAL=PASS
KASPA_POF_PROOF_ROOT_ANCHORED=PASS
KASPA_POF_PUBLIC_EXAMPLES=PASS
KASPA_POF_PACKAGE_METADATA=PASS
KASPA_POF_ROULETTE_IMPORT_WIRING=PASS
KASPA_POF_ROULETTE_TN10_VERIFY=PASS
KASPA_POF_NO_FIXTURE_TRAPS=PASS
KASPA_POF_SMOKE=PASS
```

After the diagnostics-doc updates:

```text
npm pack --dry-run: PASS
53 files
package candidate: kaspa-pof-api-0.1.0-alpha.1.tgz
```

Re-run `npm pack --dry-run` before any publish/package-content decision.

## Current git status expectation

This file may be stale after the requested commit/push. If continuing before that commit, expect uncommitted changes in docs, roulette example files, styles, `.gitignore`, and tests.

Start `/new` with:

```bash
cd /root/kaspa-pof-api
git status --short
git diff --stat
```

## Important constraints to preserve

- Do not make the package roulette-specific.
- Do not reintroduce an HTTP-centered root API.
- Do not let any server endpoint become proof authority for the roulette PoC.
- Optional services/adapters may fetch/store/submit evidence, but package/runtime verification must remain the proof authority.
- No mock/static/offline substitute proof paths unless explicitly approved as temporary exceptions.
- No fake local proofs or `local_bundle_only` downgrade in the final roulette PoC unless the user explicitly asks for a separate low-claim demo.
- No hidden paid/mainnet spend paths. Paid anchoring must require explicit enablement, fee estimate, fee cap, and acknowledgement.
- Verification must fail closed on missing, inconsistent, or unknown evidence.
- Do not publish to npm without explicit agreement on contents/version/auth state first.
- Do not commit unless the user asks.

## Best next step after /new

1. Read this file and startup docs:

```text
docs/SESSION_HANDOVER_REMAINING_TASKS.md
docs/HANDOVER_PROMPT.md
docs/ARCHITECTURE.md
docs/PACKAGE_SPEC.md
docs/NEXT_PHASE_PLAN.md
README.md
```

2. Re-run baseline checks:

```bash
npm run test
npm run smoke
npm pack --dry-run
```

3. If continuing roulette verification, run the server and complete a real browser create/place-chip/spin flow:

```bash
node examples/roulette-poc/server.cjs
```

Expected final UI state after a successful live spin:

```text
Claim level: tn10_future_entropy
Status: Browser package verified TN10 proof
Stage: verified
```

4. Ask the user whether to commit the verified roulette/doc milestone.
