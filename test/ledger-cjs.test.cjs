const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { describe, it } = require('node:test');

const { hashLedger, verifyLedger } = require('../src/index.cjs');

const entries = [
  { selection: 'red', amount: 10, playerId: 'alice' },
  { amount: 5, playerId: 'bob', selection: '17' }
];
const canonicalEntriesJson = '[{"amount":10,"playerId":"alice","selection":"red"},{"amount":5,"playerId":"bob","selection":"17"}]';
const expectedLedgerHash = createHash('sha256').update(canonicalEntriesJson, 'utf8').digest('hex');

describe('commonjs ledger exports', () => {
  it('exports deterministic ledger primitives from the package root', () => {
    assert.equal(typeof hashLedger, 'function');
    assert.equal(hashLedger(entries), expectedLedgerHash);
    assert.deepEqual(verifyLedger({ entries, ledgerHash: expectedLedgerHash }), {
      ok: true,
      expected: expectedLedgerHash,
      actual: expectedLedgerHash
    });
  });
});
