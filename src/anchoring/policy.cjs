'use strict';

const TN10_BROADCAST_ACKNOWLEDGEMENT = 'I understand this spends TN10 testnet funds';

function estimateTn10AnchorFee({ payloadBytes = 0, priorityFeeSompi = '0', networkId = 'testnet-10' } = {}) {
  if (networkId !== 'testnet-10') {
    throw new Error('TN10 anchor fee estimates require networkId testnet-10');
  }
  const payloadSize = Number(payloadBytes);
  if (!Number.isInteger(payloadSize) || payloadSize < 0) {
    throw new TypeError('payloadBytes must be a non-negative integer');
  }
  const priorityFee = parseSompi(priorityFeeSompi, 'priorityFeeSompi');
  const conservativeBaseFee = 10_000n;
  const payloadFee = BigInt(payloadSize) * 100n;
  return {
    networkId,
    estimatedFeeSompi: (conservativeBaseFee + payloadFee + priorityFee).toString(),
    priorityFeeSompi: priorityFee.toString(),
    payloadBytes: payloadSize,
    estimateLevel: 'prebuild_conservative'
  };
}

function validateTn10BroadcastPolicy({
  networkId = 'testnet-10',
  enableBroadcast = false,
  acknowledgement,
  privateKeyHex,
  feeEstimate,
  feeCapSompi
} = {}) {
  if (networkId !== 'testnet-10') {
    return fail('KASPA_POF_TN10_NETWORK_REQUIRED', `TN10 broadcast policy requires networkId testnet-10, got ${String(networkId)}`);
  }
  if (enableBroadcast !== true) {
    return fail('KASPA_POF_TN10_BROADCAST_NOT_ENABLED', 'TN10 broadcasting requires enableBroadcast: true');
  }
  if (acknowledgement !== TN10_BROADCAST_ACKNOWLEDGEMENT) {
    return fail('KASPA_POF_TN10_BROADCAST_ACK_REQUIRED', `TN10 broadcasting requires acknowledgement: ${TN10_BROADCAST_ACKNOWLEDGEMENT}`);
  }
  if (typeof privateKeyHex !== 'string' || !/^[0-9a-f]{64}$/i.test(privateKeyHex.trim())) {
    return fail('KASPA_POF_TN10_PRIVATE_KEY_INVALID', 'privateKeyHex must be a 64-character hex TN10 private key');
  }
  if (!feeEstimate || typeof feeEstimate !== 'object') {
    return fail('KASPA_POF_TN10_FEE_ESTIMATE_REQUIRED', 'feeEstimate is required before TN10 broadcasting');
  }
  const estimatedFee = parseSompiOrResult(feeEstimate.estimatedFeeSompi, 'feeEstimate.estimatedFeeSompi');
  if (!estimatedFee.ok) return estimatedFee;
  const feeCap = parseSompiOrResult(feeCapSompi, 'feeCapSompi');
  if (!feeCap.ok) return feeCap;
  if (estimatedFee.value > feeCap.value) {
    return fail(
      'KASPA_POF_TN10_FEE_CAP_EXCEEDED',
      `estimated fee ${estimatedFee.value.toString()} exceeds fee cap ${feeCap.value.toString()}`,
      { feeEstimate, feeCapSompi: feeCap.value.toString() }
    );
  }
  return {
    ok: true,
    networkId,
    acknowledgement,
    feeEstimate: normalizeFeeEstimate(feeEstimate),
    feeCapSompi: feeCap.value.toString()
  };
}

function normalizeFeeEstimate(feeEstimate) {
  return {
    ...feeEstimate,
    estimatedFeeSompi: parseSompi(feeEstimate.estimatedFeeSompi, 'feeEstimate.estimatedFeeSompi').toString(),
    totalSpendSompi: feeEstimate.totalSpendSompi === undefined
      ? undefined
      : parseSompi(feeEstimate.totalSpendSompi, 'feeEstimate.totalSpendSompi').toString()
  };
}

function parseSompi(value, fieldName) {
  const result = parseSompiOrResult(value, fieldName);
  if (!result.ok) throw new TypeError(result.message);
  return result.value;
}

function parseSompiOrResult(value, fieldName) {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'bigint') {
    return fail('KASPA_POF_TN10_SOMPI_INVALID', `${fieldName} must be a non-negative integer sompi value`);
  }
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) {
    return fail('KASPA_POF_TN10_SOMPI_INVALID', `${fieldName} must be a non-negative integer sompi value`);
  }
  return { ok: true, value: BigInt(text) };
}

function fail(code, message, extra = {}) {
  return { ok: false, code, message, ...extra };
}

module.exports = {
  TN10_BROADCAST_ACKNOWLEDGEMENT,
  estimateTn10AnchorFee,
  parseSompi,
  validateTn10BroadcastPolicy
};
