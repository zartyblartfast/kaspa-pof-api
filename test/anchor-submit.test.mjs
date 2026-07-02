import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { submitTn10AnchorTransaction } from '../src/index.mjs';

const acknowledgement = 'I understand this spends TN10 testnet funds';

function fakeKaspaKit(observed = {}) {
  class PrivateKey {
    constructor(hex) { this.hex = hex; }
    toKeypair() {
      return { toAddress: () => ({ toString: () => 'kaspatest:qsource' }) };
    }
  }
  class Resolver {
    getUrl() { return Promise.resolve('wss://fake-tn10'); }
  }
  class RpcClient {
    constructor() { this.url = 'wss://fake-tn10'; }
    connect() { observed.connected = true; return Promise.resolve(); }
    disconnect() { observed.disconnected = true; return Promise.resolve(); }
    getServerInfo() { return Promise.resolve({ networkId: 'testnet-10', isSynced: true, hasUtxoIndex: true }); }
    getUtxosByAddresses() {
      return Promise.resolve({ entries: [{ amount: '2000000', isCoinbase: false, outpoint: { transactionId: 'd'.repeat(64), index: 0 } }] });
    }
  }
  async function createTransactions(input) {
    observed.createInput = input;
    return {
      summary: { fees: '1000', finalTransactionAmount: '1001000' },
      transactions: [{
        transaction: { id: 'e'.repeat(64) },
        sign(keys, requireAllSignatures) { observed.signed = { keyCount: keys.length, requireAllSignatures }; },
        serializeToSafeJSON() { return `payload:${input.payload}`; },
        submit(rpc) { observed.submittedWithRpc = rpc.url; return Promise.resolve('f'.repeat(64)); }
      }]
    };
  }
  return { PrivateKey, Resolver, RpcClient, Encoding: { Borsh: 'borsh' }, createTransactions };
}

describe('TN10 anchor transaction submission', () => {
  it('submits a signed TN10 anchor transaction only when explicit gates and fee cap pass', async () => {
    const observed = {};
    const result = await submitTn10AnchorTransaction({
      kaspa: fakeKaspaKit(observed),
      phase: 'commit',
      payload: { roundId: 'round-1', commitment: '1'.repeat(64) },
      privateKeyHex: 'a'.repeat(64),
      amountSompi: '1000000',
      priorityFeeSompi: '0',
      feeCapSompi: '2000',
      enableBroadcast: true,
      acknowledgement
    });

    assert.equal(result.ok, true);
    assert.equal(result.networkId, 'testnet-10');
    assert.deepEqual(result.transactionIds, ['f'.repeat(64)]);
    assert.equal(result.payloadHash.length, 64);
    assert.equal(result.feeEstimate.estimatedFeeSompi, '1000');
    assert.equal(observed.signed.keyCount, 1);
    assert.equal(observed.submittedWithRpc, 'wss://fake-tn10');
  });

  it('fails closed before signing or submit when the explicit fee cap is too low', async () => {
    const observed = {};
    const result = await submitTn10AnchorTransaction({
      kaspa: fakeKaspaKit(observed),
      phase: 'commit',
      payload: { roundId: 'round-1', commitment: '1'.repeat(64) },
      privateKeyHex: 'a'.repeat(64),
      amountSompi: '1000000',
      feeCapSompi: '999',
      enableBroadcast: true,
      acknowledgement
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_TN10_FEE_CAP_EXCEEDED');
    assert.equal(observed.signed, undefined);
    assert.equal(observed.submittedWithRpc, undefined);
  });

  it('fails closed before constructing a signer when the private key shape is invalid', async () => {
    let signerConstructed = false;
    const kaspa = fakeKaspaKit({});
    kaspa.PrivateKey = class PrivateKey {
      constructor() { signerConstructed = true; }
    };

    const result = await submitTn10AnchorTransaction({
      kaspa,
      phase: 'commit',
      payload: { roundId: 'round-1', commitment: '1'.repeat(64) },
      privateKeyHex: 'not-a-key',
      amountSompi: '1000000',
      feeCapSompi: '999',
      enableBroadcast: true,
      acknowledgement
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_TN10_PRIVATE_KEY_INVALID');
    assert.equal(signerConstructed, false);
  });

  it('classifies Kaspa storage-mass rejections before signing or submit', async () => {
    const observed = {};
    const kaspa = fakeKaspaKit(observed);
    kaspa.createTransactions = async () => {
      throw 'Storage mass exceeds maximum';
    };

    const result = await submitTn10AnchorTransaction({
      kaspa,
      phase: 'proof-root',
      payload: { roundId: 'round-1', commitment: '1'.repeat(64) },
      privateKeyHex: 'a'.repeat(64),
      amountSompi: '1000000',
      feeCapSompi: '1000000',
      enableBroadcast: true,
      acknowledgement
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'KASPA_POF_TN10_STORAGE_MASS_EXCEEDS_MAXIMUM');
    assert.match(result.message, /Storage mass exceeds maximum/);
    assert.equal(observed.signed, undefined);
    assert.equal(observed.submittedWithRpc, undefined);
  });
});
