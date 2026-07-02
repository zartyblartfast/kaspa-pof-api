const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { deriveEntropyHash, hashCommitment, hashLedger, verifyFairnessProof } = require('../src/index.cjs');

describe('commonjs generalized fairness proof verifier export', () => {
  it('exports verifyFairnessProof from the package root', () => {
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

    const result = verifyFairnessProof({
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
      reveal: { serverSeed, clientSeed }
    });

    assert.equal(result.ok, true);
    assert.equal(typeof verifyFairnessProof, 'function');
  });
});
