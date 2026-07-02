const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { validateAnchorEvidence } = require('../src/index.cjs');

const payloadHashes = {
  commit: '1'.repeat(64),
  close: '2'.repeat(64),
  reveal: '3'.repeat(64)
};

describe('commonjs anchor evidence exports', () => {
  it('exports transaction anchor evidence validation from the package root', () => {
    const result = validateAnchorEvidence({
      claimLevel: 'tn10_tx_anchored',
      network: { networkId: 'testnet-10' },
      payloadHashes,
      anchors: [
        { networkId: 'testnet-10', phase: 'commit', txid: 'a'.repeat(64), payloadHash: payloadHashes.commit },
        { networkId: 'testnet-10', phase: 'close', txid: 'b'.repeat(64), payloadHash: payloadHashes.close },
        { networkId: 'testnet-10', phase: 'reveal', txid: 'c'.repeat(64), payloadHash: payloadHashes.reveal }
      ]
    });

    assert.equal(result.ok, true);
    assert.equal(typeof validateAnchorEvidence, 'function');
  });
});
