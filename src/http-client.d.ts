export interface ToccataApiClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export interface ToccataApiErrorOptions {
  status?: number;
  method?: string;
  path?: string;
  body?: unknown;
}

export class ToccataApiError extends Error {
  status?: number;
  method?: string;
  path?: string;
  body?: unknown;
  constructor(message: string, options?: ToccataApiErrorOptions);
}

export interface BetInput {
  playerId: string;
  selection: string;
  amount: number;
}

export interface CreateRoundInput {
  roundId?: string;
  game?: string;
  tableId?: string;
  metadata?: Record<string, unknown>;
}

export interface CommitRoundInput {
  serverSeed: string;
}

export interface UpdateBetLedgerInput {
  bets: BetInput[];
}

export interface CloseRoundInput {
  clientSeed: string;
  entropyMode: 'live_tn10_future';
  targetMetric?: 'blueScore' | 'daaScore';
  targetOffsetBlueScore?: number;
  targetOffsetDaaScore?: number;
}

export interface RevealRoundInput {
  serverSeed: string;
}

export type TxIntentInput = Record<string, never>;

export type JsonObject = Record<string, unknown>;

export class ToccataApiClient {
  readonly baseUrl: string;
  constructor(options?: ToccataApiClientOptions);
  request(method: string, path: string, body?: unknown): Promise<JsonObject>;
  health(): Promise<JsonObject>;
  capabilities(): Promise<JsonObject>;
  networkStatus(): Promise<JsonObject>;
  createRound(input?: CreateRoundInput): Promise<JsonObject>;
  getRound(roundId: string): Promise<JsonObject>;
  commitRound(roundId: string, input: CommitRoundInput): Promise<JsonObject>;
  updateBetLedger(roundId: string, input: UpdateBetLedgerInput): Promise<JsonObject>;
  closeRound(roundId: string, input: CloseRoundInput): Promise<JsonObject>;
  getEntropy(roundId: string): Promise<JsonObject>;
  revealRound(roundId: string, input: RevealRoundInput): Promise<JsonObject>;
  getProof(roundId: string): Promise<JsonObject>;
  verifyProof(proof: unknown): Promise<JsonObject>;
  createCommitTx(roundId: string, input?: TxIntentInput): Promise<JsonObject>;
  createCloseTx(roundId: string, input?: TxIntentInput): Promise<JsonObject>;
  createRevealTx(roundId: string, input?: TxIntentInput): Promise<JsonObject>;
}

export function createToccataApiClient(options?: ToccataApiClientOptions): ToccataApiClient;
