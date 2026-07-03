# Handover Prompt for New Hermes Profile: kaspa-pof-api

Use this after `/new` to continue the `kaspa-pof-api` work.

## Project root

```text
/root/kaspa-pof-api
```

GitHub repo:

```text
https://github.com/zartyblartfast/kaspa-pof-api.git
```

## Project intent

Build a fresh, general-purpose npm API/package for proof-of-fairness applications using Kaspa/TN10/mainnet evidence.

The package must stay app-agnostic. Roulette is the first example consumer, not package core.

## Critical architecture rule

Do not revert to the old `npm HTTP client + private Node proof service` architecture.

Target model:

```text
service/app supplies portable evidence
        ↓
consumer imports kaspa-pof-api
        ↓
consumer/package runtime independently verifies the proof
        ↓
UI displays the package verifier result
```

A server may create rounds, store state, fetch TN10/mainnet evidence, host files, or submit explicitly gated anchors. It must not be the proof authority. No `/v1/proofs/verify`-style trusted verdict should be used by the new roulette PoC.

Spend/fee-related transaction submission is allowed to run through a Node/server/operator process because browsers should not hold private keys. That process may use package helpers such as `submitTn10AnchorTransaction()` to create public transaction evidence, but the browser/app must still verify the returned proof bundle with the package runtime.

## Current package state

Package version: `0.1.0-alpha.1`.

Latest committed baseline:

```text
fee0ec4 docs: clarify npm package consumer boundary
dee2579 feat: add roulette diagnostics endpoint racing
8cfe36b feat: verify roulette runtime consumer
```

Root runtime exports include:

```text
hashCommitment / verifyCommitment
hashLedger / verifyLedger
deriveEntropyHash / verifyEntropyHash
deriveOutcome / verifyOutcome
validateClaimLevel
validateKaspaBlockEvidence
validateAnchorEvidence
validateSubmittedAnchorTransactionEvidence
estimateTn10AnchorFee
validateTn10BroadcastPolicy
submitTn10AnchorTransaction
computeProofRoot
buildProofRootAnchorPayload
verifyFairnessProof / verifyProofBundle / verifyProofOfFairness
```

`src/http-client.*` is removed and the root package does not export the old HTTP client.

## Roulette PoC current state

`examples/roulette-poc/` has been adapted structurally into the new package-runtime consumer model.

Important files:

```text
examples/roulette-poc/server.cjs
examples/roulette-poc/app.js
examples/roulette-poc/index.html
examples/roulette-poc/flowchart-spec.json
examples/roulette-poc/README.md
test/roulette-runtime-consumer.test.mjs
src/browser.mjs
```

Architecture:

- `examples/roulette-poc/server.cjs` is roulette-specific infrastructure.
- It creates committed rounds, keeps hidden server seeds server-side, accepts locked chip ledgers, fetches real TN10 future-block evidence via rusty-kaspa WASM, races bounded TN10 WRPC endpoints with resolver fallback, streams SSE diagnostics, writes per-spin JSONL logs, assembles portable `tn10_future_entropy` proof bundles, and sanity-checks those bundles with the package runtime.
- The browser imports `kaspa-pof-api/browser` from `examples/roulette-poc/node_modules/kaspa-pof-api@0.1.0-alpha.1`. This is the published npm artifact installed under the example, not repo-root `/src/browser.mjs`.
- The browser calls `verifyFairnessProof(proof, { outcomeDerivers })` itself and displays that package verifier result.
- Roulette-specific outcome mapping remains in the example consumer via `roulette-poc:number-v1`; package core remains app-agnostic.
- The previous `local_bundle_only` browser-local entropy path was removed from the roulette PoC.
- No legacy `/v1/*` proof-authority path should be reintroduced.

Run locally from the repo root:

```bash
cd /root/kaspa-pof-api
node examples/roulette-poc/server.cjs
```

Default WASM path expected by the example server:

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

Open through SSH port forwarding if viewing from a laptop:

```bash
ssh -L 8123:127.0.0.1:8123 root@srv1608371
```

Then browse:

```text
http://127.0.0.1:8123/examples/roulette-poc/
```

The live browser create/place-chip/spin flow has been recorded. Expected successful final UI state is `Browser package verified TN10 proof` with claim level `tn10_future_entropy`; diagnostics remain collapsed/reserved so the roulette table stays visually stable during a spin.

## Latest verification evidence

After the roulette runtime-consumer, SSE diagnostics, bounded endpoint race, and diagnostics-tile stabilization work:

```text
npm run test: PASS
77 tests
22 suites
0 failures

npm run smoke: PASS
KASPA_POF_ROULETTE_TN10_VERIFY=PASS
KASPA_POF_SMOKE=PASS

npm pack --dry-run: PASS after the diagnostics-doc updates
53 files
package candidate: kaspa-pof-api-0.1.0-alpha.1.tgz
```

Re-run `npm pack --dry-run` before any publish/package-content decision.

Latest doc-boundary clarification commit:

```text
fee0ec4 docs: clarify npm package consumer boundary
```

That commit recorded the earlier truth that the roulette PoC still mapped `kaspa-pof-api` to local `/src/browser.mjs`. The later uncommitted roulette npm-consumer work corrected that gap by installing/pinning `kaspa-pof-api@0.1.0-alpha.1` under the example and importing `kaspa-pof-api/browser` from the installed package artifact.

## Current npm package publication status

`kaspa-pof-api@0.1.0-alpha.1` is published to npm. The older published package is `kaspa-toccata-api@0.1.1`; that is the old HTTP-client-centered package and is not the new package-runtime API.

Completed npm-consumer correction:

1. `kaspa-pof-api/browser` exists and is tested as browser-safe.
2. `examples/roulette-poc/` has its own dependency pinned to `kaspa-pof-api@0.1.0-alpha.1`.
3. The PoC serves the installed package browser export from `examples/roulette-poc/node_modules/kaspa-pof-api/src/browser.mjs` instead of mapping to `/src/browser.mjs`.
4. `docs/ROULETTE_NPM_CONSUMER_WIRING.md`, `test/roulette-runtime-consumer.test.mjs`, and `scripts/smoke.sh` record/check every anti-stale-code boundary.
5. Spend/broadcast work remains behind a Node/server/operator boundary, but proof verification remains in the package runtime.

## User preferences / constraints

- No mocks, static proof/result fixtures, spoofed API data, fake local proofs, or half-baked shortcuts.
- Direct honesty: if live TN10 proof completion is not observed, say so and run it instead of caveating it away.
- Package core stays generalized; roulette-specific UI/game/outcome/server orchestration belongs in `examples/roulette-poc/`.
- Optional services/adapters may fetch/store/submit evidence but must not be proof authority.
- No hidden paid/mainnet spend paths. Paid anchoring must be explicit, fee-capped, and acknowledged.
- Do not publish without explicit agreement on contents/version/auth state.
- Do not commit unless the user asks.

## Latest completed task: roulette demo-unit accounting

The roulette PoC now has a compact right-panel card below `Selected chips` for demo-unit accounting only.

Implemented in `examples/roulette-poc/` only, not package core:

- Shows round stake in demo units before spin and while pending.
- After browser package verification succeeds, shows returned demo units and round net P/L using European single-zero payout semantics from the table layout.
- If browser proof verification fails, the card shows that the round was not settled; it does not display trusted final P/L.
- Keeps browser-memory-only session P/L across verified rounds, initialized on page open/refresh, guarded by settled round IDs, and preserved by `Reset Round` while clearing round-specific display.
- Does not persist session P/L to server, localStorage, cookies, chain, or proof bundles.
- Includes the wording: `Demo units only. TN10/mainnet fees are proof/evidence costs, not player wager or payout currency.`
- Regression coverage in `test/roulette-runtime-consumer.test.mjs` and `scripts/smoke.sh` checks demo-unit wording, no persistence, browser-only accounting, and no server-side proof-verdict settlement authority.

Latest live browser verification for this change: RED chip, 5 demo units, `Browser package verified TN10 proof`, result `34 red`, round stake `5`, returned `10`, round net `+5`, session P/L `+5`; `Reset Round` then cleared round accounting while preserving session P/L.

## Best next step after /new

1. Read:

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

3. For accounting/UI changes, preserve the browser/package verification boundary and demo-unit wording; do not persist session P/L or add it to proof bundles.

4. If preparing a release, run `npm pack --dry-run` and decide the next package version before publishing. Do not publish without explicit approval.
