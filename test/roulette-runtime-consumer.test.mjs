import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

const APP_PATH = new URL('../examples/roulette-poc/app.js', import.meta.url);
const INDEX_PATH = new URL('../examples/roulette-poc/index.html', import.meta.url);
const FLOW_PATH = new URL('../examples/roulette-poc/flowchart-spec.json', import.meta.url);
const SERVER_PATH = new URL('../examples/roulette-poc/server.cjs', import.meta.url);

describe('roulette package-runtime consumer', () => {
  it('uses package runtime primitives instead of a legacy HTTP proof client', () => {
    const app = fs.readFileSync(APP_PATH, 'utf8');

    assert.match(app, /from 'kaspa-pof-api'/);
    assert.match(app, /verifyFairnessProof/);
    assert.match(app, /deriveOutcome/);
    assert.doesNotMatch(app, /createToccataApiClient|apiClient\.|verifyProof\(|getProof\(|\/v1\//);
  });

  it('requires the roulette PoC to verify TN10 future-entropy proofs locally through the package runtime', () => {
    const app = fs.readFileSync(APP_PATH, 'utf8');
    const index = fs.readFileSync(INDEX_PATH, 'utf8');
    const flow = fs.readFileSync(FLOW_PATH, 'utf8');
    const layout = fs.readFileSync(new URL('../examples/roulette-poc/roulette-table-layout.js', import.meta.url), 'utf8');

    assert.match(app, /verifyFairnessProof/);
    assert.match(app, /outcomeDerivers/);
    assert.match(app, /tn10_future_entropy/);
    assert.match(app, /fetch\(/);
    assert.doesNotMatch(app, /local_bundle_only|deriveLocalEntropy|browser-local-bundle-entropy|Local bundle entropy/i);
    assert.match(index, /kaspa-pof-api package runtime/i);
    assert.doesNotMatch(index, /Kaspa Toccata API|API round|returned by the API|local_bundle_only/i);
    assert.match(flow, /TN10 Future Entropy/i);
    assert.match(flow, /Package Runtime/i);
    assert.doesNotMatch(flow, /returned by the API|GET \/entropy|\/v1\/|local_bundle_only/i);
    assert.doesNotMatch(layout, /\/v1 API responses/i);
  });

  it('ships a roulette-specific server that supplies TN10 evidence but not a trusted verify endpoint', () => {
    const server = fs.readFileSync(SERVER_PATH, 'utf8');

    assert.match(server, /RpcClient/);
    assert.match(server, /getBlockDagInfo/);
    assert.match(server, /getBlock\(/);
    assert.match(server, /deriveEntropyHash/);
    assert.match(server, /verifyFairnessProof/);
    assert.match(server, /tn10_future_entropy/);
    assert.doesNotMatch(server, /local_bundle_only|\/v1\/proofs\/verify|verified\s*:\s*true/i);
  });
});
