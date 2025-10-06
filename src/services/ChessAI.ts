import type { Move as ChessMove, Piece as ChessPiece } from '@rumenx/chess/types';
import { ChessEngine } from './ChessEngine';

/**
 * Simple AI opponent that makes random legal moves
 * This can be extended later with more sophisticated algorithms
 */
export class ChessAI {
  /** Difficulty levels mapping to search depth (practical limits to keep UI responsive) */
  static depthForLevel(level: AIDifficulty): number {
    switch (level) {
      case 'harmless':
      case 'random': // backward compatibility
        return 0; // pure random
      case 'easy':
        return 1; // shallow lookahead
      case 'medium':
        return 2; // basic tactics
      case 'hard':
        return 3; // deeper limited
      case 'expert':
        return 4; // may be slower
      case 'godlike':
        return 5; // caution: exponential growth
      default:
        return 0;
    }
  }

  /**
   * Select a random move from available legal moves
   * @param engine - The chess engine instance
   * @returns A randomly selected legal move, or null if no moves available
   */
  static makeRandomMove(engine: ChessEngine): ChessMove | null {
    const legalMoves = engine.getLegalMoves();

    if (legalMoves.length === 0) {
      return null;
    }

    // Select a random move
    const randomIndex = Math.floor(Math.random() * legalMoves.length);
    const selectedMove = legalMoves[randomIndex];

    // Execute the move
    return engine.makeMove(selectedMove.from, selectedMove.to, selectedMove.promotion);
  }

  /**
   * Make a move with a delay to simulate thinking time
   * @param engine - The chess engine instance
   * @param delayMs - Delay in milliseconds before making the move
   * @returns Promise that resolves with the executed move
   */
  static async makeRandomMoveWithDelay(
    engine: ChessEngine,
    delayMs: number = 500
  ): Promise<ChessMove | null> {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return this.makeRandomMove(engine);
  }

  /**
   * Compute best move for given difficulty without mutating game (except via temporary makes/undos).
   * Uses a simple material evaluation and minimax with alpha-beta pruning.
   */
  static computeBestMove(engine: ChessEngine, level: AIDifficulty): ChessMove | null {
    const depth = this.depthForLevel(level);
    if (depth === 0) {
      const legal = engine.getLegalMoves();
      if (!legal.length) return null;
      return legal[Math.floor(Math.random() * legal.length)];
    }

    // Soft safeguard: cap effective depth if move count explodes to avoid UI freeze
    const legalMoves = engine.getLegalMoves();
    let effectiveDepth = depth;
    if (legalMoves.length > 60 && effectiveDepth > 3) {
      effectiveDepth = 3; // emergency throttle
    }

    const maximizingColor = engine.getTurn();

    let bestMove: ChessMove | null = null;
    let bestScore = -Infinity;
    // Basic ordering: prioritize captures (bigger swing first) for pruning efficiency at harder levels
    const ordered = [...legalMoves].sort((a, b) => {
      const aCap = a.captured ? ChessAI.captureValue(a) : 0;
      const bCap = b.captured ? ChessAI.captureValue(b) : 0;
      return bCap - aCap;
    });
    for (const move of ordered) {
      const applied = engine.makeMove(move.from, move.to, move.promotion);
      if (!applied) continue;
      const score = this.minimax(engine, effectiveDepth - 1, -Infinity, Infinity, maximizingColor);
      engine.undo();
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return bestMove;
  }

  private static minimax(
    engine: ChessEngine,
    depth: number,
    alpha: number,
    beta: number,
    maximizingColor: 'white' | 'black'
  ): number {
    if (depth === 0 || engine.isGameOver()) {
      return this.evaluate(engine, maximizingColor);
    }

    const legalMoves = engine.getLegalMoves();
    if (legalMoves.length === 0) {
      return this.evaluate(engine, maximizingColor);
    }

    const currentTurn = engine.getTurn();
    const isMaximizing = currentTurn === maximizingColor;

    if (isMaximizing) {
      let value = -Infinity;
      for (const move of legalMoves) {
        const applied = engine.makeMove(move.from, move.to, move.promotion);
        if (!applied) continue;
        const childValue = this.minimax(engine, depth - 1, alpha, beta, maximizingColor);
        engine.undo();
        value = Math.max(value, childValue);
        alpha = Math.max(alpha, value);
        if (alpha >= beta) break; // beta cut-off
      }
      return value;
    } else {
      let value = Infinity;
      for (const move of legalMoves) {
        const applied = engine.makeMove(move.from, move.to, move.promotion);
        if (!applied) continue;
        const childValue = this.minimax(engine, depth - 1, alpha, beta, maximizingColor);
        engine.undo();
        value = Math.min(value, childValue);
        beta = Math.min(beta, value);
        if (alpha >= beta) break; // alpha cut-off
      }
      return value;
    }
  }

  /** Simple material evaluation from perspective of maximizingColor */
  private static evaluate(engine: ChessEngine, maximizingColor: 'white' | 'black'): number {
    const board = engine.getBoard();
    let score = 0;
    for (const row of board) {
      for (const piece of row) {
        if (!piece) continue;
        const value = this.pieceValue(piece);
        score += piece.color === maximizingColor ? value : -value;
      }
    }
    // Basic game over bonuses
    if (engine.isGameOver()) {
      const result = engine.getResult();
      if (result === '1-0') return maximizingColor === 'white' ? Infinity : -Infinity;
      if (result === '0-1') return maximizingColor === 'black' ? Infinity : -Infinity;
    }
    return score;
  }

  private static pieceValue(piece: ChessPiece): number {
    switch (piece.type) {
      case 'pawn':
        return 100;
      case 'knight':
      case 'bishop':
        return 300;
      case 'rook':
        return 500;
      case 'queen':
        return 900;
      case 'king':
        return 10000;
      default:
        return 0;
    }
  }

  private static captureValue(move: ChessMove): number {
    if (!move.captured) return 0;
    // Use pieceValue scale; assume captured piece type present
    const fake: ChessPiece = { type: move.captured.type, color: move.captured.color } as ChessPiece;
    return this.pieceValue(fake);
  }
}
// Include legacy 'random' for persistence compatibility; UI will map to 'harmless'
export type AIDifficulty =
  | 'harmless'
  | 'easy'
  | 'medium'
  | 'hard'
  | 'expert'
  | 'godlike'
  | 'random';
