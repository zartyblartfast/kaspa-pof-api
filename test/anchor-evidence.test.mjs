import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import { validateAnchorEvidence } from '../src/index.mjs';

const network = { family: 'kaspa', networkId: 'testnet-10', label: 'kaspa-tn10' };
const validTxid = 'a'.repeat(64);
const commitmentHash = '1'.repeat(64);
const ledgerHash = '2'.repeat(64);
const revealHash = createHash('sha256').update('reveal', 'utf8').digest('hex');
const payloadHashes = { commit: commitmentHash, close: ledgerHash, reveal: revealHash };

function validAnchors(overrides = {}) {
  const anchors = [
    { networkId: 'testnet-10', phase: 'commit', txid: validTxid, payloadHash: commitmentHash },
    { networkId: 'testnet-10', phase: 'close', txid: 'b'.repeat(64), payloadHash: ledgerHash },
    { networkId: 'testnet-10', phase: 'reveal', txid: 'c'.repeat(64), payloadHash: revealHash }
  ];
  return anchors.map((anchor) => ({ ...anchor, ...(overrides[anchor.phase] || {}) }));
}

describe('anchor evidence validation', () => {
  it('accepts required TN10 transaction anchor phases with matching network and payload hashes', () => {
    const result = validateAnchorEvidence({
      claimLevel: 'tn10_tx_anchored',
      network,
      anchors: validAnchors(),
      payloadHashes
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.requiredPhases, ['commit', 'close', 'reveal']);
    assert.deepEqual(result.presentPhases, ['commit', 'close', 'reveal']);
  });

  it('fails closed when a required anchor phase is missing', () => {
    const anchors = validAnchors().filter((anchor) => anchor.phase !== 'close');
    const result = validateAnchorEvidence({ claimLevel: 'tn10_tx_anchored', network, anchors, payloadHashes });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_ANCHOR_PHASE_MISSING');
    assert.equal(result.missingPhase, 'close');
  });

  it('fails closed when an anchor txid is malformed', () => {
    const result = validateAnchorEvidence({
      claimLevel: 'tn10_tx_anchored',
      network,
      anchors: validAnchors({ commit: { txid: 'not-a-txid' } }),
      payloadHashes
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_ANCHOR_TXID_INVALID');
  });

  it('fails closed when an anchor network does not match the proof network', () => {
    const result = validateAnchorEvidence({
      claimLevel: 'tn10_tx_anchored',
      network,
      anchors: validAnchors({ close: { networkId: 'mainnet' } }),
      payloadHashes
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_ANCHOR_NETWORK_MISMATCH');
  });

  it('fails closed when an anchor payload hash does not match the expected phase payload hash', () => {
    const result = validateAnchorEvidence({
      claimLevel: 'tn10_tx_anchored',
      network,
      anchors: validAnchors({ reveal: { payloadHash: '0'.repeat(64) } }),
      payloadHashes
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_ANCHOR_PAYLOAD_HASH_MISMATCH');
    assert.equal(result.phase, 'reveal');
  });

  it('fails closed when mainnet anchors are supplied without mainnet network consistency', () => {
    const result = validateAnchorEvidence({
      claimLevel: 'mainnet_tx_anchored',
      network,
      anchors: validAnchors(),
      payloadHashes
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_CLAIM_NETWORK_MISMATCH');
  });
});
