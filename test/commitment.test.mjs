import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import { hashCommitment, verifyCommitment } from '../src/index.mjs';

const serverSeed = 'kaspa-pof-api commitment test seed';
const expectedServerSeedHash = createHash('sha256').update(serverSeed, 'utf8').digest('hex');

describe('commitment primitives', () => {
  it('hashCommitment deterministically returns the sha256 hex digest for a server seed', () => {
    assert.equal(hashCommitment(serverSeed), expectedServerSeedHash);
  });

  it('verifyCommitment accepts a matching server seed and commitment hash', () => {
    assert.deepEqual(
      verifyCommitment({ serverSeed, commitment: expectedServerSeedHash }),
      {
        ok: true,
        expected: expectedServerSeedHash,
        actual: expectedServerSeedHash
      }
    );
  });

  it('verifyCommitment fails closed when the server seed does not match the commitment hash', () => {
    const result = verifyCommitment({
      serverSeed: 'different seed',
      commitment: expectedServerSeedHash
    });

    assert.equal(result.ok, false);
    assert.equal(result.expected, expectedServerSeedHash);
    assert.equal(result.actual, createHash('sha256').update('different seed', 'utf8').digest('hex'));
  });

  it('verifyCommitment fails closed when required evidence is missing', () => {
    const result = verifyCommitment({ commitment: expectedServerSeedHash });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_COMMITMENT_INPUT_MISSING');
  });
});
