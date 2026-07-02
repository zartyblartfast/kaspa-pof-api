'use strict';

const { createHash } = require('node:crypto');
const { canonicalJson } = require('../ledger.cjs');

const PROOF_SCHEMA_V1 = 'kaspa-pof-api/proof/v1';
const PROOF_ROOT_ANCHOR_PAYLOAD_SCHEMA_V1 = 'kaspa-pof-api/proof-root-anchor/v1';
const PROOF_ROOT_ALGORITHM = 'stable-json-sha256';

function computeProofRoot(proof) {
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) {
    throw new TypeError('proof must be an object');
  }
  return sha256Hex(canonicalJson(buildProofRootMaterial(proof)));
}

function sha256Hex(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function buildProofRootAnchorPayload(proof) {
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) {
    throw new TypeError('proof must be an object');
  }
  return {
    schema: PROOF_ROOT_ANCHOR_PAYLOAD_SCHEMA_V1,
    proofRootAlgorithm: PROOF_ROOT_ALGORITHM,
    proofRoot: computeProofRoot(proof),
    proofSchema: proof.schema,
    networkId: proof.network && proof.network.networkId,
    claimLevel: proof.claimLevel,
    roundId: proof.round && proof.round.roundId
  };
}

function buildProofRootMaterial(proof) {
  const material = {
    schema: proof.schema,
    claimLevel: proof.claimLevel,
    network: proof.network,
    round: proof.round,
    commitment: proof.commitment,
    ledger: proof.ledger,
    entropy: proof.entropy,
    reveal: proof.reveal
  };
  if (proof.outcome !== undefined) material.outcome = proof.outcome;
  return {
    schema: 'kaspa-pof-api/proof-root-material/v1',
    proofSchema: PROOF_SCHEMA_V1,
    proof: material
  };
}

module.exports = {
  PROOF_ROOT_ALGORITHM,
  PROOF_ROOT_ANCHOR_PAYLOAD_SCHEMA_V1,
  buildProofRootAnchorPayload,
  computeProofRoot
};
