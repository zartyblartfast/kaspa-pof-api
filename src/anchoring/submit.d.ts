export interface Tn10SubmitResult {
  ok: boolean;
  claimLevel?: 'tn10_tx_anchored';
  networkId?: string;
  phase?: string;
  sourceAddress?: string;
  destinationAddress?: string;
  amountSompi?: string;
  priorityFeeSompi?: string;
  feeEstimate?: unknown;
  feeCapSompi?: string;
  payloadHash?: string;
  payloadBytes?: number;
  payload?: string;
  transactionIds?: string[];
  submitted?: Array<{ transactionId: string; localTransactionId: string }>;
  submittedAt?: string;
  rpc?: unknown;
  code?: string;
  message?: string;
}

export const DEFAULT_KASPA_WASM_PKG: string;
export function submitTn10AnchorTransaction(input?: {
  kaspa?: unknown;
  wasmPackage?: string;
  networkId?: string;
  phase?: 'commit' | 'close' | 'reveal' | 'proof-root';
  payload?: unknown;
  privateKeyHex?: string;
  destinationAddress?: string;
  amountSompi?: string | number | bigint;
  priorityFeeSompi?: string | number | bigint;
  feeCapSompi?: string | number | bigint;
  enableBroadcast?: boolean;
  acknowledgement?: string;
  timeoutMs?: number;
}): Promise<Tn10SubmitResult>;
