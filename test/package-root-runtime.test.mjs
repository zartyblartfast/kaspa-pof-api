import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as api from '../src/index.mjs';

describe('package root runtime API', () => {
  it('exports proof-of-fairness runtime primitives from the root', () => {
    for (const name of [
      'hashCommitment',
      'verifyCommitment',
      'hashLedger',
      'verifyLedger',
      'deriveEntropyHash',
      'verifyEntropyHash',
      'validateKaspaBlockEvidence',
      'verifyFairnessProof'
    ]) {
      assert.equal(typeof api[name], 'function', `${name} should be a root function export`);
    }
  });

  it('does not export the legacy HTTP client from the package root', () => {
    assert.equal('createToccataApiClient' in api, false);
    assert.equal('ToccataApiClient' in api, false);
    assert.equal('ToccataApiError' in api, false);
  });
});
