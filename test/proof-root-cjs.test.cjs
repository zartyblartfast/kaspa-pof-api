const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  buildProofRootAnchorPayload,
  computeProofRoot,
  deriveEntropyHash,
  hashCommitment,
  hashLedger
} = require('../src/index.cjs');

describe('commonjs proof root helpers', () => {
  it('exports proof root helpers from the package root', () => {
    const serverSeed = 'cjs proof root seed';
    const clientSeed = 'cjs proof root client';
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
      roundId: 'cjs-proof-root-round',
      commitment,
      clientSeed,
      ledgerHash,
      blockEvidence: block
    });
    const proof = {
      schema: 'kaspa-pof-api/proof/v1',
      claimLevel: 'tn10_proof_root_anchored',
      network: { family: 'kaspa', networkId: 'testnet-10', label: 'kaspa-tn10' },
      round: { roundId: 'cjs-proof-root-round', appId: 'cjs-proof-root-app' },
      commitment: { algorithm: 'sha256', serverSeedHash: commitment },
      ledger: { algorithm: 'stable-json-sha256', entries, ledgerHash },
      entropy: { algorithm: 'sha256', target: { metric: 'daaScore', score: '1000' }, block, entropyHash, source },
      reveal: { serverSeed, clientSeed }
    };

    const root = computeProofRoot(proof);
    const payload = buildProofRootAnchorPayload(proof);

    assert.match(root, /^[0-9a-f]{64}$/);
    assert.equal(payload.proofRoot, root);
    assert.equal(payload.schema, 'kaspa-pof-api/proof-root-anchor/v1');
  });
});
