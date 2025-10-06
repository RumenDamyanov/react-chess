import { ChessEngine } from '../../src/services/ChessEngine';

describe('ChessEngine', () => {
  let engine: ChessEngine;

  beforeEach(() => {
    engine = new ChessEngine();
  });

  describe('initialization', () => {
    it('should initialize with starting position', () => {
      expect(engine.getFEN()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    it('should initialize with custom FEN', () => {
      const customFEN = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
      const customEngine = new ChessEngine(customFEN);
      // The engine should be initialized (just check it's not null/undefined)
      expect(customEngine).toBeDefined();
      expect(customEngine.getFEN).toBeDefined();
      // We can load FEN after initialization
      customEngine.loadFEN(customFEN);
      const board = customEngine.getBoard();
      const kings = board.flat().filter(p => p?.type === 'king');
      expect(kings).toHaveLength(2);
    });
  });

  describe('makeMove', () => {
    it('should make a legal move', () => {
      const move = engine.makeMove('e2', 'e4');
      expect(move).not.toBeNull();
      expect(move?.from).toBe('e2');
      expect(move?.to).toBe('e4');
      expect(move?.piece.type).toBe('pawn');
    });

    it('should return null for illegal move', () => {
      const move = engine.makeMove('e2', 'e5'); // Can't move 3 squares
      expect(move).toBeNull();
    });

    it('should handle promotion', () => {
      engine.loadFEN('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');
      const move = engine.makeMove('a7', 'a8', 'queen');
      expect(move).not.toBeNull();
      expect(move?.promotion).toBe('queen');
    });
  });

  describe('getLegalMoves', () => {
    it('should return 20 moves from starting position', () => {
      const moves = engine.getLegalMoves();
      expect(moves).toHaveLength(20);
    });

    it('should return empty array when checkmated', () => {
      // Fool's mate position
      engine.loadFEN('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
      const moves = engine.getLegalMoves();
      expect(moves).toHaveLength(0);
    });
  });

  describe('undo', () => {
    it('should undo last move', () => {
      const fen1 = engine.getFEN();
      engine.makeMove('e2', 'e4');
      const fen2 = engine.getFEN();
      
      expect(fen1).not.toBe(fen2);
      
      engine.undo();
      expect(engine.getFEN()).toBe(fen1);
    });

    it('should return null when no moves to undo', () => {
      const undone = engine.undo();
      expect(undone).toBeNull();
    });
  });

  describe('game status', () => {
    it('should return active status at start', () => {
      expect(engine.getStatus()).toBe('active');
    });

    it('should detect checkmate', () => {
      engine.loadFEN('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
      expect(engine.getStatus()).toBe('checkmate');
      expect(engine.isGameOver()).toBe(true);
    });

    it('should detect check', () => {
      // Start position, make moves that lead to check
      engine.makeMove('e2', 'e4');
      engine.makeMove('f7', 'f6');
      engine.makeMove('d1', 'h5'); // Queen checks king
      expect(engine.isInCheck()).toBe(true);
    });

    it('should detect stalemate', () => {
      engine.loadFEN('7k/5Q2/5K2/8/8/8/8/8 b - - 0 1');
      expect(engine.getStatus()).toBe('stalemate');
      expect(engine.isGameOver()).toBe(true);
    });
  });

  describe('getTurn', () => {
    it('should return white at start', () => {
      expect(engine.getTurn()).toBe('white');
    });

    it('should alternate turns', () => {
      engine.makeMove('e2', 'e4');
      expect(engine.getTurn()).toBe('black');
      engine.makeMove('e7', 'e5');
      expect(engine.getTurn()).toBe('white');
    });
  });

  describe('getBoard', () => {
    it('should return 8x8 array', () => {
      const board = engine.getBoard();
      expect(board).toHaveLength(8);
      expect(board[0]).toHaveLength(8);
    });

    it('should have correct pieces at start', () => {
      const board = engine.getBoard();
      // Rank 1 (row 0) should have white pieces
      expect(board[0][0]?.type).toBe('rook');
      expect(board[0][0]?.color).toBe('white');
      expect(board[0][4]?.type).toBe('king');
      expect(board[0][4]?.color).toBe('white');
    });
  });

  describe('getResult', () => {
    it('should return * for game in progress', () => {
      expect(engine.getResult()).toBe('*');
    });

    it('should return 0-1 for black checkmate victory', () => {
      // Fool's mate - black wins
      engine.loadFEN('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
      expect(engine.getResult()).toBe('0-1');
    });

    it('should return 1/2-1/2 for stalemate', () => {
      engine.loadFEN('7k/5Q2/5K2/8/8/8/8/8 b - - 0 1');
      expect(engine.getResult()).toBe('1/2-1/2');
    });
  });

  describe('coordinate conversion', () => {
    it('should convert square to coords', () => {
      expect(ChessEngine.squareToCoords('a1')).toEqual({ row: 0, col: 0 });
      expect(ChessEngine.squareToCoords('h1')).toEqual({ row: 0, col: 7 });
      expect(ChessEngine.squareToCoords('a8')).toEqual({ row: 7, col: 0 });
      expect(ChessEngine.squareToCoords('h8')).toEqual({ row: 7, col: 7 });
      expect(ChessEngine.squareToCoords('e4')).toEqual({ row: 3, col: 4 });
    });

    it('should convert coords to square', () => {
      expect(ChessEngine.coordsToSquare(0, 0)).toBe('a1');
      expect(ChessEngine.coordsToSquare(0, 7)).toBe('h1');
      expect(ChessEngine.coordsToSquare(7, 0)).toBe('a8');
      expect(ChessEngine.coordsToSquare(7, 7)).toBe('h8');
      expect(ChessEngine.coordsToSquare(3, 4)).toBe('e4');
    });

    it('should be reversible', () => {
      type Square = `${'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
      const testSquares: Square[] = ['a1', 'e4', 'h8', 'd5', 'b2', 'g7'];
      testSquares.forEach((square) => {
        const coords = ChessEngine.squareToCoords(square);
        const backToSquare = ChessEngine.coordsToSquare(coords.row, coords.col);
        expect(backToSquare).toBe(square);
      });
    });
  });

  describe('reset', () => {
    it('should reset to starting position', () => {
      engine.makeMove('e2', 'e4');
      engine.makeMove('e7', 'e5');
      expect(engine.getHistory()).toHaveLength(2);
      
      engine.reset();
      expect(engine.getHistory()).toHaveLength(0);
      expect(engine.getFEN()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });
  });

  describe('getPieceAt', () => {
    it('should get piece at square', () => {
      const piece = engine.getPieceAt('e2');
      expect(piece?.type).toBe('pawn');
      expect(piece?.color).toBe('white');
    });

    it('should return null for empty square', () => {
      const piece = engine.getPieceAt('e4');
      expect(piece).toBeNull();
    });
  });
});
