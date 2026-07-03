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

Latest committed/pushed baseline before the current uncommitted diagnostics refinements:

```text
8cfe36b feat: verify roulette runtime consumer
c37d211 Prepare alpha.1 publish readiness docs
b15c773 Add runtime proof-root anchored verification
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
- The browser imports `kaspa-pof-api` through an import map to `/src/browser.mjs`. This is a local development mapping, not proof that the published npm artifact is being consumed.
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

## Current npm package publication status

`kaspa-pof-api@0.1.0-alpha.1` has been tested and dry-run packed, but it has not yet been published to npm. The older published package is `kaspa-toccata-api@0.1.1`; that is the old HTTP-client-centered package and is not the new package-runtime API.

Agreed next actions:

1. Finalize package contents/account/version and publish `kaspa-pof-api@0.1.0-alpha.1` only after explicit approval.
2. Add/verify a browser-safe package export such as `kaspa-pof-api/browser` so browser consumers do not import Node-only transaction submission helpers.
3. Convert `examples/roulette-poc/` into a real npm consumer by installing/pinning the published `kaspa-pof-api` package and serving or bundling the installed browser export.
4. Add regression checks so the roulette PoC fails if it maps back to `/src/browser.mjs`, reintroduces a trusted proof endpoint, or uses static/fake proof data.
5. Keep spend/broadcast work behind a Node/server/operator boundary, but keep proof verification in the package runtime.

## User preferences / constraints

- No mocks, static proof/result fixtures, spoofed API data, fake local proofs, or half-baked shortcuts.
- Direct honesty: if live TN10 proof completion is not observed, say so and run it instead of caveating it away.
- Package core stays generalized; roulette-specific UI/game/outcome/server orchestration belongs in `examples/roulette-poc/`.
- Optional services/adapters may fetch/store/submit evidence but must not be proof authority.
- No hidden paid/mainnet spend paths. Paid anchoring must be explicit, fee-capped, and acknowledged.
- Do not publish without explicit agreement on contents/version/auth state.
- Do not commit unless the user asks.

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

3. Before publishing, re-run `npm pack --dry-run` and get explicit user agreement on package contents/version/auth state and npm account.

4. After publishing, update the roulette PoC to consume the installed npm package artifact rather than local repo source, then run a real browser create/place-chip/spin flow and confirm `Browser package verified TN10 proof` with claim level `tn10_future_entropy`.
