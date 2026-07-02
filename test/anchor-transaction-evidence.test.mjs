import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { validateSubmittedAnchorTransactionEvidence } from '../src/index.mjs';

const liveProofRootTx = JSON.parse(readFileSync(new URL('../references/live-tn10-proof-root-anchor-evidence.json', import.meta.url), 'utf8'));

liveProofRootTx.payloadHash = createHash('sha256').update(Buffer.from(liveProofRootTx.payloadHex, 'hex').toString('utf8'), 'utf8').digest('hex');

describe('submitted anchor transaction evidence validation', () => {
  it('turns the live TN10 proof-root transaction into reusable validated anchor evidence', () => {
    const result = validateSubmittedAnchorTransactionEvidence(liveProofRootTx);

    assert.equal(result.ok, true);
    assert.equal(result.networkId, 'testnet-10');
    assert.equal(result.phase, 'proof-root');
    assert.equal(result.txid, liveProofRootTx.txid);
    assert.equal(result.acceptingBlockHash, liveProofRootTx.acceptingBlockHash);
    assert.equal(result.payloadHash, liveProofRootTx.payloadHash);
    assert.equal(result.payloadObject.schema, 'kaspa-pof-api/anchor-transaction/v1');
    assert.equal(result.payloadObject.networkId, 'testnet-10');
    assert.equal(result.payloadObject.phase, 'proof-root');
  });

  it('fails closed when the supplied payload hash does not match the decoded transaction payload', () => {
    const result = validateSubmittedAnchorTransactionEvidence({
      ...liveProofRootTx,
      payloadHash: '0'.repeat(64)
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_ANCHOR_TRANSACTION_PAYLOAD_HASH_MISMATCH');
  });
});
