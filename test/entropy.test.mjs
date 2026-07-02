import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import { deriveEntropyHash, verifyEntropyHash } from '../src/index.mjs';

const entropyInput = {
  roundId: 'round-001',
  commitment: 'de2f256efc6b6ac991f3837e7d2f7d7d47c40000000000000000000000000000',
  clientSeed: 'client-seed-001',
  ledgerHash: 'a058ff5d83db878511b3ec2491d80e5a79bc32e01c922bde75e9d56cc933665b',
  blockEvidence: {
    blockHash: '000000000000000000000000000000000000000000000000000000000000abcd',
    daaScore: '123456789',
    blueScore: '987654321'
  }
};
const expectedSource = 'sha256(roundId|commitment|clientSeed|ledgerHash|blockHash|daaScore|blueScore)';
const expectedPreimage = `${entropyInput.roundId}|${entropyInput.commitment}|${entropyInput.clientSeed}|${entropyInput.ledgerHash}|${entropyInput.blockEvidence.blockHash}|${entropyInput.blockEvidence.daaScore}|${entropyInput.blockEvidence.blueScore}`;
const expectedEntropyHash = createHash('sha256').update(expectedPreimage, 'utf8').digest('hex');

describe('entropy primitives', () => {
  it('deriveEntropyHash deterministically hashes explicit round, ledger, and Kaspa block evidence inputs', () => {
    assert.deepEqual(deriveEntropyHash(entropyInput), {
      entropyHash: expectedEntropyHash,
      source: expectedSource
    });
  });

  it('verifyEntropyHash accepts matching explicit entropy evidence', () => {
    assert.deepEqual(verifyEntropyHash({ ...entropyInput, entropyHash: expectedEntropyHash }), {
      ok: true,
      expected: expectedEntropyHash,
      actual: expectedEntropyHash,
      source: expectedSource
    });
  });

  it('verifyEntropyHash fails closed when entropy evidence does not match', () => {
    const result = verifyEntropyHash({ ...entropyInput, entropyHash: '00'.repeat(32) });

    assert.equal(result.ok, false);
    assert.equal(result.expected, '00'.repeat(32));
    assert.equal(result.actual, expectedEntropyHash);
    assert.equal(result.source, expectedSource);
  });

  it('verifyEntropyHash fails closed when required entropy evidence is missing', () => {
    const result = verifyEntropyHash({ ...entropyInput, blockEvidence: { ...entropyInput.blockEvidence, blockHash: '' }, entropyHash: expectedEntropyHash });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_ENTROPY_INPUT_MISSING');
  });
});
