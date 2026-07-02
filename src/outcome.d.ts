export interface OutcomeSpec {
  deriver: string;
  params?: unknown;
}

export interface OutcomeEvidence extends OutcomeSpec {
  inputHash?: string;
  result: unknown;
}

export interface DerivedOutcome {
  deriver: string;
  inputHash: string;
  result: unknown;
}

export interface OutcomeVerificationResult {
  ok: boolean;
  deriver?: string;
  inputHash?: string;
  expected?: unknown;
  actual?: unknown;
  code?:
    | 'KASPA_POF_ENTROPY_HASH_INVALID'
    | 'KASPA_POF_OUTCOME_SPEC_INVALID'
    | 'KASPA_POF_OUTCOME_DERIVER_MISSING'
    | 'KASPA_POF_OUTCOME_DERIVERS_INVALID'
    | 'KASPA_POF_UNKNOWN_OUTCOME_DERIVER'
    | 'KASPA_POF_OUTCOME_DERIVER_FAILED'
    | 'KASPA_POF_OUTCOME_NON_PORTABLE_JSON'
    | 'KASPA_POF_OUTCOME_MISMATCH'
    | 'KASPA_POF_OUTCOME_INVALID';
  message?: string;
}

export type OutcomeDeriver = (input: {
  entropyHash: string;
  spec: OutcomeSpec | OutcomeEvidence;
  params?: unknown;
  inputHash: string;
}) => unknown;

export function hashOutcomeInput(input: unknown): string;
export function deriveOutcome(input?: {
  entropyHash?: string;
  spec?: OutcomeSpec | OutcomeEvidence;
  derivers?: Record<string, OutcomeDeriver>;
}): DerivedOutcome;
export function verifyOutcome(input?: {
  entropyHash?: string;
  outcome?: OutcomeEvidence;
  outcomeDerivers?: Record<string, OutcomeDeriver>;
  derivers?: Record<string, OutcomeDeriver>;
}): OutcomeVerificationResult;
