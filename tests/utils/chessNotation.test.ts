import { formatMove, chunkMoves } from '../../src/utils/chessNotation';
import type { Move } from '@rumenx/chess/types';

describe('chessNotation', () => {
  describe('formatMove', () => {
    it('should format pawn move without capture', () => {
      const move: Move = {
        from: 'e2',
        to: 'e4',
        piece: { type: 'pawn', color: 'white' },
        captured: undefined,
        castling: undefined,
        enPassant: undefined,
        promotion: undefined,
        check: false,
        checkmate: false,
      };
      expect(formatMove(move)).toBe('e4');
    });

    it('should format pawn capture', () => {
      const move: Move = {
        from: 'e4',
        to: 'd5',
        piece: { type: 'pawn', color: 'white' },
        captured: { type: 'pawn', color: 'black' },
        castling: undefined,
        enPassant: undefined,
        promotion: undefined,
        check: false,
        checkmate: false,
      };
      expect(formatMove(move)).toBe('exd5');
    });

    it('should format pawn promotion', () => {
      const move: Move = {
        from: 'e7',
        to: 'e8',
        piece: { type: 'pawn', color: 'white' },
        captured: undefined,
        castling: undefined,
        enPassant: undefined,
        promotion: 'queen',
        check: false,
        checkmate: false,
      };
      expect(formatMove(move)).toBe('e8=Q');
    });

    it('should format knight move', () => {
      const move: Move = {
        from: 'g1',
        to: 'f3',
        piece: { type: 'knight', color: 'white' },
        captured: undefined,
        castling: undefined,
        enPassant: undefined,
        promotion: undefined,
        check: false,
        checkmate: false,
      };
      expect(formatMove(move)).toBe('Nf3');
    });

    it('should format piece capture', () => {
      const move: Move = {
        from: 'f3',
        to: 'e5',
        piece: { type: 'knight', color: 'white' },
        captured: { type: 'pawn', color: 'black' },
        castling: undefined,
        enPassant: undefined,
        promotion: undefined,
        check: false,
        checkmate: false,
      };
      expect(formatMove(move)).toBe('Nxe5');
    });

    it('should format kingside castling', () => {
      const move: Move = {
        from: 'e1',
        to: 'g1',
        piece: { type: 'king', color: 'white' },
        captured: undefined,
        castling: 'kingside',
        enPassant: undefined,
        promotion: undefined,
        check: false,
        checkmate: false,
      };
      expect(formatMove(move)).toBe('O-O');
    });

    it('should format queenside castling', () => {
      const move: Move = {
        from: 'e1',
        to: 'c1',
        piece: { type: 'king', color: 'white' },
        captured: undefined,
        castling: 'queenside',
        enPassant: undefined,
        promotion: undefined,
        check: false,
        checkmate: false,
      };
      expect(formatMove(move)).toBe('O-O-O');
    });

    it('should append check symbol', () => {
      const move: Move = {
        from: 'f3',
        to: 'g5',
        piece: { type: 'knight', color: 'white' },
        captured: undefined,
        castling: undefined,
        enPassant: undefined,
        promotion: undefined,
        check: true,
        checkmate: false,
      };
      expect(formatMove(move)).toBe('Ng5+');
    });

    it('should append checkmate symbol', () => {
      const move: Move = {
        from: 'd1',
        to: 'h5',
        piece: { type: 'queen', color: 'white' },
        captured: undefined,
        castling: undefined,
        enPassant: undefined,
        promotion: undefined,
        check: false,
        checkmate: true,
      };
      expect(formatMove(move)).toBe('Qh5#');
    });

    it('should format queen move', () => {
      const move: Move = {
        from: 'd1',
        to: 'd4',
        piece: { type: 'queen', color: 'white' },
        captured: undefined,
        castling: undefined,
        enPassant: undefined,
        promotion: undefined,
        check: false,
        checkmate: false,
      };
      expect(formatMove(move)).toBe('Qd4');
    });
  });

  describe('chunkMoves', () => {
    it('should chunk empty array', () => {
      expect(chunkMoves([])).toEqual([]);
    });

    it('should chunk single move', () => {
      const move: Move = {
        from: 'e2',
        to: 'e4',
        piece: { type: 'pawn', color: 'white' },
        captured: undefined,
        castling: undefined,
        enPassant: undefined,
        promotion: undefined,
        check: false,
        checkmate: false,
      };
      const result = chunkMoves([move]);
      expect(result).toEqual([
        {
          fullMove: 1,
          white: move,
          black: undefined,
        },
      ]);
    });

    it('should chunk two moves', () => {
      const move1: Move = {
        from: 'e2',
        to: 'e4',
        piece: { type: 'pawn', color: 'white' },
        captured: undefined,
        castling: undefined,
        enPassant: undefined,
        promotion: undefined,
        check: false,
        checkmate: false,
      };
      const move2: Move = {
        from: 'e7',
        to: 'e5',
        piece: { type: 'pawn', color: 'black' },
        captured: undefined,
        castling: undefined,
        enPassant: undefined,
        promotion: undefined,
        check: false,
        checkmate: false,
      };
      const result = chunkMoves([move1, move2]);
      expect(result).toEqual([
        {
          fullMove: 1,
          white: move1,
          black: move2,
        },
      ]);
    });

    it('should chunk multiple moves correctly', () => {
      const moves: Move[] = Array(5)
        .fill(null)
        .map((_, i) => ({
          from: 'e2',
          to: 'e4',
          piece: { type: 'pawn', color: i % 2 === 0 ? 'white' : 'black' },
          captured: undefined,
          castling: undefined,
          enPassant: undefined,
          promotion: undefined,
          check: false,
          checkmate: false,
        }));
      
      const result = chunkMoves(moves);
      expect(result).toHaveLength(3);
      expect(result[0].fullMove).toBe(1);
      expect(result[1].fullMove).toBe(2);
      expect(result[2].fullMove).toBe(3);
      expect(result[2].black).toBeUndefined();
    });
  });
});
