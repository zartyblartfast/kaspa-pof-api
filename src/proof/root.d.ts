export const PROOF_ROOT_ANCHOR_PAYLOAD_SCHEMA_V1: 'kaspa-pof-api/proof-root-anchor/v1';
export const PROOF_ROOT_ALGORITHM: 'stable-json-sha256';

export interface ProofRootAnchorPayload {
  schema: typeof PROOF_ROOT_ANCHOR_PAYLOAD_SCHEMA_V1;
  proofRootAlgorithm: typeof PROOF_ROOT_ALGORITHM;
  proofRoot: string;
  proofSchema: string;
  networkId?: string;
  claimLevel?: string;
  roundId?: string;
}

export function computeProofRoot(proof: unknown): string;
export function buildProofRootAnchorPayload(proof: unknown): ProofRootAnchorPayload;
