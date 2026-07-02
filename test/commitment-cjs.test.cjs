const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { describe, it } = require('node:test');

const { hashCommitment, verifyCommitment } = require('../src/index.cjs');

const serverSeed = 'kaspa-pof-api cjs commitment test seed';
const expectedServerSeedHash = createHash('sha256').update(serverSeed, 'utf8').digest('hex');

describe('commonjs package root', () => {
  it('exports commitment primitives from the package root', () => {
    assert.equal(typeof hashCommitment, 'function');
    assert.equal(hashCommitment(serverSeed), expectedServerSeedHash);
    assert.deepEqual(verifyCommitment({ serverSeed, commitment: expectedServerSeedHash }), {
      ok: true,
      expected: expectedServerSeedHash,
      actual: expectedServerSeedHash
    });
  });

  it('does not export the legacy HTTP client from the package root', () => {
    const api = require('../src/index.cjs');

    assert.equal('createToccataApiClient' in api, false);
    assert.equal('ToccataApiClient' in api, false);
    assert.equal('ToccataApiError' in api, false);
  });
});
