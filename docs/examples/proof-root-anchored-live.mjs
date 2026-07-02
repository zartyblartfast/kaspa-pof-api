import { readFileSync } from 'node:fs';

import {
  buildProofRootAnchorPayload,
  computeProofRoot,
  validateSubmittedAnchorTransactionEvidence,
  verifyFairnessProof
} from '../../src/index.mjs';

const proof = JSON.parse(readFileSync(new URL('../../references/live-tn10-proof-root-anchored-proof.json', import.meta.url), 'utf8'));
const evidence = JSON.parse(readFileSync(new URL('../../references/live-tn10-proof-root-anchored-evidence.json', import.meta.url), 'utf8'));

const proofRoot = computeProofRoot(proof);
const payload = buildProofRootAnchorPayload(proof);
if (payload.proofRoot !== proofRoot) {
  throw new Error('proof-root payload does not match computed proof root');
}

const evidenceResult = validateSubmittedAnchorTransactionEvidence(evidence);
if (!evidenceResult.ok) {
  throw new Error(`submitted transaction evidence failed: ${evidenceResult.code}`);
}

const proofResult = verifyFairnessProof(proof);
if (!proofResult.ok) {
  throw new Error(`proof-root anchored proof failed: ${JSON.stringify(proofResult.errors)}`);
}

console.log(JSON.stringify({
  ok: true,
  claimLevel: proof.claimLevel,
  proofRoot,
  txid: evidence.txid,
  acceptingBlockHash: evidence.acceptingBlockHash
}, null, 2));
