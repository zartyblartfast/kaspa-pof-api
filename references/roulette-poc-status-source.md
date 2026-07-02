# Roulette PoC Status

Current phase: corrected two-section roulette UI rebuilt after rejection of the first API-demo-like scaffold.

## What exists

The roulette PoC lives under:

```text
apps/roulette-poc/
```

It is served by `node src/server.cjs` at:

```text
/apps/roulette-poc/
```

The app has only two main user-facing sections:

```text
1. Roulette Game
2. Proof of Fairness
```

`Roulette Game` uses the table-first SVG roulette geometry and chip placement lineage from:

```text
/root/kaspa-fair-foundation/examples/roulette-poc/ui/
```

The copied/adapted files in this repo are visual/table-only assets:

```text
apps/roulette-poc/roulette-table-renderer.js
apps/roulette-poc/roulette-table-layout.js
```

`Proof of Fairness` follows the env095 flowchart direction from:

```text
/root/kaspa-fair-foundation/examples/roulette-poc/ui-sketches/env095-flowchart-*
```

The flowchart content has been replaced with two columns:

```text
Roulette Round
Kaspa Toccata Proof of Fairness
```

Its design/content is now captured in:

```text
apps/roulette-poc/flowchart-spec.json
```

This is a static design/layout specification only; it is not round, result, proof, verifier, or TN10 evidence data. It follows the original JSON specification's asymmetric lane model more closely: each column has its own nodes and row positions rather than a forced one-left-card/one-right-card pair for every row. Roulette-only player/table operations such as `Player places chips` can appear without a matching API card. Horizontal arrows are used only for actual proof/API interactions.

Connected left/right tiles are now deliberately placed on the same row, leaving expected gaps elsewhere. The renderer uses one shared three-column CSS grid (`roulette node / connector label / proof node`) so related pairs share the same vertical center line and edge labels live in a dedicated center gutter rather than under either tile. The ambiguous edge label `opens table` was replaced with `enables chip placement`, meaning: after the API commitment is recorded, the UI allows chip placement. It still supports current-stage highlighting and `More info` disclosures containing raw API JSON when available.

The same JSON spec also defines a compact two-row live status strip. It is rendered in the Roulette Game section so proof state changes stay visible during play:

```text
Roulette: Ready | Gate | Chips | Spin | Closed | Waiting | Result | Verified
Toccata:  Create | Commit | —     | Ledger | Close | Entropy | Reveal | Verify
```

The full vertical proof flowchart remains available in a collapsible Proof of Fairness details panel below the game section. Each compact tile now has a short `compactHelp` explanation rendered as native `title` text plus an in-page `i` hover/focus tooltip; these explanations describe what is happening at that proof stage without showing JSON. Selected terms also include `compactLinks` to project documentation, for example the Entropy tile links to the generic entropy API step and the future-entropy design decision.

## API/package usage

The browser import map keeps the package-name API requirement:

```html
"kaspa-toccata-api": "/src/client.mjs"
```

The app imports the npm API surface directly:

```js
import { createToccataApiClient } from 'kaspa-toccata-api';
```

The app-level code does not use raw browser `fetch()` for API operations; it only fetches the static flowchart design JSON. Raw HTTP for Toccata API calls remains inside the reusable client implementation.

Round state, result, proof, verification, and TN10 evidence are obtained through the generic API/client lifecycle:

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
```

The app does not expose transaction broadcast controls. Guarded write endpoints remain server/API functionality and fail closed by default unless explicit TN10 write gates are set.

## Current game flow

Reset Round:

```text
health/capabilities/network status
→ create round
→ commit hidden server material through API
→ table opens for chip placement
```

Spin Wheel:

```text
submit selected table chips to /bets/ledger
→ close round with live_tn10_future entropy mode
→ fetch live TN10 entropy
→ reveal result through API
→ fetch proof
→ verify proof through API
```

The browser does not choose the result, generate proof, or act as proof authority.

Observed latency note: the reset flow currently waits for `GET /v1/network/status` before creating/committing the round. Browser verification saw health and capabilities return in single-digit milliseconds, while one `network/status` call took about 39.8s before chips became clickable. This appears to be API/TN10/network latency rather than chip-placement rendering; chip placement after the committed round is local UI state and should not call the API until `Spin Wheel` submits the ledger.

Presentation note: selected roulette zones suppress browser/SVG focus outlines on pointer interaction so temporary large white focus/doughnut highlights do not appear before the normal chip marker renders.

## Explicitly forbidden in the app

The app must not contain or load:

```text
sample-round.json
toccata-fairness-proof.json
proof.json
round.json
```

The app must not contain runtime fallback paths for:

```text
mock
static proof/result state
dry-run transaction success
offline entropy/result processing
browser-side proof authority
browser-side result authority
```

## Verification

Latest focused smoke command:

```bash
scripts/roulette-poc-smoke.sh
```

Latest output:

```text
ROULETTE_POC_FILES_EXIST=PASS
ROULETTE_POC_JS_SYNTAX=PASS
ROULETTE_POC_NO_STATIC_OR_OFFLINE_PATTERNS=PASS
ROULETTE_POC_NO_MOCK_PATTERNS=PASS
ROULETTE_POC_NPM_API_IMPORT_READY=PASS
ROULETTE_POC_FLOWCHART_SPEC_ALIGNED=PASS
ROULETTE_POC_API_ENDPOINTS_PRESENT=PASS
ROULETTE_POC_API_HEALTH=PASS
ROULETTE_POC_PAGE_SERVED=PASS
ROULETTE_POC_APP_JS_SERVED=PASS
ROULETTE_POC_FLOWCHART_SPEC_SERVED=PASS
ROULETTE_POC_RENDERER_SERVED=PASS
ROULETTE_POC_LAYOUT_SERVED=PASS
ROULETTE_POC_ESM_CLIENT_SERVED=PASS
ROULETTE_POC_API_CREATE_ROUND=PASS
ROULETTE_POC_API_COMMIT_STATE=PASS
ROULETTE_POC_TX_FAIL_CLOSED=PASS
ROULETTE_POC_NO_STATIC_PROOF_FIXTURES=PASS
```

Latest focused ad-hoc flowchart verification after the asymmetric-lane adjustment:

```text
ADHOC_FLOWCHART_JS_SYNTAX=PASS
ADHOC_ASYMMETRIC_FLOW_SPEC_PRESENT=PASS
ADHOC_FLOW_NO_STATIC_OFFLINE_RAW_FETCH=PASS
ADHOC_FLOW_NO_MOCK_PATHS=PASS
ADHOC_EXIT_CODE=0
ADHOC_SCRIPT_CLEANED_UP=PASS
```

Latest browser verification on `PORT=8797` for the compact live-status layout:

```text
page title: Kaspa Toccata Roulette PoC
compact live proof status visible inside Roulette Game section
compact rows visible: Roulette; Toccata
compact labels: Ready; Gate; Chips; Spin; Closed; Waiting; Result; Verified / Create; Commit; —; Ledger; Close; Entropy; Reveal; Verify
compact tiles include `i` help markers plus hover/focus explanations from compactHelp
compact help links: Entropy tile links to entropy step and future entropy design docs
full Proof of Fairness flowchart collapsed by default behind: Show full proof flowchart
flowchart spec fetched: /apps/roulette-poc/flowchart-spec.json
Spin Wheel completed through npm client API calls: /bets/ledger; /close; /entropy; /reveal; /proof; /v1/proofs/verify
compact current status after verified: Verified; Verify
claim level: tn10_future_entropy
visible result from browser run: 30 red
proof flow includes: verified: true
```

The active local viewing server is on `127.0.0.1:8797`. Use `ss -ltnp 'sport = :PORT'` to confirm the intended server before browser testing.

## Latest UX pass

A follow-up browser UX pass added:

- quick chip amount buttons for `1`, `5`, `25`, and `100` units;
- `Undo` and `Clear` chip controls before the ledger is submitted;
- `Spin Wheel` disabled until at least one chip is placed;
- compact-tooltip edge alignment classes plus narrower/mobile media rules to reduce tooltip clipping;
- smaller-screen CSS refinements for compact status rows, controls, and the horizontally scrollable roulette table.

Browser verification on `PORT=8798` confirmed: chip amount presets select the stake, table clicks add chips locally, undo/clear remove chips before ledger submission, Spin is disabled with zero chips and enabled after a chip is placed, and Spin completed through the npm client/API to `stage=verified`, `claimLevel=tn10_future_entropy`, with visible result `20 black` in that run. The duplicate extra status card was then removed; the game top now uses the existing service pill plus compact proof strip.

No raw app-level `/v1/*` fetch, mock/local substitute paths, synthetic transaction success paths, static proof/result JSON, or browser-side result/proof authority were added.

## Next work

1. Review the latest UX pass diff.
2. Do a deeper small-screen manual pass from a real narrow/mobile viewport if needed.
3. If explicitly authorized, run a live-write-gated browser/API pass; otherwise keep write endpoints fail-closed by default.

Latest broader verification also passed:

```text
scripts/api-live-contract-smoke.sh
API_LIVE_CONTRACT_READY=PASS
NO_STATIC_APP_FIXTURES=PASS

scripts/basic-web-api-test-smoke.sh
BASIC_WEB_PAGE_SERVED=PASS
BASIC_WEB_API_CREATE_ROUND=PASS
NO_STATIC_APP_FIXTURES=PASS
```
