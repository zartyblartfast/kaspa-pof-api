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

Package version: `0.1.0-alpha.2`.

Latest committed baseline:

```text
2ed5da0 fix: fail closed for malformed anchored proofs
00e5441 chore: publish public roulette PoC on kaspaproof.com
fee0ec4 docs: clarify npm package consumer boundary
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
- The browser imports `kaspa-pof-api/browser` from `examples/roulette-poc/node_modules/kaspa-pof-api@0.1.0-alpha.2`. This is the published npm artifact installed under the example, not repo-root `/src/browser.mjs`.
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

The public demo is live at:

```text
https://kaspaproof.com/examples/roulette-poc/
```

Caddy terminates HTTPS for `kaspaproof.com` / `www.kaspaproof.com` and proxies `/examples/roulette-poc/*` to the local roulette service on `127.0.0.1:8123`. The live browser create/place-chip/spin flow has been verified publicly; expected successful final UI state is `TN10 proof verified in browser` / browser package verification for claim level `tn10_future_entropy`.

## Latest verification evidence

Latest source baseline before this handover update:

```text
2ed5da0 fix: fail closed for malformed anchored proofs
```

Current verification after public-demo hardening and `0.1.0-alpha.2` publication:

```text
git diff --check: PASS
npm test: PASS, 86 tests, 23 suites, 0 failures
npm run smoke: PASS, including KASPA_POF_ROULETTE_OPERATIONAL_HARDENING=PASS and KASPA_POF_SMOKE=PASS
npm run smoke:published: PASS against kaspa-pof-api@0.1.0-alpha.2, including KASPA_POF_PUBLISHED_SMOKE=PASS
npm pack --dry-run: PASS, 56 files, kaspa-pof-api-0.1.0-alpha.2.tgz
```

Public deployment health after push:

```text
GET https://kaspaproof.com/examples/roulette-poc/health: ok=true, claimLevel=tn10_future_entropy, networkId=testnet-10
caddy: active/enabled
kaspa-pof-roulette.service: active/enabled
```

Re-run `npm pack --dry-run` before any publish/package-content decision.

## Current npm package publication status

`kaspa-pof-api@0.1.0-alpha.2` is published to npm. The older published package is `kaspa-toccata-api@0.1.1`; that is the old HTTP-client-centered package and is not the new package-runtime API.

Completed npm-consumer correction:

1. `kaspa-pof-api/browser` exists and is tested as browser-safe.
2. `examples/roulette-poc/` has its own dependency pinned to `kaspa-pof-api@0.1.0-alpha.2`.
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

## Latest completed task: fail-closed malformed anchored proof verification

The latest pushed source change is:

```text
2ed5da0 fix: fail closed for malformed anchored proofs
```

What changed:

- `src/proof/verify.mjs` and `src/proof/verify.cjs` now guard anchor payload-hash construction and proof-root recomputation so malformed anchored proof objects return structured verifier errors instead of throwing.
- `test/proof-verify.test.mjs` and `test/proof-verify-cjs.test.cjs` add regression coverage for malformed `tn10_tx_anchored` and `tn10_proof_root_anchored` proof objects.
- This fixed the review finding that `verifyFairnessProof()` could throw for malformed anchored proofs, violating the fail-closed verifier contract.
- This fix is published in `kaspa-pof-api@0.1.0-alpha.2`.

## Public hosting state

- Domain: `https://kaspaproof.com/examples/roulette-poc/`
- DNS: GoDaddy `A @ -> 187.124.210.10`; `www` is a CNAME to `kaspaproof.com`.
- Caddy config: `/etc/caddy/Caddyfile` proxies `/examples/roulette-poc/*` to `127.0.0.1:8123` and handles HTTPS/redirects.
- Systemd service: `/etc/systemd/system/kaspa-pof-roulette.service`; working directory `/root/kaspa-pof-api`; runtime log root `/var/log/kaspa-pof-roulette/spins`; `ExecStart=/root/.hermes/node/bin/node examples/roulette-poc/server.cjs`.
- Current service state at handover: `caddy` and `kaspa-pof-roulette.service` active/enabled after restarting against the `0.1.0-alpha.2` roulette dependency.

## Latest completed task: public-demo operational hardening

Implemented app-level public-demo hardening in `examples/roulette-poc/` while preserving the browser/package proof-authority boundary:

1. Public spin creation responses and SSE events no longer expose filesystem `logPath`; they expose `spinId`/`diagnosticId` while server-side JSONL logs still write to `ROULETTE_RUNTIME_LOG_ROOT`.
2. `HEAD /examples/roulette-poc/health` returns 200 with no response body; `GET /health` still returns the JSON health payload.
3. In-memory `rounds` and `spins` are bounded by TTL and maximum retained entries:
   - `ROULETTE_ROUND_RETENTION_TTL_MS` default `3600000`
   - `ROULETTE_SPIN_RETENTION_TTL_MS` default `3600000`
   - `ROULETTE_MAX_RETAINED_ROUNDS` default `1000`
   - `ROULETTE_MAX_RETAINED_SPINS` default `1000`
4. Regression coverage: `test/roulette-server-hardening.test.mjs`, `test/roulette-runtime-consumer.test.mjs`, and `scripts/smoke.sh`.

Latest verification for this increment:

```text
git diff --check: PASS
npm test: PASS, 86 tests, 23 suites, 0 failures
npm run smoke: PASS, including KASPA_POF_ROULETTE_OPERATIONAL_HARDENING=PASS and KASPA_POF_SMOKE=PASS
npm pack --dry-run: PASS, 56 files, kaspa-pof-api-0.1.0-alpha.2.tgz
systemctl restart kaspa-pof-roulette.service: PASS; caddy and kaspa-pof-roulette.service active
Public HEAD /examples/roulette-poc/health: 200 with no response body
Public GET /examples/roulette-poc/health: ok=true, claimLevel=tn10_future_entropy, networkId=testnet-10
Public API spin/SSE proof: PASS, no public logPath/server path, package verification ok, claimLevel=tn10_future_entropy
Public browser spin: PASS, UI reached `TN10 proof verified in browser`; browser console had 0 messages / 0 JS errors
```

Remaining separate operational items:

1. Add rate limiting for public round/spin POST endpoints.
2. Add logrotate for `/var/log/kaspa-pof-roulette/spins/*.jsonl`.
3. Consider replacing Hermes-managed Node path in systemd with a stable system/project Node path.
4. Consider conservative Caddy security headers after browser testing.

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
