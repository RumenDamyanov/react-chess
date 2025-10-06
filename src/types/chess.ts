/**
 * Chess piece colors
 */
export const Color = {
  White: 'w',
  Black: 'b',
} as const;

export type Color = (typeof Color)[keyof typeof Color];

/**
 * Chess piece types
 */
export const PieceType = {
  Pawn: 'p',
  Knight: 'n',
  Bishop: 'b',
  Rook: 'r',
  Queen: 'q',
  King: 'k',
} as const;

export type PieceType = (typeof PieceType)[keyof typeof PieceType];

/**
 * Represents a chess piece with color and type
 */
export interface Piece {
  color: Color;
  type: PieceType;
}

/**
 * Represents a square on the chess board (0-63)
 * 0 = a1, 1 = b1, ..., 63 = h8
 */
export type Square = number;

/**
 * Chess board position using FEN notation
 */
export type FEN = string;

/**
 * Chess move in UCI format (e.g., "e2e4", "e7e8q")
 */
export type UCIMove = string;

/**
 * Chess move in SAN format (e.g., "Nf3", "O-O", "e8=Q+")
 */
export type SANMove = string;

/**
 * Represents a chess move with from/to squares
 */
export interface Move {
  from: Square;
  to: Square;
  promotion?: PieceType;
  captured?: PieceType;
  flags: MoveFlags;
}

/**
 * Move flags to indicate special moves
 */
export interface MoveFlags {
  isCapture: boolean;
  isEnPassant: boolean;
  isCastling: boolean;
  isPromotion: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
}

/**
 * Game state information
 */
export interface GameState {
  fen: FEN;
  turn: Color;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  isGameOver: boolean;
  halfMoveClock: number;
  fullMoveNumber: number;
  castlingRights: CastlingRights;
  enPassantSquare: Square | null;
}

/**
 * Castling availability
 */
export interface CastlingRights {
  whiteKingSide: boolean;
  whiteQueenSide: boolean;
  blackKingSide: boolean;
  blackQueenSide: boolean;
}

/**
 * Game result
 */
export const GameResult = {
  WhiteWins: '1-0',
  BlackWins: '0-1',
  Draw: '1/2-1/2',
  InProgress: '*',
} as const;

export type GameResult = (typeof GameResult)[keyof typeof GameResult];

/**
 * Draw types
 */
export const DrawType = {
  Stalemate: 'stalemate',
  InsufficientMaterial: 'insufficient_material',
  ThreefoldRepetition: 'threefold_repetition',
  FiftyMoveRule: 'fifty_move_rule',
  Agreement: 'agreement',
} as const;

export type DrawType = (typeof DrawType)[keyof typeof DrawType];

/**
 * Move validation result
 */
export interface MoveValidation {
  isValid: boolean;
  error?: string;
}

/**
 * Chess position with board state
 */
export type Board = (Piece | null)[];

/**
 * Move history entry
 */
export interface MoveHistoryEntry {
  move: Move;
  san: SANMove;
  uci: UCIMove;
  fen: FEN;
  timestamp: number;
}

/**
 * Game metadata
 */
export interface GameMetadata {
  white?: string;
  black?: string;
  event?: string;
  site?: string;
  date?: string;
  round?: string;
  result?: GameResult;
  timeControl?: string;
}

/**
 * PGN (Portable Game Notation) format
 */
export type PGN = string;

/**
 * Square names (algebraic notation)
 */
export type SquareName =
  | 'a1'
  | 'b1'
  | 'c1'
  | 'd1'
  | 'e1'
  | 'f1'
  | 'g1'
  | 'h1'
  | 'a2'
  | 'b2'
  | 'c2'
  | 'd2'
  | 'e2'
  | 'f2'
  | 'g2'
  | 'h2'
  | 'a3'
  | 'b3'
  | 'c3'
  | 'd3'
  | 'e3'
  | 'f3'
  | 'g3'
  | 'h3'
  | 'a4'
  | 'b4'
  | 'c4'
  | 'd4'
  | 'e4'
  | 'f4'
  | 'g4'
  | 'h4'
  | 'a5'
  | 'b5'
  | 'c5'
  | 'd5'
  | 'e5'
  | 'f5'
  | 'g5'
  | 'h5'
  | 'a6'
  | 'b6'
  | 'c6'
  | 'd6'
  | 'e6'
  | 'f6'
  | 'g6'
  | 'h6'
  | 'a7'
  | 'b7'
  | 'c7'
  | 'd7'
  | 'e7'
  | 'f7'
  | 'g7'
  | 'h7'
  | 'a8'
  | 'b8'
  | 'c8'
  | 'd8'
  | 'e8'
  | 'f8'
  | 'g8'
  | 'h8';
