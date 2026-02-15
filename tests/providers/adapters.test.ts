/**
 * Tests for response adapters — validate normalisation from each
 * backend's JSON format to the unified NormGameState types.
 */
import {
  rustNormGame,
  rustNormLegalMoves,
  rustNormAiMove,
  rustNormAnalysis,
  goNormGame,
  goNormLegalMoves,
  goNormAiMove,
  goNormAnalysis,
  jsNormGame,
  jsNormLegalMoves,
  jsNormAiMove,
  jsNormAnalysis,
  ADAPTERS,
} from '../../src/providers/adapters';

// ===========================================================================
// rust-chess adapter
// ===========================================================================

describe('rust-chess adapter', () => {
  describe('rustNormGame', () => {
    it('should normalise a basic game response', () => {
      const raw = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        currentPlayer: 'black',
        status: 'active',
        check: false,
        moveHistory: [
          { from: 'e2', to: 'e4', san: 'e4', piece: { type: 'pawn', color: 'white' } },
        ],
        board: [
          ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
          ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
          [null, null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null, null],
          [null, null, null, null, 'P', null, null, null],
          [null, null, null, null, null, null, null, null],
          ['P', 'P', 'P', 'P', null, 'P', 'P', 'P'],
          ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
        ],
      };
      const norm = rustNormGame(raw);
      expect(norm.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(norm.turn).toBe('black');
      expect(norm.status).toBe('active');
      expect(norm.check).toBe(false);
      expect(norm.moveCount).toBe(1);
      expect(norm.moveHistory[0].from).toBe('e2');
      expect(norm.moveHistory[0].to).toBe('e4');
      expect(norm.gameOver).toBe(false);
      expect(norm.result).toBe('*');
    });

    it('should handle checkmate status', () => {
      const raw = {
        id: 'game-1',
        fen: 'rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
        currentPlayer: 'white',
        status: 'checkmate',
        check: true,
        moveHistory: [],
      };
      const norm = rustNormGame(raw);
      expect(norm.status).toBe('checkmate');
      expect(norm.gameOver).toBe(true);
      expect(norm.result).toBe('0-1'); // white is checkmated → black wins
    });

    it('should handle stalemate', () => {
      const raw = {
        id: 'game-2',
        fen: 'k7/8/1K6/8/8/8/8/8 b - - 0 1',
        currentPlayer: 'black',
        status: 'stalemate',
        check: false,
        moveHistory: [],
      };
      const norm = rustNormGame(raw);
      expect(norm.status).toBe('stalemate');
      expect(norm.gameOver).toBe(true);
      expect(norm.result).toBe('1/2-1/2');
    });

    it('should normalise single-char piece encoding', () => {
      const raw = {
        id: 'g1',
        fen: 'start',
        currentPlayer: 'white',
        status: 'active',
        check: false,
        moveHistory: [],
        board: [['K', null, 'k']],
      };
      const norm = rustNormGame(raw);
      expect(norm.board![0][0]).toEqual({ type: 'king', color: 'white' });
      expect(norm.board![0][1]).toBeNull();
      expect(norm.board![0][2]).toEqual({ type: 'king', color: 'black' });
    });
  });

  describe('rustNormLegalMoves', () => {
    it('should normalise moves array', () => {
      const raw = {
        moves: [
          { from: 'e2', to: 'e4', san: 'e4' },
          { from: 'e2', to: 'e3', san: 'e3' },
        ],
      };
      const moves = rustNormLegalMoves(raw);
      expect(moves).toHaveLength(2);
      expect(moves[0]).toEqual({ from: 'e2', to: 'e4', san: 'e4', promotion: undefined });
    });

    it('should handle empty moves', () => {
      expect(rustNormLegalMoves({})).toEqual([]);
    });
  });

  describe('rustNormAiMove', () => {
    it('should normalise AI move result', () => {
      const raw = {
        move: { from: 'e7', to: 'e5', san: 'e5' },
        id: 'game-1',
        fen: 'after-move-fen',
        currentPlayer: 'white',
        status: 'active',
        check: false,
        moveHistory: [],
        evaluation: 0.3,
        thinkingTime: 42,
      };
      const result = rustNormAiMove(raw);
      expect(result.move.from).toBe('e7');
      expect(result.move.to).toBe('e5');
      expect(result.evaluation).toBe(0.3);
      expect(result.thinkingTimeMs).toBe(42);
    });
  });

  describe('rustNormAnalysis', () => {
    it('should normalise analysis response', () => {
      const raw = {
        evaluation: 1.5,
        bestMove: { from: 'e2', to: 'e4', san: 'e4' },
        depth: 4,
      };
      const analysis = rustNormAnalysis(raw);
      expect(analysis.evaluation).toBe(1.5);
      expect(analysis.bestMove!.from).toBe('e2');
      expect(analysis.depth).toBe(4);
    });

    it('should handle missing fields gracefully', () => {
      const analysis = rustNormAnalysis({});
      expect(analysis.evaluation).toBe(0);
      expect(analysis.bestMove).toBeUndefined();
    });
  });
});

// ===========================================================================
// go-chess adapter
// ===========================================================================

describe('go-chess adapter', () => {
  describe('goNormGame', () => {
    it('should normalise snake_case response', () => {
      const raw = {
        id: 42,
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        active_color: 'black',
        status: 'in_progress',
        move_history: [
          { from: 'e2', to: 'e4', notation: 'e4', piece: { type: 'pawn', color: 'white' } },
        ],
      };
      const norm = goNormGame(raw);
      expect(norm.id).toBe('42');
      expect(norm.turn).toBe('black');
      expect(norm.status).toBe('active'); // in_progress → active
      expect(norm.check).toBe(false);
      expect(norm.moveCount).toBe(1);
      expect(norm.moveHistory[0].san).toBe('e4');
      expect(norm.gameOver).toBe(false);
      expect(norm.result).toBe('*');
    });

    it('should handle white_wins', () => {
      const raw = {
        id: 1,
        fen: 'mate-fen',
        active_color: 'black',
        status: 'white_wins',
        move_history: [],
      };
      const norm = goNormGame(raw);
      expect(norm.status).toBe('checkmate');
      expect(norm.gameOver).toBe(true);
      expect(norm.result).toBe('1-0');
    });

    it('should handle black_wins', () => {
      const raw = {
        id: 2,
        fen: 'mate-fen',
        active_color: 'white',
        status: 'black_wins',
        move_history: [],
      };
      const norm = goNormGame(raw);
      expect(norm.status).toBe('checkmate');
      expect(norm.result).toBe('0-1');
    });

    it('should detect check from status field', () => {
      const raw = {
        id: 3,
        fen: 'check-fen',
        active_color: 'black',
        status: 'check',
        move_history: [],
      };
      const norm = goNormGame(raw);
      expect(norm.check).toBe(true);
      expect(norm.status).toBe('check');
    });

    it('should not include a board array (go uses text diagram)', () => {
      const raw = { id: 4, fen: 'f', active_color: 'w', status: 'in_progress', move_history: [] };
      const norm = goNormGame(raw);
      expect(norm.board).toBeUndefined();
    });
  });

  describe('goNormLegalMoves', () => {
    it('should normalise legal_moves key', () => {
      const raw = {
        legal_moves: [
          { from: 'e2', to: 'e4', notation: 'e4' },
          { from: 'd2', to: 'd4', notation: 'd4' },
        ],
      };
      const moves = goNormLegalMoves(raw);
      expect(moves).toHaveLength(2);
      expect(moves[0].san).toBe('e4');
    });
  });

  describe('goNormAiMove', () => {
    it('should normalise AI move', () => {
      const raw = {
        move: { from: 'e7', to: 'e5', notation: 'e5' },
        id: 1,
        fen: 'after',
        active_color: 'white',
        status: 'in_progress',
        move_history: [],
        evaluation: -0.1,
      };
      const result = goNormAiMove(raw);
      expect(result.move.from).toBe('e7');
      expect(result.game.turn).toBe('white');
      expect(result.evaluation).toBe(-0.1);
    });
  });

  describe('goNormAnalysis', () => {
    it('should normalise analysis with evaluation_cp', () => {
      const raw = {
        evaluation_cp: 150,
        best_move: { from: 'e2', to: 'e4', notation: 'e4' },
        depth: 3,
      };
      const analysis = goNormAnalysis(raw);
      expect(analysis.evaluation).toBe(150);
      expect(analysis.bestMove!.from).toBe('e2');
    });
  });
});

// ===========================================================================
// js-chess / npm-chess adapter
// ===========================================================================

describe('js-chess adapter', () => {
  describe('jsNormGame', () => {
    it('should normalise boolean-based status', () => {
      const raw = {
        id: 'uuid-1',
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        turn: 'black',
        gameOver: false,
        checkmate: false,
        stalemate: false,
        check: false,
        moveHistory: [
          { from: 'e2', to: 'e4', san: 'e4', piece: { type: 'pawn', color: 'white' } },
        ],
      };
      const norm = jsNormGame(raw);
      expect(norm.id).toBe('uuid-1');
      expect(norm.turn).toBe('black');
      expect(norm.status).toBe('active');
      expect(norm.check).toBe(false);
      expect(norm.moveCount).toBe(1);
      expect(norm.gameOver).toBe(false);
      expect(norm.result).toBe('*');
    });

    it('should handle checkmate with winner field', () => {
      const raw = {
        id: 'uuid-2',
        fen: 'mate-fen',
        turn: 'white',
        gameOver: true,
        checkmate: true,
        stalemate: false,
        check: true,
        winner: 'black',
        moveHistory: [],
      };
      const norm = jsNormGame(raw);
      expect(norm.status).toBe('checkmate');
      expect(norm.gameOver).toBe(true);
      expect(norm.result).toBe('0-1');
    });

    it('should handle stalemate', () => {
      const raw = {
        id: 'uuid-3',
        fen: 'stale-fen',
        turn: 'white',
        gameOver: true,
        checkmate: false,
        stalemate: true,
        check: false,
        moveHistory: [],
      };
      const norm = jsNormGame(raw);
      expect(norm.status).toBe('stalemate');
      expect(norm.result).toBe('1/2-1/2');
    });

    it('should detect threefold repetition', () => {
      const raw = {
        id: 'uuid-4',
        fen: 'rep-fen',
        turn: 'white',
        gameOver: false,
        checkmate: false,
        stalemate: false,
        check: false,
        inThreefoldRepetition: true,
        moveHistory: [],
      };
      const norm = jsNormGame(raw);
      expect(norm.status).toBe('threefold_repetition');
    });

    it('should detect fifty move rule', () => {
      const raw = {
        id: 'uuid-5',
        fen: 'fifty-fen',
        turn: 'black',
        gameOver: false,
        checkmate: false,
        stalemate: false,
        check: false,
        inFiftyMoveRule: true,
        moveHistory: [],
      };
      const norm = jsNormGame(raw);
      expect(norm.status).toBe('fifty_move_rule');
    });
  });

  describe('jsNormLegalMoves', () => {
    it('should normalise moves array', () => {
      const raw = {
        moves: [
          { from: 'e2', to: 'e4', san: 'e4' },
          { from: 'g1', to: 'f3', san: 'Nf3' },
        ],
      };
      const moves = jsNormLegalMoves(raw);
      expect(moves).toHaveLength(2);
      expect(moves[1].san).toBe('Nf3');
    });
  });

  describe('jsNormAiMove', () => {
    it('should normalise AI move with metrics', () => {
      const raw = {
        id: 'uuid-1',
        fen: 'after-fen',
        turn: 'white',
        gameOver: false,
        checkmate: false,
        stalemate: false,
        check: false,
        moveHistory: [],
        lastMove: { from: 'e7', to: 'e5', san: 'e5' },
        aiMetrics: { evaluation: 0.2, thinkingTime: 15, depth: 3 },
      };
      const result = jsNormAiMove(raw);
      expect(result.move.from).toBe('e7');
      expect(result.evaluation).toBe(0.2);
      expect(result.thinkingTimeMs).toBe(15);
      expect(result.depth).toBe(3);
    });

    it('should handle missing lastMove', () => {
      const raw = {
        id: 'uuid-1',
        fen: 'fen',
        turn: 'white',
        gameOver: false,
        checkmate: false,
        stalemate: false,
        check: false,
        moveHistory: [],
      };
      const result = jsNormAiMove(raw);
      expect(result.move).toEqual({ from: '', to: '' });
    });
  });

  describe('jsNormAnalysis', () => {
    it('should normalise analysis', () => {
      const raw = {
        evaluation: -0.5,
        bestMove: { from: 'd7', to: 'd5', san: 'd5' },
        depth: 5,
      };
      const analysis = jsNormAnalysis(raw);
      expect(analysis.evaluation).toBe(-0.5);
      expect(analysis.bestMove!.san).toBe('d5');
      expect(analysis.depth).toBe(5);
    });
  });
});

// ===========================================================================
// ADAPTERS registry
// ===========================================================================

describe('ADAPTERS registry', () => {
  it('should have entries for rust, go, js', () => {
    expect(Object.keys(ADAPTERS)).toEqual(['rust', 'go', 'js']);
  });

  it.each(['rust', 'go', 'js'] as const)('adapter "%s" should have all required fields', (id) => {
    const adapter = ADAPTERS[id];
    expect(adapter.apiPrefix).toBeDefined();
    expect(typeof adapter.normGame).toBe('function');
    expect(typeof adapter.normLegalMoves).toBe('function');
    expect(typeof adapter.normAiMove).toBe('function');
    expect(typeof adapter.normAnalysis).toBe('function');
    expect(adapter.aiDifficultyField).toBeDefined();
  });

  it('should use /api for rust and go, /api/v1 for js', () => {
    expect(ADAPTERS.rust.apiPrefix).toBe('/api');
    expect(ADAPTERS.go.apiPrefix).toBe('/api');
    expect(ADAPTERS.js.apiPrefix).toBe('/api/v1');
  });

  it('should use "level" for go, "difficulty" for rust and js', () => {
    expect(ADAPTERS.rust.aiDifficultyField).toBe('difficulty');
    expect(ADAPTERS.go.aiDifficultyField).toBe('level');
    expect(ADAPTERS.js.aiDifficultyField).toBe('difficulty');
  });
});
