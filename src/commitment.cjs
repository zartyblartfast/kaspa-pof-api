'use strict';

const { createHash } = require('node:crypto');

function hashCommitment(serverSeed) {
  if (typeof serverSeed !== 'string') {
    throw new TypeError('serverSeed must be a string');
  }

  return createHash('sha256').update(serverSeed, 'utf8').digest('hex');
}

function verifyCommitment({ serverSeed, commitment } = {}) {
  if (typeof serverSeed !== 'string' || typeof commitment !== 'string') {
    return {
      ok: false,
      code: 'KASPA_POF_COMMITMENT_INPUT_MISSING',
      message: 'serverSeed and commitment are required strings'
    };
  }

  const expected = commitment.toLowerCase();
  const actual = hashCommitment(serverSeed);

  return {
    ok: actual === expected,
    expected,
    actual
  };
}

module.exports = {
  hashCommitment,
  verifyCommitment
};
