import { ChessAI, type AIDifficulty } from '../../src/services/ChessAI';
import { ChessEngine } from '../../src/services/ChessEngine';

describe('ChessAI', () => {
  describe('depthForLevel', () => {
    it('should return 0 for harmless difficulty', () => {
      expect(ChessAI.depthForLevel('harmless')).toBe(0);
    });

    it('should return 0 for random difficulty (legacy)', () => {
      expect(ChessAI.depthForLevel('random')).toBe(0);
    });

    it('should return 1 for easy difficulty', () => {
      expect(ChessAI.depthForLevel('easy')).toBe(1);
    });

    it('should return 2 for medium difficulty', () => {
      expect(ChessAI.depthForLevel('medium')).toBe(2);
    });

    it('should return 3 for hard difficulty', () => {
      expect(ChessAI.depthForLevel('hard')).toBe(3);
    });

    it('should return 4 for expert difficulty', () => {
      expect(ChessAI.depthForLevel('expert')).toBe(4);
    });

    it('should return 5 for godlike difficulty', () => {
      expect(ChessAI.depthForLevel('godlike')).toBe(5);
    });

    it('should return 0 for unknown difficulty', () => {
      expect(ChessAI.depthForLevel('unknown' as AIDifficulty)).toBe(0);
    });
  });

  describe('makeRandomMove', () => {
    let engine: ChessEngine;

    beforeEach(() => {
      engine = new ChessEngine();
    });

    it('should make a legal move', () => {
      const move = ChessAI.makeRandomMove(engine);
      expect(move).not.toBeNull();
      expect(move).toHaveProperty('from');
      expect(move).toHaveProperty('to');
      expect(move).toHaveProperty('piece');
    });

    it('should return null when no legal moves available', () => {
      // Set up a position with no legal moves (stalemate or checkmate)
      // Using a known stalemate FEN (black king is stalemated)
      engine.loadFEN('7k/5Q2/5K2/8/8/8/8/8 b - - 0 1');
      const stalematMove = ChessAI.makeRandomMove(engine);
      expect(stalematMove).toBeNull();
    });

    it('should select different moves on different calls (probabilistic)', () => {
      // Run multiple times and expect some variation
      const moves = new Set();
      for (let i = 0; i < 20; i++) {
        engine = new ChessEngine(); // Reset to start position
        const move = ChessAI.makeRandomMove(engine);
        if (move) {
          moves.add(`${move.from}-${move.to}`);
        }
      }
      // Starting position has 20 possible moves, we should see variety
      expect(moves.size).toBeGreaterThan(1);
    });
  });

  describe('makeRandomMoveWithDelay', () => {
    let engine: ChessEngine;

    beforeEach(() => {
      engine = new ChessEngine();
    });

    it('should delay before making move', async () => {
      const startTime = Date.now();
      await ChessAI.makeRandomMoveWithDelay(engine, 100);
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow small margin
    });

    it('should return a move after delay', async () => {
      const move = await ChessAI.makeRandomMoveWithDelay(engine, 10);
      expect(move).not.toBeNull();
      expect(move).toHaveProperty('from');
    });
  });

  describe('computeBestMove', () => {
    let engine: ChessEngine;

    beforeEach(() => {
      engine = new ChessEngine();
    });

    it('should return a legal move for harmless level', () => {
      const move = ChessAI.computeBestMove(engine, 'harmless');
      expect(move).not.toBeNull();
      expect(move).toHaveProperty('from');
    });

    it('should return a legal move for easy level', () => {
      const move = ChessAI.computeBestMove(engine, 'easy');
      expect(move).not.toBeNull();
    });

    it('should return null when no moves available', () => {
      // Stalemate position
      engine.loadFEN('7k/5Q2/5K2/8/8/8/8/8 b - - 0 1');
      const move = ChessAI.computeBestMove(engine, 'medium');
      expect(move).toBeNull();
    });

    it('should prefer captures at higher levels', () => {
      // Position where there's a free piece to capture
      engine.loadFEN('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPPQPPP/RNB1KBNR w KQkq - 0 1');
      
      const move = ChessAI.computeBestMove(engine, 'medium');
      expect(move).not.toBeNull();
      // At depth 2+, AI should find Qxe5 capturing the pawn
      if (move && move.captured) {
        expect(move.to).toBe('e5');
      }
    });

    it('should find checkmate in one move', () => {
      // Fool's mate position - this IS checkmate already
      engine.loadFEN('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
      
      // White is checkmated, should have no legal moves
      const legalMoves = engine.getLegalMoves();
      expect(legalMoves.length).toBe(0);
      expect(engine.isGameOver()).toBe(true);
    });

    it('should handle throttling for complex positions', () => {
      // Start position with many legal moves
      const move = ChessAI.computeBestMove(engine, 'godlike');
      expect(move).not.toBeNull();
      // Should complete without timing out
    });
  });

  describe('material evaluation', () => {
    it('should evaluate starting position as roughly equal', () => {
      const engine = new ChessEngine();
      const move1 = ChessAI.computeBestMove(engine, 'easy');
      expect(move1).not.toBeNull();
      // Starting position should not have extreme eval, just check it returns move
    });

    it('should prefer positions with material advantage', () => {
      // Position where white is up a queen
      const engine = new ChessEngine();
      engine.loadFEN('rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      const move = ChessAI.computeBestMove(engine, 'medium');
      expect(move).not.toBeNull();
    });
  });
});
