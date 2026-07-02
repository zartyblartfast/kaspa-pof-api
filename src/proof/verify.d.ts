import type { ClaimLevel } from '../networks/claim-levels.d.ts';

export const PROOF_SCHEMA_V1: 'kaspa-pof-api/proof/v1';

export interface VerificationCheck {
  name: string;
  ok: boolean;
  detail?: unknown;
}

export interface VerificationError {
  code: string;
  message: string;
}

export interface VerificationResult {
  ok: boolean;
  claimLevel?: ClaimLevel | string;
  checks: VerificationCheck[];
  errors: VerificationError[];
}

export interface OutcomeDeriverInput {
  proof: unknown;
  entropyHash?: string;
}

export interface OutcomeDeriverResult {
  inputHash?: string;
  result: unknown;
}

export interface VerifyFairnessProofOptions {
  outcomeDerivers?: Record<string, (input: OutcomeDeriverInput) => OutcomeDeriverResult>;
}

export function verifyFairnessProof(proof: unknown, options?: VerifyFairnessProofOptions): VerificationResult;
export const verifyProofBundle: typeof verifyFairnessProof;
export const verifyProofOfFairness: typeof verifyFairnessProof;
