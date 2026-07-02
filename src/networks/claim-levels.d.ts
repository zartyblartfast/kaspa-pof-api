export type ClaimLevel =
  | 'local_bundle_only'
  | 'tn10_future_entropy'
  | 'mainnet_future_entropy'
  | 'tn10_tx_anchored'
  | 'tn10_proof_root_anchored'
  | 'mainnet_tx_anchored';

export const CLAIM_LEVELS: readonly ClaimLevel[];
export const FUTURE_ENTROPY_CLAIM_LEVELS: readonly Extract<ClaimLevel, 'tn10_future_entropy' | 'mainnet_future_entropy'>[];
export const CLAIM_LEVEL_NETWORKS: Readonly<Partial<Record<ClaimLevel, 'testnet-10' | 'mainnet'>>>;

export function isKnownClaimLevel(claimLevel: unknown): claimLevel is ClaimLevel;
export function validateClaimLevel(claimLevel: unknown):
  | { ok: true; claimLevel: ClaimLevel }
  | { ok: false; code: 'KASPA_POF_UNKNOWN_CLAIM_LEVEL'; message: string };
