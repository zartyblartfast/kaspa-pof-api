'use strict';

const CLAIM_LEVELS = Object.freeze([
  'local_bundle_only',
  'tn10_future_entropy',
  'mainnet_future_entropy',
  'tn10_tx_anchored',
  'tn10_proof_root_anchored',
  'mainnet_tx_anchored'
]);

const FUTURE_ENTROPY_CLAIM_LEVELS = Object.freeze([
  'tn10_future_entropy',
  'mainnet_future_entropy'
]);

const CLAIM_LEVEL_NETWORKS = Object.freeze({
  tn10_future_entropy: 'testnet-10',
  tn10_tx_anchored: 'testnet-10',
  tn10_proof_root_anchored: 'testnet-10',
  mainnet_future_entropy: 'mainnet',
  mainnet_tx_anchored: 'mainnet'
});

function isKnownClaimLevel(claimLevel) {
  return CLAIM_LEVELS.includes(claimLevel);
}

function validateClaimLevel(claimLevel) {
  if (isKnownClaimLevel(claimLevel)) {
    return { ok: true, claimLevel };
  }

  return {
    ok: false,
    code: 'KASPA_POF_UNKNOWN_CLAIM_LEVEL',
    message: `Unknown claim level: ${String(claimLevel)}`
  };
}

module.exports = {
  CLAIM_LEVEL_NETWORKS,
  CLAIM_LEVELS,
  FUTURE_ENTROPY_CLAIM_LEVELS,
  isKnownClaimLevel,
  validateClaimLevel
};
