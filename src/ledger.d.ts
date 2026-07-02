export interface LedgerVerificationResult {
  ok: boolean;
  expected?: string;
  actual?: string;
  code?: 'KASPA_POF_LEDGER_INPUT_MISSING' | 'KASPA_POF_LEDGER_NON_PORTABLE_JSON';
  message?: string;
}

export function hashLedger(entries: unknown[]): string;
export function verifyLedger(input?: {
  entries?: unknown[];
  ledgerHash?: string;
}): LedgerVerificationResult;
