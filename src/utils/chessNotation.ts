import type { Move, Piece } from '@rumenx/chess/types';
import { ChessEngine } from '../services/ChessEngine';

// Generate Standard Algebraic Notation (simplified)
export function formatMove(
  move: Move,
  _unusedIndex?: number,
  engineForContext?: ChessEngine
): string {
  // Castling
  if (move.castling) {
    return move.to[0] === 'g' ? 'O-O' : 'O-O-O';
  }

  const piece = move.piece;
  const isPawn = piece.type === 'pawn';
  let san = '';
  const pieceLetter = isPawn ? '' : pieceLetterMap[piece.type] || piece.type[0].toUpperCase();

  // Disambiguation (basic): if engine context provided, check for other pieces of same type that can move to target
  let disambiguation = '';
  if (engineForContext && !isPawn && piece.type !== 'king') {
    disambiguation = computeDisambiguation(engineForContext, move);
  }

  if (!isPawn) san += pieceLetter + disambiguation;

  if (move.captured) {
    if (isPawn && !san) {
      // Pawn capture file letter
      san += move.from[0];
    }
    san += 'x';
  }

  san += move.to;

  // Promotion
  if (move.promotion) {
    san += '=' + pieceLetterMap[move.promotion];
  }

  if (move.checkmate) san += '#';
  else if (move.check) san += '+';

  return san;
}

const pieceLetterMap: Record<string, string> = {
  king: 'K',
  queen: 'Q',
  rook: 'R',
  bishop: 'B',
  knight: 'N',
  pawn: '',
};

function computeDisambiguation(engine: ChessEngine, move: Move): string {
  // Look for other same-type pieces of same color that can also move to move.to
  const board = engine.getBoard();
  const candidates: { square: string; piece: Piece }[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      if (p.type === move.piece.type && p.color === move.piece.color) {
        const square = ChessEngine.coordsToSquare(r, c);
        if (square !== move.from) {
          const legalFrom = engine
            .getLegalMovesFrom(square)
            .some((m) => m.to === move.to && m.piece.type === move.piece.type);
          if (legalFrom) candidates.push({ square, piece: p });
        }
      }
    }
  }
  if (candidates.length === 0) return '';
  const fromFile = move.from[0];
  const fromRank = move.from[1];
  const conflictSameFile = candidates.some((c) => c.square[0] === fromFile);
  const conflictSameRank = candidates.some((c) => c.square[1] === fromRank);
  if (!conflictSameFile) return fromFile; // file disambiguation enough
  if (!conflictSameRank) return fromRank; // rank disambiguation enough
  return move.from; // need both
}

export function chunkMoves(moves: Move[]): { fullMove: number; white?: Move; black?: Move }[] {
  const result: { fullMove: number; white?: Move; black?: Move }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    result.push({
      fullMove: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }
  return result;
}
