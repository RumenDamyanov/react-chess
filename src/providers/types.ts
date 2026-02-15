/**
 * Unified types for the multi-backend chess provider abstraction.
 *
 * These types normalise the differences between:
 *   - local   (@rumenx/chess npm library – runs in-browser)
 *   - rust    (rust-chess / rumenx-chess REST API)
 *   - go      (go-chess REST API)
 *   - js      (js-chess / npm-chess REST API via /api/v1)
 */

// ---------------------------------------------------------------------------
// Backend identification
// ---------------------------------------------------------------------------

/** Available backend identifiers */
export type BackendId = 'local' | 'rust' | 'go' | 'js';

/** Configuration for a backend */
export interface BackendConfig {
  /** Which backend to use */
  id: BackendId;
  /** Display name shown in the UI */
  label: string;
  /** Base URL for remote backends (ignored for 'local') */
  url?: string;
  /** Short description */
  description: string;
}

/** All backends with their defaults */
export const BACKEND_PRESETS: Record<BackendId, BackendConfig> = {
  local: {
    id: 'local',
    label: 'Local (Browser)',
    description: 'In-browser engine via @rumenx/chess — no server needed',
  },
  rust: {
    id: 'rust',
    label: 'Rust Engine',
    url: 'http://localhost:8082',
    description: 'rust-chess (rumenx-chess) Axum REST API',
  },
  go: {
    id: 'go',
    label: 'Go Engine',
    url: 'http://localhost:8080',
    description: 'go-chess Gin REST API',
  },
  js: {
    id: 'js',
    label: 'JS Engine',
    url: 'http://localhost:8081',
    description: 'js-chess / npm-chess Express REST API',
  },
};

// ---------------------------------------------------------------------------
// Normalised game types (frontend-canonical)
// ---------------------------------------------------------------------------

export type PlayerColor = 'white' | 'black';

export type GameStatusNorm =
  | 'active'
  | 'check'
  | 'checkmate'
  | 'stalemate'
  | 'draw'
  | 'insufficient_material'
  | 'threefold_repetition'
  | 'fifty_move_rule';

export interface NormPiece {
  type: 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';
  color: PlayerColor;
}

export interface NormMove {
  from: string;
  to: string;
  san?: string;
  piece?: NormPiece;
  captured?: NormPiece;
  promotion?: string;
}

export interface NormGameState {
  id: string;
  fen: string;
  turn: PlayerColor;
  status: GameStatusNorm;
  check: boolean;
  moveCount: number;
  moveHistory: NormMove[];
  board?: (NormPiece | null)[][];
  /** Game result: '1-0' | '0-1' | '1/2-1/2' | '*' */
  result: string;
  gameOver: boolean;
}

export interface NormLegalMove {
  from: string;
  to: string;
  san?: string;
  promotion?: string;
}

export interface NormAiMoveResult {
  move: NormMove;
  game: NormGameState;
  evaluation?: number;
  thinkingTimeMs?: number;
  depth?: number;
}

export interface NormAnalysis {
  evaluation: number;
  bestMove?: NormMove;
  depth?: number;
}

// ---------------------------------------------------------------------------
// Provider capability flags
// ---------------------------------------------------------------------------

export interface ProviderCapabilities {
  /** Can undo moves (go-chess cannot) */
  undo: boolean;
  /** Has AI opponent */
  ai: boolean;
  /** Has AI hint endpoint */
  hint: boolean;
  /** Has position analysis endpoint */
  analysis: boolean;
  /** Has LLM chat */
  chat: boolean;
  /** Has WebSocket streaming */
  websocket: boolean;
  /** Has PGN export */
  pgn: boolean;
  /** Has FEN load */
  fenLoad: boolean;
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

/**
 * Unified chess provider interface.
 * Every backend adapter must implement this.
 */
export interface ChessProvider {
  /** Which backend this provider wraps */
  readonly backendId: BackendId;

  /** What this backend supports */
  readonly capabilities: ProviderCapabilities;

  // -- Game lifecycle -------------------------------------------------------

  /** Create a new game, return normalised state */
  createGame(options?: CreateGameOptions): Promise<NormGameState>;

  /** Get current game state */
  getGame(gameId: string): Promise<NormGameState>;

  /** Delete a game */
  deleteGame(gameId: string): Promise<void>;

  // -- Moves ----------------------------------------------------------------

  /** Make a move */
  makeMove(gameId: string, from: string, to: string, promotion?: string): Promise<NormGameState>;

  /** Undo last move (throws if unsupported) */
  undoMove(gameId: string): Promise<NormGameState>;

  /** Get legal moves, optionally from a specific square */
  getLegalMoves(gameId: string, fromSquare?: string): Promise<NormLegalMove[]>;

  // -- AI -------------------------------------------------------------------

  /** Ask the AI to make a move */
  aiMove(gameId: string, difficulty?: string): Promise<NormAiMoveResult>;

  /** Get AI hint without modifying the game */
  aiHint(gameId: string, difficulty?: string): Promise<NormMove>;

  // -- Position -------------------------------------------------------------

  /** Load a position from FEN */
  loadFen(gameId: string, fen: string): Promise<NormGameState>;

  /** Export game as PGN string */
  getPgn(gameId: string): Promise<string>;

  /** Get position analysis */
  getAnalysis(gameId: string, depth?: number): Promise<NormAnalysis>;

  // -- Cleanup --------------------------------------------------------------

  /** Dispose of resources (close WS connections, etc.) */
  dispose(): void;
}

// ---------------------------------------------------------------------------
// Create-game options
// ---------------------------------------------------------------------------

export interface CreateGameOptions {
  whitePlayer?: string;
  blackPlayer?: string;
  fen?: string;
  aiEnabled?: boolean;
  aiDifficulty?: string;
  aiColor?: PlayerColor;
}
