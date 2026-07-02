# Handover Prompt for New Hermes Profile: kaspa-pof-api

Use this when starting the new Hermes Agent profile for the `kaspa-pof-api` project.

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

The package should be usable by app developers building games or other fairness-sensitive apps. Roulette is only the first example consumer.

## Critical architecture correction

The old `kaspa-toccata-api` project currently has a hybrid architecture:

```text
roulette app imports npm package name
  ↓
npm package client calls HTTP /v1/*
  ↓
Node server owns most live TN10/proof lifecycle logic
```

That is not the desired final architecture for this project.

The new target is:

```text
kaspa-pof-api npm package owns reusable proof/fairness verification/runtime primitives
optional VPS/server/adapters provide convenience only
roulette PoC imports package as an external app would
```

The server must not be the proof authority. Any service may supply evidence, but package/browser/consumer code should be able to verify fairness independently.

## User preferences / constraints

- Avoid mock/offline/static proof/result fixture traps unless explicitly authorized as temporary exceptions.
- Avoid dry-run terminology and paths for Kaspa/Toccata transaction flows.
- Prefer live Kaspa/TN10/mainnet evidence paths and honest claim levels.
- General-purpose package design matters more than roulette-specific shortcuts.
- Do not inherit architecture from prior repos without fresh evidence.
- For UI/product work, do not make unrequested layout changes.
- For commercial/mainnet thinking: no-spend future-entropy verification should be default; paid mainnet anchoring can be optional if explicit, fee-estimated, and fee-capped.

## Current package contents

The package root is runtime-first and exports local proof/fairness primitives. The legacy `src/http-client.*` files have been removed from package source and exports.

Key package modules now include:

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
test/
docs/
references/
```

The root API includes local functions such as `hashCommitment`, `hashLedger`, `deriveEntropyHash`, `deriveOutcome`, `verifyOutcome`, `validateKaspaBlockEvidence`, `validateAnchorEvidence`, `validateSubmittedAnchorTransactionEvidence`, `estimateTn10AnchorFee`, `validateTn10BroadcastPolicy`, `submitTn10AnchorTransaction`, and `verifyFairnessProof` / `verifyProofBundle` / `verifyProofOfFairness`.

The outcome helpers accept caller-supplied deterministic derivers and do not make roulette a package-core assumption.

Transaction-anchor evidence validation is available through `validateAnchorEvidence()`, and `verifyFairnessProof()` uses it for `tn10_tx_anchored` and `mainnet_tx_anchored` proofs. Guarded TN10-only transaction-anchor submission is available through `submitTn10AnchorTransaction()` and fails closed unless explicit testnet-only broadcast gates, acknowledgement, key shape, and fee cap pass. `validateSubmittedAnchorTransactionEvidence()` validates submitted TN10 anchor transaction evidence, including payload hash binding. Mainnet submission is not implemented.

Live TN10 state: a new ignored local key was generated for this repo. Public address: `kaspatest:qplkdw78a8mugpk5q5m7jpa4tvpu8amgygztlp38rqqjje20uvv7vk0xz2yvr`. Private key path: `/root/kaspa-pof-api/local-secrets/tn10-anchor-funded-key/private-key.hex`; do not print it. The user funded it. A live guarded proof-root smoke anchor was submitted: txid `8bf3489e5cdcc8347d0882b52fe6dc13284dd2399c581e56acc32c78abc4b616`, accepting block `ca45ad4e31752734d9620db161f9c6e242bb8ccf44a6df967f79dc7cc61602e7`. Public non-secret evidence is in `references/live-tn10-proof-root-anchor-evidence.json`.

Important proof-root-only clarification: the older live proof-root transaction in `references/live-tn10-proof-root-anchor-evidence.json` is a smoke anchor proving submission/evidence validation, not a canonical root of a complete fairness proof. Current `tn10_tx_anchored` proofs still require `commit`, `close`, and `reveal` anchors. A formal proof-root-only claim model is now implemented as `tn10_proof_root_anchored`, with `computeProofRoot(proof)`, `buildProofRootAnchorPayload(proof)`, verifier rules that compare the recomputed root to submitted transaction payload evidence, and a live TN10 tx whose payload commits to a full sample proof bundle in `references/live-tn10-proof-root-anchored-evidence.json` / `references/live-tn10-proof-root-anchored-proof.json`.

The copied `examples/roulette-poc/` material is legacy/reference material from the old app lineage. The current deployed roulette app uses the old npm API plus its own VPS node/server and can continue unchanged. A new roulette consumer should be cloned/adapted separately to use this package runtime model.

## Reference repos

Use these as references, not as architecture authorities:

```text
/root/kaspa-toccata-api
/root/kaspa-fair-foundation
```

Important source files in `/root/kaspa-toccata-api`:

```text
src/server.cjs                  # current hybrid server; extract carefully, do not copy wholesale
src/client.mjs|cjs|d.ts          # current npm HTTP client
apps/roulette-poc/               # current roulette PoC
scripts/*smoke.sh                # verification patterns
```

Useful reference docs copied into this repo:

```text
references/kaspa-toccata-api-status.md
references/roulette-poc-status-source.md
references/verify-tn10-transactions-source.md
```

## Suggested first implementation milestones

1. Define package proof bundle schema and claim levels.
2. Extract pure verification primitives:
   - commitment hash and validation;
   - generic input ledger hash;
   - entropy hash derivation;
   - deterministic outcome derivation hooks;
   - proof replay/verification.
3. Add app-defined outcome helper APIs and optional roulette outcome examples without making roulette a package assumption. Generic helpers are implemented; optional roulette examples remain future/separate.
4. Add fuller transaction-anchor payload/evidence validators and fee estimators as higher claim-level support. Anchor evidence validation plus guarded TN10 fee/spend/submission support are implemented; mainnet write paths remain future/design-only.
5. Document paid feature gates clearly: explicit enablement, fee estimate, fee cap, acknowledgement, no hidden broadcasting.
6. Create/adapt a separate new roulette consumer that verifies locally through the package runtime.
7. Only then consider optional transport adapters. Do not reintroduce an HTTP-centered root API.

## Working rule

The package must not depend on roulette.

Roulette must depend on the package.

## Verification baseline

Run:

```bash
npm run smoke
```

The smoke checks package runtime exports, deterministic commitment/ledger/entropy behavior, Kaspa evidence validation, local proof verification, syntax, and fixture-trap guards. `npm test` runs the unit suite.
