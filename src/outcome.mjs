import { sha256Hex } from './commitment.mjs';
import { canonicalJson } from './ledger.mjs';

function deriveOutcome({ entropyHash, spec, derivers } = {}) {
  validateEntropyHash(entropyHash);
  validateOutcomeSpec(spec);
  const outcomeDerivers = validateDerivers(derivers);
  const deriver = outcomeDerivers[spec.deriver];

  if (typeof deriver !== 'function') {
    throw outcomeError(
      'KASPA_POF_UNKNOWN_OUTCOME_DERIVER',
      `No outcome deriver supplied for ${String(spec.deriver)}`
    );
  }

  const inputHash = hashOutcomeInput({
    entropyHash,
    deriver: spec.deriver,
    params: spec.params === undefined ? null : spec.params
  });

  let derived;
  try {
    derived = deriver({
      entropyHash,
      spec,
      params: spec.params,
      inputHash
    });
  } catch (error) {
    throw outcomeError(
      'KASPA_POF_OUTCOME_DERIVER_FAILED',
      error && error.message ? error.message : 'Outcome deriver failed'
    );
  }

  return normalizeDerivedOutcome(spec.deriver, inputHash, derived);
}

function verifyOutcome({ entropyHash, outcome, outcomeDerivers, derivers } = {}) {
  let derived;
  try {
    derived = deriveOutcome({
      entropyHash,
      spec: outcome,
      derivers: outcomeDerivers || derivers || {}
    });
  } catch (error) {
    return {
      ok: false,
      code: error && error.code ? error.code : 'KASPA_POF_OUTCOME_INVALID',
      message: error && error.message ? error.message : 'outcome evidence is invalid'
    };
  }

  const expectedInputHash = outcome && outcome.inputHash;
  const inputHashMatches = expectedInputHash === undefined || derived.inputHash === expectedInputHash;
  let resultMatches = false;
  try {
    resultMatches = canonicalJson(derived.result) === canonicalJson(outcome.result);
  } catch (error) {
    return {
      ok: false,
      code: 'KASPA_POF_OUTCOME_NON_PORTABLE_JSON',
      message: error.message
    };
  }

  return {
    ok: inputHashMatches && resultMatches,
    deriver: derived.deriver,
    inputHash: derived.inputHash,
    expected: outcome.result,
    actual: derived.result,
    code: inputHashMatches && resultMatches ? undefined : 'KASPA_POF_OUTCOME_MISMATCH',
    message: inputHashMatches && resultMatches ? undefined : 'outcome evidence does not match supplied outcome deriver result'
  };
}

function hashOutcomeInput(input) {
  return sha256Hex(canonicalJson(input));
}

function normalizeDerivedOutcome(deriver, inputHash, derived) {
  if (derived && typeof derived === 'object' && !Array.isArray(derived) && Object.prototype.hasOwnProperty.call(derived, 'result')) {
    return {
      deriver,
      inputHash: typeof derived.inputHash === 'string' ? derived.inputHash : inputHash,
      result: derived.result
    };
  }

  return {
    deriver,
    inputHash,
    result: derived
  };
}

function validateEntropyHash(entropyHash) {
  if (typeof entropyHash !== 'string' || !/^[0-9a-f]{64}$/i.test(entropyHash)) {
    throw outcomeError('KASPA_POF_ENTROPY_HASH_INVALID', 'entropyHash must be a 64-character hex string');
  }
}

function validateOutcomeSpec(spec) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    throw outcomeError('KASPA_POF_OUTCOME_SPEC_INVALID', 'outcome spec must be an object');
  }

  if (typeof spec.deriver !== 'string' || !spec.deriver.trim()) {
    throw outcomeError('KASPA_POF_OUTCOME_DERIVER_MISSING', 'outcome.deriver must be a non-empty string');
  }
}

function validateDerivers(derivers) {
  if (!derivers || typeof derivers !== 'object' || Array.isArray(derivers)) {
    throw outcomeError('KASPA_POF_OUTCOME_DERIVERS_INVALID', 'outcome derivers must be an object');
  }
  return derivers;
}

function outcomeError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export {
  deriveOutcome,
  hashOutcomeInput,
  verifyOutcome
};
