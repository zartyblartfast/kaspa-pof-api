import {
  deriveEntropyHash,
  hashCommitment,
  hashLedger,
  verifyFairnessProof
} from '../../src/index.mjs';

const serverSeed = 'public docs future entropy server seed';
const clientSeed = 'public docs future entropy client seed';
const entries = [
  { participant: 'alice', input: 'A', weight: 1 },
  { participant: 'bob', input: 'B', weight: 2 }
];

const commitment = hashCommitment(serverSeed);
const ledgerHash = hashLedger(entries);
const block = {
  networkId: 'testnet-10',
  blockHash: '00000000000000000000000000000000000000000000000000000000000000aa',
  daaScore: '1002',
  blueScore: '2002'
};
const entropy = deriveEntropyHash({
  roundId: 'docs-future-entropy-round',
  commitment,
  clientSeed,
  ledgerHash,
  blockEvidence: block
});

const proof = {
  schema: 'kaspa-pof-api/proof/v1',
  claimLevel: 'tn10_future_entropy',
  network: { family: 'kaspa', networkId: 'testnet-10', label: 'kaspa-tn10' },
  round: { roundId: 'docs-future-entropy-round', appId: 'docs-example' },
  commitment: { algorithm: 'sha256', serverSeedHash: commitment },
  ledger: { algorithm: 'stable-json-sha256', entries, ledgerHash },
  entropy: {
    algorithm: 'sha256',
    target: { metric: 'daaScore', score: '1000' },
    block,
    entropyHash: entropy.entropyHash,
    source: entropy.source
  },
  reveal: { serverSeed, clientSeed }
};

const result = verifyFairnessProof(proof);
if (!result.ok) {
  throw new Error(`future entropy proof failed: ${JSON.stringify(result.errors)}`);
}

console.log(JSON.stringify({
  ok: true,
  claimLevel: result.claimLevel,
  entropyHash: proof.entropy.entropyHash,
  checks: result.checks.map((check) => check.name)
}, null, 2));
