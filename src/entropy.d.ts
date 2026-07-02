export interface KaspaBlockEvidenceInput {
  blockHash?: string;
  daaScore?: string | number | bigint;
  blueScore?: string | number | bigint;
}

export interface EntropyHashInput {
  roundId?: string | number | bigint;
  commitment?: string;
  clientSeed?: string | number | bigint;
  ledgerHash?: string;
  blockEvidence?: KaspaBlockEvidenceInput;
}

export interface DerivedEntropyHash {
  entropyHash: string;
  source: 'sha256(roundId|commitment|clientSeed|ledgerHash|blockHash|daaScore|blueScore)';
}

export interface EntropyVerificationResult {
  ok: boolean;
  expected?: string;
  actual?: string;
  source?: DerivedEntropyHash['source'];
  code?: 'KASPA_POF_ENTROPY_INPUT_MISSING';
  message?: string;
}

export function deriveEntropyHash(input?: EntropyHashInput): DerivedEntropyHash;
export function verifyEntropyHash(input?: EntropyHashInput & {
  entropyHash?: string;
}): EntropyVerificationResult;
