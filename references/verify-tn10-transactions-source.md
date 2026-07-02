# Independently Confirm TN10 Transactions

This project records live Kaspa TN10 transaction IDs for the generic fairness lifecycle phases:

```text
commit/tx
close/tx
reveal/tx
```

A roulette PoC or any other app can display these txids, but users should be able to confirm them independently from public TN10 data.

## What to check

For each txid:

1. Query the public TN10 transaction API.
2. Confirm the transaction exists.
3. Confirm `accepting_block_hash` is present.
4. Decode the hex payload to JSON.
5. Confirm the payload has `networkId: "testnet-10"`.
6. Confirm the payload `phase` is the expected phase: `commit`, `close`, or `reveal`.
7. Confirm `roundId`, hashes, result data, and prior tx references match the proof shown by the app/API.

## One transaction

```bash
TXID='<paste txid here>'

curl -fsS "https://api-tn10.kaspa.org/transactions/$TXID?inputs=true&outputs=true" \
  -o "/tmp/$TXID.json"

jq '{ transaction_id, accepting_block_hash, block_time, payload }' "/tmp/$TXID.json"

jq -r '.payload' "/tmp/$TXID.json" | xxd -r -p | jq .
```

`accepting_block_hash` should be non-empty. If it is empty or absent, the transaction may not yet be indexed/accepted, or the txid may be wrong.

## Full lifecycle example

Replace these with the txids shown by the API/app:

```bash
COMMIT_TXID='9a46c051b10353ae541bac44346fcc6fdcde5946ae8badf6a10e4e9c4ee2265c'
CLOSE_TXID='1aac88bdac2fad37e79a70f80dfdc9660109b2efbdefe8ac21b7560f250e74b5'
REVEAL_TXID='68c5f5205da7d298f0baa743092649ef1b62653247a6e127427f8d469c231f51'

for TXID in "$COMMIT_TXID" "$CLOSE_TXID" "$REVEAL_TXID"; do
  echo "Checking $TXID"
  curl -fsS "https://api-tn10.kaspa.org/transactions/$TXID?inputs=true&outputs=true" \
    -o "/tmp/$TXID.json"

  echo 'Accepted block:'
  jq -r '.accepting_block_hash' "/tmp/$TXID.json"

  echo 'Decoded payload:'
  jq -r '.payload' "/tmp/$TXID.json" | xxd -r -p | jq .

done
```

## Expected payload shapes

### Commit

```json
{
  "schema": "kaspa-toccata-api/live-commit/v1",
  "phase": "commit",
  "network": "kaspa-tn10",
  "networkId": "testnet-10",
  "roundId": "tn10_...",
  "commitment": "..."
}
```

Check:

- `phase` is `commit`
- `roundId` matches the round
- `commitment` matches the round commitment

### Close

```json
{
  "schema": "kaspa-toccata-api/live-close/v1",
  "phase": "close",
  "network": "kaspa-tn10",
  "networkId": "testnet-10",
  "roundId": "tn10_...",
  "commitment": "...",
  "closedAt": "...",
  "clientSeedHash": "...",
  "betLedgerHash": "...",
  "futureEntropyPlan": { }
}
```

Check:

- `phase` is `close`
- `roundId` and `commitment` match the round
- `betLedgerHash` matches the proof/app state
- `futureEntropyPlan` matches the target shown by the proof/app

### Reveal

```json
{
  "schema": "kaspa-toccata-api/live-reveal/v1",
  "phase": "reveal",
  "network": "kaspa-tn10",
  "networkId": "testnet-10",
  "roundId": "tn10_...",
  "commitment": "...",
  "serverSeed": "...",
  "serverSeedHash": "...",
  "clientSeedHash": "...",
  "betLedgerHash": "...",
  "entropyHash": "...",
  "entropyEvidence": { },
  "result": { },
  "priorTn10Writes": {
    "commit": ["..."],
    "close": ["..."]
  }
}
```

Check:

- `phase` is `reveal`
- `roundId` and `commitment` match the round
- `serverSeedHash` matches the revealed server seed hash
- `entropyHash` and `entropyEvidence` match the proof
- `result` matches the displayed result
- `priorTn10Writes.commit` and `priorTn10Writes.close` reference the expected prior txids

## Recommended roulette PoC UI panel

The roulette PoC should include an "Independent TN10 confirmation" panel with:

```text
Commit txid      accepted block      decoded phase: commit
Close txid       accepted block      decoded phase: close
Reveal txid      accepted block      decoded phase: reveal
Copy curl command
View decoded payload
```

The app can perform these checks for convenience, but the key UX point is that the user can copy the txids and reproduce the verification directly against public TN10 data.
