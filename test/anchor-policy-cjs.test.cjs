const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { TN10_BROADCAST_ACKNOWLEDGEMENT, estimateTn10AnchorFee, validateTn10BroadcastPolicy } = require('../src/index.cjs');

describe('commonjs TN10 broadcast policy exports', () => {
  it('exports explicit TN10 spend/fee policy helpers from the package root', () => {
    const feeEstimate = estimateTn10AnchorFee({ payloadBytes: 1, priorityFeeSompi: '0' });
    const result = validateTn10BroadcastPolicy({
      networkId: 'testnet-10',
      enableBroadcast: true,
      acknowledgement: TN10_BROADCAST_ACKNOWLEDGEMENT,
      privateKeyHex: 'a'.repeat(64),
      feeEstimate,
      feeCapSompi: '20000'
    });

    assert.equal(result.ok, true);
  });
});
