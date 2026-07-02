# kaspa-pof-api Runtime API

This package is runtime-first: application code can verify proof-of-fairness evidence locally instead of trusting a private HTTP verifier. Services may still fetch, store, or submit evidence, but they are not the proof authority.

## Import

```js
import {
  hashCommitment,
  hashLedger,
  deriveEntropyHash,
  computeProofRoot,
  buildProofRootAnchorPayload,
  verifyFairnessProof
} from 'kaspa-pof-api';
```

CommonJS consumers can use the same root API through `require('kaspa-pof-api')`.

## Core proof flow

A portable proof bundle records enough evidence to replay the fairness claim:

1. A hidden server input is committed before later inputs or entropy are known.
2. App/player inputs are fixed in a canonical input ledger.
3. Public Kaspa/TN10/mainnet block evidence supplies future entropy.
4. The hidden input is revealed.
5. Optional app-defined outcome evidence is replayed with caller-supplied derivers.
6. The verifier returns structured checks and errors; it does not return a bare boolean.

Verification fails closed on missing, inconsistent, or unknown evidence.

## Claim levels

The current package distinguishes these claim levels:

- `local_bundle_only`: commitment/ledger/reveal replay without chain evidence.
- `tn10_future_entropy`: no-spend TN10 future block entropy evidence.
- `mainnet_future_entropy`: no-spend mainnet future block entropy evidence.
- `tn10_tx_anchored`: TN10 transaction anchoring requiring `commit`, `close`, and `reveal` anchor phases.
- `tn10_proof_root_anchored`: one TN10 `proof-root` transaction commits to a canonical, recomputable root of the full proof bundle.
- `mainnet_tx_anchored`: mainnet paid anchoring claim level; mainnet submission is not implemented.

`tn10_proof_root_anchored` does not weaken `tn10_tx_anchored`. A `tn10_tx_anchored` proof still requires `commit`, `close`, and `reveal` anchors.

## Future-entropy proof example

```js
const serverSeed = 'server secret fixed before the round closes';
const clientSeed = 'client visible input';
const entries = [{ participant: 'alice', input: 'A', weight: 1 }];

const commitment = hashCommitment(serverSeed);
const ledgerHash = hashLedger(entries);
const block = {
  networkId: 'testnet-10',
  blockHash: '0000000000000000000000000000000000000000000000000000000000000001',
  daaScore: '1001',
  blueScore: '2001'
};
const entropy = deriveEntropyHash({
  roundId: 'round-001',
  commitment,
  clientSeed,
  ledgerHash,
  blockEvidence: block
});

const proof = {
  schema: 'kaspa-pof-api/proof/v1',
  claimLevel: 'tn10_future_entropy',
  network: { family: 'kaspa', networkId: 'testnet-10', label: 'kaspa-tn10' },
  round: { roundId: 'round-001', appId: 'example-app' },
  commitment: { algorithm: 'sha256', serverSeedHash: commitment },
  ledger: { algorithm: 'stable-json-sha256', entries, ledgerHash },
  entropy: {
    algorithm: 'sha256',
    target: { metric: 'daaScore', score: '1000' },
    block,
    entropyHash: entropy.entropyHash,
    source: entropy.source
  },
  reveal: { serverSeed, clientSeed }
};

const result = verifyFairnessProof(proof);
if (!result.ok) {
  console.error(result.errors);
}
```

## Proof-root-only TN10 anchor example

Use `tn10_proof_root_anchored` when one TN10 transaction should bind the full proof bundle through a canonical proof root.

```js
const proof = {
  schema: 'kaspa-pof-api/proof/v1',
  claimLevel: 'tn10_proof_root_anchored',
  network: { family: 'kaspa', networkId: 'testnet-10', label: 'kaspa-tn10' },
  round: { roundId: 'round-001', appId: 'example-app' },
  commitment,
  ledger,
  entropy,
  reveal
};

const proofRoot = computeProofRoot(proof);
const anchorPayload = buildProofRootAnchorPayload(proof);
```

`buildProofRootAnchorPayload(proof)` returns a canonical payload shaped like:

```json
{
  "schema": "kaspa-pof-api/proof-root-anchor/v1",
  "proofRootAlgorithm": "stable-json-sha256",
  "proofRoot": "...64 hex chars...",
  "proofSchema": "kaspa-pof-api/proof/v1",
  "networkId": "testnet-10",
  "claimLevel": "tn10_proof_root_anchored",
  "roundId": "round-001"
}
```

The proof root intentionally excludes its own anchor transaction evidence to avoid circular hashing. After a TN10 transaction submits the proof-root payload, attach a `proof-root` anchor containing submitted transaction evidence:

```js
proof.anchors = [{
  networkId: 'testnet-10',
  phase: 'proof-root',
  txid,
  acceptingBlockHash,
  payloadHash,
  submittedTransactionEvidence: {
    networkId: 'testnet-10',
    phase: 'proof-root',
    txid,
    acceptingBlockHash,
    payloadHex,
    payloadHash
  }
}];

const result = verifyFairnessProof(proof);
```

For `tn10_proof_root_anchored`, verification requires:

- exactly one `proof-root` anchor;
- valid submitted TN10 transaction evidence;
- matching txid and accepting block hash;
- payload hash binding to the submitted transaction payload;
- payload schema `kaspa-pof-api/proof-root-anchor/v1`;
- matching proof schema, network id, claim level, round id, and recomputed proof root.

## Live proof-root evidence

Two live TN10 proof-root evidence files are intentionally distinct:

- `references/live-tn10-proof-root-anchor-evidence.json` is the older smoke anchor. It proves guarded TN10 submission and submitted-anchor evidence validation. It is not a canonical root of a full proof bundle.
- `references/live-tn10-proof-root-anchored-evidence.json` and `references/live-tn10-proof-root-anchored-proof.json` are the canonical proof-root-only demonstration for `tn10_proof_root_anchored`.

The canonical proof-root demonstration transaction is:

```text
txid: 93d6ac35f170da06d9977ce81be29e0503ac7f46e65a0d32c2f2b7bb0338e3cb
acceptingBlockHash: cfb412ec2c0d8cdc3a7de2f6b7f2cc6cc7546dfe73e168776c698b9b40d5ed0b
proofRoot: b77d54b5c19f57858d714f6cdb34286ea2521541c151e570c583209b48fe42bc
```

The reference files contain public evidence only. They do not contain private key material.

## Transaction submission boundaries

`submitTn10AnchorTransaction()` is TN10-only and guarded. It requires explicit broadcast enablement, the acknowledgement phrase, a TN10 private key, and a fee cap checked against the created transaction summary before signing/submission.

No mainnet transaction submission helper exists in this package. Mainnet paid anchoring remains future work and must stay explicit, fee-estimated, fee-capped, and acknowledged.
