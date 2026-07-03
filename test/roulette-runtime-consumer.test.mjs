import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

const APP_PATH = new URL('../examples/roulette-poc/app.js', import.meta.url);
const INDEX_PATH = new URL('../examples/roulette-poc/index.html', import.meta.url);
const FLOW_PATH = new URL('../examples/roulette-poc/flowchart-spec.json', import.meta.url);
const SERVER_PATH = new URL('../examples/roulette-poc/server.cjs', import.meta.url);
const WHEEL_PATH = new URL('../examples/roulette-poc/roulette-wheel-renderer.js', import.meta.url);
const EXAMPLE_PACKAGE_PATH = new URL('../examples/roulette-poc/package.json', import.meta.url);

describe('roulette package-runtime consumer', () => {
  it('uses the published npm browser export instead of local repo source or a legacy HTTP proof client', () => {
    const app = fs.readFileSync(APP_PATH, 'utf8');
    const index = fs.readFileSync(INDEX_PATH, 'utf8');
    const examplePackage = JSON.parse(fs.readFileSync(EXAMPLE_PACKAGE_PATH, 'utf8'));

    assert.match(app, /from 'kaspa-pof-api\/browser'/);
    assert.match(app, /verifyFairnessProof/);
    assert.match(app, /deriveOutcome/);
    assert.equal(examplePackage.dependencies['kaspa-pof-api'], '0.1.0-alpha.2');
    assert.match(index, /"kaspa-pof-api\/browser"/);
    assert.match(index, /node_modules\/kaspa-pof-api\/src\/browser\.mjs/);
    assert.doesNotMatch(index, /"\/src\/browser\.mjs"|"kaspa-pof-api"\s*:\s*"\/src\//);
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
    assert.match(app, /EventSource/);
    assert.match(app, /diagnosticsPanel/);
    assert.doesNotMatch(app, /local_bundle_only|deriveLocalEntropy|browser-local-bundle-entropy|Local bundle entropy/i);
    assert.match(index, /kaspa-pof-api package runtime/i);
    assert.doesNotMatch(index, /Kaspa Toccata API|API round|returned by the API|local_bundle_only/i);
    assert.match(flow, /TN10 Future Entropy/i);
    assert.match(flow, /Package Runtime/i);
    assert.match(app, /drawFlowchartEdges/);
    assert.match(app, /marker-end/);
    assert.doesNotMatch(app, /renderEdgeConnector/);
    assert.doesNotMatch(flow, /returned by the API|GET \/entropy|\/v1\/|local_bundle_only/i);
    assert.doesNotMatch(layout, /\/v1 API responses/i);
    assert.doesNotMatch(index, /"\/src\/browser\.mjs"|"kaspa-pof-api"\s*:\s*"\/src\//);
  });

  it('keeps the full flowchart sequence aligned with the compact summary', () => {
    const flow = JSON.parse(fs.readFileSync(FLOW_PATH, 'utf8'));
    const edgePairs = flow.edges.map((edge) => [edge.from, edge.to]);
    const expectedPath = [
      ['round-ready', 'commitment'],
      ['commitment', 'chips'],
      ['chips', 'spin'],
      ['spin', 'ledger'],
      ['ledger', 'tn10-entropy'],
      ['tn10-entropy', 'proof-bundle'],
      ['proof-bundle', 'outcome'],
      ['outcome', 'verified'],
    ];
    assert.deepEqual(edgePairs, expectedPath);

    const compactNodes = new Set(flow.compact.rows.flatMap((row) => row.nodeIds).filter(Boolean));
    for (const node of expectedPath.flat()) assert.ok(compactNodes.has(node), `${node} missing from compact summary`);
    const nodeTitles = new Map(flow.nodes.map((node) => [node.id, node.title]));
    assert.equal(nodeTitles.get('commitment'), 'Commitment fixed');
    assert.equal(nodeTitles.get('chips'), 'Player places chips');
    assert.equal(nodeTitles.get('verified'), 'Browser package verifies proof');
  });

  it('keeps roulette demo-unit accounting browser-local and gated by browser proof verification', () => {
    const app = fs.readFileSync(APP_PATH, 'utf8');
    const index = fs.readFileSync(INDEX_PATH, 'utf8');
    const server = fs.readFileSync(SERVER_PATH, 'utf8');

    assert.match(index, /id="demoAccountingCard"/);
    assert.match(app, /calculateRoulettePayout/);
    assert.match(app, /coveredNumbers/);
    assert.match(app, /payoutMultiplier/);
    assert.match(app, /amount \* \(payoutMultiplier \+ 1\)/);
    assert.match(app, /state\.sessionProfitLoss \+= accounting\.net/);
    assert.match(app, /state\.settledRoundIds\.has\(roundId\)/);
    assert.match(app, /state\.settledRoundIds\.add\(roundId\)/);
    assert.match(app, /settleRoundAccounting\(verification\)/);
    assert.match(app, /verification\.ok/);
    assert.match(app, /Round was not settled because browser proof verification failed/);
    assert.match(app, /Demo units only\. TN10\/mainnet fees are proof\/evidence costs, not player wager or payout currency\./);
    assert.match(app, /Round stake/);
    assert.match(app, /Returned/);
    assert.match(app, /Session P\/L/);
    assert.doesNotMatch(app, /localStorage|sessionStorage|document\.cookie/);
    assert.doesNotMatch(server, /sessionProfitLoss|roundAccounting|payoutMultiplier|demoAccountingCard/);
    assert.doesNotMatch(app, /KAS wager|KAS payout|TN10 wager|TN10 payout|bankroll|deposit|withdraw/i);
  });

  it('ships a roulette-specific server that supplies TN10 evidence but not a trusted verify endpoint', () => {
    const server = fs.readFileSync(SERVER_PATH, 'utf8');

    assert.match(server, /RpcClient/);
    assert.match(server, /getBlockDagInfo/);
    assert.match(server, /getBlock\(/);
    assert.match(server, /deriveEntropyHash/);
    assert.match(server, /verifyFairnessProof/);
    assert.match(server, /tn10_future_entropy/);
    assert.match(server, /text\/event-stream/);
    assert.match(server, /appendSpinLog/);
    assert.match(server, /ROULETTE_RUNTIME_LOG_ROOT/);
    assert.match(server, /rpc_connected/);
    assert.match(server, /rpc_disconnected/);
    assert.match(server, /rpc_endpoint_connected/);
    assert.match(server, /ROULETTE_KASPA_WRPC_ENDPOINTS/);
    assert.match(server, /WRPC_CONNECT_RACE_MS/);
    assert.match(server, /RpcConnectMs/);
    assert.match(server, /ROULETTE_MAX_RETAINED_ROUNDS/);
    assert.match(server, /ROULETTE_MAX_RETAINED_SPINS/);
    assert.match(server, /ROULETTE_ROUND_RETENTION_TTL_MS/);
    assert.match(server, /ROULETTE_SPIN_RETENTION_TTL_MS/);
    assert.match(server, /pruneRetainedState/);
    assert.match(server, /req\.method === 'HEAD'/);
    assert.match(server, /require\('kaspa-pof-api'\)/);
    assert.match(server, /roulette-wheel-renderer\.js/);
    assert.doesNotMatch(server, /logPath: spin\.logPath/);
    assert.doesNotMatch(server, /require\('\.\.\/\.\.\/src\/index\.cjs'\)|\/src\/browser\.mjs|path\.join\(ROOT, 'src\//);
    assert.doesNotMatch(server, /local_bundle_only|\/v1\/proofs\/verify|verified\s*:\s*true/i);
  });

  it('keeps the roulette wheel visual-only and gates result reveal on browser verification', () => {
    const app = fs.readFileSync(APP_PATH, 'utf8');
    const index = fs.readFileSync(INDEX_PATH, 'utf8');
    const wheel = fs.readFileSync(WHEEL_PATH, 'utf8');

    assert.match(index, /id="wheelHost"/);
    assert.match(index, /roulette-wheel-renderer\.js/);
    assert.match(wheel, /EUROPEAN_WHEEL_ORDER/);
    assert.match(wheel, /WHEEL_TUNING/);
    assert.match(wheel, /renderRouletteWheel/);
    assert.match(wheel, /targetAngleForNumber/);
    assert.match(app, /MIN_WHEEL_SPIN_MS\s*=\s*3000/);
    assert.match(app, /completeWheelReveal/);
    assert.match(app, /resultRevealReady/);
    assert.match(app, /state\.verification && state\.verification\.ok/);
    assert.match(app, /wheel simulation completes/);
    assert.match(app, /settleRoundAccounting\(verification\)/);
    assert.doesNotMatch(wheel, /fetch\(|EventSource|verifyFairnessProof|deriveOutcome|localStorage|sessionStorage/);
  });
});
