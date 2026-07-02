# kaspa-pof-api

General-purpose proof-of-fairness API package for apps that want to use Kaspa/TN10/mainnet evidence as a public fairness input.

This repo is a fresh start. It is intended to replace the confusing `npm HTTP client + private Node proof service` center of gravity from `kaspa-toccata-api` with a package-first architecture:

```text
kaspa-pof-api npm package = reusable fairness primitives, proof construction, proof verification, entropy/evidence validation
optional service/VPS       = convenience adapter, app persistence, hosting, optional tx submitter
roulette PoC              = example consumer, not the API's source of truth
```

## Current package state

The package root is now runtime-first. It exports local proof-of-fairness primitives instead of a legacy HTTP client:

- commitment hashing and verification;
- canonical input ledger hashing and verification;
- deterministic future-entropy hash derivation;
- app-defined deterministic outcome derivation helpers;
- TN10/mainnet claim-level and Kaspa block-evidence validation;
- transaction-anchor evidence validation for explicit tx-anchored claim levels;
- canonical proof-root-only TN10 claim verification via `tn10_proof_root_anchored`;
- explicit TN10 transaction-anchor spend/fee policy helpers and guarded submission support;
- generalized local proof verification through `verifyFairnessProof()` / `verifyProofBundle()` / `verifyProofOfFairness()`.

The legacy `src/http-client.*` migration files have been removed from the package source and are not exported or published. Historical HTTP/server behavior remains available only through `references/` and the old `/root/kaspa-toccata-api` repo.

See `docs/API.md` for runtime API examples, including `tn10_proof_root_anchored` proof-root verification. See `docs/PUBLISH_READINESS.md` for package contents, npm registry/auth observations, and pre-publish decision points.

`examples/roulette-poc/` is now the in-repo roulette consumer for this package runtime model. It includes a roulette-specific Node server for round orchestration, hidden seed custody, chip-ledger locking, live TN10 evidence fetching, SSE/JSONL diagnostics, and a bounded TN10 WRPC endpoint race for responsive public-node evidence access. The browser imports `kaspa-pof-api` and verifies the returned `tn10_future_entropy` proof bundle with `verifyFairnessProof()`. The server supplies evidence; it is not a proof-authority endpoint. The current deployed roulette app can continue using its old npm API and VPS node/server unchanged.

## Target package direction

The package should become general-purpose and app-agnostic:

- commitment creation/checking
- input/bet ledger hashing
- future entropy target schemas
- Kaspa/TN10/mainnet evidence validation
- entropy derivation
- result/outcome derivation helpers and hooks
- portable proof bundle schemas
- local proof verification
- claim-level handling
- optional transaction anchor payload construction and fee estimation
- explicit TN10 transaction-anchor submission, gated by fee cap and acknowledgement
- transaction anchor evidence validation

Roulette-specific UI and game rules belong in the `examples/roulette-poc/` consumer, not in the package core. That consumer must depend on the package rather than define it.

## Important boundary

The package must not depend on the roulette app.

The roulette app must depend on the package.

## Source repos used as references

- `/root/kaspa-toccata-api`: current working hybrid implementation; use for lifecycle behavior, TN10 evidence work, smoke tests, and roulette PoC migration source.
- `/root/kaspa-fair-foundation`: older foundation/reference repo; use only selectively for UI assets or historical design context.

## First recommended milestones

1. Define portable proof bundle and claim-level docs.
2. Extract pure verification primitives from the old server implementation into package modules.
3. Add stronger app-defined outcome derivation helpers so roulette is one example, not a hard-coded package assumption.
4. Add fuller transaction-anchor evidence validation and fee/spend policy interfaces for paid claim levels.
5. Document the runtime API and publish-readiness checklist.
6. `examples/roulette-poc/` has been adapted into a TN10-backed package-runtime consumer: the example server supplies round/evidence plumbing and the browser verifies through `kaspa-pof-api`, not by trusting a service response.
