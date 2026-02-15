/**
 * LocalProvider — wraps the in-browser @rumenx/chess library.
 *
 * This is the zero-latency, offline-capable provider.  Every method
 * is synchronous under the hood but returns a Promise for API parity
 * with remote providers.
 */

import type { Move as LibMove, Piece as LibPiece } from '@rumenx/chess/types';
import { ChessAI, type AIDifficulty } from '../services/ChessAI';
import { ChessEngine } from '../services/ChessEngine';
import type {
  ChessProvider,
  CreateGameOptions,
  NormAiMoveResult,
  NormAnalysis,
  NormGameState,
  NormLegalMove,
  NormMove,
  NormPiece,
  PlayerColor,
  GameStatusNorm,
  ProviderCapabilities,
  BackendId,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let nextLocalId = 1;

function toNormPiece(p: LibPiece): NormPiece {
  return { type: p.type, color: p.color as PlayerColor };
}

function toNormMove(m: LibMove): NormMove {
  return {
    from: m.from,
    to: m.to,
    san: m.san,
    piece: m.piece ? toNormPiece(m.piece) : undefined,
    captured: m.captured ? toNormPiece(m.captured) : undefined,
    promotion: m.promotion,
  };
}

function gameToNorm(id: string, engine: ChessEngine): NormGameState {
  const status = engine.getStatus() as GameStatusNorm;
  const history = engine.getHistory();
  const board = engine.getBoard();

  return {
    id,
    fen: engine.getFEN(),
    turn: engine.getTurn() as PlayerColor,
    status,
    check: engine.isInCheck(),
    moveCount: history.length,
    moveHistory: history.map(toNormMove),
    board: board.map((row) => row.map((p) => (p ? toNormPiece(p) : null))),
    result: engine.getResult(),
    gameOver: engine.isGameOver(),
  };
}

// ---------------------------------------------------------------------------
// LocalProvider
// ---------------------------------------------------------------------------

export class LocalProvider implements ChessProvider {
  readonly backendId: BackendId = 'local';

  readonly capabilities: ProviderCapabilities = {
    undo: true,
    ai: true,
    hint: true,
    analysis: false, // no deep analysis in-browser (only simple eval)
    chat: false,
    websocket: false,
    pgn: true,
    fenLoad: true,
  };

  /** In-memory game store: id → { engine, meta } */
  private games = new Map<string, { engine: ChessEngine; aiEngine: ChessEngine }>();

  // -- helpers --------------------------------------------------------------

  private getEngine(gameId: string): ChessEngine {
    const entry = this.games.get(gameId);
    if (!entry) throw new Error(`Game not found: ${gameId}`);
    return entry.engine;
  }

  // -- Game lifecycle -------------------------------------------------------

  async createGame(options?: CreateGameOptions): Promise<NormGameState> {
    const id = `local-${nextLocalId++}`;
    const engine = new ChessEngine(options?.fen);
    this.games.set(id, { engine, aiEngine: engine });
    return gameToNorm(id, engine);
  }

  async getGame(gameId: string): Promise<NormGameState> {
    return gameToNorm(gameId, this.getEngine(gameId));
  }

  async deleteGame(gameId: string): Promise<void> {
    this.games.delete(gameId);
  }

  // -- Moves ----------------------------------------------------------------

  async makeMove(
    gameId: string,
    from: string,
    to: string,
    promotion?: string
  ): Promise<NormGameState> {
    const engine = this.getEngine(gameId);
    const result = engine.makeMove(from, to, promotion);
    if (!result) throw new Error(`Illegal move: ${from}-${to}`);
    return gameToNorm(gameId, engine);
  }

  async undoMove(gameId: string): Promise<NormGameState> {
    const engine = this.getEngine(gameId);
    const result = engine.undo();
    if (!result) throw new Error('Nothing to undo');
    return gameToNorm(gameId, engine);
  }

  async getLegalMoves(gameId: string, fromSquare?: string): Promise<NormLegalMove[]> {
    const engine = this.getEngine(gameId);
    const moves = fromSquare ? engine.getLegalMovesFrom(fromSquare) : engine.getLegalMoves();
    return moves.map((m) => ({
      from: m.from,
      to: m.to,
      san: m.san,
      promotion: m.promotion,
    }));
  }

  // -- AI -------------------------------------------------------------------

  async aiMove(gameId: string, difficulty: string = 'medium'): Promise<NormAiMoveResult> {
    const engine = this.getEngine(gameId);
    const start = performance.now();
    const move = ChessAI.computeBestMove(engine, difficulty as AIDifficulty);
    if (!move) throw new Error('AI could not find a move');

    // Apply the move
    const applied = engine.makeMove(move.from, move.to, move.promotion);
    if (!applied) throw new Error('AI move was illegal');

    const elapsed = performance.now() - start;
    return {
      move: toNormMove(applied),
      game: gameToNorm(gameId, engine),
      thinkingTimeMs: Math.round(elapsed),
    };
  }

  async aiHint(gameId: string, difficulty: string = 'easy'): Promise<NormMove> {
    const engine = this.getEngine(gameId);
    const move = ChessAI.computeBestMove(engine, difficulty as AIDifficulty);
    if (!move) throw new Error('No hint available');
    return { from: move.from, to: move.to, san: move.san };
  }

  // -- Position -------------------------------------------------------------

  async loadFen(gameId: string, fen: string): Promise<NormGameState> {
    const engine = this.getEngine(gameId);
    engine.loadFEN(fen);
    return gameToNorm(gameId, engine);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getPgn(_gameId: string): Promise<string> {
    // PGN is built client-side via the pgn util — just return a stub
    // The real PGN builder in App.tsx uses buildPGN() directly
    return '';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAnalysis(_gameId: string, _depth?: number): Promise<NormAnalysis> {
    throw new Error('Analysis not supported in local mode');
  }

  // -- Cleanup --------------------------------------------------------------

  dispose(): void {
    this.games.clear();
  }

  // -- Direct engine access (local-only) ------------------------------------

  /**
   * Get the raw ChessEngine for a game.
   * Only available for local provider — used by useChessGame for
   * synchronous board reads, selection logic, etc.
   */
  getEngineDirect(gameId: string): ChessEngine {
    return this.getEngine(gameId);
  }

  /**
   * Register an externally-created engine (e.g. for backwards compat
   * with the current useChessGame that creates its own ChessEngine).
   */
  registerEngine(gameId: string, engine: ChessEngine): void {
    this.games.set(gameId, { engine, aiEngine: engine });
  }
}
