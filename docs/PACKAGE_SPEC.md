# Package Specification Draft

## Package purpose

`kaspa-pof-api` is a general-purpose proof-of-fairness package for applications that need deterministic, replayable fairness proofs using Kaspa/TN10/mainnet evidence.

The package should help an app prove statements of this form:

```text
Given a pre-committed hidden server input, fixed user/app inputs, and future Kaspa block evidence, this outcome was derived deterministically and can be independently replayed.
```

## Design requirements

1. App-agnostic by default.
2. Roulette is an example, not a package assumption.
3. Local verification must be possible without trusting a private VPS.
4. No-spend future entropy should be the default proof mode.
5. Paid transaction anchoring should be optional and explicit.
6. Claim levels must be precise and honest.
7. Proof bundles must be portable JSON.
8. Missing or inconsistent proof evidence must fail closed.

## Current roulette example consumer

`examples/roulette-poc/` is an example consumer, not package core. It now demonstrates the intended production trust boundary:

- `examples/roulette-poc/server.cjs` is roulette-specific infrastructure for round creation, hidden server seed custody, chip-ledger locking, live TN10 future-block evidence fetching, bounded WRPC endpoint racing/fallback, SSE diagnostics, JSONL runtime logs, and portable proof-bundle assembly.
- `examples/roulette-poc/app.js` imports `kaspa-pof-api` in the browser and verifies the returned `tn10_future_entropy` proof bundle through `verifyFairnessProof()` with a roulette-specific outcome deriver.
- The server does not expose a trusted proof-verdict endpoint. Any service path is evidence plumbing; the package runtime remains the verifier.

Current gap: the PoC currently maps `kaspa-pof-api` to local repo source at `/src/browser.mjs`. That is acceptable for development, but it is not yet proof that a published npm package artifact is being consumed.


## Terminology

### Commitment

A hash of hidden data fixed before later inputs or entropy are known.

Example:

```text
serverSeedHash = sha256(serverSeed)
```

### Input ledger

A canonical record of app/player inputs that must be fixed before entropy is known.

For roulette, this is the accepted chip/bet list. For another app, it could be any deterministic input set.

### Entropy

Unpredictable future public evidence used as the randomness input. For this project, the main entropy source is a future Kaspa/TN10/mainnet block hash plus related block evidence.

### Reveal

Disclosure of hidden committed data after entropy is fixed.

### Proof bundle

Portable JSON containing enough evidence to replay and verify the fairness claim.

### Claim level

A concise label describing what was proven and what external evidence was used.

## Draft public API

Initial package exports should trend toward this shape:

```js
import {
  hashCommitment,
  verifyCommitment,
  hashLedger,
  deriveEntropyHash,
  deriveOutcome,
  verifyOutcome,
  validateKaspaBlockEvidence,
  validateAnchorEvidence,
  validateSubmittedAnchorTransactionEvidence,
  estimateTn10AnchorFee,
  validateTn10BroadcastPolicy,
  submitTn10AnchorTransaction,
  verifyFairnessProof,
  verifyProofBundle,
  verifyProofOfFairness
} from 'kaspa-pof-api';
```

The root package API is local/runtime-first. It does not export a legacy HTTP client. Any future hosted transport must be a separate adapter that supplies or stores evidence; it must not become the proof authority.

## Data model draft

### ProofBundle

```ts
type ProofBundle = {
  schema: 'kaspa-pof-api/proof/v1';
  claimLevel: ClaimLevel;
  network: NetworkDescriptor;
  round: RoundDescriptor;
  commitment: CommitmentEvidence;
  ledger: LedgerEvidence;
  entropy: EntropyEvidence;
  reveal: RevealEvidence;
  outcome: OutcomeEvidence;
  anchors?: AnchorEvidence[];
};
```

### ClaimLevel

```ts
type ClaimLevel =
  | 'local_bundle_only'
  | 'tn10_future_entropy'
  | 'mainnet_future_entropy'
  | 'tn10_tx_anchored'
  | 'tn10_proof_root_anchored'
  | 'mainnet_tx_anchored';
```

### NetworkDescriptor

```ts
type NetworkDescriptor = {
  family: 'kaspa';
  networkId: 'testnet-10' | 'mainnet' | string;
  label: 'kaspa-tn10' | 'kaspa-mainnet' | string;
};
```

### RoundDescriptor

```ts
type RoundDescriptor = {
  roundId: string;
  appId: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
};
```

### CommitmentEvidence

```ts
type CommitmentEvidence = {
  algorithm: 'sha256';
  serverSeedHash: string;
  committedAt?: string;
};
```

### LedgerEvidence

```ts
type LedgerEvidence = {
  algorithm: 'stable-json-sha256';
  entries: unknown[];
  ledgerHash: string;
  lockedAt?: string;
};
```

### EntropyEvidence

```ts
type EntropyEvidence = {
  algorithm: 'sha256';
  target: EntropyTarget;
  block: KaspaBlockEvidence;
  entropyHash: string;
  source: string;
};
```

### EntropyTarget

```ts
type EntropyTarget = {
  metric: 'daaScore' | 'blueScore';
  score: string;
  offset?: string;
  selectedAt?: string;
};
```

### KaspaBlockEvidence

```ts
type KaspaBlockEvidence = {
  networkId: string;
  blockHash: string;
  daaScore: string;
  blueScore?: string;
  timestamp?: string;
};
```

### RevealEvidence

```ts
type RevealEvidence = {
  serverSeed: string;
  clientSeed?: string;
  revealedAt?: string;
};
```

### OutcomeEvidence

```ts
type OutcomeEvidence = {
  deriver: string;
  inputHash: string;
  result: unknown;
};
```

### Outcome helper API

The package exposes generic outcome helpers without hard-coding roulette or any other app rules:

```ts
deriveOutcome({ entropyHash, spec, derivers })
verifyOutcome({ entropyHash, outcome, outcomeDerivers })
```

`spec.deriver` selects a caller-supplied deterministic deriver, and optional `spec.params` carries app-specific mapping parameters. The helper computes a stable `inputHash` over the entropy hash, deriver name, and params, then compares claimed outcome evidence against the derived result.

### AnchorEvidence

```ts
type AnchorEvidence = {
  networkId: string;
  phase: 'commit' | 'close' | 'reveal' | 'proof-root';
  txid: string;
  payloadHash?: string;
  acceptingBlockHash?: string;
};
```

For `tn10_tx_anchored` and `mainnet_tx_anchored`, the verifier currently requires `commit`, `close`, and `reveal` anchor phases. Each anchor must match the proof network, use a 64-character hex transaction id, and match the expected phase payload hash when the verifier can compute it. `proof-root` is an allowed optional phase. Evidence validation remains separate from transaction submission.

### Submitted anchor transaction evidence

The package also exposes `validateSubmittedAnchorTransactionEvidence()` for public, non-secret transaction evidence captured after a TN10 submission. It validates the submitted transaction's declared network, phase, txid, accepting block hash, payload hex/JSON, anchor payload schema, payload network/phase consistency, and payload hash binding.

Current public live evidence:

```text
references/live-tn10-proof-root-anchor-evidence.json
```

That file records the successful TN10 proof-root smoke anchor txid and accepting block hash without private key material. It proves the submission/evidence-validation path, not a full proof-root-only fairness claim.

### Proof-root-only claim model

`tn10_proof_root_anchored` is implemented as a separate TN10 claim level. It does not weaken `tn10_tx_anchored`: existing `tn10_tx_anchored` proofs still require `commit`, `close`, and `reveal` anchors.

A true proof-root-only model is represented by the explicit claim level:

```ts
type ClaimLevel = 'tn10_proof_root_anchored';
```

That claim means: one on-chain TN10 transaction commits to a canonical, recomputable root of the full proof bundle, and the verifier confirms the supplied proof recomputes to the same root committed by the transaction payload.

Implemented behavior:

1. Canonical payload schema: `kaspa-pof-api/proof-root-anchor/v1`.
2. `computeProofRoot(proof)` hashes a stable canonical JSON proof subset and excludes anchor transaction evidence to avoid circular hashing.
3. `buildProofRootAnchorPayload(proof)` includes `networkId`, `claimLevel`, `roundId`, `proofRoot`, `proofRootAlgorithm`, and proof schema metadata.
4. `verifyFairnessProof()` accepts a single `proof-root` anchor for `tn10_proof_root_anchored` only when submitted transaction evidence decodes to the canonical proof-root payload and the recomputed root matches.
5. Verification rejects modified proof bundles, mismatched payload roots, network/claim/round mismatches, malformed tx evidence, missing submitted payload, txid/accepting-block mismatches, and payload-hash mismatches.
6. Live TN10 canonical proof-root evidence is stored in `references/live-tn10-proof-root-anchored-evidence.json`; the full sample proof that verifies through the package is stored in `references/live-tn10-proof-root-anchored-proof.json`.

### TN10 transaction submission helpers

The package exposes an explicit TN10-only submission path for anchoring payloads with testnet funds:

```ts
estimateTn10AnchorFee({ payloadBytes, priorityFeeSompi })
validateTn10BroadcastPolicy({
  networkId: 'testnet-10',
  enableBroadcast: true,
  acknowledgement: 'I understand this spends TN10 testnet funds',
  privateKeyHex,
  feeEstimate,
  feeCapSompi
})
submitTn10AnchorTransaction({
  phase: 'commit' | 'close' | 'reveal' | 'proof-root',
  payload,
  privateKeyHex,
  amountSompi,
  priorityFeeSompi,
  feeCapSompi,
  enableBroadcast: true,
  acknowledgement: 'I understand this spends TN10 testnet funds'
})
```

The submitter uses a caller-supplied Kaspa wasm kit or `KASPA_WASM_PKG` and creates/signs/submits through TN10 wRPC. It fails closed before signing/submission if the network is not `testnet-10`, the private key shape is invalid, broadcast is not explicitly enabled, the acknowledgement is missing, or the created transaction fee estimate exceeds `feeCapSompi`.

This submitter is for Node/server/operator environments. Browser consumers should not hold private keys or perform spend broadcasts. A service may use the package submitter to produce public anchor transaction evidence, but the consuming app/browser must still verify the returned proof bundle with package runtime APIs.

No mainnet transaction submission helper exists. Mainnet paid anchoring remains design-only until a separate explicit fee/acknowledgement process is agreed.

## Verification rules draft

`verifyProofBundle(proof)` should:

1. Validate required fields for the claim level.
2. Check network ID consistency.
3. Recompute commitment hash from reveal data.
4. Recompute ledger hash from canonical ledger entries.
5. Check entropy target metric and score.
6. Check block evidence score is at or after target.
7. Recompute entropy hash.
8. Recompute outcome using the declared deriver.
9. Compare recomputed outcome to claimed outcome.
10. Validate anchor evidence if the claim level requires anchors.
11. Return a structured result, never just a boolean.

Example result:

```ts
type VerificationResult = {
  ok: boolean;
  claimLevel: ClaimLevel;
  checks: Array<{
    name: string;
    ok: boolean;
    detail?: string;
  }>;
  errors: Array<{
    code: string;
    message: string;
  }>;
};
```

## Error policy

Verification should fail closed.

Examples:

- Missing block hash: fail.
- Network mismatch: fail.
- Unknown claim level: fail.
- Unknown outcome deriver: fail unless caller explicitly supplies it.
- Ledger entry canonicalization mismatch: fail.
- Anchor tx missing for `*_tx_anchored`: fail.
- Missing required anchor phase, malformed txid, network mismatch, or payload hash mismatch: fail.
- TN10 submit without explicit enablement, acknowledgement, private key shape, or fee cap: fail before signing/submission.

## Transport / adapter policy

The package root must remain local/runtime-first. Hosted services may be useful for evidence fetching, storage, app persistence, auth, rate limits, or optional transaction submission, but they must not be required to independently verify a fairness proof.

The old HTTP client migration files have been removed from the package source and exports. If a future HTTP or RPC transport is added, it should be designed as a separate optional adapter after the runtime API is stable, and it should return portable evidence for the local verifier rather than a trusted success verdict.

## Roulette consumer policy

The current deployed roulette app uses the old npm API and its own VPS node/server. It can remain unchanged while this package evolves.

The in-repo `examples/roulette-poc/` consumer should be adapted to use the package like an external developer:

```js
import { verifyProofBundle } from 'kaspa-pof-api';
```

Roulette-specific consumer code may include:

- UI rendering;
- chip placement;
- roulette outcome derivation adapter;
- proof display.

Roulette-specific code must not become required by the core package.

Before calling the PoC an npm API showcase, publish `kaspa-pof-api@0.1.0-alpha.1`, add/verify a browser-safe export such as `kaspa-pof-api/browser`, install/pin the published package under `examples/roulette-poc/`, and serve or bundle that installed package export instead of the repo-root source file.

## Mainnet policy

Mainnet support should begin with no-spend read-only evidence:

```text
mainnet_future_entropy
```

Mainnet transaction anchoring must remain optional and should require:

- explicit enablement;
- fee estimate before submit;
- configurable fee cap;
- operator/user acknowledgement;
- no hidden default broadcasting.

Current package code implements guarded TN10 submission only. It does not implement mainnet submission.

## Compatibility note

There is no root HTTP compatibility export in this package. `createToccataApiClient`, `ToccataApiClient`, and `ToccataApiError` are intentionally absent. Legacy HTTP behavior is reference material only in `/root/kaspa-toccata-api` and copied docs under `references/`.
