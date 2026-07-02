import { sha256Hex } from '../commitment.mjs';
import { canonicalJson } from '../ledger.mjs';
import { parseSompi, validateTn10BroadcastPolicy } from './policy.mjs';

const DEFAULT_KASPA_WASM_PKG = '/tmp/kaspa-toccata-api-spikes/rusty-kaspa-toccata/wasm/nodejs/kaspa';

async function submitTn10AnchorTransaction({
  kaspa,
  wasmPackage,
  networkId = 'testnet-10',
  phase,
  payload,
  privateKeyHex,
  destinationAddress,
  amountSompi = '1000000',
  priorityFeeSompi = '0',
  feeCapSompi,
  enableBroadcast = false,
  acknowledgement,
  timeoutMs = 45000
} = {}) {
  if (!['commit', 'close', 'reveal', 'proof-root'].includes(phase)) {
    return fail('KASPA_POF_ANCHOR_PHASE_UNKNOWN', `unsupported anchor phase ${String(phase)}`);
  }
  if (networkId !== 'testnet-10') {
    return fail('KASPA_POF_TN10_NETWORK_REQUIRED', `TN10 anchor submission requires networkId testnet-10, got ${String(networkId)}`);
  }

  const amount = parseSompi(amountSompi, 'amountSompi');
  const priorityFee = parseSompi(priorityFeeSompi, 'priorityFeeSompi');
  if (amount <= 0n) return fail('KASPA_POF_TN10_AMOUNT_INVALID', 'amountSompi must be positive');

  const payloadJson = canonicalJson({ schema: 'kaspa-pof-api/anchor-transaction/v1', networkId, phase, payload });
  const payloadHex = Buffer.from(payloadJson, 'utf8').toString('hex');
  const payloadHash = sha256Hex(payloadJson);
  if (typeof privateKeyHex !== 'string' || !/^[0-9a-f]{64}$/i.test(privateKeyHex.trim())) {
    return fail('KASPA_POF_TN10_PRIVATE_KEY_INVALID', 'privateKeyHex must be a 64-character hex TN10 private key');
  }
  const resolvedWasmPackage = wasmPackage || envValue('KASPA_WASM_PKG') || DEFAULT_KASPA_WASM_PKG;
  const kit = kaspa || await loadKaspaWasm(resolvedWasmPackage);
  const required = ['PrivateKey', 'createTransactions', 'RpcClient', 'Resolver', 'Encoding'];
  for (const name of required) {
    if (!kit[name]) return fail('KASPA_POF_KASPA_WASM_EXPORT_MISSING', `Kaspa wasm package missing ${name}`);
  }

  const privateKey = new kit.PrivateKey(privateKeyHex.trim());
  const sourceAddress = privateKey.toKeypair().toAddress(networkId);
  const destination = destinationAddress || sourceAddress.toString();
  const resolver = new kit.Resolver();
  const rpc = new kit.RpcClient({ resolver, networkId, encoding: kit.Encoding.Borsh });
  let connected = false;

  try {
    await withTimeout('rpc.connect', rpc.connect(), timeoutMs);
    connected = true;
    const serverInfo = await withTimeout('rpc.getServerInfo', rpc.getServerInfo(), timeoutMs);
    if (serverInfo.networkId !== networkId) {
      return fail('KASPA_POF_TN10_RPC_NETWORK_MISMATCH', `connected RPC network mismatch: ${serverInfo.networkId}`);
    }
    if (!serverInfo.isSynced) {
      return fail('KASPA_POF_TN10_RPC_NOT_SYNCED', 'connected TN10 RPC is not synced');
    }

    const utxoResponse = await withTimeout('rpc.getUtxosByAddresses', rpc.getUtxosByAddresses([sourceAddress]), timeoutMs);
    const entries = (utxoResponse.entries || []).filter((entry) => !entry.isCoinbase);
    if (!entries.length) {
      return fail('KASPA_POF_TN10_NO_FUNDED_UTXO', 'no funded non-coinbase TN10 UTXO found for source address', {
        sourceAddress: sourceAddress.toString(),
        totalUtxos: utxoResponse.entries ? utxoResponse.entries.length : 0
      });
    }

    const { transactions, summary } = await withTimeout('createTransactions', kit.createTransactions({
      entries,
      outputs: [{ address: destination, amount }],
      priorityFee,
      changeAddress: sourceAddress,
      networkId,
      payload: payloadHex
    }), timeoutMs);
    if (!transactions || !transactions.length) return fail('KASPA_POF_TN10_NO_TRANSACTIONS_CREATED', 'createTransactions returned no transactions');

    const feeEstimate = summarizeFeeEstimate({ summary, amount, priorityFee, payloadJson });
    const policy = validateTn10BroadcastPolicy({
      networkId,
      enableBroadcast,
      acknowledgement,
      privateKeyHex,
      feeEstimate,
      feeCapSompi
    });
    if (!policy.ok) return policy;

    const transactionIds = [];
    const submitted = [];
    for (const pending of transactions) {
      pending.sign([privateKey], true);
      const localTransactionId = String(pending.transaction && pending.transaction.id ? pending.transaction.id : '');
      const safeJson = pending.serializeToSafeJSON ? pending.serializeToSafeJSON() : '';
      if (safeJson && !safeJson.includes(payloadHex)) {
        return fail('KASPA_POF_TN10_PAYLOAD_NOT_IN_TRANSACTION', 'signed transaction does not contain expected anchor payload');
      }
      const submittedTxid = String(await withTimeout('pending.submit', pending.submit(rpc), timeoutMs));
      transactionIds.push(submittedTxid || localTransactionId);
      submitted.push({ transactionId: submittedTxid || localTransactionId, localTransactionId });
    }

    return {
      ok: true,
      claimLevel: 'tn10_tx_anchored',
      networkId,
      phase,
      sourceAddress: sourceAddress.toString(),
      destinationAddress: String(destination),
      amountSompi: amount.toString(),
      priorityFeeSompi: priorityFee.toString(),
      feeEstimate: policy.feeEstimate,
      feeCapSompi: policy.feeCapSompi,
      payloadHash,
      payloadBytes: Buffer.byteLength(payloadJson),
      payload: payloadHex,
      transactionIds,
      submitted,
      submittedAt: new Date().toISOString(),
      rpc: { serverInfo: sanitizeJson(serverInfo) }
    };
  } catch (error) {
    return classifySubmitError(error);
  } finally {
    if (connected) await withTimeout('rpc.disconnect', rpc.disconnect(), 10000).catch(() => undefined);
  }
}

function summarizeFeeEstimate({ summary, amount, priorityFee, payloadJson }) {
  const json = sanitizeJson(summary && typeof summary.toJSON === 'function' ? summary.toJSON() : summary || {});
  const estimatedFee = pickSompi(json, ['fees', 'fee', 'totalFees', 'aggregateFees']) || priorityFee;
  return {
    networkId: 'testnet-10',
    estimatedFeeSompi: estimatedFee.toString(),
    priorityFeeSompi: priorityFee.toString(),
    totalSpendSompi: (amount + estimatedFee).toString(),
    payloadBytes: Buffer.byteLength(payloadJson),
    estimateLevel: 'created_transaction_summary',
    summary: json
  };
}

function pickSompi(object, keys) {
  for (const key of keys) {
    if (object[key] !== undefined) return parseSompi(object[key], `summary.${key}`);
  }
  return undefined;
}

function sanitizeJson(value) {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(sanitizeJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, sanitizeJson(child)]));
  }
  return value;
}

async function loadKaspaWasm(wasmPackage) {
  const dynamicImport = Function('specifier', 'return import(specifier)');
  const { createRequire } = await dynamicImport('node:module');
  const require = createRequire(import.meta.url);
  return require(wasmPackage);
}

function envValue(name) {
  return typeof process !== 'undefined' && process && process.env ? process.env[name] : undefined;
}

function withTimeout(label, promise, timeoutMs) {
  let timer;
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    })
  ]);
}

function fail(code, message, extra = {}) {
  return { ok: false, code, message, ...extra };
}

function classifySubmitError(error) {
  const message = error && error.message ? error.message : String(error || 'TN10 anchor submission failed');
  if (/storage mass exceeds maximum/i.test(message)) {
    return fail(
      'KASPA_POF_TN10_STORAGE_MASS_EXCEEDS_MAXIMUM',
      message,
      { hint: 'Increase amountSompi for the anchor output or reduce payload size before retrying.' }
    );
  }
  return fail('KASPA_POF_TN10_SUBMIT_FAILED', message);
}

export {
  DEFAULT_KASPA_WASM_PKG,
  submitTn10AnchorTransaction
};
