const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { deriveEntropyHash, hashCommitment, hashLedger, verifyFairnessProof } = require('../src/index.cjs');

function buildCjsProof(overrides = {}) {
  const serverSeed = 'cjs proof seed';
  const clientSeed = 'cjs client seed';
  const entries = [{ participant: 'alice', input: 'heads' }];
  const commitment = hashCommitment(serverSeed);
  const ledgerHash = hashLedger(entries);
  const block = {
    networkId: 'testnet-10',
    blockHash: '000000000000000000000000000000000000000000000000000000000000abcd',
    daaScore: '1001',
    blueScore: '2001'
  };
  const { entropyHash, source } = deriveEntropyHash({
    roundId: 'cjs-proof-round',
    commitment,
    clientSeed,
    ledgerHash,
    blockEvidence: block
  });

  return {
    schema: 'kaspa-pof-api/proof/v1',
    claimLevel: 'tn10_future_entropy',
    network: { family: 'kaspa', networkId: 'testnet-10', label: 'kaspa-tn10' },
    round: { roundId: 'cjs-proof-round', appId: 'cjs-proof-app' },
    commitment: { algorithm: 'sha256', serverSeedHash: commitment },
    ledger: { algorithm: 'stable-json-sha256', entries, ledgerHash },
    entropy: {
      algorithm: 'sha256',
      target: { metric: 'daaScore', score: '1000' },
      block,
      entropyHash,
      source
    },
    reveal: { serverSeed, clientSeed },
    ...overrides
  };
}

describe('commonjs generalized fairness proof verifier export', () => {
  it('exports verifyFairnessProof from the package root', () => {
    const result = verifyFairnessProof(buildCjsProof());

    assert.equal(result.ok, true);
    assert.equal(typeof verifyFairnessProof, 'function');
  });

  it('fails closed without throwing for malformed anchored proof objects', () => {
    const txAnchored = buildCjsProof({ claimLevel: 'tn10_tx_anchored', anchors: [] });
    delete txAnchored.network;
    delete txAnchored.reveal;

    assert.doesNotThrow(() => verifyFairnessProof(txAnchored));
    const txResult = verifyFairnessProof(txAnchored);
    assert.equal(txResult.ok, false);
    assert.equal(txResult.errors.some((error) => error.code === 'KASPA_POF_ANCHOR_PAYLOAD_HASHES_INVALID'), true);

    const proofRootAnchored = buildCjsProof({ claimLevel: 'tn10_proof_root_anchored', anchors: [{ phase: 'proof-root' }] });
    delete proofRootAnchored.network;
    delete proofRootAnchored.round;

    assert.doesNotThrow(() => verifyFairnessProof(proofRootAnchored));
    const rootResult = verifyFairnessProof(proofRootAnchored);
    assert.equal(rootResult.ok, false);
    assert.equal(rootResult.errors.some((error) => error.code === 'KASPA_POF_PROOF_ROOT_TXID_INVALID'), true);
  });
});
