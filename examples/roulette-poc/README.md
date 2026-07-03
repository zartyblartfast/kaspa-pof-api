# Roulette PoC package-runtime consumer

This example is a roulette-specific consumer of the generalized `kaspa-pof-api` npm runtime.

Trust boundary:

- The roulette PoC server owns roulette round orchestration, hidden server-seed custody, chip-ledger locking, and TN10 evidence fetching.
- The server starts each spin as a diagnostic SSE session, locks the chip ledger, fetches TN10 evidence, and streams live progress events while the browser waits.
- The final SSE event returns a portable `tn10_future_entropy` proof bundle containing commitment, ledger, TN10 block evidence, reveal data, and roulette outcome evidence.
- The browser imports `kaspa-pof-api/browser` from this example's installed `node_modules/kaspa-pof-api@0.1.0-alpha.2` dependency and calls `verifyFairnessProof()` itself after the proof bundle arrives.
- The browser displays the package verifier result. There is no trusted legacy proof-verdict endpoint.
- The browser also displays demo-unit-only round accounting after package verification: round stake, returned units, round net, and a browser-memory-only session P/L guarded by settled round IDs. This accounting is not persisted, not sent to the server, and not included in proof bundles.
- The server writes per-spin JSONL diagnostics to `examples/roulette-poc/.runtime/spins/<spinId>.jsonl`; these logs intentionally summarize proof/timing data and do not log the hidden server seed. Public HTTP/SSE payloads expose only spin/diagnostic ids, not filesystem log paths.
- The compact proof summary and expanded Proof of Fairness flowchart are both driven by `flowchart-spec.json`. The full sequence is: committed round ready -> package commitment fixed -> player places chips -> spin locks ledger -> package hashes ledger -> TN10 future entropy -> proof bundle returned -> package outcome replay -> browser package verification.

Run from the repository root:

```bash
npm install --prefix examples/roulette-poc
node examples/roulette-poc/server.cjs
```

Then open:

```text
http://127.0.0.1:8123/examples/roulette-poc/
```

Required live dependency:

- `KASPA_WASM_PKG` must point at a local rusty-kaspa WASM Node.js package exposing `RpcClient`, `Resolver`, and `Encoding`.
- The default path is `/tmp/kaspa-pof-api-spikes/rusty-kaspa/wasm/nodejs/kaspa`.

Optional live RPC tuning:

- `ROULETTE_KASPA_WRPC_ENDPOINTS` can provide a comma-separated list of preferred WRPC/Borsh endpoints. On TN10, the server defaults to the public `muon`, `quark`, and `vector` testnet endpoints.
- `ROULETTE_KASPA_WRPC_CONNECT_RACE_MS` bounds each explicit endpoint dial attempt during the endpoint race. The first endpoint to connect wins; timed-out endpoints are temporarily penalized.
- `ROULETTE_KASPA_WRPC_ENDPOINT_PENALTY_MS` controls how long a timed-out or failed endpoint is deprioritized.
- If all configured endpoints fail the bounded race, the server falls back to the rusty-kaspa resolver and records that fallback in the per-spin diagnostics.

Optional public-demo retention tuning:

- `ROULETTE_ROUND_RETENTION_TTL_MS` bounds in-memory round lifetime; default `3600000`.
- `ROULETTE_SPIN_RETENTION_TTL_MS` bounds in-memory spin/SSE event lifetime; default `3600000`.
- `ROULETTE_MAX_RETAINED_ROUNDS` bounds retained in-memory rounds; default `1000`.
- `ROULETTE_MAX_RETAINED_SPINS` bounds retained in-memory spins; default `1000`.
- `ROULETTE_ROUND_RATE_LIMIT_MAX` / `ROULETTE_ROUND_RATE_LIMIT_WINDOW_MS` limit public `POST /examples/roulette-poc/rounds`; defaults `30` per `60000` ms per client address.
- `ROULETTE_SPIN_RATE_LIMIT_MAX` / `ROULETTE_SPIN_RATE_LIMIT_WINDOW_MS` limit public `POST /examples/roulette-poc/rounds/:roundId/spins`; defaults `10` per `60000` ms per client address.
- The public service deployment should install `ops/logrotate.d/kaspa-pof-roulette-spins` to rotate `/var/log/kaspa-pof-roulette/spins/*.jsonl`.
- `HEAD /examples/roulette-poc/health` is supported for uptime checks without a response body; `GET` still returns the JSON health payload.

The package core stays app-agnostic. Roulette-specific result derivation remains in this example consumer through the `roulette-poc:number-v1` outcome deriver.
