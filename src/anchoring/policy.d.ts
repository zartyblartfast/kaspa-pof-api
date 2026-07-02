export const TN10_BROADCAST_ACKNOWLEDGEMENT: 'I understand this spends TN10 testnet funds';

export interface Tn10FeeEstimate {
  networkId?: 'testnet-10';
  estimatedFeeSompi: string;
  priorityFeeSompi?: string;
  totalSpendSompi?: string;
  payloadBytes?: number;
  estimateLevel?: string;
}

export interface Tn10BroadcastPolicyResult {
  ok: boolean;
  networkId?: string;
  acknowledgement?: string;
  feeEstimate?: Tn10FeeEstimate;
  feeCapSompi?: string;
  code?:
    | 'KASPA_POF_TN10_NETWORK_REQUIRED'
    | 'KASPA_POF_TN10_BROADCAST_NOT_ENABLED'
    | 'KASPA_POF_TN10_BROADCAST_ACK_REQUIRED'
    | 'KASPA_POF_TN10_PRIVATE_KEY_INVALID'
    | 'KASPA_POF_TN10_FEE_ESTIMATE_REQUIRED'
    | 'KASPA_POF_TN10_FEE_CAP_EXCEEDED'
    | 'KASPA_POF_TN10_SOMPI_INVALID';
  message?: string;
}

export function estimateTn10AnchorFee(input?: {
  payloadBytes?: number;
  priorityFeeSompi?: string | number | bigint;
  networkId?: string;
}): Tn10FeeEstimate;

export function validateTn10BroadcastPolicy(input?: {
  networkId?: string;
  enableBroadcast?: boolean;
  acknowledgement?: string;
  privateKeyHex?: string;
  feeEstimate?: Tn10FeeEstimate;
  feeCapSompi?: string | number | bigint;
}): Tn10BroadcastPolicyResult;
