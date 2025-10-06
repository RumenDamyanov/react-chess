import { Game } from '@rumenx/chess/engine';
import type {
  Color,
  GameStatus,
  Move as ChessMove,
  MoveOptions,
  Piece as ChessPiece,
  Square as ChessSquare,
  CastlingRights,
} from '@rumenx/chess/types';

/**
 * Service class that wraps the @rumenx/chess Game engine
 * Provides a simplified, React-friendly interface to the chess engine
 */
export class ChessEngine {
  private game: Game;

  constructor(fen?: string) {
    this.game = new Game(fen ? { fen } : undefined);
  }

  /**
   * Make a move on the board
   * @param from - Source square (e.g., "e2")
   * @param to - Target square (e.g., "e4")
   * @param promotion - Optional promotion piece type
   * @returns The executed move or null if invalid
   */
  makeMove(from: ChessSquare, to: ChessSquare, promotion?: string): ChessMove | null {
    const moveOptions: MoveOptions = {
      from,
      to,
      promotion: promotion as ChessPiece['type'],
    };

    return this.game.move(moveOptions);
  }

  /**
   * Get all legal moves from the current position
   * @returns Array of legal moves
   */
  getLegalMoves(): ChessMove[] {
    return this.game.getLegalMoves();
  }

  /**
   * Get legal moves from a specific square
   * @param square - The square to get moves from (e.g., "e2")
   * @returns Array of legal moves from that square
   */
  getLegalMovesFrom(square: ChessSquare): ChessMove[] {
    return this.game.getLegalMovesFrom(square);
  }

  /**
   * Undo the last move
   * @returns The undone move or null if no moves to undo
   */
  undo(): ChessMove | null {
    return this.game.undo();
  }

  /**
   * Get the current FEN string
   * @returns FEN notation of the current position
   */
  getFEN(): string {
    return this.game.getFen();
  }

  /**
   * Load a position from FEN notation
   * @param fen - FEN string to load
   */
  loadFEN(fen: string): void {
    this.game.loadFen(fen);
  }

  /**
   * Get the current game status
   * @returns Game status (active, check, checkmate, stalemate, draw, etc.)
   */
  getStatus(): GameStatus {
    return this.game.getStatus();
  }

  /**
   * Get the current turn
   * @returns The color whose turn it is
   */
  getTurn(): Color {
    return this.game.getTurn();
  }

  /**
   * Get the move history
   * @returns Array of all moves made in the game
   */
  getHistory(): ChessMove[] {
    return this.game.getHistory();
  }

  /**
   * Get the current board state as 2D array
   * @returns 8x8 array of pieces (null for empty squares)
   */
  getBoard(): (ChessPiece | null)[][] {
    return this.game.getBoard().getBoard();
  }

  /**
   * Get a piece at a specific square
   * @param square - Square to check (e.g., "e4")
   * @returns The piece at that square or null if empty
   */
  getPieceAt(square: ChessSquare): ChessPiece | null {
    return this.game.getBoard().getPiece(square);
  }

  /**
   * Check if the game is over
   * @returns True if the game has ended
   */
  isGameOver(): boolean {
    return this.game.isGameOver();
  }

  /**
   * Check if the current player is in check
   * @returns True if in check
   */
  isInCheck(): boolean {
    return this.game.isInCheck();
  }

  /**
   * Get castling rights for both players
   * @returns Object with castling availability
   */
  getCastlingRights(): CastlingRights {
    return this.game.getCastlingRights();
  }

  /**
   * Get en passant target square if available
   * @returns Square where en passant capture is possible, or null
   */
  getEnPassantSquare(): ChessSquare | null {
    return this.game.getEnPassantSquare();
  }

  /**
   * Get half move clock (for 50-move rule)
   * @returns Number of half moves since last capture or pawn move
   */
  getHalfMoveClock(): number {
    return this.game.getHalfMoveClock();
  }

  /**
   * Get full move number
   * @returns The number of full moves in the game
   */
  getFullMoveNumber(): number {
    return this.game.getFullMoveNumber();
  }

  /**
   * Reset the game to starting position
   */
  reset(): void {
    this.game.reset();
  }

  /**
   * Get complete game position with all metadata
   * @returns Object containing board state and game metadata
   */
  getPosition() {
    return this.game.getPosition();
  }

  /**
   * Check if a square is under attack by the opponent
   * @param square - Square to check
   * @param byColor - Color of the attacking pieces
   * @returns True if the square is under attack
   */
  isSquareUnderAttack(square: ChessSquare, byColor: Color): boolean {
    // This would require access to the internal board methods
    // For now, we can infer this from legal moves
    const legalMoves = this.game.getLegalMoves();
    return legalMoves.some((move) => move.to === square && move.piece.color !== byColor);
  }

  /**
   * Get game result as standard notation
   * @returns "1-0" (white wins), "0-1" (black wins), "1/2-1/2" (draw), or "*" (in progress)
   */
  getResult(): string {
    const status = this.getStatus();
    switch (status) {
      case 'checkmate':
        // If checkmate, the current turn lost (since turn switches after move)
        return this.getTurn() === 'white' ? '0-1' : '1-0';
      case 'stalemate':
      case 'draw':
      case 'insufficient_material':
      case 'threefold_repetition':
      case 'fifty_move_rule':
        return '1/2-1/2';
      default:
        return '*';
    }
  }

  /**
   * Convert square notation to row/col coordinates
   * @param square - Square in algebraic notation (e.g., "e4")
   * @returns Object with row and col indices (0-7)
   */
  static squareToCoords(square: ChessSquare): { row: number; col: number } {
    // Adjusted mapping (verified via board discrepancy):
    // row 0 -> rank 1, row 7 -> rank 8 (bottom-up indexing)
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(square[1], 10); // 1..8
    const row = rank - 1; // rank1 -> row0
    return { row, col: file };
  }

  /**
   * Convert row/col coordinates to square notation
   * @param row - Row index (0-7, where 0 is rank 8, 7 is rank 1)
   * @param col - Column index (0-7, where 0 is file a)
   * @returns Square in algebraic notation (e.g., "e4")
   */
  static coordsToSquare(row: number, col: number): ChessSquare {
    const file = String.fromCharCode('a'.charCodeAt(0) + col);
    const rank = row + 1; // row0 -> rank1
    return `${file}${rank}` as ChessSquare;
  }
}

export default ChessEngine;
