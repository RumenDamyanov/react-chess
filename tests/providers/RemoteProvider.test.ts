/**
 * Tests for RemoteProvider — HTTP-based backend communication.
 *
 * Uses mocked fetch to verify correct URL construction,
 * request bodies, and response adapter dispatch.
 */
import { RemoteProvider } from '../../src/providers/RemoteProvider';

// ---------------------------------------------------------------------------
// fetch mock
// ---------------------------------------------------------------------------

const fetchMock = jest.fn();
global.fetch = fetchMock;

function mockJsonResponse(data: Record<string, unknown>, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

function mockTextResponse(text: string, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'text/plain' }),
    json: () => Promise.reject(new Error('not json')),
    text: () => Promise.resolve(text),
  });
}

// Minimal "valid" game response for each backend
const RUST_GAME = {
  id: 'uuid-1',
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  currentPlayer: 'white',
  status: 'active',
  check: false,
  moveHistory: [],
  board: [],
};

const GO_GAME = {
  id: 1,
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  active_color: 'white',
  status: 'in_progress',
  move_history: [],
};

const JS_GAME = {
  id: 'uuid-1',
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  turn: 'white',
  gameOver: false,
  checkmate: false,
  stalemate: false,
  check: false,
  moveHistory: [],
};

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

describe('RemoteProvider', () => {
  afterEach(() => fetchMock.mockReset());

  describe('constructor', () => {
    it('should create a rust provider', () => {
      const p = new RemoteProvider('rust', 'http://localhost:8082');
      expect(p.backendId).toBe('rust');
      expect(p.capabilities.undo).toBe(true);
      expect(p.capabilities.chat).toBe(true);
    });

    it('should create a go provider with undo=false', () => {
      const p = new RemoteProvider('go', 'http://localhost:8080');
      expect(p.backendId).toBe('go');
      expect(p.capabilities.undo).toBe(false);
    });

    it('should create a js provider with chat=false', () => {
      const p = new RemoteProvider('js', 'http://localhost:8081');
      expect(p.backendId).toBe('js');
      expect(p.capabilities.chat).toBe(false);
    });

    it('should throw for local backend', () => {
      expect(() => new RemoteProvider('local', '')).toThrow('Use LocalProvider');
    });

    it('should strip trailing slashes from base URL', () => {
      const p = new RemoteProvider('rust', 'http://localhost:8082///');
      fetchMock.mockReturnValue(mockJsonResponse(RUST_GAME));
      p.createGame();
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8082/api/games',
        expect.anything(),
      );
    });
  });

  // -----------------------------------------------------------------------
  // rust-chess provider
  // -----------------------------------------------------------------------

  describe('rust provider', () => {
    let provider: RemoteProvider;

    beforeEach(() => {
      provider = new RemoteProvider('rust', 'http://localhost:8082');
    });

    it('should POST to /api/games on createGame', async () => {
      fetchMock.mockReturnValue(mockJsonResponse(RUST_GAME));
      const state = await provider.createGame({ fen: 'custom-fen' });
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8082/api/games',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"fen":"custom-fen"'),
        }),
      );
      expect(state.turn).toBe('white');
      expect(state.status).toBe('active');
    });

    it('should GET /api/games/:id on getGame', async () => {
      fetchMock.mockReturnValue(mockJsonResponse(RUST_GAME));
      await provider.getGame('uuid-1');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8082/api/games/uuid-1',
        expect.anything(),
      );
    });

    it('should DELETE /api/games/:id on deleteGame', async () => {
      fetchMock.mockReturnValue(mockJsonResponse({ success: true }));
      await provider.deleteGame('uuid-1');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8082/api/games/uuid-1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('should POST to /api/games/:id/moves on makeMove', async () => {
      fetchMock.mockReturnValue(mockJsonResponse(RUST_GAME));
      await provider.makeMove('uuid-1', 'e2', 'e4');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).toEqual({ from: 'e2', to: 'e4' });
    });

    it('should include promotion in makeMove body', async () => {
      fetchMock.mockReturnValue(mockJsonResponse(RUST_GAME));
      await provider.makeMove('uuid-1', 'e7', 'e8', 'queen');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.promotion).toBe('queen');
    });

    it('should POST to /api/games/:id/undo on undoMove', async () => {
      fetchMock.mockReturnValue(mockJsonResponse(RUST_GAME));
      await provider.undoMove('uuid-1');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8082/api/games/uuid-1/undo',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should GET /api/games/:id/legal-moves on getLegalMoves', async () => {
      fetchMock.mockReturnValue(mockJsonResponse({ moves: [] }));
      await provider.getLegalMoves('uuid-1');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8082/api/games/uuid-1/legal-moves',
        expect.anything(),
      );
    });

    it('should append ?from= for filtered legal moves', async () => {
      fetchMock.mockReturnValue(mockJsonResponse({ moves: [] }));
      await provider.getLegalMoves('uuid-1', 'e2');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8082/api/games/uuid-1/legal-moves?from=e2',
        expect.anything(),
      );
    });

    it('should POST to /api/games/:id/ai-move with difficulty field', async () => {
      fetchMock.mockReturnValue(
        mockJsonResponse({ ...RUST_GAME, move: { from: 'e7', to: 'e5' } }),
      );
      await provider.aiMove('uuid-1', 'hard');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.difficulty).toBe('hard');
    });

    it('should POST to /api/games/:id/ai-hint', async () => {
      fetchMock.mockReturnValue(
        mockJsonResponse({ ...RUST_GAME, move: { from: 'e2', to: 'e4' } }),
      );
      const hint = await provider.aiHint('uuid-1');
      expect(hint.from).toBeDefined();
    });

    it('should POST to /api/games/:id/fen on loadFen', async () => {
      fetchMock.mockReturnValue(mockJsonResponse(RUST_GAME));
      await provider.loadFen('uuid-1', 'custom-fen');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.fen).toBe('custom-fen');
    });

    it('should GET text/plain for getPgn', async () => {
      fetchMock.mockReturnValue(mockTextResponse('1. e4 e5 *'));
      const pgn = await provider.getPgn('uuid-1');
      expect(pgn).toBe('1. e4 e5 *');
    });

    it('should GET /api/games/:id/analysis', async () => {
      fetchMock.mockReturnValue(mockJsonResponse({ evaluation: 0.5, depth: 3 }));
      const analysis = await provider.getAnalysis('uuid-1', 3);
      expect(analysis.evaluation).toBe(0.5);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8082/api/games/uuid-1/analysis?depth=3',
        expect.anything(),
      );
    });
  });

  // -----------------------------------------------------------------------
  // go-chess provider
  // -----------------------------------------------------------------------

  describe('go provider', () => {
    let provider: RemoteProvider;

    beforeEach(() => {
      provider = new RemoteProvider('go', 'http://localhost:8080');
    });

    it('should use /api prefix', async () => {
      fetchMock.mockReturnValue(mockJsonResponse(GO_GAME));
      await provider.createGame();
      expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8080/api/games');
    });

    it('should use "level" field for AI difficulty', async () => {
      fetchMock.mockReturnValue(
        mockJsonResponse({ ...GO_GAME, move: { from: 'e7', to: 'e5' } }),
      );
      await provider.aiMove('1', 'medium');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.level).toBe('medium');
    });

    it('should use ai_color for go backend', async () => {
      fetchMock.mockReturnValue(mockJsonResponse(GO_GAME));
      await provider.createGame({ aiColor: 'black' });
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.ai_color).toBe('black');
      expect(body.aiColor).toBeUndefined();
    });

    it('should throw on undoMove (not supported)', async () => {
      await expect(provider.undoMove('1')).rejects.toThrow('not supported');
    });

    it('should normalise go game response', async () => {
      fetchMock.mockReturnValue(mockJsonResponse(GO_GAME));
      const state = await provider.getGame('1');
      expect(state.turn).toBe('white');
      expect(state.status).toBe('active');
    });
  });

  // -----------------------------------------------------------------------
  // js-chess provider
  // -----------------------------------------------------------------------

  describe('js provider', () => {
    let provider: RemoteProvider;

    beforeEach(() => {
      provider = new RemoteProvider('js', 'http://localhost:8081');
    });

    it('should use /api/v1 prefix', async () => {
      fetchMock.mockReturnValue(mockJsonResponse(JS_GAME));
      await provider.createGame();
      expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8081/api/v1/games');
    });

    it('should use "difficulty" field for AI', async () => {
      fetchMock.mockReturnValue(
        mockJsonResponse({ ...JS_GAME, lastMove: { from: 'e7', to: 'e5' } }),
      );
      await provider.aiMove('uuid-1', 'expert');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.difficulty).toBe('expert');
    });

    it('should support undo', async () => {
      fetchMock.mockReturnValue(mockJsonResponse(JS_GAME));
      const state = await provider.undoMove('uuid-1');
      expect(state.turn).toBe('white');
      expect(fetchMock.mock.calls[0][0]).toBe(
        'http://localhost:8081/api/v1/games/uuid-1/undo',
      );
    });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------

  describe('error handling', () => {
    let provider: RemoteProvider;

    beforeEach(() => {
      provider = new RemoteProvider('rust', 'http://localhost:8082');
    });

    it('should throw ApiError on non-ok response', async () => {
      fetchMock.mockReturnValue(
        mockJsonResponse({ error: { code: 'NOT_FOUND', message: 'Game not found' } }, 404),
      );
      await expect(provider.getGame('bad-id')).rejects.toThrow('Game not found');
    });

    it('should handle string error body', async () => {
      fetchMock.mockReturnValue(
        mockJsonResponse({ error: 'Something broke', message: 'oops' }, 500),
      );
      await expect(provider.getGame('x')).rejects.toThrow();
    });

    it('should handle text/plain error', async () => {
      fetchMock.mockReturnValue(
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: new Headers({ 'content-type': 'text/plain' }),
          text: () => Promise.resolve('Internal failure'),
        }),
      );
      await expect(provider.getGame('x')).rejects.toThrow('Internal failure');
    });
  });

  // -----------------------------------------------------------------------
  // dispose
  // -----------------------------------------------------------------------

  describe('dispose', () => {
    it('should not throw', () => {
      const p = new RemoteProvider('rust', 'http://localhost:8082');
      expect(() => p.dispose()).not.toThrow();
    });
  });
});
