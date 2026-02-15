/**
 * RemoteProvider — communicates with rust-chess, go-chess, or js-chess
 * backends via their REST APIs.
 *
 * The adapter layer (./adapters.ts) handles JSON shape differences.
 */

import { ADAPTERS, type BackendAdapter } from './adapters';
import type {
  BackendId,
  ChessProvider,
  CreateGameOptions,
  NormAiMoveResult,
  NormAnalysis,
  NormGameState,
  NormLegalMove,
  NormMove,
  ProviderCapabilities,
} from './types';

// ---------------------------------------------------------------------------
// Capability map per remote backend
// ---------------------------------------------------------------------------

const REMOTE_CAPS: Record<string, ProviderCapabilities> = {
  rust: {
    undo: true,
    ai: true,
    hint: true,
    analysis: true,
    chat: true,
    websocket: true,
    pgn: true,
    fenLoad: true,
  },
  go: {
    undo: false,
    ai: true,
    hint: true,
    analysis: true,
    chat: true,
    websocket: true,
    pgn: true,
    fenLoad: true,
  },
  js: {
    undo: true,
    ai: true,
    hint: true,
    analysis: true,
    chat: false,
    websocket: false,
    pgn: true,
    fenLoad: true,
  },
};

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  // Handle PGN (text/plain) responses
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('text/plain')) {
    const text = await res.text();
    if (!res.ok) throw new ApiError(res.status, 'HTTP_ERROR', text);
    return text as unknown as T;
  }

  const body = await res.json();

  if (!res.ok) {
    // Normalise error extraction across backends
    const errObj = body?.error;
    const code = typeof errObj === 'object' ? errObj?.code : errObj ?? 'UNKNOWN';
    const msg = typeof errObj === 'object' ? errObj?.message : body?.message ?? res.statusText;
    throw new ApiError(res.status, String(code), String(msg));
  }
  return body as T;
}

// ---------------------------------------------------------------------------
// RemoteProvider
// ---------------------------------------------------------------------------

export class RemoteProvider implements ChessProvider {
  readonly backendId: BackendId;
  readonly capabilities: ProviderCapabilities;
  private baseUrl: string;
  private adapter: BackendAdapter;

  constructor(backendId: BackendId, baseUrl: string) {
    if (backendId === 'local') throw new Error('Use LocalProvider for local backend');
    this.backendId = backendId;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.adapter = ADAPTERS[backendId];
    this.capabilities = REMOTE_CAPS[backendId] ?? REMOTE_CAPS.rust;
  }

  private url(path: string): string {
    return `${this.baseUrl}${this.adapter.apiPrefix}${path}`;
  }

  // -- Game lifecycle -------------------------------------------------------

  async createGame(options?: CreateGameOptions): Promise<NormGameState> {
    const body: Record<string, unknown> = {};
    if (options?.whitePlayer) body.whitePlayer = options.whitePlayer;
    if (options?.blackPlayer) body.blackPlayer = options.blackPlayer;
    if (options?.fen) body.fen = options.fen;
    if (options?.aiEnabled !== undefined) body.aiEnabled = options.aiEnabled;
    if (options?.aiDifficulty) body.aiDifficulty = options.aiDifficulty;
    if (options?.aiColor) {
      // go-chess uses snake_case
      if (this.backendId === 'go') body.ai_color = options.aiColor;
      else body.aiColor = options.aiColor;
    }

    const raw = await request<Record<string, unknown>>(this.url('/games'), {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return this.adapter.normGame(raw);
  }

  async getGame(gameId: string): Promise<NormGameState> {
    const raw = await request<Record<string, unknown>>(this.url(`/games/${gameId}`));
    return this.adapter.normGame(raw);
  }

  async deleteGame(gameId: string): Promise<void> {
    await request<unknown>(this.url(`/games/${gameId}`), { method: 'DELETE' });
  }

  // -- Moves ----------------------------------------------------------------

  async makeMove(
    gameId: string,
    from: string,
    to: string,
    promotion?: string,
  ): Promise<NormGameState> {
    const body: Record<string, unknown> = { from, to };
    if (promotion) body.promotion = promotion;
    const raw = await request<Record<string, unknown>>(this.url(`/games/${gameId}/moves`), {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return this.adapter.normGame(raw);
  }

  async undoMove(gameId: string): Promise<NormGameState> {
    if (!this.capabilities.undo) {
      throw new Error(`Undo is not supported by the ${this.backendId} backend`);
    }
    const raw = await request<Record<string, unknown>>(this.url(`/games/${gameId}/undo`), {
      method: 'POST',
    });
    return this.adapter.normGame(raw);
  }

  async getLegalMoves(gameId: string, fromSquare?: string): Promise<NormLegalMove[]> {
    const qs = fromSquare ? `?from=${fromSquare}` : '';
    const raw = await request<Record<string, unknown>>(
      this.url(`/games/${gameId}/legal-moves${qs}`),
    );
    return this.adapter.normLegalMoves(raw);
  }

  // -- AI -------------------------------------------------------------------

  async aiMove(gameId: string, difficulty: string = 'medium'): Promise<NormAiMoveResult> {
    const body: Record<string, unknown> = {
      [this.adapter.aiDifficultyField]: difficulty,
    };
    const raw = await request<Record<string, unknown>>(this.url(`/games/${gameId}/ai-move`), {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return this.adapter.normAiMove(raw);
  }

  async aiHint(gameId: string, difficulty: string = 'easy'): Promise<NormMove> {
    const body: Record<string, unknown> = {
      [this.adapter.aiDifficultyField]: difficulty,
    };
    const raw = await request<Record<string, unknown>>(this.url(`/games/${gameId}/ai-hint`), {
      method: 'POST',
      body: JSON.stringify(body),
    });
    // ai-hint returns a similar shape to ai-move
    const result = this.adapter.normAiMove(raw);
    return result.move;
  }

  // -- Position -------------------------------------------------------------

  async loadFen(gameId: string, fen: string): Promise<NormGameState> {
    const raw = await request<Record<string, unknown>>(this.url(`/games/${gameId}/fen`), {
      method: 'POST',
      body: JSON.stringify({ fen }),
    });
    return this.adapter.normGame(raw);
  }

  async getPgn(gameId: string): Promise<string> {
    return request<string>(this.url(`/games/${gameId}/pgn`));
  }

  async getAnalysis(gameId: string, depth?: number): Promise<NormAnalysis> {
    const qs = depth ? `?depth=${depth}` : '';
    const raw = await request<Record<string, unknown>>(
      this.url(`/games/${gameId}/analysis${qs}`),
    );
    return this.adapter.normAnalysis(raw);
  }

  // -- Cleanup --------------------------------------------------------------

  dispose(): void {
    // Nothing to clean up for basic HTTP (WebSocket cleanup would go here)
  }
}
