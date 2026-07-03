# Publish Readiness Review

Date: 2026-07-03
State reviewed: local `fee0ec4 docs: clarify npm package consumer boundary` plus uncommitted browser-export readiness changes

This review records the package contents, version, npm auth state, publish result, and post-publish consumer checks. It does not authorize future publishes.

## Package identity

```json
{
  "name": "kaspa-pof-api",
  "version": "0.1.0-alpha.1",
  "main": "./src/index.cjs",
  "types": "./src/index.d.ts",
  "exports": [".", "./browser"]
}
```

The package root exports only the runtime-first API through `.`. The browser-safe subpath `kaspa-pof-api/browser` maps to `src/browser.mjs`/`src/browser.d.ts` and intentionally omits the Node/operator TN10 transaction submitter. The legacy HTTP client is not exported.

## npm registry state

Commands run:

```bash
npm whoami
npm view kaspa-pof-api@0.1.0-alpha.1 version --json
npm pack --dry-run
packed tarball install/import smoke for kaspa-pof-api/browser
```

Observed state:

- `npm whoami`: `bitcoin-card-mcp`
- `npm view kaspa-pof-api ...`: `E404 Not Found` before publish
- Published result: `kaspa-pof-api@0.1.0-alpha.1` is now available on npm at `https://registry.npmjs.org/kaspa-pof-api/-/kaspa-pof-api-0.1.0-alpha.1.tgz`.
- Published shasum: `f0abd63f48bf2121ee3d25f1ae5a97630286e793`.
- Published integrity: `sha512-Z+gKFHIUYaV970M4TwEjYmrwU+4t8kegY8LvVbOZro5k1052RgRKgxx5ZloPVQpGWPVGvMwHpe4SEu7ONnKTeA==`.

## Dry-run package contents

`npm pack --dry-run --json` passed. Because this review file is itself included in the tarball, exact tarball hashes change when this file changes; use the current `npm pack --dry-run` output as the authoritative hash before publishing.

Observed tarball shape after adding the browser export:

```text
name: kaspa-pof-api
version: 0.1.0-alpha.1
filename: kaspa-pof-api-0.1.0-alpha.1.tgz
files: 54
includes: src/browser.d.ts and src/browser.mjs
packed-browser-export smoke: PASS
```

Included top-level package areas:

- `src/` runtime modules, CommonJS files, and TypeScript declarations
- selected `references/live-*.json` public TN10 evidence used by docs examples and smoke verification
- `README.md`
- `LICENSE`
- `docs/`

Not included:

- `test/`
- `examples/`
- `local-secrets/`
- generated tarballs

`local-secrets/` is ignored by `.gitignore`; the TN10 private key is not part of the dry-run tarball.

## Public docs included in package

The tarball includes:

- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/HANDOVER_PROMPT.md`
- `docs/HERMES_PROFILE_SETUP.md`
- `docs/NEXT_PHASE_PLAN.md`
- `docs/PACKAGE_SPEC.md`
- `docs/SESSION_HANDOVER_REMAINING_TASKS.md`
- `docs/examples/future-entropy-proof.mjs`
- `docs/examples/proof-root-anchored-live.mjs`

These docs include development/handover material. Decide before publishing whether to keep all docs in the public npm tarball or reduce the published docs to public-facing files only.

## Current publish decision points

Pre-publish decisions were made for `0.1.0-alpha.1` and the package was published from npm account `bitcoin-card-mcp`.

For `0.1.0-alpha.2`, the user explicitly approved npm deployment on 2026-07-03. Purpose: publish the package-runtime fail-closed malformed anchored proof fix from `2ed5da0` (`src/proof/verify.mjs` and `src/proof/verify.cjs`) so npm consumers no longer receive the older verifier from `0.1.0-alpha.1`.

Published result: `kaspa-pof-api@0.1.0-alpha.2` is available on npm at `https://registry.npmjs.org/kaspa-pof-api/-/kaspa-pof-api-0.1.0-alpha.2.tgz`.

`0.1.0-alpha.2` publish facts:

```text
npm whoami: bitcoin-card-mcp
npm publish --access public: PASS
published shasum: c7c3e60a4f1cca71e1d06a78d35ac5204392e22c
published integrity: sha512-ffoZJig/N4Css7f6u57sVPSjoENQCz3jzbrebDl3sfzfWOp3oTdAfpP6pVKz9GIeb2x9xgqcfXVVy5A98MDqmw==
npm run smoke:published -- 0.1.0-alpha.2: PASS
```


## Post-publish consumer correction

Publishing alone was not sufficient for the roulette PoC to demonstrate the npm API, so the PoC was corrected after publish:

1. `examples/roulette-poc/` has its own dependency on `kaspa-pof-api@0.1.0-alpha.2`.
2. The PoC serves the installed package browser export from `examples/roulette-poc/node_modules/kaspa-pof-api/src/browser.mjs` instead of mapping to `/src/browser.mjs`.
3. Checks fail if the PoC reverts to local repo source, a trusted proof endpoint, or static/fake proof data.
4. The package exposes and tests `kaspa-pof-api/browser`.

Spend/fee transaction submission may remain in a Node/server/operator path because private keys should not live in the browser. That path may use package helpers to create public evidence; it must not replace browser/package proof verification.

## Verification baseline

The latest verification baseline for this milestone:

```bash
npm test
npm run smoke
npm pack --dry-run
npm run smoke:published
```

Expected status:

- `npm test`: PASS, 86 tests / 23 suites
- `npm run smoke`: PASS, including `KASPA_POF_PACKAGE_METADATA=PASS`, `KASPA_POF_ROULETTE_TN10_VERIFY=PASS`, and `KASPA_POF_SMOKE=PASS`
- `npm pack --dry-run`: PASS, 56 files for `kaspa-pof-api@0.1.0-alpha.2`
- packed tarball install/import smoke: PASS for `kaspa-pof-api/browser`, and the browser export does not expose `submitTn10AnchorTransaction`
- `npm run smoke:published -- 0.1.0-alpha.2`: PASS against `kaspa-pof-api@0.1.0-alpha.2` installed from the public npm registry in a fresh temp project. It verifies ESM/CJS/browser exports, core proof primitives, generic outcome replay, fail-closed tampering, anchor evidence/policy helpers, and live proof-root evidence replay without using roulette app code.

## Publish guardrail

Do not run `npm publish` until version, npm account, and public package contents are explicitly approved.
