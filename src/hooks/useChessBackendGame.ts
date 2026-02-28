/**
 * useChessBackendGame — backend-aware game hook.
 *
 * For the "local" backend this delegates to the existing useChessGame hook
 * (synchronous, zero-latency).  For remote backends (rust/go/js) it manages
 * game state through the REST API.
 *
 * The return type is a superset of what App.tsx already consumes, so the
 * switchover is a simple import change.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Move as ChessMove, Piece, Color, GameStatus } from '@rumenx/chess/types';
import { useBackend } from '../providers/BackendContext';
import { ChessEngine } from '../services/ChessEngine';
import type { NormGameState } from '../providers/types';

// ---------------------------------------------------------------------------
// Return type (mirrors useChessGame as closely as possible)
// ---------------------------------------------------------------------------

export interface BackendGameHook {
  // State
  board: (Piece | null)[][];
  turn: Color;
  status: GameStatus;
  history: ChessMove[];
  selectedSquare: string | null;
  legalMoves: ChessMove[];
  currentPly: number;
  pendingPromotion: { from: string; to: string } | null;

  // Actions
  makeMove: (from: string, to: string, promotion?: string) => ChessMove | null;
  undoMove: () => ChessMove | null;
  selectSquare: (square: string | null) => void;
  resetGame: (startingColor?: Color) => void;
  loadFEN: (fen: string) => void;
  getFEN: () => string;
  isValidMoveTarget: (square: string) => boolean;
  getAllLegalMoves: () => ChessMove[];
  goToPly: (plyIndex: number) => void;
  setPendingPromotion: (val: { from: string; to: string } | null) => void;

  // Computed values
  isGameOver: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  result: string;
  finalResult: string;
  whiteTimeMs: number;
  blackTimeMs: number;
  timeControl: { initialMs: number | null; incrementMs: number };
  setTimeControlPreset: (mins: number | null, incSec: number) => void;
  timeoutWinner: Color | null;
  isTimeout: boolean;
  lastMove: ChessMove | null;
  canUndo: boolean;

  // Engine access (local-only, null for remote)
  engine: ChessEngine;

  // Remote-only extras
  remoteGameId: string | null;
  loading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

/**
 * A backend-aware chess game hook.
 *
 * **Strategy**: The local provider path keeps the existing synchronous
 * ChessEngine approach — the same code that worked before, just wrapped.
 * Remote providers overlay async operations on top.
 */
export function useChessBackendGame(initialFEN?: string): BackendGameHook {
  const { backendId, provider } = useBackend();

  // -----------------------------------------------------------------------
  // Core engine state (used by BOTH local and remote paths)
  // -----------------------------------------------------------------------
  const [engine] = useState(() => new ChessEngine(initialFEN));
  const [board, setBoard] = useState<(Piece | null)[][]>(() => engine.getBoard());
  const [turn, setTurn] = useState<Color>(() => engine.getTurn());
  const [status, setStatus] = useState<GameStatus>(() => engine.getStatus());
  const [history, setHistory] = useState<ChessMove[]>(() => engine.getHistory());
  const [currentPly, setCurrentPly] = useState<number>(() => engine.getHistory().length);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<ChessMove[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: string;
    to: string;
  } | null>(null);

  // Time control
  const [timeControl, setTimeControl] = useState<{
    initialMs: number | null;
    incrementMs: number;
  }>({ initialMs: null, incrementMs: 0 });
  const [whiteTimeMs, setWhiteTimeMs] = useState<number>(0);
  const [blackTimeMs, setBlackTimeMs] = useState<number>(0);
  const [lastTick, setLastTick] = useState<number | null>(null);
  const [timeoutWinner, setTimeoutWinner] = useState<Color | null>(null);

  // Remote-specific
  const [remoteGameId, setRemoteGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRemote = backendId !== 'local';

  // -----------------------------------------------------------------------
  // Sync helpers (local engine)
  // -----------------------------------------------------------------------

  const updateGameState = useCallback(() => {
    setBoard(engine.getBoard());
    setTurn(engine.getTurn());
    setStatus(engine.getStatus());
    setHistory(engine.getHistory());
  }, [engine]);

  // -----------------------------------------------------------------------
  // Remote helpers — apply NormGameState onto local engine for display
  // -----------------------------------------------------------------------

  const applyRemoteState = useCallback(
    (state: NormGameState) => {
      // Load the FEN to synchronise the local engine so board / turn / status
      // derived from it match the remote state
      engine.loadFEN(state.fen);
      updateGameState();
      setCurrentPly(state.moveCount);
      setRemoteGameId(state.id);
    },
    [engine, updateGameState]
  );

  // Auto-create remote game on mount / backend switch
  const didInit = useRef(false);
  useEffect(() => {
    if (!isRemote) {
      didInit.current = false;
      return;
    }
    if (didInit.current) return;
    didInit.current = true;

    // Wrap in async IIFE so setState calls happen inside the async
    // context rather than synchronously in the effect body.
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const state = await provider.createGame({ fen: initialFEN });
        applyRemoteState(state);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create game');
      } finally {
        setLoading(false);
      }
    })();
  }, [isRemote, provider, initialFEN, applyRemoteState]);

  // -----------------------------------------------------------------------
  // makeMove
  // -----------------------------------------------------------------------

  const makeMove = useCallback(
    (from: string, to: string, promotion?: string): ChessMove | null => {
      // Promotion gating
      if (!promotion) {
        const moves = engine.getLegalMovesFrom(from);
        const target = moves.find((m) => m.to === to);
        if (target && target.promotion && target.piece.type === 'pawn') {
          setPendingPromotion({ from, to });
          return null;
        }
      }

      // Apply locally first (optimistic for remote, authoritative for local)
      const move = engine.makeMove(from, to, promotion);
      if (!move) return null;

      // Apply increment
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

      // Fire-and-forget remote sync
      if (isRemote && remoteGameId) {
        provider.makeMove(remoteGameId, from, to, promotion).catch((err) => {
          setError(err instanceof Error ? err.message : 'Remote move failed');
        });
      }

      return move;
    },
    [
      engine,
      updateGameState,
      timeControl.initialMs,
      timeControl.incrementMs,
      timeoutWinner,
      isRemote,
      remoteGameId,
      provider,
    ]
  );

  // -----------------------------------------------------------------------
  // undoMove
  // -----------------------------------------------------------------------

  const undoMove = useCallback((): ChessMove | null => {
    const move = engine.undo();
    if (move) {
      updateGameState();
      setSelectedSquare(null);
      setLegalMoves([]);
      setCurrentPly(engine.getHistory().length);

      if (isRemote && remoteGameId) {
        provider.undoMove(remoteGameId).catch((err) => {
          setError(err instanceof Error ? err.message : 'Remote undo failed');
        });
      }
    }
    return move;
  }, [engine, updateGameState, isRemote, remoteGameId, provider]);

  // -----------------------------------------------------------------------
  // selectSquare
  // -----------------------------------------------------------------------

  const selectSquare = useCallback(
    (square: string | null) => {
      if (!square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      const piece = engine.getPieceAt(square);
      if (piece && piece.color === turn) {
        setSelectedSquare(square);
        setLegalMoves(engine.getLegalMovesFrom(square));
      } else if (selectedSquare) {
        makeMove(selectedSquare, square);
      }
    },
    [engine, turn, selectedSquare, makeMove]
  );

  // -----------------------------------------------------------------------
  // resetGame
  // -----------------------------------------------------------------------

  const resetGame = useCallback(
    (startingColor: Color = 'white') => {
      if (startingColor === 'white') {
        engine.reset();
      } else {
        engine.loadFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1');
      }
      updateGameState();
      setSelectedSquare(null);
      setLegalMoves([]);
      setCurrentPly(engine.getHistory().length);
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

      // Create new remote game
      if (isRemote) {
        didInit.current = false;
        setLoading(true);
        provider
          .createGame({
            fen:
              startingColor === 'black'
                ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1'
                : undefined,
          })
          .then(applyRemoteState)
          .catch((err) => setError(err instanceof Error ? err.message : 'Reset failed'))
          .finally(() => setLoading(false));
      }
    },
    [engine, updateGameState, timeControl.initialMs, isRemote, provider, applyRemoteState]
  );

  // -----------------------------------------------------------------------
  // loadFEN
  // -----------------------------------------------------------------------

  const loadFEN = useCallback(
    (fen: string) => {
      engine.loadFEN(fen);
      updateGameState();
      setSelectedSquare(null);
      setLegalMoves([]);
      setCurrentPly(engine.getHistory().length);

      if (isRemote && remoteGameId) {
        provider.loadFen(remoteGameId, fen).catch((err) => {
          setError(err instanceof Error ? err.message : 'Remote FEN load failed');
        });
      }
    },
    [engine, updateGameState, isRemote, remoteGameId, provider]
  );

  const getFEN = useCallback(() => engine.getFEN(), [engine]);

  // -----------------------------------------------------------------------
  // Remaining delegations to engine (unchanged)
  // -----------------------------------------------------------------------

  const isValidMoveTarget = useCallback(
    (square: string): boolean => legalMoves.some((m) => m.to === square),
    [legalMoves]
  );

  const getAllLegalMoves = useCallback(() => engine.getLegalMoves(), [engine]);

  const goToPly = useCallback(
    (plyIndex: number) => {
      if (plyIndex < 0 || plyIndex > history.length) return;
      const full = [...history];
      engine.reset();
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

  // -----------------------------------------------------------------------
  // Computed
  // -----------------------------------------------------------------------

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

  const result = useMemo(() => engine.getResult(), [engine]);
  const lastMove = useMemo(
    () => (history.length > 0 ? history[history.length - 1] : null),
    [history]
  );
  const canUndo = useMemo(() => history.length > 0, [history]);

  const isTimeout = useMemo(() => timeoutWinner !== null, [timeoutWinner]);
  const finalResult = useMemo(() => {
    if (timeoutWinner) return timeoutWinner === 'white' ? '1-0' : '0-1';
    return engine.getResult();
  }, [timeoutWinner, engine]);

  // -----------------------------------------------------------------------
  // Clock ticking
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (timeControl.initialMs === null) return;
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

  return {
    board,
    turn,
    status,
    history,
    selectedSquare,
    legalMoves,
    currentPly,
    pendingPromotion,
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
    engine,
    remoteGameId,
    loading,
    error,
  };
}
