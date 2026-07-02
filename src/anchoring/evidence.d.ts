export type AnchorPhase = 'commit' | 'close' | 'reveal' | 'proof-root';

export interface AnchorEvidence {
  networkId: string;
  phase: AnchorPhase;
  txid: string;
  payloadHash?: string;
  acceptingBlockHash?: string;
  submittedTransactionEvidence?: SubmittedAnchorTransactionEvidence;
}

export interface AnchorValidationResult {
  ok: boolean;
  claimLevel?: string;
  networkId?: string;
  requiredPhases?: AnchorPhase[];
  presentPhases?: string[];
  phase?: string;
  missingPhase?: string;
  code?:
    | 'KASPA_POF_UNKNOWN_CLAIM_LEVEL'
    | 'KASPA_POF_CLAIM_LEVEL_REQUIRES_NO_ANCHOR_EVIDENCE'
    | 'KASPA_POF_NETWORK_ID_MISSING'
    | 'KASPA_POF_CLAIM_NETWORK_MISMATCH'
    | 'KASPA_POF_ANCHOR_EVIDENCE_MISSING'
    | 'KASPA_POF_ANCHOR_INVALID'
    | 'KASPA_POF_ANCHOR_PHASE_MISSING'
    | 'KASPA_POF_ANCHOR_PHASE_UNKNOWN'
    | 'KASPA_POF_ANCHOR_NETWORK_MISSING'
    | 'KASPA_POF_ANCHOR_NETWORK_MISMATCH'
    | 'KASPA_POF_ANCHOR_TXID_MISSING'
    | 'KASPA_POF_ANCHOR_TXID_INVALID'
    | 'KASPA_POF_ANCHOR_ACCEPTING_BLOCK_HASH_INVALID'
    | 'KASPA_POF_ANCHOR_PAYLOAD_HASH_MISSING'
    | 'KASPA_POF_ANCHOR_PAYLOAD_HASH_INVALID'
    | 'KASPA_POF_ANCHOR_PAYLOAD_HASH_MISMATCH'
    | 'KASPA_POF_ANCHOR_PHASE_DUPLICATE';
  message?: string;
}

export interface SubmittedAnchorTransactionEvidence {
  networkId: string;
  phase: AnchorPhase;
  txid: string;
  acceptingBlockHash: string;
  payloadHex: string;
  payloadHash?: string;
}

export interface SubmittedAnchorTransactionValidationResult {
  ok: boolean;
  networkId?: string;
  phase?: AnchorPhase;
  txid?: string;
  acceptingBlockHash?: string;
  payloadHash?: string;
  payloadObject?: unknown;
  code?: string;
  message?: string;
}

export const REQUIRED_ANCHOR_PHASES: readonly AnchorPhase[];
export const ALLOWED_ANCHOR_PHASES: readonly AnchorPhase[];
export const TX_ANCHORED_CLAIM_LEVELS: readonly ['tn10_tx_anchored', 'mainnet_tx_anchored'];
export function validateAnchorEvidence(input?: {
  claimLevel?: string;
  network?: { networkId?: string };
  anchors?: AnchorEvidence[];
  payloadHashes?: Partial<Record<AnchorPhase, string>>;
}): AnchorValidationResult;

export function validateSubmittedAnchorTransactionEvidence(
  evidence?: SubmittedAnchorTransactionEvidence
): SubmittedAnchorTransactionValidationResult;
