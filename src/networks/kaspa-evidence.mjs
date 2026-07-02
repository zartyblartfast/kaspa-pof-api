import { CLAIM_LEVEL_NETWORKS, FUTURE_ENTROPY_CLAIM_LEVELS, validateClaimLevel } from './claim-levels.mjs';

function validateKaspaBlockEvidence({ claimLevel, network, target, block } = {}) {
  const claimValidation = validateClaimLevel(claimLevel);
  if (!claimValidation.ok) return claimValidation;

  if (!FUTURE_ENTROPY_CLAIM_LEVELS.includes(claimLevel)) {
    return {
      ok: false,
      code: 'KASPA_POF_CLAIM_LEVEL_REQUIRES_NO_BLOCK_EVIDENCE',
      message: `Claim level ${claimLevel} is not a future-entropy block-evidence claim level`
    };
  }

  const networkId = requiredText(network && network.networkId, 'network.networkId');
  if (!networkId.ok) return fail('KASPA_POF_NETWORK_ID_MISSING', networkId.message);

  const expectedNetworkId = CLAIM_LEVEL_NETWORKS[claimLevel];
  if (expectedNetworkId && networkId.value !== expectedNetworkId) {
    return fail('KASPA_POF_CLAIM_NETWORK_MISMATCH', `Claim level ${claimLevel} requires networkId ${expectedNetworkId}`);
  }

  const blockNetworkId = requiredText(block && block.networkId, 'block.networkId');
  if (!blockNetworkId.ok) return fail('KASPA_POF_NETWORK_ID_MISSING', blockNetworkId.message);
  if (blockNetworkId.value !== networkId.value) {
    return fail('KASPA_POF_NETWORK_MISMATCH', `Network ${networkId.value} does not match block network ${blockNetworkId.value}`);
  }

  const blockHash = requiredText(block && block.blockHash, 'block.blockHash');
  if (!blockHash.ok) return fail('KASPA_POF_BLOCK_HASH_MISSING', blockHash.message);

  const metric = requiredMetric(target && target.metric);
  if (!metric.ok) return fail('KASPA_POF_TARGET_METRIC_INVALID', metric.message);

  const targetScore = parseScore(target && target.score, 'target.score');
  if (!targetScore.ok) return fail('KASPA_POF_TARGET_SCORE_INVALID', targetScore.message);

  const blockScore = parseScore(block && block[metric.value], `block.${metric.value}`);
  if (!blockScore.ok) return fail('KASPA_POF_BLOCK_SCORE_INVALID', blockScore.message);

  if (blockScore.value < targetScore.value) {
    return fail(
      'KASPA_POF_BLOCK_BEFORE_TARGET',
      `Block ${metric.value} ${blockScore.text} is before target ${targetScore.text}`
    );
  }

  return {
    ok: true,
    claimLevel,
    networkId: networkId.value,
    targetMetric: metric.value,
    targetScore: targetScore.text,
    blockScore: blockScore.text
  };
}

function requiredMetric(metric) {
  if (metric === 'daaScore' || metric === 'blueScore') return { ok: true, value: metric };
  return { ok: false, message: 'target.metric must be daaScore or blueScore' };
}

function requiredText(value, fieldName) {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'bigint') {
    return { ok: false, message: `${fieldName} is required` };
  }
  const text = String(value).trim();
  if (!text) return { ok: false, message: `${fieldName} is required` };
  return { ok: true, value: text };
}

function parseScore(value, fieldName) {
  const text = requiredText(value, fieldName);
  if (!text.ok) return text;
  if (!/^\d+$/.test(text.value)) return { ok: false, message: `${fieldName} must be a non-negative integer string` };
  return { ok: true, text: text.value, value: BigInt(text.value) };
}

function fail(code, message) {
  return { ok: false, code, message };
}

export {
  validateKaspaBlockEvidence
};
