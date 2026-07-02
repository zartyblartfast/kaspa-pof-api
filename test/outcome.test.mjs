import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import { deriveOutcome, verifyOutcome } from '../src/index.mjs';

const entropyHash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const spec = { deriver: 'example:modulo', params: { modulo: 10 } };
const expectedInputHash = createHash('sha256')
  .update('{"deriver":"example:modulo","entropyHash":"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef","params":{"modulo":10}}', 'utf8')
  .digest('hex');

const derivers = {
  'example:modulo': ({ entropyHash, params, inputHash }) => {
    assert.equal(inputHash, expectedInputHash);
    return {
      value: Number(BigInt(`0x${entropyHash.slice(0, 16)}`) % BigInt(params.modulo))
    };
  }
};

describe('outcome helpers', () => {
  it('deriveOutcome deterministically applies a caller supplied app deriver', () => {
    const outcome = deriveOutcome({ entropyHash, spec, derivers });

    assert.deepEqual(outcome, {
      deriver: 'example:modulo',
      inputHash: expectedInputHash,
      result: { value: 5 }
    });
  });

  it('verifyOutcome accepts outcome evidence that matches a caller supplied app deriver', () => {
    const result = verifyOutcome({
      entropyHash,
      outcome: {
        deriver: 'example:modulo',
        params: { modulo: 10 },
        inputHash: expectedInputHash,
        result: { value: 5 }
      },
      outcomeDerivers: derivers
    });

    assert.equal(result.ok, true);
    assert.equal(result.deriver, 'example:modulo');
    assert.equal(result.inputHash, expectedInputHash);
    assert.deepEqual(result.actual, { value: 5 });
    assert.deepEqual(result.expected, { value: 5 });
  });

  it('verifyOutcome fails closed for an unknown deriver', () => {
    const result = verifyOutcome({
      entropyHash,
      outcome: { deriver: 'missing:deriver', result: { value: 5 } },
      outcomeDerivers: derivers
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_UNKNOWN_OUTCOME_DERIVER');
  });

  it('verifyOutcome fails closed when claimed outcome result does not match', () => {
    const result = verifyOutcome({
      entropyHash,
      outcome: {
        deriver: 'example:modulo',
        params: { modulo: 10 },
        inputHash: expectedInputHash,
        result: { value: 9 }
      },
      outcomeDerivers: derivers
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_OUTCOME_MISMATCH');
    assert.deepEqual(result.actual, { value: 5 });
    assert.deepEqual(result.expected, { value: 9 });
  });
});
