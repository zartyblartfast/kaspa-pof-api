# API Status

Guarded TN10 write endpoint surface with dry-runs forbidden, Milestone 4 live TN10 future entropy round, live-TN10-only API policy enforcement, typed client/package boundary, and Milestone 1 live TN10 status API shell are implemented and verified. JSON persistence remains a temporary dev/test seam only.

## Implemented endpoints

```text
GET  /v1/health
GET  /v1/capabilities
GET  /v1/network/status
POST /v1/rounds
GET  /v1/rounds/:roundId
POST /v1/rounds/:roundId/commit
POST /v1/rounds/:roundId/bets/ledger
POST /v1/rounds/:roundId/close
GET  /v1/rounds/:roundId/entropy
POST /v1/rounds/:roundId/reveal
GET  /v1/rounds/:roundId/proof
POST /v1/proofs/verify
POST /v1/rounds/:roundId/commit/tx
POST /v1/rounds/:roundId/close/tx
POST /v1/rounds/:roundId/reveal/tx
```

Future entropy uses the same lifecycle endpoints. Pass `entropyMode: "live_tn10_future"` and `targetOffsetDaaScore` to `POST /v1/rounds/:roundId/close` to fix a future TN10 DAA-score target and later fetch live entropy evidence through `GET /v1/rounds/:roundId/entropy`.

## Current stage

Runtime/API presentation spike scaffold plus npm/Toccata WASM source/build/import/covenant-construction/live-TN10-read checks, own npm wrapper package-boundary check, JS/TS live transaction write/submit-surface check, guarded live TN10 broadcast spike scaffold, live broadcast validation for txid `79e2aa3be09dc0847a7888aea06437a0793c72b97e76cd83205f14425b436021`, Milestone 1 live TN10 status API shell, and live-TN10-only API policy enforcement.

The npm/WASM spike validates that official `kaspanet/rusty-kaspa` branch `toccata`:

- contains JS/WASM-facing covenant primitives;
- builds a Node WASM package via `wasm-pack`;
- imports from Node;
- exposes covenant-related exports;
- can construct `CovenantBinding`, `GenesisCovenantGroup`, and `TransactionOutput` with a covenant binding;
- can connect from Node to live TN10 wRPC via public resolver/Borsh transport;
- can fetch live `getServerInfo()` and `getBlockDagInfo()` from TN10.

The wrapper package spike validates that a temporary own package `@kaspa-toccata/core` can vendor the built official WASM package, pack with `npm pack`, include `kaspa_bg.wasm`, install into a clean consumer, import through the wrapper boundary, and construct covenant primitives.

The JS/TS transaction spike validates live API commit transaction construction, signing, submission, txid recording, and external TN10 REST evidence retrieval.

A guarded live TN10 broadcast spike transaction was validated at txid `79e2aa3be09dc0847a7888aea06437a0793c72b97e76cd83205f14425b436021`. The API live commit endpoint was later validated with real TN10 commit txid `5576e597aa80197de50dd6dfe3f9c351ba5c8c58b5e7d9be33bc82b5d86258e8`, confirmed through `api-tn10.kaspa.org` with accepting block hash `7a7177a5da86857e4e0a32ca2afbb4828d370eae42a76e4873764eaad325b60a`.

The future entropy lifecycle fixes a future target blue score at close using `getSinkBlueScore()`, waits/fetches live TN10 block evidence at or after the target blue score, derives roulette result material from that evidence, and verifies proof replay with `claimLevel: tn10_future_entropy`.

Optional file-backed round persistence is available with `TOCCATA_ROUND_STORE_FILE=/path/to/round-store.json`. The store is JSON, atomically rewritten, reloads on server start, and is currently a dev/test state-provider seam rather than a production database.

The Milestone 1 service uses the built official WASM package from `KASPA_WASM_PKG` or `/tmp/kaspa-toccata-api-spikes/rusty-kaspa-toccata/wasm/nodejs/kaspa`. Generated WASM artifacts are not committed to this repo.

The previous local lifecycle path has been disabled as a public API path. Round setup is `live_tn10_pending`; entropy/proof behavior must use live TN10 evidence.

A reusable client boundary exists at `src/client.cjs` with TypeScript declarations at `src/client.d.ts`; a browser-compatible ESM export now exists at `src/client.mjs`. The package export maps CommonJS consumers to `client.cjs` and ESM/import consumers to `client.mjs`. `scripts/client-package-boundary-smoke.sh` verifies a packed local package, and `scripts/npm-client-readiness-smoke.sh` verifies publish-ready tarball contents. The public npm package `kaspa-toccata-api@0.1.1` is published and registry-install verified; the local repo now has an unpublished ESM export change for the roulette PoC package-import path.

The basic browser/API test page at `demo/basic-api-test.html` is served by `node src/server.cjs` and calls the same `/v1/*` API surface wrapped by the npm client. Its state flow now has explicit reset/new-round behavior, next-action guidance, disabled transaction buttons until required state steps are complete, disabled completed phase transaction buttons, and `live_<phase>_already_recorded` handling that fetches/shows existing `tn10Writes` txids. Button-level API behavior and roulette proof-of-fairness mapping are documented in `docs/BASIC_WEB_DEMO_BUTTONS.md`.

The first roulette PoC scaffold was rejected because it looked too much like the API demo/test page. It has now been replaced by the corrected two-section UI under `apps/roulette-poc/`: table-first `Roulette Game` above a `Proof of Fairness` area. The proof UX uses `apps/roulette-poc/flowchart-spec.json` as a static design/help spec: a compact two-row live status strip remains visible near the roulette table, and the full env095-style vertical flowchart is collapsible below. Compact labels avoid bare jargon (`Entropy` instead of `TN10`) and include hover/focus `i` help plus allow-listed project-doc links. The app imports `createToccataApiClient` from `kaspa-toccata-api` via the browser import map to `/src/client.mjs`, uses live API/client responses for round state/result/proof/verification, and keeps raw API JSON behind flowchart `More info` disclosures rather than presenting a JSON wall.

The guarded write endpoints reject dry-run requests with `400 dry_run_forbidden`. This is intentional: transaction mock/preflight paths are considered a fixture trap. Commit, close, and reveal write endpoints now have real live TN10 paths behind explicit gates: they derive the env-supplied testnet key address, connect to TN10, look up funded non-coinbase UTXOs, build transactions with phase-specific payloads, sign, submit, record transaction IDs/evidence on the round, and fail closed rather than mocking when gates/funds are absent. Reveal live write implementation is implemented behind explicit gates.

## Smoke scripts

```bash
scripts/api-smoke.sh
scripts/api-live-contract-smoke.sh
scripts/basic-web-api-test-smoke.sh
scripts/live-only-policy-smoke.sh
scripts/client-lifecycle-smoke.sh
scripts/client-package-boundary-smoke.sh
scripts/npm-client-readiness-smoke.sh
scripts/future-entropy-round-smoke.sh
scripts/proof-transaction-evidence-smoke.sh
scripts/persistence-smoke.sh
scripts/tn10-write-round-smoke.sh
scripts/tn10-live-commit-smoke.sh
scripts/tn10-live-close-smoke.sh
scripts/tn10-live-reveal-smoke.sh
```

Latest verified output for `scripts/api-smoke.sh`:

```text
API_PREREQ_KASPA_WASM_PKG=PASS
HEALTH_OK=PASS
CAPABILITIES_OK=PASS
TN10_STATUS_OK=PASS
NO_STATIC_APP_FIXTURES=PASS
```

Latest verified output for `scripts/api-live-contract-smoke.sh`:

```text
API_HEALTH=PASS
API_CAPABILITIES=PASS
TN10_STATUS=PASS
ROUND_CREATE=PASS
ROUND_COMMIT_STATE=PASS
ROUND_COMMIT_TX_FAIL_CLOSED=PASS
LOCAL_ENTROPY_DISABLED=PASS
DRY_RUN_FORBIDDEN=PASS
ROUND_CLOSE_STATE=PASS
ROUND_CLOSE_TX_FAIL_CLOSED=PASS
API_LIVE_CONTRACT_READY=PASS
NO_STATIC_APP_FIXTURES=PASS
```

Latest verified output for `scripts/live-only-policy-smoke.sh`:

```text
ROUND_CREATE_LIVE_PENDING_OK=PASS
ROUND_COMMIT_STATE_ONLY_OK=PASS
LOCAL_ENTROPY_DISABLED=PASS
DRY_RUN_FORBIDDEN=PASS
NO_STATIC_APP_FIXTURES=PASS
```

Latest verified output for `scripts/client-lifecycle-smoke.sh`:

```text
CLIENT_HEALTH_OK=PASS
CLIENT_CAPABILITIES_OK=PASS
CLIENT_TN10_STATUS_OK=PASS
CLIENT_ROUND_CREATE_OK=PASS
CLIENT_ROUND_GET_OK=PASS
CLIENT_ROUND_COMMIT_OK=PASS
CLIENT_BET_LEDGER_OK=PASS
CLIENT_CLOSE_OK=PASS
CLIENT_TN10_ENTROPY_OK=PASS
CLIENT_ROUND_REVEAL_OK=PASS
CLIENT_PROOF_GET_OK=PASS
CLIENT_PROOF_VERIFY_OK=PASS
NO_STATIC_APP_FIXTURES=PASS
```

Latest verified output for `scripts/client-package-boundary-smoke.sh`:

```text
CLIENT_PACKAGE_PACK_OK=PASS
CLIENT_PACKAGE_CONSUMER_IMPORT=PASS
CLIENT_PACKAGE_CONSUMER_API_CALL=PASS
CLIENT_PACKAGE_TARBALL_CONTENTS_OK=PASS
NO_STATIC_APP_FIXTURES=PASS
```

Latest verified output for `scripts/future-entropy-round-smoke.sh`:

```text
FUTURE_ROUND_CREATE_OK=PASS
FUTURE_COMMIT_OK=PASS
FUTURE_BET_LEDGER_OK=PASS
FUTURE_CLOSE_TARGET_FIXED=PASS
FUTURE_TN10_ENTROPY_FETCH_OK=PASS
FUTURE_REVEAL_OK=PASS
FUTURE_PROOF_GET_OK=PASS
FUTURE_PROOF_VERIFY_OK=PASS
NO_STATIC_APP_FIXTURES=PASS
```

Latest verified output for `scripts/persistence-smoke.sh`:

```text
PERSISTENCE_ROUND_CREATED=PASS
PERSISTENCE_STORE_WRITTEN=PASS
PERSISTENCE_RESTART_STOPPED=PASS
PERSISTENCE_RESTART_STARTED=PASS
PERSISTENCE_ROUND_RELOADED=PASS
PERSISTENCE_LIVE_TN10_PLAN_ONLY=PASS
NO_STATIC_APP_FIXTURES=PASS
```

## Claim levels

Current implemented claim levels:

```text
live_tn10_pending
live_tn10_status
tn10_future_entropy
```

The service exposes guarded TN10 transaction endpoints only; commit has a validated live path, and close/reveal have gated live paths with fail-closed smoke coverage. Toccata covenant-enforced proofs are not implemented yet.

Full planned claim-level ladder:

```text
live_tn10_pending
live_tn10_status
tn10_future_entropy
tn10_write_commit_reveal
toccata_covenant_enforced
```

## Guarded live TN10 broadcast spike

Run fail-closed/default guard check:

```bash
node spikes/live-tn10-broadcast-capability/check-live-tn10-broadcast.js
```

Live broadcast validation recorded:

```text
LIVE_TN10_BROADCAST_TXID=79e2aa3be09dc0847a7888aea06437a0793c72b97e76cd83205f14425b436021
LIVE_TN10_BROADCAST_VERDICT=VALIDATED
```

Keep the guarded script fail-closed by default. Any additional live TN10 broadcast must still require `testnet-10`, `TOCCATA_ENABLE_TN10_WRITES=1`, a private key via environment only, and the exact acknowledgement phrase.

## Live broadcast key/funding investigation

With explicit user approval, checked historical Kaspa Fair Foundation / lab locations for a usable funded TN10 key:

- Foundation profile `.env` files contain no TN10 key material.
- Historical helper key file under `/root/kaspa-fair-lab/spikes/tn12-minimal-covenant/local-secrets/env-059-helper-key/helper-private-key.hex` exists and maps on TN10 to `kaspatest:qzn7auhpkdladk9m20f02dz46clvv7whgumgrm4pex4djesaued0g9wutcqld`, but live TN10 UTXO lookup returned zero spendable entries.
- Another old test key under `/root/kaspa-fair-lab/spikes/tn12-minimal-covenant/local-secrets/env-049-key-address/tn12-test-only-key.private` maps on TN10 to `kaspatest:qqaq5f4ju52g9r869c50n55lmtgku9nsf2pc56y76neaj7rksmewg2ytrxccg`, but live TN10 UTXO lookup returned zero spendable entries.
- Old wallet files `/root/.kaspa/env052-tn10-test-only.wallet` and `/root/.kaspa/env052-tn10-test-only.password` exist, but the password file did not decrypt the wallet in the current CLI attempt (`Unable to decrypt this wallet`). Do not claim this wallet is usable unless a later run proves it.
- A new disposable key was generated locally at `/tmp/toccata-tn10-disposable-key.hex` for possible faucet funding; its public address is `kaspatest:qp6pqywzj8pvmk6l8pl775jqvsvw59md5hqrvtwrfzy2pngcrzgcge2sx3gd2`. The private key must not be printed or committed.
- The TN10 faucet URL documented historically is currently behind Cloudflare challenge from this environment, so automated faucet funding was not completed.


Latest verified output for `scripts/tn10-write-round-smoke.sh`:

```text
NETWORK_GUARD=PASS
WRITE_DEFAULT_DISABLED=PASS
COMMIT_TX_DRY_RUN_FORBIDDEN=PASS
CLOSE_TX_DRY_RUN_FORBIDDEN=PASS
REVEAL_TX_DRY_RUN_FORBIDDEN=PASS
COMMIT_TX_BROADCAST_FAIL_CLOSED=PASS
CLOSE_TX_BROADCAST_FAIL_CLOSED=PASS
REVEAL_TX_BROADCAST_FAIL_CLOSED=PASS
PROOF_VERIFIED=PASS
NO_STATIC_APP_FIXTURES=PASS
```

Latest default/fail-closed output for `scripts/tn10-live-commit-smoke.sh`:

```text
LIVE_COMMIT_NETWORK_GUARD=PASS
LIVE_COMMIT_ROUND_COMMITTED=PASS
LIVE_COMMIT_DEFAULT_FAIL_CLOSED=PASS
LIVE_COMMIT_EXECUTED=PASS # NO; set explicit TN10 write gates and a funded key to broadcast
NO_STATIC_APP_FIXTURES=PASS
```

Validated live API commit evidence:

```text
LIVE_COMMIT_TX_BROADCAST=PASS # 5576e597aa80197de50dd6dfe3f9c351ba5c8c58b5e7d9be33bc82b5d86258e8
LIVE_COMMIT_TXID_RECORDED=PASS
LIVE_COMMIT_TX_REST_EVIDENCE=PASS # accepting_block_hash=7a7177a5da86857e4e0a32ca2afbb4828d370eae42a76e4873764eaad325b60a payloadBytes=382
```


## Basic web API test page

A minimal browser page is served at `GET /demo/basic-api-test` (also `/demo` and `/`) to manually exercise the generic lifecycle: health/status, create round, commit, ledger, close, entropy, reveal, proof, verification, and guarded live transaction buttons for `commit/tx`, `close/tx`, and `reveal/tx`.


Static-server note: if the page is opened from a separate static server such as port 8789, `/v1/*` calls will hit that static server unless the page's `API base URL` field is set to the actual API process, for example `http://127.0.0.1:8787`. The API supports CORS preflight for this basic test page.


## Latest basic web demo manual finding

The minimal web page can exercise the full generic lifecycle against a live-write-enabled TN10 API, including yellow `commit/tx`, `close/tx`, and `reveal/tx` buttons. Manual testing found a UX/state issue rather than an API write failure: retrying a yellow phase button after success returns the correct conflict (`live_<phase>_already_recorded`), but the page presents it as an error. The next improvement is to persist/display completed phase txids in the page, disable completed phase buttons, and add an explicit new-round/reset control.
