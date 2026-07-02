'use strict';

const { createHash } = require('node:crypto');
const { CLAIM_LEVEL_NETWORKS, validateClaimLevel } = require('../networks/claim-levels.cjs');

const REQUIRED_ANCHOR_PHASES = Object.freeze(['commit', 'close', 'reveal']);
const OPTIONAL_ANCHOR_PHASES = Object.freeze(['proof-root']);
const ALLOWED_ANCHOR_PHASES = Object.freeze([...REQUIRED_ANCHOR_PHASES, ...OPTIONAL_ANCHOR_PHASES]);
const TX_ANCHORED_CLAIM_LEVELS = Object.freeze(['tn10_tx_anchored', 'mainnet_tx_anchored']);

function validateAnchorEvidence({ claimLevel, network, anchors, payloadHashes = {} } = {}) {
  const claimValidation = validateClaimLevel(claimLevel);
  if (!claimValidation.ok) return claimValidation;

  if (!TX_ANCHORED_CLAIM_LEVELS.includes(claimLevel)) {
    return fail(
      'KASPA_POF_CLAIM_LEVEL_REQUIRES_NO_ANCHOR_EVIDENCE',
      `Claim level ${claimLevel} is not a transaction-anchored claim level`
    );
  }

  const networkId = requiredText(network && network.networkId, 'network.networkId');
  if (!networkId.ok) return fail('KASPA_POF_NETWORK_ID_MISSING', networkId.message);

  const expectedNetworkId = CLAIM_LEVEL_NETWORKS[claimLevel];
  if (expectedNetworkId && networkId.value !== expectedNetworkId) {
    return fail('KASPA_POF_CLAIM_NETWORK_MISMATCH', `Claim level ${claimLevel} requires networkId ${expectedNetworkId}`);
  }

  if (!Array.isArray(anchors) || anchors.length === 0) {
    return fail('KASPA_POF_ANCHOR_EVIDENCE_MISSING', 'transaction-anchored claim levels require anchor evidence');
  }

  const anchorsByPhase = new Map();
  for (const anchor of anchors) {
    const anchorValidation = validateAnchor(anchor, networkId.value, payloadHashes);
    if (!anchorValidation.ok) return anchorValidation;

    if (anchorsByPhase.has(anchor.phase)) {
      return fail('KASPA_POF_ANCHOR_PHASE_DUPLICATE', `anchor phase ${anchor.phase} appears more than once`, { phase: anchor.phase });
    }
    anchorsByPhase.set(anchor.phase, anchor);
  }

  for (const phase of REQUIRED_ANCHOR_PHASES) {
    if (!anchorsByPhase.has(phase)) {
      return fail('KASPA_POF_ANCHOR_PHASE_MISSING', `required anchor phase ${phase} is missing`, { missingPhase: phase });
    }
  }

  return {
    ok: true,
    claimLevel,
    networkId: networkId.value,
    requiredPhases: [...REQUIRED_ANCHOR_PHASES],
    presentPhases: [...anchorsByPhase.keys()]
  };
}

function validateSubmittedAnchorTransactionEvidence(evidence = {}) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    return fail('KASPA_POF_ANCHOR_TRANSACTION_EVIDENCE_INVALID', 'submitted anchor transaction evidence must be an object');
  }

  const networkId = requiredText(evidence.networkId, 'evidence.networkId');
  if (!networkId.ok) return fail('KASPA_POF_ANCHOR_TRANSACTION_NETWORK_MISSING', networkId.message);
  if (networkId.value !== 'testnet-10') return fail('KASPA_POF_ANCHOR_TRANSACTION_NETWORK_UNSUPPORTED', 'submitted anchor transaction evidence currently supports testnet-10 only');

  const phase = requiredText(evidence.phase, 'evidence.phase');
  if (!phase.ok) return fail('KASPA_POF_ANCHOR_TRANSACTION_PHASE_MISSING', phase.message);
  if (!ALLOWED_ANCHOR_PHASES.includes(phase.value)) return fail('KASPA_POF_ANCHOR_TRANSACTION_PHASE_UNKNOWN', `unsupported anchor transaction phase ${phase.value}`, { phase: phase.value });

  const txid = requiredText(evidence.txid, 'evidence.txid');
  if (!txid.ok) return fail('KASPA_POF_ANCHOR_TRANSACTION_TXID_MISSING', txid.message, { phase: phase.value });
  if (!isHex64(txid.value)) return fail('KASPA_POF_ANCHOR_TRANSACTION_TXID_INVALID', 'submitted anchor transaction txid must be a 64-character hex string', { phase: phase.value });

  const acceptingBlockHash = requiredText(evidence.acceptingBlockHash, 'evidence.acceptingBlockHash');
  if (!acceptingBlockHash.ok) return fail('KASPA_POF_ANCHOR_TRANSACTION_ACCEPTING_BLOCK_MISSING', acceptingBlockHash.message, { phase: phase.value });
  if (!isHex64(acceptingBlockHash.value)) return fail('KASPA_POF_ANCHOR_TRANSACTION_ACCEPTING_BLOCK_INVALID', 'submitted anchor transaction acceptingBlockHash must be a 64-character hex string', { phase: phase.value });

  const payloadHex = requiredText(evidence.payloadHex, 'evidence.payloadHex');
  if (!payloadHex.ok) return fail('KASPA_POF_ANCHOR_TRANSACTION_PAYLOAD_MISSING', payloadHex.message, { phase: phase.value });
  if (!/^[0-9a-f]*$/i.test(payloadHex.value) || payloadHex.value.length % 2 !== 0) return fail('KASPA_POF_ANCHOR_TRANSACTION_PAYLOAD_INVALID', 'submitted anchor transaction payloadHex must be even-length hex', { phase: phase.value });

  let payloadText;
  let payloadObject;
  try {
    payloadText = Buffer.from(payloadHex.value, 'hex').toString('utf8');
    payloadObject = JSON.parse(payloadText);
  } catch (error) {
    return fail('KASPA_POF_ANCHOR_TRANSACTION_PAYLOAD_JSON_INVALID', error.message, { phase: phase.value });
  }

  if (!payloadObject || typeof payloadObject !== 'object' || Array.isArray(payloadObject)) return fail('KASPA_POF_ANCHOR_TRANSACTION_PAYLOAD_OBJECT_INVALID', 'submitted anchor transaction payload must decode to a JSON object', { phase: phase.value });
  if (payloadObject.schema !== 'kaspa-pof-api/anchor-transaction/v1') return fail('KASPA_POF_ANCHOR_TRANSACTION_PAYLOAD_SCHEMA_INVALID', 'submitted anchor transaction payload schema is unsupported', { phase: phase.value });
  if (payloadObject.networkId !== networkId.value) return fail('KASPA_POF_ANCHOR_TRANSACTION_PAYLOAD_NETWORK_MISMATCH', 'submitted anchor transaction payload networkId does not match evidence networkId', { phase: phase.value });
  if (payloadObject.phase !== phase.value) return fail('KASPA_POF_ANCHOR_TRANSACTION_PAYLOAD_PHASE_MISMATCH', 'submitted anchor transaction payload phase does not match evidence phase', { phase: phase.value });

  const payloadHash = createHash('sha256').update(payloadText, 'utf8').digest('hex');
  if (evidence.payloadHash !== undefined) {
    const suppliedPayloadHash = requiredText(evidence.payloadHash, 'evidence.payloadHash');
    if (!suppliedPayloadHash.ok) return fail('KASPA_POF_ANCHOR_TRANSACTION_PAYLOAD_HASH_MISSING', suppliedPayloadHash.message, { phase: phase.value });
    if (!isHex64(suppliedPayloadHash.value)) return fail('KASPA_POF_ANCHOR_TRANSACTION_PAYLOAD_HASH_INVALID', 'submitted anchor transaction payloadHash must be a 64-character hex string', { phase: phase.value });
    if (suppliedPayloadHash.value.toLowerCase() !== payloadHash) return fail('KASPA_POF_ANCHOR_TRANSACTION_PAYLOAD_HASH_MISMATCH', 'submitted anchor transaction payloadHash does not match decoded payload', { phase: phase.value });
  }

  return { ok: true, networkId: networkId.value, phase: phase.value, txid: txid.value.toLowerCase(), acceptingBlockHash: acceptingBlockHash.value.toLowerCase(), payloadHash, payloadObject };
}

function validateAnchor(anchor, expectedNetworkId, payloadHashes) {
  if (!anchor || typeof anchor !== 'object' || Array.isArray(anchor)) {
    return fail('KASPA_POF_ANCHOR_INVALID', 'anchor evidence must be an object');
  }

  const phase = requiredText(anchor.phase, 'anchor.phase');
  if (!phase.ok) return fail('KASPA_POF_ANCHOR_PHASE_MISSING', phase.message);
  if (!ALLOWED_ANCHOR_PHASES.includes(phase.value)) {
    return fail('KASPA_POF_ANCHOR_PHASE_UNKNOWN', `unsupported anchor phase ${phase.value}`, { phase: phase.value });
  }

  const networkId = requiredText(anchor.networkId, 'anchor.networkId');
  if (!networkId.ok) return fail('KASPA_POF_ANCHOR_NETWORK_MISSING', networkId.message, { phase: phase.value });
  if (networkId.value !== expectedNetworkId) {
    return fail(
      'KASPA_POF_ANCHOR_NETWORK_MISMATCH',
      `anchor phase ${phase.value} networkId ${networkId.value} does not match proof networkId ${expectedNetworkId}`,
      { phase: phase.value }
    );
  }

  const txid = requiredText(anchor.txid, 'anchor.txid');
  if (!txid.ok) return fail('KASPA_POF_ANCHOR_TXID_MISSING', txid.message, { phase: phase.value });
  if (!isHex64(txid.value)) {
    return fail('KASPA_POF_ANCHOR_TXID_INVALID', `anchor phase ${phase.value} txid must be a 64-character hex string`, { phase: phase.value });
  }

  if (anchor.acceptingBlockHash !== undefined && !isHex64(String(anchor.acceptingBlockHash).trim())) {
    return fail(
      'KASPA_POF_ANCHOR_ACCEPTING_BLOCK_HASH_INVALID',
      `anchor phase ${phase.value} acceptingBlockHash must be a 64-character hex string when supplied`,
      { phase: phase.value }
    );
  }

  const expectedPayloadHash = payloadHashes[phase.value];
  if (expectedPayloadHash !== undefined) {
    const payloadHash = requiredText(anchor.payloadHash, 'anchor.payloadHash');
    if (!payloadHash.ok) return fail('KASPA_POF_ANCHOR_PAYLOAD_HASH_MISSING', payloadHash.message, { phase: phase.value });
    if (!isHex64(payloadHash.value)) {
      return fail('KASPA_POF_ANCHOR_PAYLOAD_HASH_INVALID', `anchor phase ${phase.value} payloadHash must be a 64-character hex string`, { phase: phase.value });
    }
    if (payloadHash.value.toLowerCase() !== String(expectedPayloadHash).toLowerCase()) {
      return fail(
        'KASPA_POF_ANCHOR_PAYLOAD_HASH_MISMATCH',
        `anchor phase ${phase.value} payloadHash does not match expected payload hash`,
        { phase: phase.value }
      );
    }
  }

  return { ok: true };
}

function requiredText(value, fieldName) {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'bigint') {
    return { ok: false, message: `${fieldName} is required` };
  }
  const text = String(value).trim();
  if (!text) return { ok: false, message: `${fieldName} is required` };
  return { ok: true, value: text };
}

function isHex64(value) {
  return /^[0-9a-f]{64}$/i.test(value);
}

function fail(code, message, extra = {}) {
  return { ok: false, code, message, ...extra };
}

module.exports = {
  ALLOWED_ANCHOR_PHASES,
  REQUIRED_ANCHOR_PHASES,
  TX_ANCHORED_CLAIM_LEVELS,
  validateAnchorEvidence,
  validateSubmittedAnchorTransactionEvidence
};
