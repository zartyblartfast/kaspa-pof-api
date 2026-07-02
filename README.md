# kaspa-pof-api

General-purpose proof-of-fairness API package for apps that want to use Kaspa/TN10/mainnet evidence as a public fairness input.

This repo is a fresh start. It is intended to replace the confusing `npm HTTP client + private Node proof service` center of gravity from `kaspa-toccata-api` with a package-first architecture:

```text
kaspa-pof-api npm package = reusable fairness primitives, proof construction, proof verification, entropy/evidence validation
optional service/VPS       = convenience adapter, app persistence, hosting, optional tx submitter
roulette PoC              = example consumer, not the API's source of truth
```

## Current scaffold

This initial commit deliberately contains only a migration basis:

- `src/http-client.mjs|cjs|d.ts` copied from `kaspa-toccata-api` as a legacy HTTP adapter reference.
- `src/index.mjs` currently re-exports that adapter so the copied roulette example can load through the new package name.
- `examples/roulette-poc/` copied from the current roulette PoC and adjusted to import `kaspa-pof-api` through an import map.
- `references/` contains selected source-project docs for migration context.
- `docs/` contains the new target architecture, package specification, next-phase plan, profile setup, and handover notes.

Do not treat the legacy HTTP client as the desired final architecture. It is present so the new repo has a working baseline and a known comparison point while direct package/runtime/verifier APIs are extracted.

## Target package direction

The package should become general-purpose and app-agnostic:

- commitment creation/checking
- input/bet ledger hashing
- future entropy target schemas
- Kaspa/TN10/mainnet evidence validation
- entropy derivation
- result/outcome derivation hooks
- portable proof bundle schemas
- local proof verification
- claim-level handling
- optional transaction anchor payload construction and fee estimation

Roulette-specific UI and game rules belong under `examples/roulette-poc/`.

## Important boundary

The package must not depend on the roulette app.

The roulette app must depend on the package.

## Source repos used as references

- `/root/kaspa-toccata-api`: current working hybrid implementation; use for lifecycle behavior, TN10 evidence work, smoke tests, and roulette PoC migration source.
- `/root/kaspa-fair-foundation`: older foundation/reference repo; use only selectively for UI assets or historical design context.

## First recommended milestones

1. Define portable proof bundle and claim-level docs.
2. Extract pure verification primitives from the old server implementation into package modules.
3. Make the roulette example verify proof locally through `kaspa-pof-api`, not by trusting a service response.
4. Add generic app/outcome hooks so roulette is one example, not a hard-coded package assumption.
5. Add Kaspa/TN10/mainnet evidence validators and no-spend future-entropy claim levels.
6. Add optional transaction anchoring as a higher claim level, with explicit fee estimates before any mainnet write path.
