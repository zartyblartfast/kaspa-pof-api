import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import { hashCommitment, hashLedger, deriveEntropyHash, verifyFairnessProof } from '../src/index.mjs';

function buildProof(overrides = {}) {
  const serverSeed = 'general fairness server seed';
  const clientSeed = 'general fairness client seed';
  const entries = [
    { participant: 'alice', input: 'A', weight: 1 },
    { participant: 'bob', input: 'B', weight: 2 }
  ];
  const commitmentHash = hashCommitment(serverSeed);
  const ledgerHash = hashLedger(entries);
  const block = {
    networkId: 'testnet-10',
    blockHash: '000000000000000000000000000000000000000000000000000000000000abcd',
    daaScore: '1002',
    blueScore: '2002'
  };
  const entropy = deriveEntropyHash({
    roundId: 'general-round-001',
    commitment: commitmentHash,
    clientSeed,
    ledgerHash,
    blockEvidence: block
  });
  const proof = {
    schema: 'kaspa-pof-api/proof/v1',
    claimLevel: 'tn10_future_entropy',
    network: { family: 'kaspa', networkId: 'testnet-10', label: 'kaspa-tn10' },
    round: { roundId: 'general-round-001', appId: 'general-proof-app' },
    commitment: { algorithm: 'sha256', serverSeedHash: commitmentHash },
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

  return deepMerge(proof, overrides);
}

describe('generalized fairness proof verification', () => {
  it('verifies a generic TN10 future-entropy proof without any roulette-specific fields', () => {
    const result = verifyFairnessProof(buildProof());

    assert.equal(result.ok, true);
    assert.equal(result.claimLevel, 'tn10_future_entropy');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(
      result.checks.map((check) => [check.name, check.ok]),
      [
        ['schema', true],
        ['claimLevel', true],
        ['commitment', true],
        ['ledger', true],
        ['kaspaBlockEvidence', true],
        ['entropy', true]
      ]
    );
  });

  it('fails closed and returns structured errors when commitment evidence is inconsistent', () => {
    const result = verifyFairnessProof(buildProof({ reveal: { serverSeed: 'tampered seed' } }));

    assert.equal(result.ok, false);
    assert.equal(result.errors.some((error) => error.code === 'KASPA_POF_COMMITMENT_MISMATCH'), true);
    assert.equal(result.checks.find((check) => check.name === 'commitment').ok, false);
  });

  it('fails closed when ledger evidence is inconsistent', () => {
    const result = verifyFairnessProof(buildProof({ ledger: { entries: [{ participant: 'mallory', input: 'C', weight: 99 }] } }));

    assert.equal(result.ok, false);
    assert.equal(result.errors.some((error) => error.code === 'KASPA_POF_LEDGER_MISMATCH'), true);
  });

  it('fails closed when Kaspa block evidence is before the declared target', () => {
    const result = verifyFairnessProof(buildProof({ entropy: { block: { daaScore: '999' } } }));

    assert.equal(result.ok, false);
    assert.equal(result.errors.some((error) => error.code === 'KASPA_POF_BLOCK_BEFORE_TARGET'), true);
  });

  it('fails closed when entropy evidence is inconsistent', () => {
    const result = verifyFairnessProof(buildProof({ entropy: { entropyHash: '00'.repeat(32) } }));

    assert.equal(result.ok, false);
    assert.equal(result.errors.some((error) => error.code === 'KASPA_POF_ENTROPY_MISMATCH'), true);
  });

  it('fails closed for an unknown proof schema', () => {
    const result = verifyFairnessProof(buildProof({ schema: 'unknown/proof/v1' }));

    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, 'KASPA_POF_UNKNOWN_SCHEMA');
  });

  it('can verify app-defined outcome evidence through a caller supplied deterministic deriver', () => {
    const proof = buildProof();
    const outcomeInputHash = createHash('sha256').update(proof.entropy.entropyHash, 'utf8').digest('hex');
    proof.outcome = {
      deriver: 'example:modulo-10',
      inputHash: outcomeInputHash,
      result: { value: Number(BigInt(`0x${proof.entropy.entropyHash.slice(0, 16)}`) % 10n) }
    };

    const result = verifyFairnessProof(proof, {
      outcomeDerivers: {
        'example:modulo-10': ({ entropyHash }) => ({
          inputHash: createHash('sha256').update(entropyHash, 'utf8').digest('hex'),
          result: { value: Number(BigInt(`0x${entropyHash.slice(0, 16)}`) % 10n) }
        })
      }
    });

    assert.equal(result.ok, true);
    assert.equal(result.checks.find((check) => check.name === 'outcome').ok, true);
  });

  it('passes outcome params and deterministic input hash to proof outcome derivers', () => {
    const proof = buildProof();
    proof.outcome = {
      deriver: 'example:param-modulo',
      params: { modulo: 10 },
      result: { value: Number(BigInt(`0x${proof.entropy.entropyHash.slice(0, 16)}`) % 10n) }
    };

    const result = verifyFairnessProof(proof, {
      outcomeDerivers: {
        'example:param-modulo': ({ entropyHash, params, inputHash }) => {
          assert.equal(params.modulo, 10);
          assert.equal(typeof inputHash, 'string');
          assert.equal(inputHash.length, 64);
          return { value: Number(BigInt(`0x${entropyHash.slice(0, 16)}`) % BigInt(params.modulo)) };
        }
      }
    });

    assert.equal(result.ok, true);
    assert.equal(result.checks.find((check) => check.name === 'outcome').ok, true);
  });

  it('fails closed when outcome evidence exists but no deriver is supplied', () => {
    const result = verifyFairnessProof(buildProof({
      outcome: { deriver: 'missing:deriver', inputHash: 'abc', result: { value: 1 } }
    }));

    assert.equal(result.ok, false);
    assert.equal(result.errors.some((error) => error.code === 'KASPA_POF_UNKNOWN_OUTCOME_DERIVER'), true);
  });

  it('verifies a generic TN10 transaction-anchored proof with required anchor phases', () => {
    const txid = 'a'.repeat(64);
    const proof = buildProof({ claimLevel: 'tn10_tx_anchored' });
    proof.anchors = [
      { networkId: 'testnet-10', phase: 'commit', txid, payloadHash: proof.commitment.serverSeedHash },
      { networkId: 'testnet-10', phase: 'close', txid: 'b'.repeat(64), payloadHash: proof.ledger.ledgerHash },
      { networkId: 'testnet-10', phase: 'reveal', txid: 'c'.repeat(64), payloadHash: createHash('sha256').update('{"clientSeed":"general fairness client seed","serverSeed":"general fairness server seed"}', 'utf8').digest('hex') }
    ];

    const result = verifyFairnessProof(proof);

    assert.equal(result.ok, true);
    assert.equal(result.checks.find((check) => check.name === 'anchors').ok, true);
  });

  it('fails closed for a transaction-anchored proof with mismatched anchor payload evidence', () => {
    const proof = buildProof({ claimLevel: 'tn10_tx_anchored' });
    proof.anchors = [
      { networkId: 'testnet-10', phase: 'commit', txid: 'a'.repeat(64), payloadHash: proof.commitment.serverSeedHash },
      { networkId: 'testnet-10', phase: 'close', txid: 'b'.repeat(64), payloadHash: proof.ledger.ledgerHash },
      { networkId: 'testnet-10', phase: 'reveal', txid: 'c'.repeat(64), payloadHash: '0'.repeat(64) }
    ];

    const result = verifyFairnessProof(proof);

    assert.equal(result.ok, false);
    assert.equal(result.errors.some((error) => error.code === 'KASPA_POF_ANCHOR_PAYLOAD_HASH_MISMATCH'), true);
  });

  it('fails closed without throwing for malformed transaction-anchored proof objects', () => {
    const proof = buildProof({ claimLevel: 'tn10_tx_anchored', anchors: [] });
    delete proof.network;
    delete proof.reveal;

    assert.doesNotThrow(() => verifyFairnessProof(proof));
    const result = verifyFairnessProof(proof);

    assert.equal(result.ok, false);
    assert.equal(result.errors.some((error) => error.code === 'KASPA_POF_NETWORK_ID_MISSING'), true);
    assert.equal(result.errors.some((error) => error.code === 'KASPA_POF_ANCHOR_PAYLOAD_HASHES_INVALID'), true);
  });

  it('fails closed without throwing for malformed proof-root-anchored proof objects', () => {
    const proof = buildProof({ claimLevel: 'tn10_proof_root_anchored', anchors: [{ phase: 'proof-root' }] });
    delete proof.network;
    delete proof.round;

    assert.doesNotThrow(() => verifyFairnessProof(proof));
    const result = verifyFairnessProof(proof);

    assert.equal(result.ok, false);
    assert.equal(result.errors.some((error) => error.code === 'KASPA_POF_NETWORK_ID_MISSING'), true);
    assert.equal(result.errors.some((error) => error.code === 'KASPA_POF_PROOF_ROOT_TXID_INVALID'), true);
  });
});

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
