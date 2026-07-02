import type { ClaimLevel } from './claim-levels.d.ts';

export interface NetworkDescriptorInput {
  family?: 'kaspa' | string;
  networkId?: string;
  label?: string;
}

export interface EntropyTargetInput {
  metric?: 'daaScore' | 'blueScore' | string;
  score?: string | number | bigint;
  offset?: string | number | bigint;
  selectedAt?: string;
}

export interface KaspaBlockEvidenceInput {
  networkId?: string;
  blockHash?: string;
  daaScore?: string | number | bigint;
  blueScore?: string | number | bigint;
  timestamp?: string | number | bigint;
}

export type KaspaBlockEvidenceValidationResult =
  | {
      ok: true;
      claimLevel: Extract<ClaimLevel, 'tn10_future_entropy' | 'mainnet_future_entropy'>;
      networkId: string;
      targetMetric: 'daaScore' | 'blueScore';
      targetScore: string;
      blockScore: string;
    }
  | {
      ok: false;
      code:
        | 'KASPA_POF_UNKNOWN_CLAIM_LEVEL'
        | 'KASPA_POF_CLAIM_LEVEL_REQUIRES_NO_BLOCK_EVIDENCE'
        | 'KASPA_POF_NETWORK_ID_MISSING'
        | 'KASPA_POF_CLAIM_NETWORK_MISMATCH'
        | 'KASPA_POF_NETWORK_MISMATCH'
        | 'KASPA_POF_BLOCK_HASH_MISSING'
        | 'KASPA_POF_TARGET_METRIC_INVALID'
        | 'KASPA_POF_TARGET_SCORE_INVALID'
        | 'KASPA_POF_BLOCK_SCORE_INVALID'
        | 'KASPA_POF_BLOCK_BEFORE_TARGET';
      message: string;
    };

export function validateKaspaBlockEvidence(input?: {
  claimLevel?: ClaimLevel | string;
  network?: NetworkDescriptorInput;
  target?: EntropyTargetInput;
  block?: KaspaBlockEvidenceInput;
}): KaspaBlockEvidenceValidationResult;
