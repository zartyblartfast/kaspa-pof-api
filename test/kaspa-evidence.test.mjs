import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validateKaspaBlockEvidence } from '../src/index.mjs';

const validTn10Evidence = {
  claimLevel: 'tn10_future_entropy',
  network: { family: 'kaspa', networkId: 'testnet-10', label: 'kaspa-tn10' },
  target: { metric: 'daaScore', score: '1000' },
  block: {
    networkId: 'testnet-10',
    blockHash: '000000000000000000000000000000000000000000000000000000000000abcd',
    daaScore: '1001',
    blueScore: '2001'
  }
};

describe('Kaspa block evidence validation', () => {
  it('accepts TN10 future-entropy evidence when network matches and block score reaches the target', () => {
    assert.deepEqual(validateKaspaBlockEvidence(validTn10Evidence), {
      ok: true,
      claimLevel: 'tn10_future_entropy',
      networkId: 'testnet-10',
      targetMetric: 'daaScore',
      targetScore: '1000',
      blockScore: '1001'
    });
  });

  it('accepts mainnet future-entropy evidence on mainnet', () => {
    const result = validateKaspaBlockEvidence({
      claimLevel: 'mainnet_future_entropy',
      network: { family: 'kaspa', networkId: 'mainnet', label: 'kaspa-mainnet' },
      target: { metric: 'blueScore', score: '2000' },
      block: {
        networkId: 'mainnet',
        blockHash: '000000000000000000000000000000000000000000000000000000000000dcba',
        daaScore: '1001',
        blueScore: '2000'
      }
    });

    assert.equal(result.ok, true);
    assert.equal(result.claimLevel, 'mainnet_future_entropy');
    assert.equal(result.networkId, 'mainnet');
    assert.equal(result.targetMetric, 'blueScore');
  });

  it('accepts TN10 transaction-anchored claim levels with matching block evidence', () => {
    const result = validateKaspaBlockEvidence({
      ...validTn10Evidence,
      claimLevel: 'tn10_tx_anchored'
    });

    assert.equal(result.ok, true);
    assert.equal(result.claimLevel, 'tn10_tx_anchored');
  });

  it('fails closed for network mismatch', () => {
    const result = validateKaspaBlockEvidence({
      ...validTn10Evidence,
      block: { ...validTn10Evidence.block, networkId: 'mainnet' }
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_NETWORK_MISMATCH');
  });

  it('fails closed when block score is before the target', () => {
    const result = validateKaspaBlockEvidence({
      ...validTn10Evidence,
      block: { ...validTn10Evidence.block, daaScore: '999' }
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_BLOCK_BEFORE_TARGET');
  });

  it('fails closed for malformed block hash evidence', () => {
    const result = validateKaspaBlockEvidence({
      ...validTn10Evidence,
      block: { ...validTn10Evidence.block, blockHash: '' }
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_BLOCK_HASH_MISSING');
  });

  it('fails closed when claim level and network are inconsistent', () => {
    const result = validateKaspaBlockEvidence({
      ...validTn10Evidence,
      claimLevel: 'mainnet_future_entropy'
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_CLAIM_NETWORK_MISMATCH');
  });
});
