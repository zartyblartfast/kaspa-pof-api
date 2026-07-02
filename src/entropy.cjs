'use strict';

const { createHash } = require('node:crypto');

const ENTROPY_SOURCE = 'sha256(roundId|commitment|clientSeed|ledgerHash|blockHash|daaScore|blueScore)';

function deriveEntropyHash({ roundId, commitment, clientSeed = '', ledgerHash, blockEvidence } = {}) {
  const normalized = normalizeEntropyInput({ roundId, commitment, clientSeed, ledgerHash, blockEvidence });
  const entropyHash = createHash('sha256').update([
    normalized.roundId,
    normalized.commitment,
    normalized.clientSeed,
    normalized.ledgerHash,
    normalized.blockHash,
    normalized.daaScore,
    normalized.blueScore
  ].join('|'), 'utf8').digest('hex');

  return {
    entropyHash,
    source: ENTROPY_SOURCE
  };
}

function verifyEntropyHash({ entropyHash, ...input } = {}) {
  if (typeof entropyHash !== 'string' || !entropyHash.trim()) {
    return {
      ok: false,
      code: 'KASPA_POF_ENTROPY_INPUT_MISSING',
      message: 'entropyHash is required'
    };
  }

  let derived;
  try {
    derived = deriveEntropyHash(input);
  } catch (error) {
    return {
      ok: false,
      code: 'KASPA_POF_ENTROPY_INPUT_MISSING',
      message: error.message
    };
  }

  const expected = entropyHash.toLowerCase();
  return {
    ok: derived.entropyHash === expected,
    expected,
    actual: derived.entropyHash,
    source: derived.source
  };
}

function normalizeEntropyInput({ roundId, commitment, clientSeed = '', ledgerHash, blockEvidence } = {}) {
  const block = blockEvidence && typeof blockEvidence === 'object' ? blockEvidence : {};
  return {
    roundId: requiredText(roundId, 'roundId'),
    commitment: requiredText(commitment, 'commitment'),
    clientSeed: typeof clientSeed === 'string' ? clientSeed : String(clientSeed),
    ledgerHash: requiredText(ledgerHash, 'ledgerHash'),
    blockHash: requiredText(block.blockHash, 'blockEvidence.blockHash'),
    daaScore: requiredText(block.daaScore, 'blockEvidence.daaScore'),
    blueScore: requiredText(block.blueScore, 'blockEvidence.blueScore')
  };
}

function requiredText(value, fieldName) {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'bigint') {
    throw new TypeError(`${fieldName} is required`);
  }

  const text = String(value).trim();
  if (!text) throw new TypeError(`${fieldName} is required`);
  return text;
}

module.exports = {
  ENTROPY_SOURCE,
  deriveEntropyHash,
  verifyEntropyHash
};
