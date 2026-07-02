import { verifyCommitment } from '../commitment.mjs';
import { canonicalJson, verifyLedger } from '../ledger.mjs';
import { verifyEntropyHash } from '../entropy.mjs';
import { validateClaimLevel } from '../networks/claim-levels.mjs';
import { validateKaspaBlockEvidence } from '../networks/kaspa-evidence.mjs';

const PROOF_SCHEMA_V1 = 'kaspa-pof-api/proof/v1';
const TX_ANCHORED_CLAIM_LEVELS = new Set(['tn10_tx_anchored', 'mainnet_tx_anchored']);
const FUTURE_ENTROPY_CLAIM_LEVELS = new Set(['tn10_future_entropy', 'mainnet_future_entropy']);

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

  if (FUTURE_ENTROPY_CLAIM_LEVELS.has(claimLevel) || TX_ANCHORED_CLAIM_LEVELS.has(claimLevel)) {
    verifyKaspaEvidence(proof, checks, errors);
    verifyEntropyEvidence(proof, checks, errors);
  }

  if (TX_ANCHORED_CLAIM_LEVELS.has(claimLevel)) {
    verifyAnchorEvidence(proof, checks, errors);
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
  const anchors = proof.anchors;
  const ok = Array.isArray(anchors) && anchors.length > 0 && anchors.every((anchor) => anchor && typeof anchor.txid === 'string' && anchor.txid.trim());
  pushCheck(
    checks,
    errors,
    'anchors',
    ok,
    'KASPA_POF_ANCHOR_EVIDENCE_MISSING',
    'transaction-anchored claim levels require at least one anchor with a txid'
  );
}

function verifyOutcomeEvidence(proof, options, checks, errors) {
  const outcome = proof.outcome;
  const deriverName = outcome && outcome.deriver;
  const derivers = options && options.outcomeDerivers && typeof options.outcomeDerivers === 'object'
    ? options.outcomeDerivers
    : {};
  const deriver = typeof deriverName === 'string' ? derivers[deriverName] : undefined;

  if (typeof deriver !== 'function') {
    pushCheck(
      checks,
      errors,
      'outcome',
      false,
      'KASPA_POF_UNKNOWN_OUTCOME_DERIVER',
      `No outcome deriver supplied for ${String(deriverName)}`
    );
    return;
  }

  let derived;
  try {
    derived = deriver({ proof, entropyHash: proof.entropy && proof.entropy.entropyHash });
  } catch (error) {
    pushCheck(
      checks,
      errors,
      'outcome',
      false,
      'KASPA_POF_OUTCOME_DERIVER_FAILED',
      error && error.message ? error.message : 'Outcome deriver failed'
    );
    return;
  }

  const inputHashMatches = !('inputHash' in outcome) || derived.inputHash === outcome.inputHash;
  const resultMatches = canonicalJson(derived.result) === canonicalJson(outcome.result);
  pushCheck(
    checks,
    errors,
    'outcome',
    inputHashMatches && resultMatches,
    'KASPA_POF_OUTCOME_MISMATCH',
    'outcome evidence does not match supplied outcome deriver result',
    { deriver: deriverName }
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

export {
  PROOF_SCHEMA_V1,
  verifyFairnessProof,
  verifyFairnessProof as verifyProofBundle,
  verifyFairnessProof as verifyProofOfFairness
};
