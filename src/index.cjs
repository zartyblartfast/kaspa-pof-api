'use strict';

const commitment = require('./commitment.cjs');
const ledger = require('./ledger.cjs');
const entropy = require('./entropy.cjs');
const outcome = require('./outcome.cjs');
const claimLevels = require('./networks/claim-levels.cjs');
const kaspaEvidence = require('./networks/kaspa-evidence.cjs');
const anchorEvidence = require('./anchoring/evidence.cjs');
const anchorPolicy = require('./anchoring/policy.cjs');
const anchorSubmit = require('./anchoring/submit.cjs');
const proofRoot = require('./proof/root.cjs');
const proofVerify = require('./proof/verify.cjs');

module.exports = {
  ...commitment,
  ...ledger,
  ...entropy,
  ...outcome,
  ...claimLevels,
  ...kaspaEvidence,
  ...anchorEvidence,
  ...anchorPolicy,
  ...anchorSubmit,
  ...proofRoot,
  ...proofVerify
};
