# Handover Prompt for New Hermes Profile: kaspa-pof-api

Use this when starting the new Hermes Agent profile for the `kaspa-pof-api` project.

## Project root

```text
/root/kaspa-pof-api
```

GitHub repo:

```text
https://github.com/zartyblartfast/kaspa-pof-api.git
```

## Project intent

Build a fresh, general-purpose npm API/package for proof-of-fairness applications using Kaspa/TN10/mainnet evidence.

The package should be usable by app developers building games or other fairness-sensitive apps. Roulette is only the first example consumer.

## Critical architecture correction

The old `kaspa-toccata-api` project currently has a hybrid architecture:

```text
roulette app imports npm package name
  ↓
npm package client calls HTTP /v1/*
  ↓
Node server owns most live TN10/proof lifecycle logic
```

That is not the desired final architecture for this project.

The new target is:

```text
kaspa-pof-api npm package owns reusable proof/fairness verification/runtime primitives
optional VPS/server/adapters provide convenience only
roulette PoC imports package as an external app would
```

The server must not be the proof authority. Any service may supply evidence, but package/browser/consumer code should be able to verify fairness independently.

## User preferences / constraints

- Avoid mock/offline/static proof/result fixture traps unless explicitly authorized as temporary exceptions.
- Avoid dry-run terminology and paths for Kaspa/Toccata transaction flows.
- Prefer live Kaspa/TN10/mainnet evidence paths and honest claim levels.
- General-purpose package design matters more than roulette-specific shortcuts.
- Do not inherit architecture from prior repos without fresh evidence.
- For UI/product work, do not make unrequested layout changes.
- For commercial/mainnet thinking: no-spend future-entropy verification should be default; paid mainnet anchoring can be optional if explicit, fee-estimated, and fee-capped.

## Current scaffold contents

This repo has been initialized with selected basis files only:

```text
src/http-client.mjs
src/http-client.cjs
src/http-client.d.ts
src/index.mjs
examples/roulette-poc/
docs/ARCHITECTURE.md
docs/PACKAGE_SPEC.md
docs/NEXT_PHASE_PLAN.md
docs/HERMES_PROFILE_SETUP.md
docs/HANDOVER_PROMPT.md
references/
```

The copied HTTP client is legacy migration material from `kaspa-toccata-api`; it is not the desired final center of gravity.

The copied roulette example has been adjusted to import:

```js
import { createToccataApiClient } from 'kaspa-pof-api';
```

through an import map:

```json
{
  "imports": {
    "kaspa-pof-api": "/src/index.mjs"
  }
}
```

This is only a baseline. The next work should move proof verification/runtime primitives into package modules and reduce dependence on HTTP verification.

## Reference repos

Use these as references, not as architecture authorities:

```text
/root/kaspa-toccata-api
/root/kaspa-fair-foundation
```

Important source files in `/root/kaspa-toccata-api`:

```text
src/server.cjs                  # current hybrid server; extract carefully, do not copy wholesale
src/client.mjs|cjs|d.ts          # current npm HTTP client
apps/roulette-poc/               # current roulette PoC
scripts/*smoke.sh                # verification patterns
```

Useful reference docs copied into this repo:

```text
references/kaspa-toccata-api-status.md
references/roulette-poc-status-source.md
references/verify-tn10-transactions-source.md
```

## Suggested first implementation milestones

1. Define package proof bundle schema and claim levels.
2. Extract pure verification primitives:
   - commitment hash and validation;
   - generic input ledger hash;
   - entropy hash derivation;
   - deterministic outcome derivation hooks;
   - proof replay/verification.
3. Make roulette example verify locally through the package rather than relying on `/v1/proofs/verify` as proof authority.
4. Add Kaspa/TN10/mainnet block-evidence validators for no-spend future entropy.
5. Add optional transaction anchoring payload builders and fee estimators as higher claim-level support.
6. Only then consider optional HTTP/VPS/Vercel/Python adapters.

## Working rule

The package must not depend on roulette.

Roulette must depend on the package.

## Verification baseline

Run:

```bash
npm run smoke
```

The smoke currently checks syntax/import wiring and confirms the roulette example uses package-name import/pathing. Add stronger tests as soon as real primitives are extracted.
