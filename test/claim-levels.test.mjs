import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CLAIM_LEVELS,
  isKnownClaimLevel,
  validateClaimLevel
} from '../src/index.mjs';

describe('claim level primitives', () => {
  it('exports the documented claim levels in stable order', () => {
    assert.deepEqual(CLAIM_LEVELS, [
      'local_bundle_only',
      'tn10_future_entropy',
      'mainnet_future_entropy',
      'tn10_tx_anchored',
      'mainnet_tx_anchored'
    ]);
  });

  it('recognizes known claim levels', () => {
    assert.equal(isKnownClaimLevel('tn10_future_entropy'), true);
    assert.equal(isKnownClaimLevel('unknown_claim'), false);
  });

  it('validateClaimLevel fails closed for unknown claim levels', () => {
    assert.deepEqual(validateClaimLevel('unknown_claim'), {
      ok: false,
      code: 'KASPA_POF_UNKNOWN_CLAIM_LEVEL',
      message: 'Unknown claim level: unknown_claim'
    });
  });
});
