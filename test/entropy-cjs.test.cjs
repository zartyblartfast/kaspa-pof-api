const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { describe, it } = require('node:test');

const { deriveEntropyHash, verifyEntropyHash } = require('../src/index.cjs');

const entropyInput = {
  roundId: 'round-cjs-001',
  commitment: 'de2f256efc6b6ac991f3837e7d2f7d7d47c40000000000000000000000000000',
  clientSeed: 'client-seed-cjs-001',
  ledgerHash: 'a058ff5d83db878511b3ec2491d80e5a79bc32e01c922bde75e9d56cc933665b',
  blockEvidence: {
    blockHash: '000000000000000000000000000000000000000000000000000000000000dcba',
    daaScore: '234567890',
    blueScore: '876543210'
  }
};
const expectedPreimage = `${entropyInput.roundId}|${entropyInput.commitment}|${entropyInput.clientSeed}|${entropyInput.ledgerHash}|${entropyInput.blockEvidence.blockHash}|${entropyInput.blockEvidence.daaScore}|${entropyInput.blockEvidence.blueScore}`;
const expectedEntropyHash = createHash('sha256').update(expectedPreimage, 'utf8').digest('hex');

describe('commonjs entropy exports', () => {
  it('exports deterministic entropy primitives from the package root', () => {
    assert.equal(typeof deriveEntropyHash, 'function');
    assert.equal(deriveEntropyHash(entropyInput).entropyHash, expectedEntropyHash);
    assert.equal(verifyEntropyHash({ ...entropyInput, entropyHash: expectedEntropyHash }).ok, true);
  });
});
