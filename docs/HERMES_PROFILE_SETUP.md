# Hermes Profile Setup for kaspa-pof-api

Recommended profile name:

```text
kaspa-pof-api
```

## Recommended setup

Create the new profile by cloning config, credentials, tools, and skills from the current Kaspa TN10 profile, but do not clone all state/history.

```bash
hermes profile create kaspa-pof-api \
  --clone-from kaspa-fair-tn10 \
  --description "Kaspa proof-of-fairness npm API/package work: package-first verifier/runtime architecture with roulette as example consumer."
```

Why `--clone-from` and not `--clone-all`:

- `--clone-from` copies the practical setup: config, env, SOUL.md, and skills.
- It avoids dragging the old profile's full project state into the new profile.
- The new repo contains its own project rules in `.hermes.md`.

If the profile already exists, inspect it instead of recreating:

```bash
hermes profile show kaspa-pof-api
```

## Start the new profile

```bash
cd /root/kaspa-pof-api
hermes --profile kaspa-pof-api
```

Or set it as sticky default only if you want future Hermes sessions to use it automatically:

```bash
hermes profile use kaspa-pof-api
```

## Project rules

The repo includes:

```text
.hermes.md
```

Hermes auto-loads `.hermes.md` when started inside this repo. It contains the core rules for:

- no mock proof/result paths;
- no offline/local substitute proof paths unless explicitly authorized;
- no static proof/result JSON fixture traps;
- no transaction simulation paths presented as success;
- no dry-run terminology or flows for Kaspa/Toccata transaction work;
- package-first architecture;
- roulette as example consumer;
- optional server as adapter/convenience only.

## Startup prompt for the first session

Use this prompt in the new profile's first session:

```text
You are working in /root/kaspa-pof-api. First read .hermes.md, docs/HANDOVER_PROMPT.md, docs/ARCHITECTURE.md, docs/PACKAGE_SPEC.md, docs/NEXT_PHASE_PLAN.md, and README.md. This project is a fresh package-first proof-of-fairness npm API. The core package should own reusable proof/verification/runtime primitives. Roulette is only an example consumer. A server/VPS may be an optional adapter but must not be the proof authority. Do not add mock/offline/static proof/result paths or dry-run transaction flows. Start by summarizing the current repo state and the recommended first implementation milestone; do not change files until asked.
```

## Memory seeding

After starting the new profile, save compact profile memory facts equivalent to:

```text
kaspa-pof-api aims to be a general-purpose npm package for proof-of-fairness apps using Kaspa/TN10/mainnet evidence; roulette is only an example consumer.
```

```text
kaspa-pof-api architecture target: package owns reusable fairness verifier/runtime primitives; optional VPS/server adapters may provide convenience but must not be proof authority.
```

```text
For kaspa-pof-api, avoid mock/offline/static proof-result fixture paths and dry-run transaction flows unless the user explicitly authorizes a temporary exception.
```

These should be saved with the new profile's memory tool, not copied mechanically from the old profile.

## Skills

The cloned profile should include the useful existing skills. The most relevant ones are:

```text
kaspa-toccata-api-workflow
hermes-agent
plan
test-driven-development
systematic-debugging
requesting-code-review
github-pr-workflow
github-repo-management
```

If a needed skill is missing after profile creation, install or copy it intentionally rather than cloning all old state.

## Verification after switching

Run:

```bash
cd /root/kaspa-pof-api
npm run smoke
```

Expected markers include:

```text
KASPA_POF_REQUIRED_FILES=PASS
KASPA_POF_PACKAGE_IMPORT=PASS
KASPA_POF_ROULETTE_IMPORT_WIRING=PASS
KASPA_POF_NO_FIXTURE_TRAPS=PASS
KASPA_POF_SMOKE=PASS
```
