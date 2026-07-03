#!/usr/bin/env bash
set -euo pipefail

PACKAGE_VERSION="${1:-0.1.0-alpha.2}"
export PACKAGE_VERSION
PACKAGE_SPEC="kaspa-pof-api@${PACKAGE_VERSION}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cd "$TMP_DIR"
npm init -y >/dev/null
npm install "$PACKAGE_SPEC" >/dev/null

node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

import * as rootApi from 'kaspa-pof-api';
import * as browserApi from 'kaspa-pof-api/browser';

const require = createRequire(import.meta.url);
const cjsApi = require('kaspa-pof-api');
const packageRoot = path.dirname(path.dirname(require.resolve('kaspa-pof-api')));
const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));

assert.equal(packageJson.name, 'kaspa-pof-api');
assert.equal(packageJson.version, process.env.PACKAGE_VERSION ?? '0.1.0-alpha.2');
assert.ok(packageJson.exports['.'], 'root export must exist');
assert.ok(packageJson.exports['./browser'], 'browser export must exist');
assert.equal(packageJson.exports['./http-client'], undefined, 'legacy HTTP client must not be exported');

const requiredRootFunctions = [
  'hashCommitment',
  'verifyCommitment',
  'hashLedger',
  'verifyLedger',
  'deriveEntropyHash',
  'verifyEntropyHash',
  'deriveOutcome',
  'verifyOutcome',
  'validateClaimLevel',
  'validateKaspaBlockEvidence',
  'validateAnchorEvidence',
  'validateSubmittedAnchorTransactionEvidence',
  'estimateTn10AnchorFee',
  'validateTn10BroadcastPolicy',
  'submitTn10AnchorTransaction',
  'computeProofRoot',
  'buildProofRootAnchorPayload',
  'verifyFairnessProof',
  'verifyProofBundle',
  'verifyProofOfFairness'
];

for (const name of requiredRootFunctions) {
  assert.equal(typeof rootApi[name], 'function', `root missing ${name}`);
  assert.equal(typeof cjsApi[name], 'function', `commonjs root missing ${name}`);
}

for (const name of [
  'hashCommitment',
  'verifyCommitment',
  'hashLedger',
  'verifyLedger',
  'deriveEntropyHash',
  'verifyEntropyHash',
  'deriveOutcome',
  'verifyOutcome',
  'validateClaimLevel',
  'validateKaspaBlockEvidence',
  'validateAnchorEvidence',
  'validateSubmittedAnchorTransactionEvidence',
  'computeProofRoot',
  'buildProofRootAnchorPayload',
  'verifyFairnessProof',
  'verifyProofBundle',
  'verifyProofOfFairness'
]) {
  assert.equal(typeof browserApi[name], 'function', `browser missing ${name}`);
}
assert.equal('submitTn10AnchorTransaction' in browserApi, false, 'browser export must not expose TN10 submitter');
assert.equal('estimateTn10AnchorFee' in browserApi, false, 'browser export must not expose fee estimator');
assert.equal('validateTn10BroadcastPolicy' in browserApi, false, 'browser export must not expose broadcast policy');
assert.equal('createToccataApiClient' in rootApi, false, 'legacy client must not be exported');
assert.equal('ToccataApiClient' in rootApi, false, 'legacy client class must not be exported');
assert.equal('ToccataApiError' in rootApi, false, 'legacy HTTP error must not be exported');

const serverSeed = 'published package external server seed';
const clientSeed = 'published package external client seed';
const entries = [
  { participant: 'alice', input: 'alpha', weight: 2 },
  { participant: 'bob', input: 'beta', weight: 3 }
];
const commitmentHash = rootApi.hashCommitment(serverSeed);
assert.match(commitmentHash, /^[0-9a-f]{64}$/);
assert.equal(rootApi.verifyCommitment({ serverSeed, commitment: commitmentHash }).ok, true);
assert.equal(rootApi.verifyCommitment({ serverSeed: `${serverSeed}-wrong`, commitment: commitmentHash }).ok, false);

const ledgerHash = rootApi.hashLedger(entries);
assert.match(ledgerHash, /^[0-9a-f]{64}$/);
assert.equal(rootApi.verifyLedger({ entries, ledgerHash }).ok, true);
assert.equal(rootApi.verifyLedger({ entries: entries.slice(0, 1), ledgerHash }).ok, false);

const block = {
  networkId: 'testnet-10',
  blockHash: '0'.repeat(63) + '7',
  daaScore: '9001',
  blueScore: '12001'
};
const entropy = rootApi.deriveEntropyHash({
  roundId: 'published-package-smoke-round',
  commitment: commitmentHash,
  clientSeed,
  ledgerHash,
  blockEvidence: block
});
assert.match(entropy.entropyHash, /^[0-9a-f]{64}$/);
assert.equal(rootApi.verifyEntropyHash({
  roundId: 'published-package-smoke-round',
  commitment: commitmentHash,
  clientSeed,
  ledgerHash,
  blockEvidence: block,
  entropyHash: entropy.entropyHash,
  source: entropy.source
}).ok, true);

assert.equal(rootApi.validateClaimLevel('tn10_future_entropy').ok, true);
assert.equal(rootApi.validateClaimLevel('not-a-claim').ok, false);
assert.equal(rootApi.validateKaspaBlockEvidence({
  claimLevel: 'tn10_future_entropy',
  network: { networkId: 'testnet-10' },
  target: { metric: 'daaScore', score: '9000' },
  block
}).ok, true);
assert.equal(rootApi.validateKaspaBlockEvidence({
  claimLevel: 'tn10_future_entropy',
  network: { networkId: 'mainnet' },
  target: { metric: 'daaScore', score: '9000' },
  block
}).ok, false);

const outcomeSpec = { deriver: 'external-demo:mod-v1', params: { modulo: 37 } };
const outcomeDerivers = {
  'external-demo:mod-v1': ({ entropyHash, params }) => ({
    value: Number(BigInt(`0x${entropyHash.slice(0, 12)}`) % BigInt(params.modulo))
  })
};
const outcome = { ...rootApi.deriveOutcome({ entropyHash: entropy.entropyHash, spec: outcomeSpec, derivers: outcomeDerivers }), params: outcomeSpec.params };
assert.equal(rootApi.verifyOutcome({ entropyHash: entropy.entropyHash, outcome, outcomeDerivers }).ok, true);
assert.equal(rootApi.verifyOutcome({ entropyHash: entropy.entropyHash, outcome: { ...outcome, result: { value: -1 } }, outcomeDerivers }).ok, false);

const proof = {
  schema: 'kaspa-pof-api/proof/v1',
  claimLevel: 'tn10_future_entropy',
  network: { family: 'kaspa', networkId: 'testnet-10', label: 'kaspa-tn10' },
  round: { roundId: 'published-package-smoke-round', appId: 'published-package-smoke' },
  commitment: { algorithm: 'sha256', serverSeedHash: commitmentHash },
  ledger: { algorithm: 'stable-json-sha256', entries, ledgerHash },
  entropy: {
    algorithm: 'sha256',
    target: { metric: 'daaScore', score: '9000' },
    block,
    entropyHash: entropy.entropyHash,
    source: entropy.source
  },
  reveal: { serverSeed, clientSeed },
  outcome
};
const proofResult = rootApi.verifyFairnessProof(proof, { outcomeDerivers });
assert.equal(proofResult.ok, true, JSON.stringify(proofResult.errors));
assert.equal(rootApi.verifyProofBundle(proof, { outcomeDerivers }).ok, true);
assert.equal(rootApi.verifyProofOfFairness(proof, { outcomeDerivers }).ok, true);
const badProof = structuredClone(proof);
badProof.ledger.entries = [{ participant: 'mallory', input: 'tampered', weight: 99 }];
assert.equal(rootApi.verifyFairnessProof(badProof, { outcomeDerivers }).ok, false);

assert.equal(rootApi.validateAnchorEvidence({
  claimLevel: 'tn10_tx_anchored',
  network: { networkId: 'testnet-10' },
  anchors: [
    { networkId: 'testnet-10', phase: 'commit', txid: '1'.repeat(64) },
    { networkId: 'testnet-10', phase: 'close', txid: '2'.repeat(64) },
    { networkId: 'testnet-10', phase: 'reveal', txid: '3'.repeat(64) }
  ]
}).ok, true);
assert.equal(rootApi.validateAnchorEvidence({
  claimLevel: 'tn10_tx_anchored',
  network: { networkId: 'testnet-10' },
  anchors: [{ networkId: 'testnet-10', phase: 'commit', txid: '1'.repeat(64) }]
}).ok, false);

const feeEstimate = rootApi.estimateTn10AnchorFee({ payloadBytes: 128, priorityFeeSompi: 3n });
assert.equal(feeEstimate.networkId, 'testnet-10');
assert.equal(rootApi.validateTn10BroadcastPolicy({
  networkId: 'testnet-10',
  enableBroadcast: true,
  acknowledgement: rootApi.TN10_BROADCAST_ACKNOWLEDGEMENT,
  privateKeyHex: 'a'.repeat(64),
  feeEstimate,
  feeCapSompi: feeEstimate.estimatedFeeSompi
}).ok, true);
assert.equal(rootApi.validateTn10BroadcastPolicy({
  networkId: 'mainnet',
  enableBroadcast: true,
  acknowledgement: rootApi.TN10_BROADCAST_ACKNOWLEDGEMENT,
  privateKeyHex: 'a'.repeat(64),
  feeEstimate,
  feeCapSompi: feeEstimate.estimatedFeeSompi
}).ok, false);

const liveProofPath = path.join(packageRoot, 'references/live-tn10-proof-root-anchored-proof.json');
const liveEvidencePath = path.join(packageRoot, 'references/live-tn10-proof-root-anchored-evidence.json');
assert.equal(fs.existsSync(liveProofPath), true, 'published live proof reference missing');
assert.equal(fs.existsSync(liveEvidencePath), true, 'published live evidence reference missing');
const liveProof = JSON.parse(fs.readFileSync(liveProofPath, 'utf8'));
const liveEvidence = JSON.parse(fs.readFileSync(liveEvidencePath, 'utf8'));
const liveRoot = rootApi.computeProofRoot(liveProof);
const livePayload = rootApi.buildProofRootAnchorPayload(liveProof);
assert.equal(livePayload.proofRoot, liveRoot);
assert.equal(livePayload.proofRoot, 'b77d54b5c19f57858d714f6cdb34286ea2521541c151e570c583209b48fe42bc');
assert.equal(rootApi.validateSubmittedAnchorTransactionEvidence(liveEvidence).ok, true);
assert.equal(rootApi.verifyFairnessProof(liveProof).ok, true);
const tamperedLiveProof = structuredClone(liveProof);
tamperedLiveProof.round.roundId = `${tamperedLiveProof.round.roundId}-tampered`;
assert.equal(rootApi.verifyFairnessProof(tamperedLiveProof).ok, false);

const wrapper = { schema: 'kaspa-pof-api/anchor-transaction/v1', networkId: 'testnet-10', phase: 'proof-root', payload: livePayload };
const wrapperText = canonicalJson(wrapper);
assert.match(createHash('sha256').update(wrapperText).digest('hex'), /^[0-9a-f]{64}$/);

console.log('KASPA_POF_PUBLISHED_PACKAGE_ID=PASS');
console.log('KASPA_POF_PUBLISHED_EXPORTS=PASS');
console.log('KASPA_POF_PUBLISHED_BROWSER_EXPORT=PASS');
console.log('KASPA_POF_PUBLISHED_CJS_EXPORT=PASS');
console.log('KASPA_POF_PUBLISHED_CORE_PRIMITIVES=PASS');
console.log('KASPA_POF_PUBLISHED_PROOF_VERIFY=PASS');
console.log('KASPA_POF_PUBLISHED_ANCHOR_POLICY=PASS');
console.log('KASPA_POF_PUBLISHED_LIVE_PROOF_ROOT=PASS');
console.log('KASPA_POF_PUBLISHED_FAIL_CLOSED=PASS');
console.log('KASPA_POF_PUBLISHED_SMOKE=PASS');

function canonicalJson(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const type = typeof value;
  if (type === 'string') return JSON.stringify(value);
  if (type === 'boolean') return value ? 'true' : 'false';
  if (type === 'number') return JSON.stringify(value);
  if (type === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  throw new TypeError('non-portable JSON');
}
NODE
