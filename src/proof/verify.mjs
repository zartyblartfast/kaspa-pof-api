import { sha256Hex, verifyCommitment } from '../commitment.mjs';
import { canonicalJson, verifyLedger } from '../ledger.mjs';
import { verifyEntropyHash } from '../entropy.mjs';
import { verifyOutcome } from '../outcome.mjs';
import { validateAnchorEvidence, validateSubmittedAnchorTransactionEvidence } from '../anchoring/evidence.mjs';
import { validateClaimLevel } from '../networks/claim-levels.mjs';
import { validateKaspaBlockEvidence } from '../networks/kaspa-evidence.mjs';
import { PROOF_ROOT_ALGORITHM, PROOF_ROOT_ANCHOR_PAYLOAD_SCHEMA_V1, computeProofRoot } from './root.mjs';

const PROOF_SCHEMA_V1 = 'kaspa-pof-api/proof/v1';
const TX_ANCHORED_CLAIM_LEVELS = new Set(['tn10_tx_anchored', 'mainnet_tx_anchored']);
const FUTURE_ENTROPY_CLAIM_LEVELS = new Set(['tn10_future_entropy', 'mainnet_future_entropy']);
const PROOF_ROOT_ANCHORED_CLAIM_LEVELS = new Set(['tn10_proof_root_anchored']);

function verifyFairnessProof(proof, options = {}) {
  const checks = [];
  const errors = [];
  const claimLevel = proof && proof.claimLevel;

  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) {
    pushCheck(checks, errors, 'schema', false, 'KASPA_POF_PROOF_INPUT_INVALID', 'proof must be an object');
    return buildResult(false, claimLevel, checks, errors);
  }

  pushCheck(
    checks,
    errors,
    'schema',
    proof.schema === PROOF_SCHEMA_V1,
    'KASPA_POF_UNKNOWN_SCHEMA',
    `Unsupported proof schema: ${String(proof.schema)}`
  );

  const claimValidation = validateClaimLevel(claimLevel);
  pushCheck(
    checks,
    errors,
    'claimLevel',
    claimValidation.ok,
    claimValidation.code || 'KASPA_POF_UNKNOWN_CLAIM_LEVEL',
    claimValidation.message || `Unknown claim level: ${String(claimLevel)}`
  );

  if (!proof.round || typeof proof.round.roundId !== 'string' || !proof.round.roundId.trim()) {
    pushCheck(checks, errors, 'round', false, 'KASPA_POF_ROUND_ID_MISSING', 'round.roundId is required');
  }

  verifyCommitmentEvidence(proof, checks, errors);
  verifyLedgerEvidence(proof, checks, errors);

  if (FUTURE_ENTROPY_CLAIM_LEVELS.has(claimLevel) || TX_ANCHORED_CLAIM_LEVELS.has(claimLevel) || PROOF_ROOT_ANCHORED_CLAIM_LEVELS.has(claimLevel)) {
    verifyKaspaEvidence(proof, checks, errors);
    verifyEntropyEvidence(proof, checks, errors);
  }

  if (TX_ANCHORED_CLAIM_LEVELS.has(claimLevel)) {
    verifyAnchorEvidence(proof, checks, errors);
  }

  if (PROOF_ROOT_ANCHORED_CLAIM_LEVELS.has(claimLevel)) {
    verifyProofRootAnchorEvidence(proof, checks, errors);
  }

  if (proof.outcome !== undefined) {
    verifyOutcomeEvidence(proof, options, checks, errors);
  }

  return buildResult(errors.length === 0, claimLevel, checks, errors);
}

function verifyCommitmentEvidence(proof, checks, errors) {
  const serverSeed = proof.reveal && proof.reveal.serverSeed;
  const commitment = proof.commitment && proof.commitment.serverSeedHash;
  const result = verifyCommitment({ serverSeed, commitment });
  const code = result.code || 'KASPA_POF_COMMITMENT_MISMATCH';
  const message = result.message || 'reveal.serverSeed does not match commitment.serverSeedHash';
  pushCheck(checks, errors, 'commitment', result.ok, code, message, {
    expected: result.expected,
    actual: result.actual
  });
}

function verifyLedgerEvidence(proof, checks, errors) {
  const entries = proof.ledger && proof.ledger.entries;
  const ledgerHash = proof.ledger && proof.ledger.ledgerHash;
  const result = verifyLedger({ entries, ledgerHash });
  const code = result.code || 'KASPA_POF_LEDGER_MISMATCH';
  const message = result.message || 'ledger.entries do not match ledger.ledgerHash';
  pushCheck(checks, errors, 'ledger', result.ok, code, message, {
    expected: result.expected,
    actual: result.actual
  });
}

function verifyKaspaEvidence(proof, checks, errors) {
  const result = validateKaspaBlockEvidence({
    claimLevel: proof.claimLevel,
    network: proof.network,
    target: proof.entropy && proof.entropy.target,
    block: proof.entropy && proof.entropy.block
  });

  pushCheck(
    checks,
    errors,
    'kaspaBlockEvidence',
    result.ok,
    result.code || 'KASPA_POF_KASPA_EVIDENCE_INVALID',
    result.message || 'Kaspa block evidence is invalid',
    result.ok ? {
      networkId: result.networkId,
      targetMetric: result.targetMetric,
      targetScore: result.targetScore,
      blockScore: result.blockScore
    } : undefined
  );
}

function verifyEntropyEvidence(proof, checks, errors) {
  const commitment = proof.commitment && proof.commitment.serverSeedHash;
  const clientSeed = proof.reveal && proof.reveal.clientSeed;
  const ledgerHash = proof.ledger && proof.ledger.ledgerHash;
  const result = verifyEntropyHash({
    roundId: proof.round && proof.round.roundId,
    commitment,
    clientSeed,
    ledgerHash,
    blockEvidence: proof.entropy && proof.entropy.block,
    entropyHash: proof.entropy && proof.entropy.entropyHash
  });

  const code = result.code || 'KASPA_POF_ENTROPY_MISMATCH';
  const message = result.message || 'entropy evidence does not match recomputed entropy hash';
  pushCheck(checks, errors, 'entropy', result.ok, code, message, {
    expected: result.expected,
    actual: result.actual,
    source: result.source
  });
}

function verifyAnchorEvidence(proof, checks, errors) {
  const result = validateAnchorEvidence({
    claimLevel: proof.claimLevel,
    network: proof.network,
    anchors: proof.anchors,
    payloadHashes: buildAnchorPayloadHashes(proof)
  });

  pushCheck(
    checks,
    errors,
    'anchors',
    result.ok,
    result.code || 'KASPA_POF_ANCHOR_EVIDENCE_INVALID',
    result.message || 'transaction-anchored claim levels require valid anchor evidence',
    result.ok ? {
      requiredPhases: result.requiredPhases,
      presentPhases: result.presentPhases
    } : { phase: result.phase, missingPhase: result.missingPhase }
  );
}

function verifyProofRootAnchorEvidence(proof, checks, errors) {
  const proofRootAnchors = Array.isArray(proof.anchors) ? proof.anchors.filter((anchor) => anchor && anchor.phase === 'proof-root') : [];
  const anchor = proofRootAnchors[0];
  if (!anchor) {
    pushCheck(checks, errors, 'proofRootAnchor', false, 'KASPA_POF_PROOF_ROOT_ANCHOR_MISSING', 'tn10_proof_root_anchored requires one proof-root anchor');
    return;
  }
  if (proofRootAnchors.length !== 1) {
    pushCheck(checks, errors, 'proofRootAnchor', false, 'KASPA_POF_PROOF_ROOT_ANCHOR_DUPLICATE', 'tn10_proof_root_anchored requires exactly one proof-root anchor');
    return;
  }
  if (anchor.networkId !== proof.network.networkId) {
    pushCheck(checks, errors, 'proofRootAnchor', false, 'KASPA_POF_PROOF_ROOT_ANCHOR_NETWORK_MISMATCH', 'proof-root anchor networkId does not match proof networkId', { phase: 'proof-root' });
    return;
  }
  if (!isHex64(anchor.txid)) {
    pushCheck(checks, errors, 'proofRootAnchor', false, 'KASPA_POF_PROOF_ROOT_TXID_INVALID', 'proof-root anchor txid must be a 64-character hex string', { phase: 'proof-root' });
    return;
  }
  if (!isHex64(anchor.acceptingBlockHash)) {
    pushCheck(checks, errors, 'proofRootAnchor', false, 'KASPA_POF_PROOF_ROOT_ACCEPTING_BLOCK_INVALID', 'proof-root anchor acceptingBlockHash must be a 64-character hex string', { phase: 'proof-root' });
    return;
  }
  if (!anchor.submittedTransactionEvidence || typeof anchor.submittedTransactionEvidence !== 'object' || Array.isArray(anchor.submittedTransactionEvidence)) {
    pushCheck(checks, errors, 'proofRootAnchor', false, 'KASPA_POF_PROOF_ROOT_SUBMITTED_EVIDENCE_MISSING', 'proof-root anchor requires submitted transaction evidence with payloadHex', { phase: 'proof-root' });
    return;
  }

  const submitted = validateSubmittedAnchorTransactionEvidence(anchor.submittedTransactionEvidence);
  if (!submitted.ok) {
    pushCheck(checks, errors, 'proofRootAnchor', false, submitted.code || 'KASPA_POF_PROOF_ROOT_SUBMITTED_EVIDENCE_INVALID', submitted.message || 'proof-root submitted transaction evidence is invalid', { phase: 'proof-root' });
    return;
  }
  if (submitted.txid !== anchor.txid.toLowerCase()) {
    pushCheck(checks, errors, 'proofRootAnchor', false, 'KASPA_POF_PROOF_ROOT_TXID_MISMATCH', 'proof-root anchor txid does not match submitted transaction evidence txid', { phase: 'proof-root' });
    return;
  }
  if (submitted.acceptingBlockHash !== anchor.acceptingBlockHash.toLowerCase()) {
    pushCheck(checks, errors, 'proofRootAnchor', false, 'KASPA_POF_PROOF_ROOT_ACCEPTING_BLOCK_MISMATCH', 'proof-root anchor acceptingBlockHash does not match submitted transaction evidence', { phase: 'proof-root' });
    return;
  }
  if (anchor.payloadHash !== submitted.payloadHash) {
    pushCheck(checks, errors, 'proofRootAnchor', false, 'KASPA_POF_PROOF_ROOT_PAYLOAD_HASH_MISMATCH', 'proof-root anchor payloadHash does not match submitted transaction payload hash', { phase: 'proof-root' });
    return;
  }

  const payload = submitted.payloadObject && submitted.payloadObject.payload;
  const root = computeProofRoot(proof);
  const payloadValidation = validateProofRootPayload({ proof, payload, root });
  if (!payloadValidation.ok) {
    pushCheck(checks, errors, 'proofRootAnchor', false, payloadValidation.code, payloadValidation.message, { phase: 'proof-root' });
    return;
  }

  pushCheck(checks, errors, 'proofRootAnchor', true, 'KASPA_POF_PROOF_ROOT_ANCHOR_INVALID', 'proof-root anchor evidence is valid', {
    phase: 'proof-root',
    proofRoot: root,
    txid: submitted.txid,
    acceptingBlockHash: submitted.acceptingBlockHash
  });
}

function validateProofRootPayload({ proof, payload, root }) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return fail('KASPA_POF_PROOF_ROOT_PAYLOAD_INVALID', 'proof-root transaction payload must contain a proof-root payload object');
  if (payload.schema !== PROOF_ROOT_ANCHOR_PAYLOAD_SCHEMA_V1) return fail('KASPA_POF_PROOF_ROOT_PAYLOAD_SCHEMA_INVALID', 'proof-root payload schema is unsupported');
  if (payload.proofRootAlgorithm !== PROOF_ROOT_ALGORITHM) return fail('KASPA_POF_PROOF_ROOT_ALGORITHM_UNSUPPORTED', 'proof-root payload algorithm is unsupported');
  if (payload.proofSchema !== proof.schema) return fail('KASPA_POF_PROOF_ROOT_PAYLOAD_PROOF_SCHEMA_MISMATCH', 'proof-root payload proofSchema does not match proof schema');
  if (payload.networkId !== proof.network.networkId) return fail('KASPA_POF_PROOF_ROOT_PAYLOAD_NETWORK_MISMATCH', 'proof-root payload networkId does not match proof networkId');
  if (payload.claimLevel !== proof.claimLevel) return fail('KASPA_POF_PROOF_ROOT_PAYLOAD_CLAIM_MISMATCH', 'proof-root payload claimLevel does not match proof claimLevel');
  if (payload.roundId !== proof.round.roundId) return fail('KASPA_POF_PROOF_ROOT_PAYLOAD_ROUND_MISMATCH', 'proof-root payload roundId does not match proof roundId');
  if (payload.proofRoot !== root) return fail('KASPA_POF_PROOF_ROOT_MISMATCH', 'proof-root payload proofRoot does not match recomputed proof root');
  return { ok: true };
}

function buildAnchorPayloadHashes(proof) {
  const hashes = {};
  if (proof.commitment && typeof proof.commitment.serverSeedHash === 'string') {
    hashes.commit = proof.commitment.serverSeedHash;
  }
  if (proof.ledger && typeof proof.ledger.ledgerHash === 'string') {
    hashes.close = proof.ledger.ledgerHash;
  }
  if (proof.reveal !== undefined) {
    hashes.reveal = sha256Hex(canonicalJson(proof.reveal));
  }
  const proofRootPayload = {
    schema: proof.schema,
    claimLevel: proof.claimLevel,
    network: proof.network,
    round: proof.round,
    commitment: proof.commitment,
    ledger: proof.ledger,
    entropy: proof.entropy,
    reveal: proof.reveal
  };
  if (proof.outcome !== undefined) proofRootPayload.outcome = proof.outcome;
  hashes['proof-root'] = sha256Hex(canonicalJson(proofRootPayload));
  return hashes;
}

function verifyOutcomeEvidence(proof, options, checks, errors) {
  const result = verifyOutcome({
    entropyHash: proof.entropy && proof.entropy.entropyHash,
    outcome: proof.outcome,
    outcomeDerivers: options && options.outcomeDerivers
  });

  pushCheck(
    checks,
    errors,
    'outcome',
    result.ok,
    result.code || 'KASPA_POF_OUTCOME_MISMATCH',
    result.message || 'outcome evidence does not match supplied outcome deriver result',
    { deriver: result.deriver, inputHash: result.inputHash }
  );
}

function pushCheck(checks, errors, name, ok, code, message, detail) {
  const check = { name, ok };
  if (detail !== undefined) check.detail = detail;
  checks.push(check);
  if (!ok) errors.push({ code, message });
}

function buildResult(ok, claimLevel, checks, errors) {
  return {
    ok,
    claimLevel,
    checks,
    errors
  };
}

function isHex64(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);
}

function fail(code, message) {
  return { ok: false, code, message };
}

export {
  PROOF_SCHEMA_V1,
  verifyFairnessProof,
  verifyFairnessProof as verifyProofBundle,
  verifyFairnessProof as verifyProofOfFairness
};
