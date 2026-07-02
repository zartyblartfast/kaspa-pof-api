export interface CommitmentVerificationResult {
  ok: boolean;
  expected?: string;
  actual?: string;
  code?: 'KASPA_POF_COMMITMENT_INPUT_MISSING';
  message?: string;
}

export function hashCommitment(serverSeed: string): string;
export function verifyCommitment(input?: {
  serverSeed?: string;
  commitment?: string;
}): CommitmentVerificationResult;
