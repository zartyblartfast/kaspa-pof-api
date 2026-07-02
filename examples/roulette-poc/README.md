# Roulette PoC package-runtime consumer

This example is a roulette-specific consumer of the generalized `kaspa-pof-api` npm runtime.

Trust boundary:

- The roulette PoC server owns roulette round orchestration, hidden server-seed custody, chip-ledger locking, and TN10 evidence fetching.
- The server returns a portable `tn10_future_entropy` proof bundle containing commitment, ledger, TN10 block evidence, reveal data, and roulette outcome evidence.
- The browser imports `kaspa-pof-api` through the import map and calls `verifyFairnessProof()` itself.
- The browser displays the package verifier result. There is no trusted legacy proof-verdict endpoint.

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

The package core stays app-agnostic. Roulette-specific result derivation remains in this example consumer through the `roulette-poc:number-v1` outcome deriver.
