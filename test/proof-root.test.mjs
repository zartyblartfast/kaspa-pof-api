import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import {
  buildProofRootAnchorPayload,
  computeProofRoot,
  deriveEntropyHash,
  hashCommitment,
  hashLedger,
  verifyFairnessProof
} from '../src/index.mjs';

const TXID = '1'.repeat(64);
const ACCEPTING_BLOCK_HASH = '2'.repeat(64);

function buildFutureEntropyProof(overrides = {}) {
  const serverSeed = 'proof root server seed';
  const clientSeed = 'proof root client seed';
  const entries = [
    { participant: 'alice', input: 'red', amount: 5 },
    { participant: 'bob', input: 'black', amount: 3 }
  ];
  const commitmentHash = hashCommitment(serverSeed);
  const ledgerHash = hashLedger(entries);
  const block = {
    networkId: 'testnet-10',
    blockHash: '000000000000000000000000000000000000000000000000000000000000beef',
    daaScore: '5002',
    blueScore: '7002'
  };
  const entropy = deriveEntropyHash({
    roundId: 'proof-root-round-001',
    commitment: commitmentHash,
    clientSeed,
    ledgerHash,
    blockEvidence: block
  });

  return deepMerge({
    schema: 'kaspa-pof-api/proof/v1',
    claimLevel: 'tn10_future_entropy',
    network: { family: 'kaspa', networkId: 'testnet-10', label: 'kaspa-tn10' },
    round: { roundId: 'proof-root-round-001', appId: 'proof-root-test-app' },
    commitment: { algorithm: 'sha256', serverSeedHash: commitmentHash },
    ledger: { algorithm: 'stable-json-sha256', entries, ledgerHash },
    entropy: {
      algorithm: 'sha256',
      target: { metric: 'daaScore', score: '5000' },
      block,
      entropyHash: entropy.entropyHash,
      source: entropy.source
    },
    reveal: { serverSeed, clientSeed }
  }, overrides);
}

function buildProofRootClaim(overrides = {}) {
  const proof = buildFutureEntropyProof({ claimLevel: 'tn10_proof_root_anchored' });
  const payload = buildProofRootAnchorPayload(proof);
  const wrapper = { schema: 'kaspa-pof-api/anchor-transaction/v1', networkId: 'testnet-10', phase: 'proof-root', payload };
  const payloadText = canonicalJson(wrapper);
  const payloadHex = Buffer.from(payloadText, 'utf8').toString('hex');
  proof.anchors = [{
    networkId: 'testnet-10',
    phase: 'proof-root',
    txid: TXID,
    acceptingBlockHash: ACCEPTING_BLOCK_HASH,
    payloadHash: sha256Hex(payloadText),
    submittedTransactionEvidence: {
      networkId: 'testnet-10',
      phase: 'proof-root',
      txid: TXID,
      acceptingBlockHash: ACCEPTING_BLOCK_HASH,
      payloadHex
    }
  }];
  return deepMerge(proof, overrides);
}

describe('formal TN10 proof-root anchored claim model', () => {
  it('computes a stable proof root that excludes proof-root anchor transaction evidence', () => {
    const proof = buildFutureEntropyProof({ claimLevel: 'tn10_proof_root_anchored' });
    const rootWithoutAnchor = computeProofRoot(proof);

    proof.anchors = [{
      networkId: 'testnet-10',
      phase: 'proof-root',
      txid: TXID,
      acceptingBlockHash: ACCEPTING_BLOCK_HASH,
      payloadHash: 'a'.repeat(64),
      submittedTransactionEvidence: { payloadHex: '7b7d' }
    }];

    assert.match(rootWithoutAnchor, /^[0-9a-f]{64}$/);
    assert.equal(computeProofRoot(proof), rootWithoutAnchor);
  });

  it('builds a canonical proof-root anchor payload with network, claim, round, proof schema and root', () => {
    const proof = buildFutureEntropyProof({ claimLevel: 'tn10_proof_root_anchored' });
    const payload = buildProofRootAnchorPayload(proof);

    assert.deepEqual(payload, {
      schema: 'kaspa-pof-api/proof-root-anchor/v1',
      proofRootAlgorithm: 'stable-json-sha256',
      proofRoot: computeProofRoot(proof),
      proofSchema: 'kaspa-pof-api/proof/v1',
      networkId: 'testnet-10',
      claimLevel: 'tn10_proof_root_anchored',
      roundId: 'proof-root-round-001'
    });
  });

  it('verifies a TN10 proof-root anchored proof with one submitted proof-root transaction', () => {
    const result = verifyFairnessProof(buildProofRootClaim());

    assert.equal(result.ok, true);
    assert.equal(result.claimLevel, 'tn10_proof_root_anchored');
    assert.equal(result.checks.find((check) => check.name === 'proofRootAnchor').ok, true);
  });

  it('rejects modified proof data because the recomputed proof root no longer matches the submitted transaction payload', () => {
    const result = verifyFairnessProof(buildProofRootClaim({ ledger: { entries: [{ participant: 'mallory', input: 'green', amount: 99 }] } }));

    assert.equal(result.ok, false);
    assert.equal(result.errors.some((error) => error.code === 'KASPA_POF_PROOF_ROOT_MISMATCH'), true);
  });

  it('rejects proof-root payloads with mismatched network, claim, round, tx or payload hash binding', () => {
    const wrongNetwork = buildProofRootClaim();
    replacePayload(wrongNetwork, { networkId: 'mainnet' });
    assert.equal(errorCodes(wrongNetwork).includes('KASPA_POF_PROOF_ROOT_PAYLOAD_NETWORK_MISMATCH'), true);

    const wrongClaim = buildProofRootClaim();
    replacePayload(wrongClaim, { claimLevel: 'tn10_future_entropy' });
    assert.equal(errorCodes(wrongClaim).includes('KASPA_POF_PROOF_ROOT_PAYLOAD_CLAIM_MISMATCH'), true);

    const wrongRound = buildProofRootClaim();
    replacePayload(wrongRound, { roundId: 'other-round' });
    assert.equal(errorCodes(wrongRound).includes('KASPA_POF_PROOF_ROOT_PAYLOAD_ROUND_MISMATCH'), true);

    const wrongTx = buildProofRootClaim();
    wrongTx.anchors[0].submittedTransactionEvidence.txid = '3'.repeat(64);
    assert.equal(errorCodes(wrongTx).includes('KASPA_POF_PROOF_ROOT_TXID_MISMATCH'), true);

    const wrongHash = buildProofRootClaim();
    wrongHash.anchors[0].payloadHash = '4'.repeat(64);
    assert.equal(errorCodes(wrongHash).includes('KASPA_POF_PROOF_ROOT_PAYLOAD_HASH_MISMATCH'), true);
  });

  it('fails closed when proof-root submitted transaction evidence is missing or malformed', () => {
    const missingEvidence = buildProofRootClaim();
    delete missingEvidence.anchors[0].submittedTransactionEvidence;
    assert.equal(errorCodes(missingEvidence).includes('KASPA_POF_PROOF_ROOT_SUBMITTED_EVIDENCE_MISSING'), true);

    const malformedEvidence = buildProofRootClaim();
    malformedEvidence.anchors[0].submittedTransactionEvidence.payloadHex = 'not-hex';
    assert.equal(errorCodes(malformedEvidence).includes('KASPA_POF_ANCHOR_TRANSACTION_PAYLOAD_INVALID'), true);
  });
});

function replacePayload(proof, replacement) {
  const evidence = proof.anchors[0].submittedTransactionEvidence;
  const wrapper = JSON.parse(Buffer.from(evidence.payloadHex, 'hex').toString('utf8'));
  wrapper.payload = { ...wrapper.payload, ...replacement };
  const payloadText = canonicalJson(wrapper);
  proof.anchors[0].payloadHash = sha256Hex(payloadText);
  proof.anchors[0].submittedTransactionEvidence.payloadHex = Buffer.from(payloadText, 'utf8').toString('hex');
}

function errorCodes(proof) {
  return verifyFairnessProof(proof).errors.map((error) => error.code);
}

function sha256Hex(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function canonicalJson(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const type = typeof value;
  if (type === 'string') return JSON.stringify(value);
  if (type === 'boolean') return value ? 'true' : 'false';
  if (type === 'number') return JSON.stringify(value);
  if (type === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  throw new TypeError('non-portable JSON');
}

function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) return override === undefined ? base : override;
  if (!base || typeof base !== 'object' || !override || typeof override !== 'object') {
    return override === undefined ? base : override;
  }
  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    merged[key] = deepMerge(base[key], value);
  }
  return merged;
}
