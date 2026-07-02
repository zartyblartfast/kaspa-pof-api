# Next Phase Plan: Package-First Proof-of-Fairness API

## Goal

Turn `kaspa-pof-api` from a migration scaffold into a general-purpose npm package whose core value is local, reusable proof-of-fairness verification using Kaspa/TN10/mainnet evidence.

Roulette remains the first intended consumer, but the package must support other apps with similar fairness objectives. The current deployed roulette app can remain on its old npm API plus VPS node/server; the in-repo `examples/roulette-poc/` directory is the agreed location for the new package-runtime roulette consumer.

## Non-goals for this phase

- Do not build a production casino app.
- Do not add mainnet write/broadcast capability.
- Do not make the VPS service the proof authority.
- Do not copy `kaspa-toccata-api/src/server.cjs` wholesale.
- Do not introduce mock/offline/static proof/result fixtures.

## Target outcome

At the end of this phase:

```text
examples/roulette-poc receives or builds a proof bundle
        ↓
kaspa-pof-api verifies that proof locally
        ↓
roulette displays local verification result
```

The old HTTP `/v1/proofs/verify` service remains only a historical/reference path in the old project. It is not exported by this package and must not be the proof authority for new consumers.

## Architecture principle

```text
package owns proof logic
service owns convenience only
example app proves package usability
```

## Workstream 1: Define proof data model

Create stable package-level data structures before moving implementation.

Planned files:

```text
src/proof/schema.mjs
src/proof/schema.d.ts
test/proof-schema.test.mjs
```

Define:

- `ProofBundle`
- `RoundCommitment`
- `InputLedger`
- `EntropyTarget`
- `KaspaBlockEvidence`
- `RevealEvidence`
- `OutcomeEvidence`
- `VerificationResult`
- `ClaimLevel`

Acceptance criteria:

- Schemas are app-generic.
- No roulette-only field is required by the package core.
- Network and claim level are explicit.
- Proof bundle is portable JSON.

## Workstream 2: Extract pure hashing and replay primitives

Planned files:

```text
src/commitment.mjs
src/ledger.mjs
src/entropy.mjs
src/proof/verify.mjs
test/commitment.test.mjs
test/ledger.test.mjs
test/entropy.test.mjs
test/verify.test.mjs
```

Functions should be pure and deterministic:

```js
hashCommitment(serverSeed)
hashLedger(entries)
deriveEntropyHash({ roundId, commitment, clientSeed, ledgerHash, blockEvidence })
verifyCommitment({ serverSeed, commitment })
verifyLedger({ entries, ledgerHash })
verifyProofBundle(proof)
```

Acceptance criteria:

- Functions do not call HTTP.
- Functions do not depend on roulette UI.
- Tests use explicit inline sample objects, not static app fixture files.
- Verification fails closed on missing or inconsistent fields.

## Workstream 3: Add app-defined outcome hooks

Status: initial generic helper API implemented in `src/outcome.*` and integrated with `verifyFairnessProof()`.

The package should not know only roulette.

Planned files:

```text
src/outcome.mjs
src/outcomes/roulette.mjs
test/outcome.test.mjs
test/roulette-outcome.test.mjs
```

Core package should expose generic helpers:

```js
deriveOutcome({ entropyHash, spec, derivers })
verifyOutcome({ entropyHash, outcome, outcomeDerivers })
```

Roulette may be included as an example/default deriver, but app developers must be able to supply their own deterministic outcome mapping.

Acceptance criteria:

- Generic apps can define their own result mapping.
- Roulette result derivation is deterministic and replayable.
- `verifyProofBundle` checks claimed outcome against the selected deriver.

## Workstream 4: Validate Kaspa/TN10/mainnet evidence

Planned files:

```text
src/networks/kaspa-evidence.mjs
src/networks/claim-levels.mjs
test/kaspa-evidence.test.mjs
```

Support read-only evidence validation first:

```text
tn10_future_entropy
mainnet_future_entropy
```

Evidence validation should check:

- declared network ID;
- block hash presence;
- target metric and target score;
- evidence score at or after target;
- entropy hash derivation inputs;
- optional finality depth once specified.

Acceptance criteria:

- No KAS spend is needed for these claim levels.
- Network mismatch fails verification.
- Claim level accurately communicates what was proven.

## Workstream 5: Adapt `examples/roulette-poc/` into a package-runtime roulette consumer

Status: implemented structurally as a TN10-backed package-runtime consumer. The example now has a roulette-specific server that creates committed rounds, locks chip ledgers, fetches real TN10 future-block evidence through rusty-kaspa WASM, assembles portable `tn10_future_entropy` proof bundles, and sanity-checks them through the package. The browser imports `kaspa-pof-api`, supplies the roulette outcome deriver, and calls `verifyFairnessProof()` itself. The server is evidence plumbing, not proof authority.

Implemented files:

```text
examples/roulette-poc/app.js
examples/roulette-poc/index.html
examples/roulette-poc/README.md
examples/roulette-poc/server.cjs
test/roulette-runtime-consumer.test.mjs
```

Implemented app flow:

```text
roulette server creates committed round and fetches TN10 evidence
server returns portable tn10_future_entropy proof bundle
browser calls verifyFairnessProof(proof) from kaspa-pof-api
UI displays browser package verification result
```

Acceptance criteria:

- The roulette consumer does not rely on `/v1/proofs/verify` or any HTTP endpoint for proof authority.
- Existing package-name import remains.
- Legacy raw app-level `/v1/*` proof-authority fetches are removed or demoted to non-authoritative convenience/evidence plumbing.
- No mock/offline/static result/proof spoofing path is added.

## Workstream 6: Optional transport adapters, after runtime stabilization

The legacy HTTP client has been removed from package exports and source. Do not reintroduce an HTTP-centered API.

Future transport adapters, if needed, should be designed after the runtime API is stable and should be optional evidence/provider layers. They may fetch, store, or submit evidence, but local package verification remains the proof authority.

Acceptance criteria:

- Core proof modules do not import transport adapters.
- No root HTTP client export exists.
- Adapters return portable evidence for local verification, not trusted success verdicts.

## Workstream 7: Mainnet anchoring design only

Status: evidence validation for existing tx-anchored claim levels is implemented. TN10-only fee policy and guarded transaction-anchor submission are implemented. Mainnet transaction submission remains future work and must stay explicit.

Do not implement mainnet write paths in this phase. Specify them.

Planned files:

```text
docs/MAINNET_ANCHORING.md
src/anchoring/fees.mjs
```

Focus on:

- fee estimation interface;
- anchor policy names;
- payload schema;
- explicit gates for any future write path;
- no-spend default claim levels.

Acceptance criteria:

- No mainnet transaction submission code.
- Fee estimate shapes are documented.
- Paid anchoring is clearly optional.

## Workstream 8: Formal proof-root-only TN10 claim model

Status: implemented. Current `proof-root` remains an optional anchor phase for `tn10_tx_anchored`, while the separate `tn10_proof_root_anchored` claim level makes one TN10 transaction sufficient only when it commits to a canonical recomputable root of the full proof bundle.

The earlier live TN10 proof-root tx in `references/live-tn10-proof-root-anchor-evidence.json` remains a smoke anchor proving the broadcast/evidence path. The canonical proof-root-only demonstration is now in `references/live-tn10-proof-root-anchored-evidence.json` and `references/live-tn10-proof-root-anchored-proof.json`.

Implemented files:

```text
src/proof/root.mjs
src/proof/root.cjs
src/proof/root.d.ts
test/proof-root.test.mjs
test/proof-root-cjs.test.cjs
```

Implemented API:

```js
computeProofRoot(proof)
buildProofRootAnchorPayload(proof)
```

Verifier behavior:

- adds `tn10_proof_root_anchored` as a separate claim level;
- recomputes proof root from a stable canonical subset of the proof;
- excludes anchor tx evidence from the root to avoid circularity;
- requires a single `proof-root` anchor with submitted transaction evidence;
- checks payload schema, network, claim level, round id, proof schema, proof root, txid, accepting block hash, and payload hash binding;
- fails closed on any mismatch or missing evidence.

Acceptance criteria:

- A proof with a matching single proof-root anchor verifies without `commit`/`close`/`reveal` tx anchors.
- Mutating commitment, ledger, entropy, reveal, or outcome data changes the root and fails verification.
- Wrong network, claim level, round id, payload schema, payload root, txid, accepting block hash, or payload hash fails verification.
- A new live TN10 transaction was submitted with a canonical proof-root payload for a sample full proof bundle, and that exact evidence verifies through the package.

## Verification commands

Baseline:

```bash
npm run smoke
```

After tests are added:

```bash
npm test
```

Current relevant smoke markers include:

```text
KASPA_POF_COMMITMENT_VERIFY=PASS
KASPA_POF_LEDGER_HASH=PASS
KASPA_POF_ENTROPY_DERIVE=PASS
KASPA_POF_PROOF_VERIFY_LOCAL=PASS
KASPA_POF_PROOF_ROOT_ANCHORED=PASS
KASPA_POF_ROULETTE_IMPORT_WIRING=PASS
KASPA_POF_ROULETTE_TN10_VERIFY=PASS
```

## First implementation sequence

1. Add package test runner and minimal unit test convention.
2. Add `hashCommitment()` with tests.
3. Add `hashLedger()` with tests.
4. Add `deriveEntropyHash()` with tests using explicit inline evidence.
5. Add `verifyProofBundle()` for commitment/ledger/entropy consistency.
6. Add app-defined outcome helper APIs outside package core assumptions. DONE for the generic helper API; optional roulette example remains separate/future.
7. Document claim levels and mainnet anchoring policy.
8. Add paid anchor payload/fee policy interfaces without hidden broadcasting. Anchor evidence validation and guarded TN10 submission are implemented; mainnet write design remains future work.
9. Implement the formal proof-root-only TN10 claim model described in Workstream 8 if the next priority remains proof-root-only anchoring.
10. DONE structurally: adapt `examples/roulette-poc/` into a TN10-backed package-runtime roulette consumer that calls browser-side package verification.
11. Next: finish live create/spin/browser verification if not already completed, then decide whether to commit. Commit only when the user asks; the user has allowed skipping commits across several related tasks.

## Open questions

- Near-term active work after the roulette adaptation:
  1. Run/record live create+spin browser verification against `examples/roulette-poc/server.cjs` if not already completed.
  2. Run `npm run smoke` and `npm pack --dry-run` after the doc/handover update.
  3. Ask whether to commit the verified roulette milestone.
- Version decision completed: publish candidate is `0.1.0-alpha.1`.
- Optional chain evidence provider/adapters are parked until roulette integration proves they are needed.
- Mainnet paid submission is parked for a later stage.

- What finality depth should `mainnet_future_entropy` require?
- Should the package name published to npm be `kaspa-pof-api`, or should this repo eventually publish scoped packages?
- Should the proof-root-only claim level be named `tn10_proof_root_anchored`, or should a different explicit claim-level name be used?
