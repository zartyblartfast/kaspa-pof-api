# Roulette PoC package-runtime consumer

This example is a roulette-specific consumer of the generalized `kaspa-pof-api` npm runtime.

Trust boundary:

- The roulette PoC server owns roulette round orchestration, hidden server-seed custody, chip-ledger locking, and TN10 evidence fetching.
- The server starts each spin as a diagnostic SSE session, locks the chip ledger, fetches TN10 evidence, and streams live progress events while the browser waits.
- The final SSE event returns a portable `tn10_future_entropy` proof bundle containing commitment, ledger, TN10 block evidence, reveal data, and roulette outcome evidence.
- The browser imports `kaspa-pof-api` through the import map and calls `verifyFairnessProof()` itself after the proof bundle arrives.
- The browser displays the package verifier result. There is no trusted legacy proof-verdict endpoint.
- The server writes per-spin JSONL diagnostics to `examples/roulette-poc/.runtime/spins/<spinId>.jsonl`; these logs intentionally summarize proof/timing data and do not log the hidden server seed.

Run from the repository root:

```bash
node examples/roulette-poc/server.cjs
```

Then open:

```text
http://127.0.0.1:8123/examples/roulette-poc/
```

Required live dependency:

- `KASPA_WASM_PKG` must point at a local rusty-kaspa WASM Node.js package exposing `RpcClient`, `Resolver`, and `Encoding`.
- The default path is `/tmp/kaspa-toccata-api-spikes/rusty-kaspa-toccata/wasm/nodejs/kaspa`.

Optional live RPC tuning:

- `ROULETTE_KASPA_WRPC_ENDPOINTS` can provide a comma-separated list of preferred WRPC/Borsh endpoints. On TN10, the server defaults to the public `muon`, `quark`, and `vector` testnet endpoints.
- `ROULETTE_KASPA_WRPC_CONNECT_RACE_MS` bounds each explicit endpoint dial attempt during the endpoint race. The first endpoint to connect wins; timed-out endpoints are temporarily penalized.
- `ROULETTE_KASPA_WRPC_ENDPOINT_PENALTY_MS` controls how long a timed-out or failed endpoint is deprioritized.
- If all configured endpoints fail the bounded race, the server falls back to the rusty-kaspa resolver and records that fallback in the per-spin diagnostics.

The package core stays app-agnostic. Roulette-specific result derivation remains in this example consumer through the `roulette-poc:number-v1` outcome deriver.
