/**
 * Response adapters for each remote chess backend.
 *
 * Each adapter converts a backend-specific JSON response into the
 * normalised frontend types defined in ./types.ts.
 */

import type {
  GameStatusNorm,
  NormAiMoveResult,
  NormAnalysis,
  NormGameState,
  NormLegalMove,
  NormMove,
  NormPiece,
  PlayerColor,
} from './types';

// ===========================================================================
// Shared helpers
// ===========================================================================

function assertColor(c: string | undefined): PlayerColor {
  if (c === 'white' || c === 'black') return c;
  if (c === 'w') return 'white';
  if (c === 'b') return 'black';
  return 'white';
}

// ===========================================================================
// rust-chess adapter  (camelCase, /api/...)
// ===========================================================================

export function rustNormGame(raw: Record<string, unknown>): NormGameState {
  const history = (raw.moveHistory as Record<string, unknown>[] | undefined) ?? [];
  return {
    id: String(raw.id),
    fen: String(raw.fen ?? ''),
    turn: assertColor(raw.currentPlayer as string),
    status: rustNormStatus(raw.status as string),
    check: Boolean(raw.check),
    moveCount: history.length,
    moveHistory: history.map(rustNormMove),
    board: rustNormBoard(raw.board),
    result: rustDeriveResult(raw.status as string, raw.currentPlayer as string),
    gameOver: ['checkmate', 'stalemate', 'draw', 'insufficient_material',
      'threefold_repetition', 'fifty_move_rule'].includes(raw.status as string),
  };
}

function rustNormStatus(s: string): GameStatusNorm {
  const map: Record<string, GameStatusNorm> = {
    active: 'active',
    check: 'check',
    checkmate: 'checkmate',
    stalemate: 'stalemate',
    draw: 'draw',
    insufficient_material: 'insufficient_material',
    threefold_repetition: 'threefold_repetition',
    fifty_move_rule: 'fifty_move_rule',
  };
  return map[s] ?? 'active';
}

function rustDeriveResult(status: string, currentPlayer: string): string {
  if (status === 'checkmate') return currentPlayer === 'white' ? '0-1' : '1-0';
  if (['stalemate', 'draw', 'insufficient_material', 'threefold_repetition', 'fifty_move_rule'].includes(status)) return '1/2-1/2';
  return '*';
}

function rustNormMove(raw: Record<string, unknown>): NormMove {
  return {
    from: String(raw.from ?? ''),
    to: String(raw.to ?? ''),
    san: raw.san as string | undefined,
    piece: raw.piece ? rustNormPiece(raw.piece as string) : undefined,
    captured: raw.captured ? rustNormPiece(raw.captured as string) : undefined,
    promotion: raw.promotion as string | undefined,
  };
}

/** rust-chess encodes pieces as single chars: "P","N",..."p","n",... or as {type,color} objects */
function rustNormPiece(raw: unknown): NormPiece | undefined {
  if (!raw) return undefined;
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    return { type: obj.type as NormPiece['type'], color: assertColor(obj.color as string) };
  }
  // Single string char encoding
  if (typeof raw === 'string' && raw.length === 1) {
    const map: Record<string, NormPiece['type']> = {
      P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king',
      p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
    };
    const type = map[raw];
    if (type) return { type, color: raw === raw.toUpperCase() ? 'white' : 'black' };
  }
  return undefined;
}

function rustNormBoard(raw: unknown): (NormPiece | null)[][] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return (raw as (string | null)[][]).map((row) =>
    row.map((cell) => (cell ? (rustNormPiece(cell) ?? null) : null)),
  );
}

export function rustNormLegalMoves(raw: Record<string, unknown>): NormLegalMove[] {
  const moves = (raw.moves as Record<string, unknown>[] | undefined) ?? [];
  return moves.map((m) => ({
    from: String(m.from),
    to: String(m.to),
    san: m.san as string | undefined,
    promotion: m.promotion as string | undefined,
  }));
}

export function rustNormAiMove(raw: Record<string, unknown>): NormAiMoveResult {
  const moveRaw = raw.move as Record<string, unknown> | undefined;
  return {
    move: moveRaw ? rustNormMove(moveRaw) : { from: '', to: '' },
    game: rustNormGame(raw),
    evaluation: raw.evaluation as number | undefined,
    thinkingTimeMs: raw.thinkingTime as number | undefined,
  };
}

export function rustNormAnalysis(raw: Record<string, unknown>): NormAnalysis {
  return {
    evaluation: (raw.evaluation as number) ?? 0,
    bestMove: raw.bestMove ? rustNormMove(raw.bestMove as Record<string, unknown>) : undefined,
    depth: raw.depth as number | undefined,
  };
}

// ===========================================================================
// go-chess adapter  (snake_case, /api/...)
// ===========================================================================

export function goNormGame(raw: Record<string, unknown>): NormGameState {
  const history = (raw.move_history as Record<string, unknown>[] | undefined) ?? [];
  return {
    id: String(raw.id),
    fen: String(raw.fen ?? ''),
    turn: assertColor(raw.active_color as string),
    status: goNormStatus(raw.status as string),
    check: (raw.status as string) === 'check',
    moveCount: history.length,
    moveHistory: history.map(goNormMove),
    board: undefined, // go-chess returns a text diagram, not useful for UI
    result: goDeriveResult(raw.status as string),
    gameOver: ['white_wins', 'black_wins', 'stalemate', 'draw',
      'insufficient_material', 'threefold_repetition', 'fifty_move_rule'].includes(raw.status as string),
  };
}

function goNormStatus(s: string): GameStatusNorm {
  const map: Record<string, GameStatusNorm> = {
    in_progress: 'active',
    check: 'check',
    white_wins: 'checkmate',
    black_wins: 'checkmate',
    stalemate: 'stalemate',
    draw: 'draw',
    insufficient_material: 'insufficient_material',
    threefold_repetition: 'threefold_repetition',
    fifty_move_rule: 'fifty_move_rule',
  };
  return map[s] ?? 'active';
}

function goDeriveResult(status: string): string {
  if (status === 'white_wins') return '1-0';
  if (status === 'black_wins') return '0-1';
  if (['stalemate', 'draw', 'insufficient_material', 'threefold_repetition', 'fifty_move_rule'].includes(status)) return '1/2-1/2';
  return '*';
}

function goNormMove(raw: Record<string, unknown>): NormMove {
  return {
    from: String(raw.from ?? ''),
    to: String(raw.to ?? ''),
    san: (raw.notation as string | undefined) ?? undefined,
    piece: raw.piece ? goNormPiece(raw.piece) : undefined,
    captured: raw.captured ? goNormPiece(raw.captured) : undefined,
    promotion: raw.promotion as string | undefined,
  };
}

function goNormPiece(raw: unknown): NormPiece | undefined {
  if (!raw) return undefined;
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    return { type: obj.type as NormPiece['type'], color: assertColor(obj.color as string) };
  }
  return undefined;
}

export function goNormLegalMoves(raw: Record<string, unknown>): NormLegalMove[] {
  const moves = (raw.legal_moves as Record<string, unknown>[] | undefined) ?? [];
  return moves.map((m) => ({
    from: String(m.from),
    to: String(m.to),
    san: (m.notation as string | undefined) ?? undefined,
    promotion: m.promotion as string | undefined,
  }));
}

export function goNormAiMove(raw: Record<string, unknown>): NormAiMoveResult {
  const moveRaw = raw.move as Record<string, unknown> | undefined;
  // go-chess may nest the game state at the top level alongside the move
  return {
    move: moveRaw ? goNormMove(moveRaw) : { from: '', to: '' },
    game: goNormGame(raw),
    evaluation: raw.evaluation as number | undefined,
  };
}

export function goNormAnalysis(raw: Record<string, unknown>): NormAnalysis {
  return {
    evaluation: (raw.evaluation as number) ?? (raw.evaluation_cp as number) ?? 0,
    bestMove: raw.best_move ? goNormMove(raw.best_move as Record<string, unknown>) : undefined,
    depth: raw.depth as number | undefined,
  };
}

// ===========================================================================
// js-chess / npm-chess adapter  (camelCase, /api/v1/...)
// ===========================================================================

export function jsNormGame(raw: Record<string, unknown>): NormGameState {
  const history = (raw.moveHistory as Record<string, unknown>[] | undefined) ?? [];
  const gameOver = Boolean(raw.gameOver);
  const checkmate = Boolean(raw.checkmate);
  const stalemate = Boolean(raw.stalemate);
  const check = Boolean(raw.check);

  let status: GameStatusNorm = 'active';
  if (checkmate) status = 'checkmate';
  else if (stalemate) status = 'stalemate';
  else if (raw.inThreefoldRepetition) status = 'threefold_repetition';
  else if (raw.inFiftyMoveRule) status = 'fifty_move_rule';
  else if (gameOver) status = 'draw';
  else if (check) status = 'check';

  return {
    id: String(raw.id),
    fen: String(raw.fen ?? ''),
    turn: assertColor(raw.turn as string),
    status,
    check,
    moveCount: history.length,
    moveHistory: history.map(jsNormMove),
    board: undefined, // npm-chess doesn't return a board array
    result: jsDeriveResult(raw),
    gameOver,
  };
}

function jsDeriveResult(raw: Record<string, unknown>): string {
  if (raw.checkmate) {
    return (raw.winner as string) === 'white' ? '1-0' : '0-1';
  }
  if (raw.gameOver) return '1/2-1/2';
  return '*';
}

function jsNormMove(raw: Record<string, unknown>): NormMove {
  return {
    from: String(raw.from ?? ''),
    to: String(raw.to ?? ''),
    san: raw.san as string | undefined,
    piece: raw.piece ? jsNormPiece(raw.piece) : undefined,
    captured: raw.capturedPiece ? jsNormPiece(raw.capturedPiece) : undefined,
    promotion: raw.promotion as string | undefined,
  };
}

function jsNormPiece(raw: unknown): NormPiece | undefined {
  if (!raw) return undefined;
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    return { type: obj.type as NormPiece['type'], color: assertColor(obj.color as string) };
  }
  return undefined;
}

export function jsNormLegalMoves(raw: Record<string, unknown>): NormLegalMove[] {
  const moves = (raw.moves as Record<string, unknown>[] | undefined) ?? [];
  return moves.map((m) => ({
    from: String(m.from),
    to: String(m.to),
    san: m.san as string | undefined,
    promotion: m.promotion as string | undefined,
  }));
}

export function jsNormAiMove(raw: Record<string, unknown>): NormAiMoveResult {
  // npm-chess embeds the move in the full game response
  const metrics = (raw.aiMetrics as Record<string, unknown>) ?? {};
  const lastMove = raw.lastMove as Record<string, unknown> | undefined;
  return {
    move: lastMove ? jsNormMove(lastMove) : { from: '', to: '' },
    game: jsNormGame(raw),
    evaluation: metrics.evaluation as number | undefined,
    thinkingTimeMs: metrics.thinkingTime as number | undefined,
    depth: metrics.depth as number | undefined,
  };
}

export function jsNormAnalysis(raw: Record<string, unknown>): NormAnalysis {
  return {
    evaluation: (raw.evaluation as number) ?? 0,
    bestMove: raw.bestMove ? jsNormMove(raw.bestMove as Record<string, unknown>) : undefined,
    depth: raw.depth as number | undefined,
  };
}

// ===========================================================================
// Adapter registry — pick by backend id
// ===========================================================================

export interface BackendAdapter {
  /** Path prefix (no trailing slash) */
  apiPrefix: string;
  normGame: (raw: Record<string, unknown>) => NormGameState;
  normLegalMoves: (raw: Record<string, unknown>) => NormLegalMove[];
  normAiMove: (raw: Record<string, unknown>) => NormAiMoveResult;
  normAnalysis: (raw: Record<string, unknown>) => NormAnalysis;
  /** Field name for difficulty in AI move request */
  aiDifficultyField: string;
}

export const ADAPTERS: Record<string, BackendAdapter> = {
  rust: {
    apiPrefix: '/api',
    normGame: rustNormGame,
    normLegalMoves: rustNormLegalMoves,
    normAiMove: rustNormAiMove,
    normAnalysis: rustNormAnalysis,
    aiDifficultyField: 'difficulty',
  },
  go: {
    apiPrefix: '/api',
    normGame: goNormGame,
    normLegalMoves: goNormLegalMoves,
    normAiMove: goNormAiMove,
    normAnalysis: goNormAnalysis,
    aiDifficultyField: 'level',
  },
  js: {
    apiPrefix: '/api/v1',
    normGame: jsNormGame,
    normLegalMoves: jsNormLegalMoves,
    normAiMove: jsNormAiMove,
    normAnalysis: jsNormAnalysis,
    aiDifficultyField: 'difficulty',
  },
};
