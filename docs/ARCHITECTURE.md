# Architecture Direction

## Decision

Use `kaspa-pof-api` as the general-purpose npm proof-of-fairness package foundation.

Roulette is an example consumer, not the package source of truth. The current deployed roulette app remains on the old npm API plus its own VPS node/server. A new roulette consumer should be cloned/adapted separately to use this package runtime model.

## Why fresh repo

The prior `kaspa-toccata-api` repo proved useful live TN10 behavior but centered the implementation around a Node HTTP service. That made the npm package mostly an HTTP client and created a trust problem for a proof-of-fairness architecture.

The new repo should avoid inheriting that architecture as the default.

## Target trust model

The fairness verifier/runtime should live in the npm package wherever practical.

A service may provide data or convenience, but the service should not be the proof authority.

```text
browser/app/server gets proof evidence
        ↓
kaspa-pof-api verifies proof locally
        ↓
app displays claim level and verification result
```

## Layers

### Core package layer

Reusable, app-agnostic modules:

- commitments
- generic input ledger hashes
- future entropy targets
- Kaspa/TN10/mainnet evidence schemas
- entropy derivation
- app-defined outcome derivation helpers
- proof bundle construction
- proof verification
- claim-level validation
- outcome derivation hooks
- optional tx anchor payload builders
- tx anchor evidence validators
- submitted tx anchor evidence validators
- optional fee estimation helpers
- explicit TN10-only tx anchor submitter guarded by fee cap and acknowledgement

### Consumer app layer

A roulette consumer may contain roulette-specific UI and outcome mapping:

- table rendering
- chip placement
- roulette result display
- proof status presentation

It should import `kaspa-pof-api` like an external app developer would. The package must not depend on roulette-specific files or assumptions.

### Optional service layer

A VPS/Node/Python/Vercel service can remain useful for:

- hosting demos
- storing proof bundles
- persistence/session coordination
- rate limits/auth/admin
- optional transaction submission
- optional HTTP adapter for developers who prefer hosted APIs

But it should not be required to independently verify fairness.

The package may expose explicit TN10 transaction-anchor submission helpers because TN10 spends testnet funds and is useful for proof-of-fairness anchoring. That path must remain opt-in and fail closed unless the caller supplies a TN10 private key, explicit broadcast enablement, the acknowledgement phrase, and a fee cap that covers the created transaction summary. No mainnet submitter exists in the package.

## Claim levels to design

Initial claim levels should distinguish cost/trust tradeoffs clearly:

```text
local_bundle_only
  commitment/ledger/reveal replay only; no chain evidence.

tn10_future_entropy
  no-spend TN10 future block entropy; read-only chain evidence.

mainnet_future_entropy
  no-spend Kaspa mainnet future block entropy; read-only chain evidence.

tn10_tx_anchored
  commit/close/reveal or compact anchors written to TN10; spends testnet funds.

tn10_proof_root_anchored
  one TN10 transaction commits to a canonical, recomputable root of the full proof bundle. This is a formal claim level with proof-root payload schema and verifier rules, not a loose interpretation of the optional proof-root phase.

mainnet_tx_anchored
  optional paid mainnet anchoring; spends real KAS; must be explicitly enabled and fee-capped.
```

## Mainnet cost policy

Mainnet should default to read-only future entropy and local verification.

Transaction anchoring should be optional and should expose before-submit estimates:

```json
{
  "network": "kaspa-mainnet",
  "transactionCount": 3,
  "estimatedFeeSompi": "...",
  "estimatedFeeKas": "...",
  "payloadBytes": 0,
  "transactionMass": 0,
  "feeRate": 0
}
```

No mainnet write path should exist without explicit gates, fee caps, and clear user/operator acknowledgement.

## Migration principle

Do not copy the old `src/server.cjs` wholesale.

Extract or rewrite pure functions first:

1. hash commitments;
2. hash generic ledgers;
3. derive entropy from chain evidence;
4. derive/replay outcomes;
5. verify proof bundles.

Then wrap those functions with optional adapters.
