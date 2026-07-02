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
validateClaimLevel()
validateKaspaBlockEvidence()
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

Last verification commands run after docs and HTTP cleanup:

```bash
npm test
npm run smoke
npm pack --dry-run
```

Results:

```text
npm test: PASS
37 tests
11 suites
0 failures

npm run smoke: PASS
KASPA_POF_REQUIRED_FILES=PASS
KASPA_POF_ROULETTE_JS_SYNTAX=PASS
KASPA_POF_PACKAGE_IMPORT=PASS
KASPA_POF_COMMITMENT_VERIFY=PASS
KASPA_POF_LEDGER_HASH=PASS
KASPA_POF_ENTROPY_DERIVE=PASS
KASPA_POF_KASPA_EVIDENCE_VALIDATE=PASS
KASPA_POF_PROOF_VERIFY_LOCAL=PASS
KASPA_POF_PACKAGE_METADATA=PASS
KASPA_POF_ROULETTE_IMPORT_WIRING=PASS
KASPA_POF_NO_FIXTURE_TRAPS=PASS
KASPA_POF_SMOKE=PASS

npm pack --dry-run: PASS
29 files
No src/http-client.* files included
```

## Current git status summary

As of this handover, there are many uncommitted changes. Do not assume anything is committed.

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

### 1. Review and possibly commit current milestone

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

Current `verifyFairnessProof()` supports caller-supplied deterministic outcome derivers, but there is no separate ergonomic outcome helper API yet.

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

Current tx-anchored claim levels are recognized, but anchor evidence validation is not production-complete.

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

3. Ask/decide whether to commit the current runtime-first milestone before starting the next production-grade feature.
