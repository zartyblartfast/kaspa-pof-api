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

Latest committed baseline:

```text
fee0ec4 docs: clarify npm package consumer boundary
dee2579 feat: add roulette diagnostics endpoint racing
8cfe36b feat: verify roulette runtime consumer
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

The in-repo `examples/roulette-poc/` has been adapted into a TN10-backed published-npm-package consumer.

Implemented trust boundary:

```text
roulette-specific Node server creates/coordinates round and supplies evidence
        ↓
server returns portable tn10_future_entropy proof bundle
        ↓
browser imports kaspa-pof-api/browser from examples/roulette-poc/node_modules/kaspa-pof-api@0.1.0-alpha.1
        ↓
browser calls verifyFairnessProof() with roulette outcome deriver
        ↓
UI displays browser/package verifier result
```

Important files added or changed:

```text
examples/roulette-poc/package.json
examples/roulette-poc/package-lock.json
examples/roulette-poc/server.cjs
examples/roulette-poc/app.js
examples/roulette-poc/index.html
examples/roulette-poc/flowchart-spec.json
examples/roulette-poc/README.md
examples/roulette-poc/roulette-table-layout.js
docs/ROULETTE_NPM_CONSUMER_WIRING.md
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
- `examples/roulette-poc/app.js` imports `kaspa-pof-api/browser` from the example's installed `node_modules/kaspa-pof-api@0.1.0-alpha.1`, receives the proof bundle, supplies `roulette-poc:number-v1` as the app-specific outcome deriver, and verifies the proof in the browser.
- Published-package wiring is documented in `docs/ROULETTE_NPM_CONSUMER_WIRING.md`. Tests and smoke now fail if the PoC maps back to repo-root `/src/browser.mjs`, serves repo-root package source, uses a trusted proof-verdict endpoint, or uses static/fake proof data.
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
/tmp/kaspa-pof-api-spikes/rusty-kaspa/wasm/nodejs/kaspa
```

If needed:

```bash
KASPA_WASM_PKG=/tmp/kaspa-pof-api-spikes/rusty-kaspa/wasm/nodejs/kaspa \
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

## Current package publication status

`kaspa-pof-api@0.1.0-alpha.1` is published to npm. The older published npm package `kaspa-toccata-api@0.1.1` belongs to the previous HTTP-client-centered repo.

Completed before claiming the roulette PoC showcases the npm API:

1. Published `kaspa-pof-api@0.1.0-alpha.1`.
2. Added/verified browser-safe package export `kaspa-pof-api/browser`.
3. Added `examples/roulette-poc/package.json` and `package-lock.json` pinning `kaspa-pof-api@0.1.0-alpha.1`.
4. Served the installed package browser export from `examples/roulette-poc/node_modules/kaspa-pof-api/src/browser.mjs`; the PoC no longer maps to `/src/browser.mjs`.
5. Added regression checks that fail if the PoC uses local repo source, a trusted proof-verdict endpoint, or static/fake proof data.

## Spend / fee / transaction boundary

Spend and fee-related TN10 transaction submission may run through a Node/server/operator process because browsers should not hold private keys. The package still owns the reusable submission helper and policy checks (`estimateTn10AnchorFee()`, `validateTn10BroadcastPolicy()`, `submitTn10AnchorTransaction()`), but browser consumers should verify public evidence rather than broadcast spends.

Do not move proof verification back into a Node/server. A server may submit anchors, fetch evidence, stream diagnostics, and assemble proof bundles; it must not return a trusted fairness verdict that bypasses `verifyFairnessProof()`.

## Current git status expectation

Latest local commit is expected to be `fee0ec4 docs: clarify npm package consumer boundary`; working tree should be clean unless current handover updates are in progress. If publishing from a new session, check whether `fee0ec4` has been pushed before relying on the remote branch.

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

## Latest completed task: roulette demo-unit win/loss display

User agreed the roulette PoC should use demo accounting units only. This is now implemented in the browser example only; chip amounts are not KAS/TN10 coins, and the funded TN10 wallet is only for proof/evidence/fee operations where explicitly gated. The UI does not imply player bankroll, custody, deposits, withdrawals, or real-money settlement.

Implemented behavior:

- A compact `Demo unit accounting` card appears in the main roulette table section, right side, below `Selected chips`.
- Round display shows total round stake in demo units before spin and while pending.
- After browser package verification succeeds, it shows round returned units and net win/loss.
- If browser proof verification fails, it does not settle or display trusted final P/L; it shows that the round was not settled because proof verification failed.
- Payout calculation uses the table layout's European single-zero semantics: each selection wins if the verified result number is in `coveredNumbers`; `payoutMultiplier` is net odds, so a winning stake returns `stake * (payoutMultiplier + 1)`, winning net is `stake * payoutMultiplier`, losing return is `0`, and losing net is `-stake`.
- The card includes: `Demo units only. TN10/mainnet fees are proof/evidence costs, not player wager or payout currency.`
- Browser-memory-only session P/L starts at zero on page open/refresh, updates only after successful browser verification, and uses settled round IDs so rerenders/SSE reconnects cannot double-count.
- `Reset Round` clears round-specific display/state and keeps the browser-memory session total.
- Session P/L is not persisted to the server, localStorage, cookies, package proof bundles, or chain.

Files in this increment:

```text
examples/roulette-poc/app.js
examples/roulette-poc/index.html
examples/roulette-poc/styles.css
test/roulette-runtime-consumer.test.mjs
scripts/smoke.sh
README.md
docs/PACKAGE_SPEC.md
docs/NEXT_PHASE_PLAN.md
docs/HANDOVER_PROMPT.md
docs/SESSION_HANDOVER_REMAINING_TASKS.md
examples/roulette-poc/README.md
```

Latest verification for this increment:

```text
node --test test/roulette-runtime-consumer.test.mjs: PASS
npm run test: PASS, 79 tests, 22 suites, 0 failures
npm run smoke: PASS, including KASPA_POF_ROULETTE_DEMO_ACCOUNTING=PASS and KASPA_POF_SMOKE=PASS
```

Real browser verification:

```text
URL: http://127.0.0.1:8123/examples/roulette-poc/
Bet: RED, 5 demo units
Status: Browser package verified TN10 proof
Stage: verified
Result: 34 red
Round stake: 5 demo units
Returned: 10 demo units
Round net: +5 demo units
Session P/L: +5 demo units
Reset Round: cleared round display/state and preserved Session P/L +5 demo units
Browser console: 0 messages, 0 JS errors
```

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

2. Check state:

```bash
cd /root/kaspa-pof-api
git status --short
npm run test
npm run smoke
npm pack --dry-run
```

3. Decide the next coherent increment. Likely options:

- review package tarball/version and decide whether a follow-up npm package version should be published for the browser export/example/docs milestone;
- improve roulette demo diagnostics/UX only if a specific issue is observed;
- continue package API hardening without moving roulette settlement or proof authority into the server.
