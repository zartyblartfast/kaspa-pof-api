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
      'deriveOutcome',
      'computeProofRoot',
      'buildProofRootAnchorPayload',
      'verifyOutcome',
      'validateKaspaBlockEvidence',
      'validateAnchorEvidence',
      'validateSubmittedAnchorTransactionEvidence',
      'validateTn10BroadcastPolicy',
      'submitTn10AnchorTransaction',
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

  it('keeps the root ESM import graph free of Node-only module specifiers', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const submitSource = readFileSync(resolve('src/anchoring/submit.mjs'), 'utf8');

    assert.doesNotMatch(submitSource, /from 'node:/);
  });

  it('exports a browser runtime entrypoint without the Node-only TN10 submitter', async () => {
    const browserApi = await import('../src/browser.mjs');

    assert.equal(typeof browserApi.verifyFairnessProof, 'function');
    assert.equal(typeof browserApi.hashCommitment, 'function');
    assert.equal(typeof browserApi.deriveOutcome, 'function');
    assert.equal('submitTn10AnchorTransaction' in browserApi, false);
  });
});
