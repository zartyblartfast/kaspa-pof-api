#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

pass() { printf '%s=PASS%s\n' "$1" "${2:+ # $2}"; }
fail() { printf '%s=FAIL%s\n' "$1" "${2:+ # $2}"; exit 1; }

for file in \
  package.json \
  README.md \
  docs/API.md \
  docs/ARCHITECTURE.md \
  docs/HANDOVER_PROMPT.md \
  src/commitment.mjs \
  src/commitment.cjs \
  src/commitment.d.ts \
  src/ledger.mjs \
  src/ledger.cjs \
  src/ledger.d.ts \
  src/entropy.mjs \
  src/entropy.cjs \
  src/entropy.d.ts \
  src/outcome.mjs \
  src/outcome.cjs \
  src/outcome.d.ts \
  src/anchoring/evidence.mjs \
  src/anchoring/evidence.cjs \
  src/anchoring/evidence.d.ts \
  src/anchoring/policy.mjs \
  src/anchoring/policy.cjs \
  src/anchoring/policy.d.ts \
  src/anchoring/submit.mjs \
  src/anchoring/submit.cjs \
  src/anchoring/submit.d.ts \
  src/networks/claim-levels.mjs \
  src/networks/claim-levels.cjs \
  src/networks/claim-levels.d.ts \
  src/networks/kaspa-evidence.mjs \
  src/networks/kaspa-evidence.cjs \
  src/networks/kaspa-evidence.d.ts \
  src/proof/root.mjs \
  src/proof/root.cjs \
  src/proof/root.d.ts \
  src/proof/verify.mjs \
  src/proof/verify.cjs \
  src/proof/verify.d.ts \
  src/index.mjs \
  src/index.cjs \
  src/index.d.ts \
  examples/roulette-poc/index.html \
  examples/roulette-poc/app.js \
  examples/roulette-poc/styles.css \
  examples/roulette-poc/flowchart-spec.json \
  examples/roulette-poc/roulette-table-layout.js \
  examples/roulette-poc/roulette-table-renderer.js; do
  [ -f "$file" ] || fail KASPA_POF_REQUIRED_FILE "$file missing"
done
pass KASPA_POF_REQUIRED_FILES

node --check src/commitment.mjs >/dev/null
node --check src/ledger.mjs >/dev/null
node --check src/entropy.mjs >/dev/null
node --check src/outcome.mjs >/dev/null
node --check src/anchoring/evidence.mjs >/dev/null
node --check src/anchoring/policy.mjs >/dev/null
node --check src/anchoring/submit.mjs >/dev/null
node --check src/networks/claim-levels.mjs >/dev/null
node --check src/networks/kaspa-evidence.mjs >/dev/null
node --check src/proof/root.mjs >/dev/null
node --check src/proof/verify.mjs >/dev/null
node --check src/index.mjs >/dev/null
node --check src/commitment.cjs >/dev/null
node --check src/ledger.cjs >/dev/null
node --check src/entropy.cjs >/dev/null
node --check src/outcome.cjs >/dev/null
node --check src/anchoring/evidence.cjs >/dev/null
node --check src/anchoring/policy.cjs >/dev/null
node --check src/anchoring/submit.cjs >/dev/null
node --check src/networks/claim-levels.cjs >/dev/null
node --check src/networks/kaspa-evidence.cjs >/dev/null
node --check src/proof/root.cjs >/dev/null
node --check src/proof/verify.cjs >/dev/null
node --check src/index.cjs >/dev/null
node --check examples/roulette-poc/app.js >/dev/null
node --check examples/roulette-poc/roulette-table-layout.js >/dev/null
node --check examples/roulette-poc/roulette-table-renderer.js >/dev/null
pass KASPA_POF_ROULETTE_JS_SYNTAX

node --input-type=module - <<'NODE'
import * as api from './src/index.mjs';
if (typeof api.verifyFairnessProof !== 'function') throw new Error('verifyFairnessProof export missing');
if (typeof api.hashCommitment !== 'function') throw new Error('hashCommitment export missing');
if (typeof api.deriveOutcome !== 'function') throw new Error('deriveOutcome export missing');
if (typeof api.validateAnchorEvidence !== 'function') throw new Error('validateAnchorEvidence export missing');
if (typeof api.validateSubmittedAnchorTransactionEvidence !== 'function') throw new Error('validateSubmittedAnchorTransactionEvidence export missing');
if (typeof api.validateTn10BroadcastPolicy !== 'function') throw new Error('validateTn10BroadcastPolicy export missing');
if (typeof api.submitTn10AnchorTransaction !== 'function') throw new Error('submitTn10AnchorTransaction export missing');
if (typeof api.computeProofRoot !== 'function') throw new Error('computeProofRoot export missing');
if (typeof api.buildProofRootAnchorPayload !== 'function') throw new Error('buildProofRootAnchorPayload export missing');
if ('createToccataApiClient' in api) throw new Error('legacy HTTP client must not be exported from package root');
NODE
pass KASPA_POF_PACKAGE_IMPORT

node --input-type=module - <<'NODE'
import { hashCommitment, verifyCommitment } from './src/index.mjs';
const hash = hashCommitment('kaspa-pof-api smoke seed');
if (hash !== '982654a7ca3c04ee384abd27dcd566aa97f82ded6696f70bc3583a29d617ba60') throw new Error(`unexpected commitment hash ${hash}`);
const result = verifyCommitment({ serverSeed: 'kaspa-pof-api smoke seed', commitment: hash });
if (!result.ok) throw new Error('commitment verification failed');
NODE
pass KASPA_POF_COMMITMENT_VERIFY

node --input-type=module - <<'NODE'
import { hashLedger, verifyLedger } from './src/index.mjs';
const entries = [{ selection: 'red', amount: 10, playerId: 'alice' }];
const hash = hashLedger(entries);
if (hash !== 'a058ff5d83db878511b3ec2491d80e5a79bc32e01c922bde75e9d56cc933665b') throw new Error(`unexpected ledger hash ${hash}`);
const result = verifyLedger({ entries, ledgerHash: hash });
if (!result.ok) throw new Error('ledger verification failed');
NODE
pass KASPA_POF_LEDGER_HASH

node --input-type=module - <<'NODE'
import { deriveEntropyHash, verifyEntropyHash } from './src/index.mjs';
const input = {
  roundId: 'smoke-round',
  commitment: '982654a7ca3c04ee384abd27dcd566aa97f82ded6696f70bc3583a29d617ba60',
  clientSeed: 'smoke-client-seed',
  ledgerHash: 'a058ff5d83db878511b3ec2491d80e5a79bc32e01c922bde75e9d56cc933665b',
  blockEvidence: {
    blockHash: '0000000000000000000000000000000000000000000000000000000000000001',
    daaScore: '1000',
    blueScore: '2000'
  }
};
const { entropyHash } = deriveEntropyHash(input);
if (entropyHash !== '4096cb0f7410ef06270f8f34f74f860e2271f5694a2b07818c0b81a89c116ef0') throw new Error(`unexpected entropy hash ${entropyHash}`);
if (!verifyEntropyHash({ ...input, entropyHash }).ok) throw new Error('entropy verification failed');
NODE
pass KASPA_POF_ENTROPY_DERIVE

node --input-type=module - <<'NODE'
import { deriveOutcome, verifyOutcome } from './src/index.mjs';
const entropyHash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const derivers = {
  'smoke:modulo': ({ entropyHash, params }) => ({ value: Number(BigInt(`0x${entropyHash.slice(0, 16)}`) % BigInt(params.modulo)) })
};
const outcome = deriveOutcome({ entropyHash, spec: { deriver: 'smoke:modulo', params: { modulo: 10 } }, derivers });
if (outcome.result.value !== 5) throw new Error(`unexpected outcome ${JSON.stringify(outcome)}`);
const verified = verifyOutcome({ entropyHash, outcome: { deriver: 'smoke:modulo', params: { modulo: 10 }, inputHash: outcome.inputHash, result: outcome.result }, outcomeDerivers: derivers });
if (!verified.ok) throw new Error(`outcome verification failed: ${verified.code}`);
NODE
pass KASPA_POF_OUTCOME_DERIVE

node --input-type=module - <<'NODE'
import { validateKaspaBlockEvidence } from './src/index.mjs';
const result = validateKaspaBlockEvidence({
  claimLevel: 'tn10_future_entropy',
  network: { family: 'kaspa', networkId: 'testnet-10', label: 'kaspa-tn10' },
  target: { metric: 'daaScore', score: '1000' },
  block: {
    networkId: 'testnet-10',
    blockHash: '0000000000000000000000000000000000000000000000000000000000000001',
    daaScore: '1001',
    blueScore: '2000'
  }
});
if (!result.ok) throw new Error(`Kaspa evidence validation failed: ${result.code}`);
NODE
pass KASPA_POF_KASPA_EVIDENCE_VALIDATE

node --input-type=module - <<'NODE'
import { validateAnchorEvidence } from './src/index.mjs';
const payloadHashes = { commit: '1'.repeat(64), close: '2'.repeat(64), reveal: '3'.repeat(64) };
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
if (!result.ok) throw new Error(`anchor evidence validation failed: ${result.code}`);
NODE
pass KASPA_POF_ANCHOR_EVIDENCE_VALIDATE

node --input-type=module - <<'NODE'
import fs from 'node:fs';
import { validateSubmittedAnchorTransactionEvidence } from './src/index.mjs';
const evidence = JSON.parse(fs.readFileSync('references/live-tn10-proof-root-anchor-evidence.json', 'utf8'));
const result = validateSubmittedAnchorTransactionEvidence(evidence);
if (!result.ok) throw new Error(`submitted anchor transaction evidence failed: ${result.code}`);
NODE
pass KASPA_POF_SUBMITTED_ANCHOR_TX_EVIDENCE

node --input-type=module - <<'NODE'
import { TN10_BROADCAST_ACKNOWLEDGEMENT, estimateTn10AnchorFee, validateTn10BroadcastPolicy } from './src/index.mjs';
const feeEstimate = estimateTn10AnchorFee({ payloadBytes: 10, priorityFeeSompi: '0' });
const result = validateTn10BroadcastPolicy({
  networkId: 'testnet-10',
  enableBroadcast: true,
  acknowledgement: TN10_BROADCAST_ACKNOWLEDGEMENT,
  privateKeyHex: 'a'.repeat(64),
  feeEstimate,
  feeCapSompi: '20000'
});
if (!result.ok) throw new Error(`TN10 broadcast policy validation failed: ${result.code}`);
NODE
pass KASPA_POF_TN10_BROADCAST_POLICY

node --input-type=module - <<'NODE'
import { deriveEntropyHash, hashCommitment, hashLedger, verifyFairnessProof } from './src/index.mjs';
const serverSeed = 'smoke proof server seed';
const clientSeed = 'smoke proof client seed';
const entries = [{ participant: 'alice', input: 'A' }];
const commitment = hashCommitment(serverSeed);
const ledgerHash = hashLedger(entries);
const block = {
  networkId: 'testnet-10',
  blockHash: '0000000000000000000000000000000000000000000000000000000000000001',
  daaScore: '1001',
  blueScore: '2001'
};
const entropy = deriveEntropyHash({ roundId: 'smoke-proof-round', commitment, clientSeed, ledgerHash, blockEvidence: block });
const result = verifyFairnessProof({
  schema: 'kaspa-pof-api/proof/v1',
  claimLevel: 'tn10_future_entropy',
  network: { family: 'kaspa', networkId: 'testnet-10', label: 'kaspa-tn10' },
  round: { roundId: 'smoke-proof-round', appId: 'smoke-proof-app' },
  commitment: { algorithm: 'sha256', serverSeedHash: commitment },
  ledger: { algorithm: 'stable-json-sha256', entries, ledgerHash },
  entropy: { algorithm: 'sha256', target: { metric: 'daaScore', score: '1000' }, block, entropyHash: entropy.entropyHash, source: entropy.source },
  reveal: { serverSeed, clientSeed }
});
if (!result.ok) throw new Error(`fairness proof verification failed: ${JSON.stringify(result.errors)}`);
NODE
pass KASPA_POF_PROOF_VERIFY_LOCAL

node --input-type=module - <<'NODE'
import fs from 'node:fs';
import {
  buildProofRootAnchorPayload,
  computeProofRoot,
  validateSubmittedAnchorTransactionEvidence,
  verifyFairnessProof
} from './src/index.mjs';
const proof = JSON.parse(fs.readFileSync('references/live-tn10-proof-root-anchored-proof.json', 'utf8'));
const evidence = JSON.parse(fs.readFileSync('references/live-tn10-proof-root-anchored-evidence.json', 'utf8'));
if (proof.claimLevel !== 'tn10_proof_root_anchored') throw new Error(`unexpected proof claim level ${proof.claimLevel}`);
const root = computeProofRoot(proof);
const payload = buildProofRootAnchorPayload(proof);
if (payload.proofRoot !== root) throw new Error('proof root payload does not match computed root');
if (payload.proofRoot !== 'b77d54b5c19f57858d714f6cdb34286ea2521541c151e570c583209b48fe42bc') throw new Error(`unexpected live proof root ${payload.proofRoot}`);
const txEvidence = validateSubmittedAnchorTransactionEvidence(evidence);
if (!txEvidence.ok) throw new Error(`live proof-root transaction evidence failed: ${txEvidence.code}`);
const result = verifyFairnessProof(proof);
if (!result.ok) throw new Error(`live proof-root anchored proof failed: ${JSON.stringify(result.errors)}`);
NODE
pass KASPA_POF_PROOF_ROOT_ANCHORED

node - <<'NODE'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.name !== 'kaspa-pof-api') throw new Error(`unexpected package name ${pkg.name}`);
if (!pkg.exports || !pkg.exports['.']) throw new Error('package root export missing');
if (pkg.exports['./http-client']) throw new Error('legacy HTTP client export must not be published');
NODE
pass KASPA_POF_PACKAGE_METADATA

grep -q '"kaspa-pof-api": "/src/index.mjs"' examples/roulette-poc/index.html || fail KASPA_POF_IMPORT_MAP
! grep -q 'kaspa-toccata-api' examples/roulette-poc/index.html || fail KASPA_POF_NO_OLD_IMPORT_MAP
! grep -q "from 'kaspa-toccata-api'" examples/roulette-poc/app.js || fail KASPA_POF_NO_OLD_APP_IMPORT
grep -q "from 'kaspa-pof-api'" examples/roulette-poc/app.js || fail KASPA_POF_APP_IMPORT
pass KASPA_POF_ROULETTE_IMPORT_WIRING

! grep -R "sample-round\|toccata-fairness-proof\|proof\.json\|round\.json" examples/roulette-poc >/dev/null || fail KASPA_POF_NO_STATIC_PROOF_FIXTURES
! grep -Ri "mock" examples/roulette-poc >/dev/null || fail KASPA_POF_NO_MOCK_PATTERNS
! grep -Ri "dry[- ]run" examples/roulette-poc >/dev/null || fail KASPA_POF_NO_DRY_RUN_PATTERNS
pass KASPA_POF_NO_FIXTURE_TRAPS

pass KASPA_POF_SMOKE
