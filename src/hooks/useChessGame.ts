import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Move as ChessMove, Color, GameStatus, Piece } from '@rumenx/chess/types';
import { ChessEngine } from '../services/ChessEngine';

/**
 * Custom hook for managing chess game state
 * Provides game logic, move validation, and state management
 */
export function useChessGame(initialFEN?: string) {
  const [engine] = useState(() => new ChessEngine(initialFEN));
  const [board, setBoard] = useState<(Piece | null)[][]>(() => engine.getBoard());
  const [turn, setTurn] = useState<Color>(() => engine.getTurn());
  const [status, setStatus] = useState<GameStatus>(() => engine.getStatus());
  const [history, setHistory] = useState<ChessMove[]>(() => engine.getHistory());
  const [currentPly, setCurrentPly] = useState<number>(() => engine.getHistory().length); // points to length when at latest
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<ChessMove[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(
    null
  );
  // Time control state (null initialMs => unlimited)
  const [timeControl, setTimeControl] = useState<{ initialMs: number | null; incrementMs: number }>(
    { initialMs: null, incrementMs: 0 }
  );
  const [whiteTimeMs, setWhiteTimeMs] = useState<number>(0);
  const [blackTimeMs, setBlackTimeMs] = useState<number>(0);
  const [lastTick, setLastTick] = useState<number | null>(null);
  const [timeoutWinner, setTimeoutWinner] = useState<Color | null>(null);

  /**
   * Update all game state from the engine
   */
  const updateGameState = useCallback(() => {
    setBoard(engine.getBoard());
    setTurn(engine.getTurn());
    setStatus(engine.getStatus());
    setHistory(engine.getHistory());
  }, [engine]);

  /**
   * Make a move on the board
   * @param from - Source square (e.g., "e2")
   * @param to - Target square (e.g., "e4")
   * @param promotion - Optional promotion piece type
   * @returns The executed move or null if invalid
   */
  const makeMove = useCallback(
    (from: string, to: string, promotion?: string): ChessMove | null => {
      // If promotion piece not chosen yet and move is a promotion candidate, stash
      if (!promotion) {
        const moves = engine.getLegalMovesFrom(from);
        const target = moves.find((m) => m.to === to);
        if (target && target.promotion && target.piece.type === 'pawn') {
          setPendingPromotion({ from, to });
          return null;
        }
      }
      const move = engine.makeMove(from, to, promotion);
      if (move) {
        // Apply increment to side that moved if time control active
        if (timeControl.initialMs !== null && !timeoutWinner) {
          if (move.piece.color === 'white') {
            setWhiteTimeMs((t) => t + timeControl.incrementMs);
          } else {
            setBlackTimeMs((t) => t + timeControl.incrementMs);
          }
        }
        updateGameState();
        setSelectedSquare(null);
        setLegalMoves([]);
        setPendingPromotion(null);
        setCurrentPly(engine.getHistory().length);
      }
      return move;
    },
    [engine, updateGameState, timeControl.initialMs, timeControl.incrementMs, timeoutWinner]
  );

  /**
   * Undo the last move
   * @returns The undone move or null if no moves to undo
   */
  const undoMove = useCallback((): ChessMove | null => {
    const move = engine.undo();

    if (move) {
      updateGameState();
      setSelectedSquare(null);
      setLegalMoves([]);
      setCurrentPly(engine.getHistory().length);
    }

    return move;
  }, [engine, updateGameState]);

  /**
   * Select a square on the board
   * If a piece is selected, shows legal moves from that square
   * @param square - Square to select (e.g., "e2")
   */
  const selectSquare = useCallback(
    (square: string | null) => {
      console.log('[selectSquare] Called with:', square);

      if (!square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      const piece = engine.getPieceAt(square);
      console.log('[selectSquare] Piece at', square, ':', piece);
      console.log('[selectSquare] Current turn:', turn);

      // Only allow selecting pieces of the current turn
      if (piece && piece.color === turn) {
        console.log('[selectSquare] Selecting piece at', square);
        setSelectedSquare(square);
        const moves = engine.getLegalMovesFrom(square);
        console.log('[selectSquare] Legal moves:', moves);
        setLegalMoves(moves);
      } else {
        // If clicking on an empty square or opponent piece while a piece is selected,
        // try to make a move
        if (selectedSquare) {
          console.log('[selectSquare] Attempting move from', selectedSquare, 'to', square);
          makeMove(selectedSquare, square);
        } else {
          if (piece) {
            console.log(
              '[selectSquare] Ignoring click: piece is',
              piece.color,
              'but turn is',
              turn
            );
          } else {
            console.log('[selectSquare] Ignoring click: empty square and no selection');
          }
        }
      }
    },
    [engine, turn, selectedSquare, makeMove]
  );

  /**
   * Reset the game to starting position
   */
  const resetGame = useCallback(
    (startingColor: Color = 'white') => {
      if (startingColor === 'white') {
        engine.reset();
      } else {
        // Standard initial position but black to move
        engine.loadFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
      }
      updateGameState();
      setSelectedSquare(null);
      setLegalMoves([]);
      setCurrentPly(engine.getHistory().length);
      // Reset clocks
      setTimeoutWinner(null);
      if (timeControl.initialMs !== null) {
        setWhiteTimeMs(timeControl.initialMs);
        setBlackTimeMs(timeControl.initialMs);
        setLastTick(null);
      } else {
        setWhiteTimeMs(0);
        setBlackTimeMs(0);
        setLastTick(null);
      }
    },
    [engine, updateGameState, timeControl.initialMs]
  );

  /**
   * Load a position from FEN notation
   * @param fen - FEN string to load
   */
  const loadFEN = useCallback(
    (fen: string) => {
      engine.loadFEN(fen);
      updateGameState();
      setSelectedSquare(null);
      setLegalMoves([]);
      setCurrentPly(engine.getHistory().length);
    },
    [engine, updateGameState]
  );

  /**
   * Get the current FEN string
   */
  const getFEN = useCallback(() => {
    return engine.getFEN();
  }, [engine]);

  /**
   * Check if a square is a valid move target from the selected square
   * @param square - Target square to check
   */
  const isValidMoveTarget = useCallback(
    (square: string): boolean => {
      return legalMoves.some((move) => move.to === square);
    },
    [legalMoves]
  );

  /**
   * Get all legal moves in the current position
   */
  const getAllLegalMoves = useCallback(() => {
    return engine.getLegalMoves();
  }, [engine]);

  /**
   * Game state computed values
   */
  const isGameOver = useMemo(() => engine.isGameOver(), [engine]);
  const isCheck = useMemo(() => engine.isInCheck(), [engine]);
  const isCheckmate = useMemo(() => status === 'checkmate', [status]);
  const isStalemate = useMemo(() => status === 'stalemate', [status]);
  const isDraw = useMemo(
    () =>
      status === 'draw' ||
      status === 'insufficient_material' ||
      status === 'threefold_repetition' ||
      status === 'fifty_move_rule',
    [status]
  );

  /**
   * Get game result
   */
  const result = useMemo(() => engine.getResult(), [engine]);

  /**
   * Get the last move from history
   */
  const lastMove = useMemo(
    () => (history.length > 0 ? history[history.length - 1] : null),
    [history]
  );

  /**
   * Can undo (has moves in history)
   */
  const canUndo = useMemo(() => history.length > 0, [history]);

  /**
   * Jump to a specific ply (half-move) in the game history
   * Rebuild position by resetting and replaying moves up to plyIndex
   */
  const goToPly = useCallback(
    (plyIndex: number) => {
      if (plyIndex < 0 || plyIndex > history.length) return;
      // Save full history
      const full = [...history];
      // Reset engine
      engine.reset();
      // Replay moves up to plyIndex
      for (let i = 0; i < plyIndex; i++) {
        const m = full[i];
        engine.makeMove(m.from, m.to, m.promotion);
      }
      updateGameState();
      setSelectedSquare(null);
      setLegalMoves([]);
      setCurrentPly(plyIndex);
    },
    [engine, history, updateGameState]
  );

  // Clock ticking effect (animation frame based for smoothness)
  useEffect(() => {
    if (timeControl.initialMs === null) return; // unlimited
    if (timeoutWinner) return;
    if (engine.isGameOver()) return;
    let frame: number;
    const tick = () => {
      const now = Date.now();
      setLastTick((prev) => prev ?? now);
      setWhiteTimeMs((prev) => {
        if (turn !== 'white') return prev;
        const elapsed = lastTick ? now - lastTick : 0;
        const next = Math.max(0, prev - elapsed);
        if (next === 0 && prev !== 0) setTimeoutWinner('black');
        return next;
      });
      setBlackTimeMs((prev) => {
        if (turn !== 'black') return prev;
        const elapsed = lastTick ? now - lastTick : 0;
        const next = Math.max(0, prev - elapsed);
        if (next === 0 && prev !== 0) setTimeoutWinner('white');
        return next;
      });
      setLastTick(now);
      if (!timeoutWinner) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [timeControl.initialMs, timeoutWinner, engine, turn, lastTick]);

  const setTimeControlPreset = useCallback(
    (initialMinutes: number | null, incrementSeconds: number) => {
      const initialMs = initialMinutes === null ? null : initialMinutes * 60_000;
      setTimeControl({ initialMs, incrementMs: incrementSeconds * 1000 });
      if (initialMs !== null) {
        setWhiteTimeMs(initialMs);
        setBlackTimeMs(initialMs);
      } else {
        setWhiteTimeMs(0);
        setBlackTimeMs(0);
      }
      setTimeoutWinner(null);
      setLastTick(null);
    },
    []
  );

  const isTimeout = useMemo(() => timeoutWinner !== null, [timeoutWinner]);
  const finalResult = useMemo(() => {
    if (timeoutWinner) return timeoutWinner === 'white' ? '1-0' : '0-1';
    return engine.getResult();
  }, [timeoutWinner, engine]);

  return {
    // State
    board,
    turn,
    status,
    history,
    selectedSquare,
    legalMoves,
    currentPly,
    pendingPromotion,

    // Actions
    makeMove,
    undoMove,
    selectSquare,
    resetGame,
    loadFEN,
    getFEN,
    isValidMoveTarget,
    getAllLegalMoves,
    goToPly,
    setPendingPromotion,

    // Computed values
    isGameOver,
    isCheck,
    isCheckmate,
    isStalemate,
    isDraw,
    result,
    finalResult,
    whiteTimeMs,
    blackTimeMs,
    timeControl,
    setTimeControlPreset,
    timeoutWinner,
    isTimeout,
    lastMove,
    canUndo,

    // Engine access (for advanced use)
    engine,
  };
}

export default useChessGame;
