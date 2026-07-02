# Session Handover: Remaining Tasks

Date: 2026-07-02
Project root: `/root/kaspa-pof-api`

## Current state

`kaspa-pof-api` has been moved from an HTTP-client-centered scaffold to a runtime-first npm package for generalized proof-of-fairness applications using Kaspa/TN10/mainnet evidence.

The root package API no longer exports the legacy HTTP client. The files below were removed from source and are absent from `npm pack --dry-run` output:

```text
src/http-client.mjs
src/http-client.cjs
src/http-client.d.ts
```

The current deployed roulette app is not being migrated in this repo. It uses the old npm API plus its own VPS node/server and can continue unchanged. A new roulette consumer should be cloned/adapted separately against this package runtime model.

## Current root API direction

The root package exports local/runtime primitives, including:

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
verifyFairnessProof()
verifyProofBundle()
verifyProofOfFairness()
```

These are generalized and not roulette-specific.

## Implemented modules

```text
src/commitment.mjs|cjs|d.ts
src/ledger.mjs|cjs|d.ts
src/entropy.mjs|cjs|d.ts
src/outcome.mjs|cjs|d.ts
src/anchoring/evidence.mjs|cjs|d.ts
src/anchoring/policy.mjs|cjs|d.ts
src/anchoring/submit.mjs|cjs|d.ts
src/networks/claim-levels.mjs|cjs|d.ts
src/networks/kaspa-evidence.mjs|cjs|d.ts
src/proof/verify.mjs|cjs|d.ts
src/index.mjs|cjs|d.ts
```

## Tests added

```text
test/commitment.test.mjs
test/commitment-cjs.test.cjs
test/ledger.test.mjs
test/ledger-cjs.test.cjs
test/entropy.test.mjs
test/entropy-cjs.test.cjs
test/outcome.test.mjs
test/outcome-cjs.test.cjs
test/anchor-evidence.test.mjs
test/anchor-evidence-cjs.test.cjs
test/anchor-policy.test.mjs
test/anchor-policy-cjs.test.cjs
test/anchor-submit.test.mjs
test/anchor-transaction-evidence.test.mjs
test/claim-levels.test.mjs
test/kaspa-evidence.test.mjs
test/proof-verify.test.mjs
test/proof-verify-cjs.test.cjs
test/package-root-runtime.test.mjs
```

## Docs updated

Updated docs now describe the runtime-first state and separate future roulette consumer model:

```text
README.md
docs/ARCHITECTURE.md
docs/HANDOVER_PROMPT.md
docs/NEXT_PHASE_PLAN.md
docs/PACKAGE_SPEC.md
```

## Last verification evidence

Last verification commands run after live TN10 anchor submission, submitted-anchor evidence validation, and submitter hardening:

```bash
npm test
npm run smoke
npm pack --dry-run
```

Results:

```text
npm run test: PASS
65 tests
19 suites
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
KASPA_POF_PACKAGE_METADATA=PASS
KASPA_POF_ROULETTE_IMPORT_WIRING=PASS
KASPA_POF_NO_FIXTURE_TRAPS=PASS
KASPA_POF_SMOKE=PASS

npm pack --dry-run: PASS
42 files
No src/http-client.* files included
```

## Current git status summary

As of the original handover, there were many uncommitted changes. The runtime-first milestone was committed as `207e898 Make package runtime-first proof verifier`; outcome helper API work after that commit is currently uncommitted until the user asks/agrees to commit it.

Known status shape:

```text
Modified:
README.md
docs/ARCHITECTURE.md
docs/HANDOVER_PROMPT.md
docs/NEXT_PHASE_PLAN.md
docs/PACKAGE_SPEC.md
package.json
scripts/smoke.sh
src/index.mjs

Deleted:
src/http-client.cjs
src/http-client.d.ts
src/http-client.mjs

Untracked:
src/commitment.*
src/ledger.*
src/entropy.*
src/index.cjs
src/index.d.ts
src/networks/
src/proof/
test/
docs/SESSION_HANDOVER_REMAINING_TASKS.md
```

Re-run `git status --short` after `/new` before doing anything.

## Important constraints to preserve

- Do not make the package roulette-specific.
- Do not reintroduce an HTTP-centered root API.
- Optional services/adapters may fetch/store/submit evidence, but local package verification must remain the proof authority.
- No mock/static/offline substitute proof paths unless explicitly approved as temporary exceptions.
- No hidden paid/mainnet spend paths. Paid anchoring must require explicit enablement, fee estimate, fee cap, and acknowledgement.
- Verification must fail closed on missing, inconsistent, or unknown evidence.
- Do not publish to npm without explicit agreement on contents/version/auth state first.
- Do not commit unless the user asks.

## Remaining production-grade work

### Completed after this handover was written

- Runtime-first milestone committed as `207e898 Make package runtime-first proof verifier`.
- Generic outcome helper API added: `deriveOutcome({ entropyHash, spec, derivers })` and `verifyOutcome({ entropyHash, outcome, outcomeDerivers })`.
- `verifyFairnessProof()` now reuses the outcome helper path and passes outcome params plus a deterministic input hash to caller-supplied derivers.
- Generic anchor evidence validation added: `validateAnchorEvidence({ claimLevel, network, anchors, payloadHashes })`.
- `verifyFairnessProof()` now validates `tn10_tx_anchored` and `mainnet_tx_anchored` proofs with required `commit`, `close`, and `reveal` anchor phases, txid shape checks, network checks, and payload hash consistency checks.
- Guarded TN10 transaction-anchor submission added: `estimateTn10AnchorFee()`, `validateTn10BroadcastPolicy()`, and `submitTn10AnchorTransaction()`.
- TN10 submission is fail-closed behind `testnet-10`, a 64-hex private key, explicit `enableBroadcast`, the acknowledgement phrase, and a fee cap checked against the created transaction summary before signing/submission.
- A new TN10 funding key was generated and persisted under ignored local secrets. Public address: `kaspatest:qplkdw78a8mugpk5q5m7jpa4tvpu8amgygztlp38rqqjje20uvv7vk0xz2yvr`. Private key path: `/root/kaspa-pof-api/local-secrets/tn10-anchor-funded-key/private-key.hex` (`chmod 600`, ignored by `.gitignore`). Do not print the private key.
- The user funded that address and a live guarded TN10 `proof-root` smoke anchor was submitted. Txid: `8bf3489e5cdcc8347d0882b52fe6dc13284dd2399c581e56acc32c78abc4b616`; accepting block hash: `ca45ad4e31752734d9620db161f9c6e242bb8ccf44a6df967f79dc7cc61602e7`.
- Public reusable transaction evidence for that live anchor is stored in `references/live-tn10-proof-root-anchor-evidence.json`. It contains no private key material.
- `validateSubmittedAnchorTransactionEvidence()` now validates submitted-anchor tx evidence shape, TN10 network, phase, txid, accepting block hash, payload hex/JSON, payload schema, payload network/phase consistency, and payload hash binding.
- Submitter hardening added fail-closed classification for Kaspa storage-mass rejection as `KASPA_POF_TN10_STORAGE_MASS_EXCEEDS_MAXIMUM` with a hint to increase `amountSompi` or reduce payload size.
- Formal proof-root-only claim model added as `tn10_proof_root_anchored`, with `computeProofRoot(proof)`, `buildProofRootAnchorPayload(proof)`, package root ESM/CJS/type exports, verifier rules for a single submitted `proof-root` transaction, and fail-closed tests for modified proof data plus payload/network/claim/round/tx/hash mismatches.
- A new live guarded TN10 transaction was submitted with an actual canonical proof-root payload for a full sample proof bundle. Txid: `93d6ac35f170da06d9977ce81be29e0503ac7f46e65a0d32c2f2b7bb0338e3cb`; accepting block hash: `cfb412ec2c0d8cdc3a7de2f6b7f2cc6cc7546dfe73e168776c698b9b40d5ed0b`.
- Public reusable transaction evidence for the canonical proof-root-only demonstration is stored in `references/live-tn10-proof-root-anchored-evidence.json`; the full sample proof that verifies locally is stored in `references/live-tn10-proof-root-anchored-proof.json`. These contain no private key material.

### Proof-root-only task: important clarification

Do not describe “proof-root alone” as complete without the following context.

Current state: `proof-root` is an allowed optional anchor phase, and the package can validate the older live submitted proof-root smoke transaction evidence. The separate `tn10_proof_root_anchored` claim level is now implemented for canonical proof-root-only verification. Current `tn10_tx_anchored` verification still requires the phase anchors `commit`, `close`, and `reveal`.

What “proof-root alone” means in the implemented formal model: one on-chain transaction commits to a canonical, recomputable root of the entire proof bundle, so the verifier can replace separate `commit`/`close`/`reveal` tx anchors with a single binding transaction for the `tn10_proof_root_anchored` claim level.

Implemented as a formal claim model, separate from `tn10_tx_anchored`:

1. Define a canonical proof-root payload schema, e.g. `kaspa-pof-api/proof-root-anchor/v1`.
2. Define `computeProofRoot(proof)` over a stable canonical JSON subset of the proof bundle. Avoid circularity: the root must exclude its own anchor tx evidence.
3. Add `buildProofRootAnchorPayload(proof)` so apps do not invent incompatible root payloads.
4. Extend verifier semantics for the new proof-root-only claim level: a single `proof-root` anchor is sufficient only if the submitted tx payload contains the recomputed proof root and matching network/claim/round metadata.
5. Validate submitted transaction evidence against that payload: txid, accepting block hash, payload hex/JSON/schema, network, phase, payload hash, and proof root.
6. Add tests proving it accepts a matching single proof-root anchor and rejects modified proof data, mismatched root, wrong network/claim/round, malformed tx evidence, and missing submitted payload.
7. New live TN10 transaction submitted with an actual canonical proof-root payload for a sample full proof bundle. The previous live tx remains useful evidence for the broadcast path, but it is not the final proof-root-only demonstration.

### 1. Review and possibly commit current milestone

Status: completed in commit `207e898 Make package runtime-first proof verifier`.

Before further feature work, inspect current diff and decide with the user whether to commit the runtime-first milestone.

Suggested commands:

```bash
git status --short
git diff --stat
npm test
npm run smoke
npm pack --dry-run
```

If committing, use an accurate message such as:

```text
Make package runtime-first proof verifier
```

Only commit if the user asks/agrees.

### 2. Strengthen app-defined outcome API

Status: initial generic helper API completed. Remaining possible follow-up: optional example deriver(s), kept outside package-core assumptions.

`verifyFairnessProof()` supports caller-supplied deterministic outcome derivers and the package now exposes separate ergonomic outcome helpers.

Add generalized helpers without making roulette core:

Potential files:

```text
src/outcome.mjs
src/outcome.cjs
src/outcome.d.ts
test/outcome.test.mjs
test/outcome-cjs.test.cjs
```

Possible API shape to evaluate first:

```js
verifyOutcome({ entropyHash, outcome, outcomeDerivers })
deriveOutcome({ entropyHash, spec, derivers })
```

Keep app-specific derivers optional and external or example-only.

### 3. Strengthen transaction-anchor evidence validation

Status: initial generic validator completed. Remaining possible follow-up: paid fee/policy interfaces and any deeper chain-confirmation/finality checks.

Tx-anchored claim levels are recognized and anchor evidence validation now covers required phases, txid shape, payload hash consistency, network consistency, and fail-closed errors for missing/malformed anchor evidence.

Needed:

- explicit `AnchorEvidence` validator;
- required phases per claim level;
- txid shape validation;
- payload hash consistency checks;
- network consistency checks;
- clear fail-closed errors for missing or malformed anchor evidence.

Potential files:

```text
src/anchoring/evidence.mjs
src/anchoring/evidence.cjs
src/anchoring/evidence.d.ts
test/anchor-evidence.test.mjs
```

Do not add transaction broadcasting as part of this step.

### 4. Add paid feature / fee policy interfaces

Status: initial TN10-only policy and guarded submitter implemented. Mainnet paid anchoring remains design-only.

Needed before any mainnet paid anchoring support:

- fee estimate type/schema;
- fee cap policy;
- explicit acknowledgement flag/schema;
- no hidden default broadcasting;
- clear distinction between building/verifying evidence and submitting transactions.

Potential files:

```text
src/anchoring/policy.mjs
src/anchoring/policy.cjs
src/anchoring/policy.d.ts
docs/MAINNET_ANCHORING.md
test/anchor-policy.test.mjs
```

Implemented files now include `src/anchoring/policy.*`, `src/anchoring/submit.*`, `test/anchor-policy.test.mjs`, `test/anchor-policy-cjs.test.cjs`, and `test/anchor-submit.test.mjs`.

### 5. Decide chain evidence provider/adapters

The runtime currently validates supplied Kaspa block evidence but does not fetch chain data.

Decide whether to add optional evidence provider adapters in this package or keep them separate.

If added, they must return portable evidence for local verification. They must not return trusted success verdicts as proof authority.

### 6. Improve public API docs

Add user-facing examples for:

- commitment + reveal;
- ledger hash;
- entropy derivation;
- local `verifyFairnessProof()`;
- fail-closed behavior;
- claim levels;
- no-spend future entropy vs paid anchoring.

Suggested file:

```text
docs/API.md
```

Then link it from `README.md`.

### 7. Create/adapt new roulette consumer separately

Do not mutate the current deployed roulette app assumption. The next roulette work should be a new cloned/adapted consumer using this package runtime.

The consumer should:

- depend on this package;
- supply or receive proof evidence;
- call `verifyFairnessProof()` locally;
- provide roulette-specific outcome deriver outside package core;
- avoid raw `/v1/*` proof authority flows;
- avoid mock/static result/proof traps.

## Best next step after /new

Recommended first action:

1. Read this file and startup docs:

```text
docs/SESSION_HANDOVER_REMAINING_TASKS.md
docs/HANDOVER_PROMPT.md
docs/ARCHITECTURE.md
docs/PACKAGE_SPEC.md
docs/NEXT_PHASE_PLAN.md
README.md
```

2. Re-run:

```bash
git status --short
npm test
npm run smoke
npm pack --dry-run
```

3. Continue one coherent task at a time. The next production-grade feature candidate is the formal proof-root-only claim model described above (`tn10_proof_root_anchored` or equivalent). The user has said commits can be skipped for a few tasks because several related tasks remain; do not commit unless the user explicitly asks.
