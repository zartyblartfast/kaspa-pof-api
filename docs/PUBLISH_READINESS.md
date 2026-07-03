# Publish Readiness Review

Date: 2026-07-02
Commit reviewed: `dee2579 feat: add roulette diagnostics endpoint racing`

This review records the package contents, version, npm auth state, and publish blockers before any npm publish step. It does not publish the package.

## Package identity

```json
{
  "name": "kaspa-pof-api",
  "version": "0.1.0-alpha.1",
  "main": "./src/index.cjs",
  "types": "./src/index.d.ts"
}
```

The package root exports only the runtime-first API through `.`. The legacy HTTP client is not exported.

## npm registry state

Commands run:

```bash
npm whoami
npm view kaspa-pof-api version dist-tags --json
npm pack --dry-run --json
```

Observed state:

- `npm whoami`: `bitcoin-card-mcp`
- `npm view kaspa-pof-api ...`: `E404 Not Found`
- Interpretation: the `kaspa-pof-api` package name is currently unpublished on the configured npm registry from this environment.

## Dry-run package contents

`npm pack --dry-run --json` passed. Because this review file is itself included in the tarball, exact tarball hashes change when this file changes; use the current `npm pack --dry-run` output as the authoritative hash before publishing.

Observed tarball shape:

```text
name: kaspa-pof-api
version: 0.1.0-alpha.1
filename: kaspa-pof-api-0.1.0-alpha.1.tgz
files: 53
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

Before publish, decide:

1. Version decision: publish candidate is now `0.1.0-alpha.1`.
2. Whether the npm account `bitcoin-card-mcp` is the intended publishing account.
3. Whether all files under `docs/` should be public in the npm tarball.
4. Whether the selected public live evidence JSON files under `references/` should remain included in npm. Current package examples use those files, and they contain no private key material.

## Post-publish consumer correction

Publishing the package is necessary but not sufficient for the roulette PoC to demonstrate the npm API. The current PoC import map resolves `kaspa-pof-api` to local repo source at `/src/browser.mjs`.

After publish:

1. Add/verify a browser-safe export such as `kaspa-pof-api/browser`.
2. Give `examples/roulette-poc/` its own dependency on `kaspa-pof-api@0.1.0-alpha.1`.
3. Serve or bundle the installed package browser export from the PoC instead of mapping to `/src/browser.mjs`.
4. Add checks that fail if the PoC reverts to local repo source, a trusted proof endpoint, or static/fake proof data.

Spend/fee transaction submission may remain in a Node/server/operator path because private keys should not live in the browser. That path may use package helpers to create public evidence; it must not replace browser/package proof verification.

## Verification baseline

The latest verification baseline for this milestone:

```bash
npm test
npm run smoke
npm pack --dry-run
```

Expected status:

- `npm test`: PASS, 77 tests / 22 suites
- `npm run smoke`: PASS, including `KASPA_POF_ROULETTE_TN10_VERIFY=PASS` and `KASPA_POF_SMOKE=PASS`
- `npm pack --dry-run`: PASS, 53 files before these doc updates

## Publish guardrail

Do not run `npm publish` until version, npm account, and public package contents are explicitly approved.
