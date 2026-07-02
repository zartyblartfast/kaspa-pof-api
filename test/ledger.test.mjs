import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import { hashLedger, verifyLedger } from '../src/index.mjs';

const entries = [
  { selection: 'red', amount: 10, playerId: 'alice' },
  { amount: 5, playerId: 'bob', selection: '17' }
];
const canonicalEntriesJson = '[{"amount":10,"playerId":"alice","selection":"red"},{"amount":5,"playerId":"bob","selection":"17"}]';
const expectedLedgerHash = createHash('sha256').update(canonicalEntriesJson, 'utf8').digest('hex');

describe('ledger primitives', () => {
  it('hashLedger deterministically hashes canonical JSON with sorted object keys', () => {
    assert.equal(hashLedger(entries), expectedLedgerHash);
    assert.equal(
      hashLedger([
        { playerId: 'alice', amount: 10, selection: 'red' },
        { selection: '17', playerId: 'bob', amount: 5 }
      ]),
      expectedLedgerHash
    );
  });

  it('verifyLedger accepts matching entries and ledger hash', () => {
    assert.deepEqual(verifyLedger({ entries, ledgerHash: expectedLedgerHash }), {
      ok: true,
      expected: expectedLedgerHash,
      actual: expectedLedgerHash
    });
  });

  it('verifyLedger fails closed when entries do not match the ledger hash', () => {
    const result = verifyLedger({
      entries: [...entries, { playerId: 'carol', selection: 'black', amount: 2 }],
      ledgerHash: expectedLedgerHash
    });

    assert.equal(result.ok, false);
    assert.equal(result.expected, expectedLedgerHash);
    assert.notEqual(result.actual, expectedLedgerHash);
  });

  it('verifyLedger fails closed when required evidence is missing', () => {
    const result = verifyLedger({ ledgerHash: expectedLedgerHash });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_LEDGER_INPUT_MISSING');
  });

  it('hashLedger rejects non-portable JSON values instead of silently omitting them', () => {
    assert.throws(
      () => hashLedger([{ playerId: 'alice', selection: undefined, amount: 10 }]),
      /entries contain a non-portable JSON value/
    );
  });
});
