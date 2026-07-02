# Next Phase Plan: Package-First Proof-of-Fairness API

## Goal

Turn `kaspa-pof-api` from a migration scaffold into a general-purpose npm package whose core value is local, reusable proof-of-fairness verification using Kaspa/TN10/mainnet evidence.

Roulette remains the first example app, but the package must support other apps with similar fairness objectives.

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

The old HTTP `/v1/proofs/verify` service may remain as a comparison/reference path, but it must not be the only proof authority for the PoC.

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
deriveOutcome({ entropyHash, outcomeSpec })
registerOutcomeDeriver(name, fn)
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

## Workstream 5: Update roulette example to use local package verification

Planned files:

```text
examples/roulette-poc/app.js
examples/roulette-poc/index.html
examples/roulette-poc/README.md
```

Expected app flow:

```text
service/client provides round/proof data for now
roulette app calls verifyProofBundle(proof) from kaspa-pof-api
UI displays local verification result
```

Acceptance criteria:

- Roulette no longer relies solely on `/v1/proofs/verify` for proof authority.
- Existing package-name import remains.
- No raw app-level `/v1/*` fetches are added.
- No mock/offline/static result proof path is added.

## Workstream 6: Optional HTTP adapter boundary

Keep HTTP support as an adapter, not the core package.

Planned files:

```text
src/adapters/http-client.mjs
src/adapters/http-client.cjs
```

Current `src/http-client.*` can either move there or be re-exported as legacy compatibility.

Acceptance criteria:

- Core proof modules do not import HTTP adapter.
- HTTP adapter imports package primitives only if needed.
- Docs clearly describe it as optional convenience transport.

## Workstream 7: Mainnet anchoring design only

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

## Verification commands

Baseline:

```bash
npm run smoke
```

After tests are added:

```bash
npm test
```

Expected future smoke markers:

```text
KASPA_POF_PROOF_SCHEMA=PASS
KASPA_POF_COMMITMENT_VERIFY=PASS
KASPA_POF_LEDGER_HASH=PASS
KASPA_POF_ENTROPY_DERIVE=PASS
KASPA_POF_PROOF_VERIFY_LOCAL=PASS
KASPA_POF_ROULETTE_LOCAL_VERIFY=PASS
```

## First implementation sequence

1. Add package test runner and minimal unit test convention.
2. Add `hashCommitment()` with tests.
3. Add `hashLedger()` with tests.
4. Add `deriveEntropyHash()` with tests using explicit inline evidence.
5. Add `verifyProofBundle()` for commitment/ledger/entropy consistency.
6. Add roulette outcome deriver.
7. Update roulette example to call local verification.
8. Move legacy HTTP client under adapter namespace.
9. Document claim levels and mainnet anchoring policy.
10. Commit after each coherent milestone.

## Open questions

- Should browser-local chain evidence fetching be in this phase, or should the service continue to supply block evidence while the package validates it?
- Should roulette outcome derivation be part of the core package or an example plugin?
- What finality depth should `mainnet_future_entropy` require?
- Should the package name published to npm be `kaspa-pof-api`, or should this repo eventually publish scoped packages?
