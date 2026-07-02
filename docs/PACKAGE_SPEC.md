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
  validateKaspaBlockEvidence,
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

### AnchorEvidence

```ts
type AnchorEvidence = {
  networkId: string;
  phase: 'commit' | 'close' | 'reveal' | 'proof-root' | string;
  txid: string;
  payloadHash?: string;
  acceptingBlockHash?: string;
};
```

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

## Transport / adapter policy

The package root must remain local/runtime-first. Hosted services may be useful for evidence fetching, storage, app persistence, auth, rate limits, or optional transaction submission, but they must not be required to independently verify a fairness proof.

The old HTTP client migration files have been removed from the package source and exports. If a future HTTP or RPC transport is added, it should be designed as a separate optional adapter after the runtime API is stable, and it should return portable evidence for the local verifier rather than a trusted success verdict.

## Roulette consumer policy

The current deployed roulette app uses the old npm API and its own VPS node/server. It can remain unchanged while this package evolves.

A new roulette consumer should be cloned/adapted separately and should use the package like an external developer:

```js
import { verifyProofBundle } from 'kaspa-pof-api';
```

Roulette-specific consumer code may include:

- UI rendering;
- chip placement;
- roulette outcome derivation adapter;
- proof display.

Roulette-specific code must not become required by the core package.

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

## Compatibility note

There is no root HTTP compatibility export in this package. `createToccataApiClient`, `ToccataApiClient`, and `ToccataApiError` are intentionally absent. Legacy HTTP behavior is reference material only in `/root/kaspa-toccata-api` and copied docs under `references/`.
