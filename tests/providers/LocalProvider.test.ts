/**
 * Tests for LocalProvider — in-browser chess engine wrapper.
 */
import { LocalProvider } from '../../src/providers/LocalProvider';

describe('LocalProvider', () => {
  let provider: LocalProvider;

  beforeEach(() => {
    provider = new LocalProvider();
  });

  afterEach(() => {
    provider.dispose();
  });

  describe('metadata', () => {
    it('should have backendId "local"', () => {
      expect(provider.backendId).toBe('local');
    });

    it('should report correct capabilities', () => {
      expect(provider.capabilities).toEqual({
        undo: true,
        ai: true,
        hint: true,
        analysis: false,
        chat: false,
        websocket: false,
        pgn: true,
        fenLoad: true,
      });
    });
  });

  describe('createGame', () => {
    it('should create a game with starting position', async () => {
      const state = await provider.createGame();
      expect(state.id).toMatch(/^local-\d+$/);
      expect(state.fen).toContain('rnbqkbnr');
      expect(state.turn).toBe('white');
      expect(state.status).toBe('active');
      expect(state.check).toBe(false);
      expect(state.moveCount).toBe(0);
      expect(state.moveHistory).toEqual([]);
      expect(state.gameOver).toBe(false);
      expect(state.result).toBe('*');
    });

    it('should create a game with custom FEN', async () => {
      const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
      const state = await provider.createGame({ fen });
      expect(state.turn).toBe('white');
      expect(state.gameOver).toBe(false);
    });

    it('should assign unique ids', async () => {
      const g1 = await provider.createGame();
      const g2 = await provider.createGame();
      expect(g1.id).not.toBe(g2.id);
    });
  });

  describe('getGame', () => {
    it('should return game state', async () => {
      const created = await provider.createGame();
      const state = await provider.getGame(created.id);
      expect(state.id).toBe(created.id);
      expect(state.fen).toBe(created.fen);
    });

    it('should throw for non-existent game', async () => {
      await expect(provider.getGame('fake-id')).rejects.toThrow('Game not found');
    });
  });

  describe('deleteGame', () => {
    it('should delete a game', async () => {
      const created = await provider.createGame();
      await provider.deleteGame(created.id);
      await expect(provider.getGame(created.id)).rejects.toThrow('Game not found');
    });
  });

  describe('makeMove', () => {
    it('should make a legal move', async () => {
      const game = await provider.createGame();
      const state = await provider.makeMove(game.id, 'e2', 'e4');
      expect(state.turn).toBe('black');
      expect(state.moveCount).toBe(1);
      expect(state.moveHistory).toHaveLength(1);
      expect(state.moveHistory[0].from).toBe('e2');
      expect(state.moveHistory[0].to).toBe('e4');
    });

    it('should reject an illegal move', async () => {
      const game = await provider.createGame();
      await expect(provider.makeMove(game.id, 'e2', 'e5')).rejects.toThrow('Illegal move');
    });

    it('should handle promotion', async () => {
      // Create a game and load a promotion-ready position via loadFen
      const game = await provider.createGame();
      const fen = '4k3/P7/8/8/8/8/8/4K3 w - - 0 1';
      await provider.loadFen(game.id, fen);
      const state = await provider.makeMove(game.id, 'a7', 'a8', 'queen');
      expect(state.moveCount).toBe(1);
    });
  });

  describe('undoMove', () => {
    it('should undo the last move', async () => {
      const game = await provider.createGame();
      await provider.makeMove(game.id, 'e2', 'e4');
      const state = await provider.undoMove(game.id);
      expect(state.turn).toBe('white');
      expect(state.moveCount).toBe(0);
    });

    it('should throw when nothing to undo', async () => {
      const game = await provider.createGame();
      await expect(provider.undoMove(game.id)).rejects.toThrow('Nothing to undo');
    });
  });

  describe('getLegalMoves', () => {
    it('should return 20 moves from starting position', async () => {
      const game = await provider.createGame();
      const moves = await provider.getLegalMoves(game.id);
      expect(moves).toHaveLength(20);
    });

    it('should return moves for a specific square', async () => {
      const game = await provider.createGame();
      const moves = await provider.getLegalMoves(game.id, 'e2');
      expect(moves.length).toBeGreaterThanOrEqual(1);
      expect(moves.every((m) => m.from === 'e2')).toBe(true);
    });

    it('should return empty for square with no moves', async () => {
      const game = await provider.createGame();
      const moves = await provider.getLegalMoves(game.id, 'a1');
      expect(moves).toHaveLength(0);
    });
  });

  describe('aiMove', () => {
    it('should make an AI move', async () => {
      const game = await provider.createGame();
      await provider.makeMove(game.id, 'e2', 'e4');
      const result = await provider.aiMove(game.id, 'easy');
      expect(result.move.from).toBeTruthy();
      expect(result.move.to).toBeTruthy();
      expect(result.game.turn).toBe('white');
      expect(result.thinkingTimeMs).toBeDefined();
    });
  });

  describe('aiHint', () => {
    it('should return a hint without modifying the game', async () => {
      const game = await provider.createGame();
      const hint = await provider.aiHint(game.id, 'easy');
      expect(hint.from).toBeTruthy();
      expect(hint.to).toBeTruthy();
      // Game should not be modified
      const state = await provider.getGame(game.id);
      expect(state.moveCount).toBe(0);
    });
  });

  describe('loadFen', () => {
    it('should load a new position', async () => {
      const game = await provider.createGame();
      const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
      const state = await provider.loadFen(game.id, fen);
      expect(state.fen).toContain('4k3');
    });
  });

  describe('getPgn', () => {
    it('should return a string', async () => {
      const game = await provider.createGame();
      const pgn = await provider.getPgn(game.id);
      expect(typeof pgn).toBe('string');
    });
  });

  describe('getAnalysis', () => {
    it('should throw (not supported in local mode)', async () => {
      const game = await provider.createGame();
      await expect(provider.getAnalysis(game.id)).rejects.toThrow(
        'Analysis not supported in local mode',
      );
    });
  });

  describe('dispose', () => {
    it('should clear all games', async () => {
      const game = await provider.createGame();
      provider.dispose();
      await expect(provider.getGame(game.id)).rejects.toThrow('Game not found');
    });
  });

  describe('getEngineDirect', () => {
    it('should return the raw engine instance', async () => {
      const game = await provider.createGame();
      const engine = provider.getEngineDirect(game.id);
      expect(engine).toBeDefined();
      expect(engine.getFEN()).toContain('rnbqkbnr');
    });
  });

  describe('registerEngine', () => {
    it('should register an external engine', async () => {
      const { ChessEngine } = await import('../../src/services/ChessEngine');
      const engine = new ChessEngine();
      provider.registerEngine('ext-1', engine);
      const state = await provider.getGame('ext-1');
      expect(state.id).toBe('ext-1');
      expect(state.fen).toContain('rnbqkbnr');
    });
  });
});
