import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validateTn10BroadcastPolicy, estimateTn10AnchorFee } from '../src/index.mjs';

const acknowledgement = 'I understand this spends TN10 testnet funds';

describe('TN10 broadcast policy', () => {
  it('requires explicit enablement, acknowledgement, private key shape, and fee cap before broadcast', () => {
    const result = validateTn10BroadcastPolicy({
      networkId: 'testnet-10',
      enableBroadcast: true,
      acknowledgement,
      privateKeyHex: 'a'.repeat(64),
      feeEstimate: { estimatedFeeSompi: '1000', totalSpendSompi: '1001000' },
      feeCapSompi: '2000'
    });

    assert.equal(result.ok, true);
    assert.equal(result.networkId, 'testnet-10');
    assert.equal(result.feeEstimate.estimatedFeeSompi, '1000');
  });

  it('fails closed when acknowledgement is missing', () => {
    const result = validateTn10BroadcastPolicy({
      networkId: 'testnet-10',
      enableBroadcast: true,
      privateKeyHex: 'a'.repeat(64),
      feeEstimate: { estimatedFeeSompi: '1000' },
      feeCapSompi: '2000'
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_TN10_BROADCAST_ACK_REQUIRED');
  });

  it('fails closed when fee estimate exceeds the explicit fee cap', () => {
    const result = validateTn10BroadcastPolicy({
      networkId: 'testnet-10',
      enableBroadcast: true,
      acknowledgement,
      privateKeyHex: 'a'.repeat(64),
      feeEstimate: { estimatedFeeSompi: '3000' },
      feeCapSompi: '2000'
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_TN10_FEE_CAP_EXCEEDED');
  });

  it('never authorizes mainnet broadcasts through TN10 policy', () => {
    const result = validateTn10BroadcastPolicy({
      networkId: 'mainnet',
      enableBroadcast: true,
      acknowledgement,
      privateKeyHex: 'a'.repeat(64),
      feeEstimate: { estimatedFeeSompi: '1000' },
      feeCapSompi: '2000'
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_TN10_NETWORK_REQUIRED');
  });

  it('estimates a conservative fee shape from payload bytes and priority fee', () => {
    assert.deepEqual(estimateTn10AnchorFee({ payloadBytes: 120, priorityFeeSompi: '500' }), {
      networkId: 'testnet-10',
      estimatedFeeSompi: '22500',
      priorityFeeSompi: '500',
      payloadBytes: 120,
      estimateLevel: 'prebuild_conservative'
    });
  });
});
