const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { describe, it } = require('node:test');

const { deriveOutcome, verifyOutcome } = require('../src/index.cjs');

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

describe('commonjs outcome helper exports', () => {
  it('exports deterministic outcome helpers from the package root', () => {
    assert.deepEqual(deriveOutcome({ entropyHash, spec, derivers }), {
      deriver: 'example:modulo',
      inputHash: expectedInputHash,
      result: { value: 5 }
    });

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
  });
});
