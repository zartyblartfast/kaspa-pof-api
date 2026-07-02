import { sha256Hex } from './commitment.mjs';

function hashLedger(entries) {
  if (!Array.isArray(entries)) {
    throw new TypeError('entries must be an array');
  }

  return sha256Hex(canonicalJson(entries));
}

function verifyLedger({ entries, ledgerHash } = {}) {
  if (!Array.isArray(entries) || typeof ledgerHash !== 'string') {
    return {
      ok: false,
      code: 'KASPA_POF_LEDGER_INPUT_MISSING',
      message: 'entries must be an array and ledgerHash must be a string'
    };
  }

  let actual;
  try {
    actual = hashLedger(entries);
  } catch (error) {
    return {
      ok: false,
      code: 'KASPA_POF_LEDGER_NON_PORTABLE_JSON',
      message: error.message
    };
  }

  const expected = ledgerHash.toLowerCase();
  return {
    ok: actual === expected,
    expected,
    actual
  };
}

function canonicalJson(value) {
  if (value === null) return 'null';

  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }

  const valueType = typeof value;

  if (valueType === 'string') return JSON.stringify(value);
  if (valueType === 'boolean') return value ? 'true' : 'false';
  if (valueType === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('entries contain a non-portable JSON value');
    return JSON.stringify(value);
  }

  if (valueType === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('entries contain a non-portable JSON value');
    }

    return `{${Object.keys(value)
      .sort()
      .map((key) => {
        const child = value[key];
        if (child === undefined || typeof child === 'function' || typeof child === 'symbol' || typeof child === 'bigint') {
          throw new TypeError('entries contain a non-portable JSON value');
        }
        return `${JSON.stringify(key)}:${canonicalJson(child)}`;
      })
      .join(',')}}`;
  }

  throw new TypeError('entries contain a non-portable JSON value');
}

export {
  canonicalJson,
  hashLedger,
  verifyLedger
};
