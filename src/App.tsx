import { useState, useEffect, useCallback } from 'react';
import type { Color } from '@rumenx/chess/types';
import { ChessBoard } from './components/ChessBoard/ChessBoard';
import { useChessBackendGame } from './hooks/useChessBackendGame';
import { useBackend, BACKEND_PRESETS, type BackendId } from './providers';
import { ChessAI, type AIDifficulty } from './services/ChessAI';
import MoveHistory from './components/MoveHistory/MoveHistory';
import PromotionDialog from './components/PromotionDialog/PromotionDialog';
import { buildPGN } from './utils/pgn';
import { loadJSON, saveJSON, remove as removeStorage } from './utils/persist';
import './App.scss';

function App() {
  // Backend context
  const {
    backendId,
    switchBackend,
    backends,
    connected,
    connectionError,
    checking,
    checkConnection,
    capabilities,
    setBackendUrl,
  } = useBackend();

  // Persistent settings
  const [playerColor, setPlayerColor] = useState<Color>(() => loadJSON('rc_playerColor', 'white'));
  const [whiteName, setWhiteName] = useState<string>(() => loadJSON('rc_whiteName', 'You'));
  const [blackName, setBlackName] = useState<string>(() => loadJSON('rc_blackName', 'AI'));
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>(() =>
    loadJSON('rc_boardOrientation', 'white')
  );
  const [aiEnabled, setAiEnabled] = useState<boolean>(() => loadJSON('rc_aiEnabled', true));
  const [showCoordinates, setShowCoordinates] = useState<boolean>(() =>
    loadJSON('rc_showCoords', true)
  );
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>(() => {
    const raw: unknown = loadJSON('rc_aiDifficulty', 'harmless');
    const allowed: AIDifficulty[] = ['harmless', 'easy', 'medium', 'hard', 'expert', 'godlike'];
    return typeof raw === 'string' && (allowed as string[]).includes(raw)
      ? (raw as AIDifficulty)
      : 'harmless';
  });
  const [showColorDebug, setShowColorDebug] = useState<boolean>(() =>
    loadJSON('rc_showColorDebug', false)
  );
  const [showMappingDebug, setShowMappingDebug] = useState<boolean>(() =>
    loadJSON('rc_showMappingDebug', false)
  );
  const [devOpen, setDevOpen] = useState(false);

  useEffect(() => {
    saveJSON('rc_playerColor', playerColor);
  }, [playerColor]);
  useEffect(() => {
    saveJSON('rc_whiteName', whiteName);
  }, [whiteName]);
  useEffect(() => {
    saveJSON('rc_blackName', blackName);
  }, [blackName]);
  useEffect(() => {
    saveJSON('rc_boardOrientation', boardOrientation);
  }, [boardOrientation]);
  useEffect(() => {
    saveJSON('rc_aiEnabled', aiEnabled);
  }, [aiEnabled]);
  useEffect(() => {
    saveJSON('rc_showCoords', showCoordinates);
  }, [showCoordinates]);
  useEffect(() => {
    saveJSON('rc_aiDifficulty', aiDifficulty);
  }, [aiDifficulty]);
  useEffect(() => {
    saveJSON('rc_showColorDebug', showColorDebug);
  }, [showColorDebug]);
  useEffect(() => {
    saveJSON('rc_showMappingDebug', showMappingDebug);
  }, [showMappingDebug]);

  // Chess game hook (backend-aware)
  const {
    board,
    turn,
    history,
    selectedSquare,
    legalMoves,
    lastMove,
    isCheck,
    isGameOver,
    result,
    finalResult,
    canUndo,
    selectSquare,
    undoMove,
    resetGame,
    getFEN,
    engine,
    pendingPromotion,
    makeMove,
    goToPly,
    currentPly,
    whiteTimeMs,
    blackTimeMs,
    timeControl,
    setTimeControlPreset,
    isTimeout,
    timeoutWinner,
    loading: gameLoading,
    error: gameError,
  } = useChessBackendGame();

  // Time control preset state (minutes + increment seconds)
  const [tcPreset, setTcPreset] = useState<{ m: number | null; inc: number }>(() =>
    loadJSON('rc_timeControl', { m: null as number | null, inc: 0 })
  );
  useEffect(() => {
    saveJSON('rc_timeControl', tcPreset);
  }, [tcPreset]);
  useEffect(() => {
    setTimeControlPreset(tcPreset.m, tcPreset.inc);
  }, [tcPreset, setTimeControlPreset]);

  const [aiThinking, setAiThinking] = useState(false);
  const [hintMove, setHintMove] = useState<{ from: string; to: string } | null>(null);
  const [inlineMessage, setInlineMessage] = useState<string | null>(null);

  const formatClock = useCallback(
    (ms: number) => {
      if (timeControl.initialMs === null) return '∞';
      const totalSeconds = Math.floor(ms / 1000);
      const seconds = totalSeconds % 60;
      const minutes = Math.floor(totalSeconds / 60);
      if (ms < 10_000) {
        const tenths = Math.floor((ms % 1000) / 100);
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
      }
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },
    [timeControl.initialMs]
  );

  const activeColor = turn;
  const whiteFlagged = isTimeout && timeoutWinner === 'black';
  const blackFlagged = isTimeout && timeoutWinner === 'white';

  const handleSquareClick = useCallback(
    (square: string) => {
      if (aiThinking) return;
      if (aiEnabled && turn !== playerColor) {
        setInlineMessage(`Not your turn (${turn} to move)`);
        return;
      }
      selectSquare(square);
    },
    [aiThinking, aiEnabled, turn, playerColor, selectSquare]
  );

  useEffect(() => {
    if (inlineMessage) {
      const t = setTimeout(() => setInlineMessage(null), 1600);
      return () => clearTimeout(t);
    }
  }, [inlineMessage]);

  // AI logic
  useEffect(() => {
    if (!aiEnabled || isGameOver || isTimeout) return;
    const isAITurn = turn !== playerColor;
    if (!isAITurn) return;
    let cancelled = false;
    const think = async () => {
      setAiThinking(true);
      const baseDelay = history.length === 0 && playerColor === 'black' ? 50 : 150;
      await new Promise((r) => setTimeout(r, baseDelay));
      if (cancelled) return;
      const move = ChessAI.computeBestMove(engine, aiDifficulty);
      if (move) {
        makeMove(move.from, move.to);
        if (!cancelled) setAiThinking(false);
      } else {
        setAiThinking(false);
      }
    };
    think();
    return () => {
      cancelled = true;
      setAiThinking(false);
    };
  }, [
    turn,
    aiEnabled,
    isGameOver,
    isTimeout,
    playerColor,
    engine,
    makeMove,
    aiDifficulty,
    history.length,
  ]);

  const handlePlayerColorChange = (color: Color) => {
    setPlayerColor(color);
    setBoardOrientation(color);
    if (aiEnabled) {
      resetGame('white');
    } else {
      resetGame(color);
    }
  };

  useEffect(() => {
    if (!aiEnabled && history.length === 0 && turn !== playerColor) {
      resetGame(playerColor);
    }
  }, [aiEnabled, history.length, turn, playerColor, resetGame]);

  const handleAiToggle = () => {
    const newVal = !aiEnabled;
    setAiEnabled(newVal);
    resetGame(newVal ? 'white' : playerColor);
  };

  const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAiDifficulty(e.target.value as AIDifficulty);
  };

  const requestHint = () => {
    // Only show hints when it's the player's turn (not AI's turn)
    const isPlayersTurn = !aiEnabled || turn === playerColor;
    if (!isPlayersTurn || isGameOver || aiThinking) return;
    const move = ChessAI.computeBestMove(engine, 'easy');
    if (move) setHintMove({ from: move.from, to: move.to });
  };

  // Clear hint when the hinted move is made
  useEffect(() => {
    if (!hintMove) return;
    const last = history[history.length - 1];
    const isHintedMoveMade = last && (last.from === hintMove.from || last.to === hintMove.to);
    if (isHintedMoveMade) {
      // Schedule state update to avoid synchronous update in effect
      const timer = setTimeout(() => setHintMove(null), 0);
      return () => clearTimeout(timer);
    }
  }, [history, hintMove]);

  const resetSettings = () => {
    removeStorage('rc_playerColor');
    removeStorage('rc_aiEnabled');
    removeStorage('rc_showCoords');
    removeStorage('rc_aiDifficulty');
    setPlayerColor('white');
    setAiEnabled(true);
    setShowCoordinates(true);
    setAiDifficulty('harmless');
  };

  const statusMessage = inlineMessage
    ? inlineMessage
    : isTimeout
      ? `Time Out: ${finalResult}`
      : isGameOver
        ? `Game Over: ${finalResult}`
        : isCheck
          ? 'Check!'
          : turn === playerColor
            ? 'Your move'
            : aiEnabled
              ? aiThinking
                ? 'AI thinking…'
                : 'AI move'
              : 'Opponent move';

  const displayWhite =
    playerColor === 'white' || !aiEnabled ? whiteName : aiEnabled ? 'You' : whiteName;
  const displayBlack =
    playerColor === 'black' || !aiEnabled ? blackName : aiEnabled ? 'AI' : blackName;

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">React Chess</h1>
        <p className="app__subtitle">
          Backend: <strong>{backends[backendId].label}</strong>
          {backendId !== 'local' && (
            <span
              className={`app__connection-dot ${connected ? 'app__connection-dot--ok' : connected === false ? 'app__connection-dot--err' : 'app__connection-dot--pending'}`}
              title={connected ? 'Connected' : (connectionError ?? 'Checking…')}
            />
          )}
        </p>
      </header>

      <main className="app__main layout-3col">
        {/* Left Column: Settings */}
        <div className="layout-3col__left">
          {/* Backend Picker */}
          <div className="board-settings">
            <h3 className="board-settings__title">Backend Engine</h3>
            <div className="board-settings__option">
              <label className="board-settings__label" htmlFor="backend-select">
                Engine:
              </label>
              <select
                id="backend-select"
                className="board-settings__select"
                value={backendId}
                onChange={(e) => {
                  const id = e.target.value as BackendId;
                  switchBackend(id);
                  resetGame(aiEnabled ? 'white' : playerColor);
                }}
              >
                {(Object.keys(BACKEND_PRESETS) as BackendId[]).map((id) => (
                  <option key={id} value={id}>
                    {BACKEND_PRESETS[id].label}
                  </option>
                ))}
              </select>
            </div>
            {backendId !== 'local' && backendId !== 'js' && (
              <>
                <div className="board-settings__option">
                  <label className="board-settings__label" htmlFor="backend-url">
                    URL:
                  </label>
                  <input
                    id="backend-url"
                    className="board-settings__select"
                    type="text"
                    value={backends[backendId].url ?? ''}
                    onChange={(e) => setBackendUrl(backendId, e.target.value)}
                    placeholder="http://localhost:8082"
                  />
                </div>
                <div className="board-settings__option">
                  <span
                    className={`board-settings__connection-status ${
                      connected
                        ? 'board-settings__connection-status--ok'
                        : connected === false
                          ? 'board-settings__connection-status--err'
                          : 'board-settings__connection-status--pending'
                    }`}
                  >
                    {checking
                      ? '⏳ Checking…'
                      : connected
                        ? '✅ Connected'
                        : `❌ ${connectionError ?? 'Disconnected'}`}
                  </span>
                  <button
                    className="board-settings__button board-settings__button--small"
                    onClick={() => checkConnection()}
                    disabled={checking}
                    type="button"
                  >
                    🔄 Retry
                  </button>
                </div>
                {!capabilities.undo && (
                  <div className="board-settings__note">⚠️ This backend does not support undo</div>
                )}
              </>
            )}
          </div>

          {/* Game Settings */}
          <div className="board-settings">
            <h3 className="board-settings__title">Game Settings</h3>
            <div className="board-settings__option">
              <label className="board-settings__label">Play as:</label>
              <div className="board-settings__toggle">
                <button
                  className={`board-settings__toggle-btn ${playerColor === 'white' ? 'active' : ''}`}
                  onClick={() => handlePlayerColorChange('white')}
                >
                  ♔ White
                </button>
                <button
                  className={`board-settings__toggle-btn ${playerColor === 'black' ? 'active' : ''}`}
                  onClick={() => handlePlayerColorChange('black')}
                >
                  ♚ Black
                </button>
              </div>
            </div>
            <div className="board-settings__option">
              <label className="board-settings__checkbox">
                <input type="checkbox" checked={aiEnabled} onChange={handleAiToggle} />
                <span>Play against AI</span>
              </label>
            </div>
            {aiEnabled && (
              <div className="board-settings__option">
                <label className="board-settings__label" htmlFor="ai-difficulty">
                  AI Strength:
                </label>
                <select
                  id="ai-difficulty"
                  className="board-settings__select"
                  value={aiDifficulty}
                  onChange={handleDifficultyChange}
                >
                  <option value="harmless">Harmless (Random)</option>
                  <option value="easy">Easy (Depth 1)</option>
                  <option value="medium">Medium (Depth 2)</option>
                  <option value="hard">Hard (Depth 3)</option>
                  <option value="expert">Expert (Depth 4)</option>
                  <option value="godlike">Godlike (Depth 5)</option>
                </select>
              </div>
            )}
            <div className="board-settings__option">
              <label className="board-settings__label" htmlFor="white-name">
                White Name:
              </label>
              <input
                id="white-name"
                className="board-settings__select"
                type="text"
                maxLength={24}
                value={whiteName}
                onChange={(e) => setWhiteName(e.target.value || 'White')}
              />
            </div>
            <div className="board-settings__option">
              <label className="board-settings__label" htmlFor="black-name">
                Black Name:
              </label>
              <input
                id="black-name"
                className="board-settings__select"
                type="text"
                maxLength={24}
                value={blackName}
                onChange={(e) => setBlackName(e.target.value || 'Black')}
              />
            </div>
            <div className="board-settings__option">
              <label className="board-settings__label" htmlFor="tc-preset">
                Time Control:
              </label>
              <select
                id="tc-preset"
                className="board-settings__select"
                value={`${tcPreset.m ?? 'unlimited'}|${tcPreset.inc}`}
                onChange={(e) => {
                  const [mRaw, incRaw] = e.target.value.split('|');
                  setTcPreset({
                    m: mRaw === 'unlimited' ? null : parseInt(mRaw, 10),
                    inc: parseInt(incRaw, 10),
                  });
                  resetGame(aiEnabled ? 'white' : playerColor);
                }}
              >
                <option value="unlimited|0">Unlimited</option>
                <option value="3|0">3+0 Blitz</option>
                <option value="3|2">3+2 Blitz</option>
                <option value="5|0">5+0 Blitz</option>
                <option value="5|3">5+3 Rapid</option>
                <option value="10|5">10+5 Rapid</option>
                <option value="15|10">15+10 Classical</option>
              </select>
            </div>
            <div className="board-settings__option">
              <label className="board-settings__checkbox">
                <input
                  type="checkbox"
                  checked={showCoordinates}
                  onChange={(e) => setShowCoordinates(e.target.checked)}
                />
                <span>Show Coordinates</span>
              </label>
            </div>
            <div className="board-settings__option">
              <button
                className="board-settings__button"
                onClick={() => {
                  navigator.clipboard.writeText(getFEN());
                  alert('FEN copied to clipboard!');
                }}
                title="Copy position as FEN notation"
              >
                📋 Copy FEN
              </button>
            </div>
            <div className="board-settings__option">
              <button
                className="board-settings__button"
                onClick={() => {
                  const pgn = buildPGN(history, engine, { result });
                  navigator.clipboard.writeText(pgn);
                  alert('PGN copied to clipboard!');
                }}
                title="Copy full game as PGN"
              >
                📑 Copy PGN
              </button>
            </div>
            <div className="board-settings__option">
              <button
                className="board-settings__button"
                onClick={resetSettings}
                title="Reset stored settings to defaults"
              >
                ♻️ Reset Settings
              </button>
            </div>
          </div>
          <div className="developer-options">
            <button
              className="developer-options__toggle"
              type="button"
              aria-expanded={devOpen}
              onClick={() => setDevOpen((o) => !o)}
            >
              <span className="developer-options__chevron" data-open={devOpen}>
                ▶
              </span>
              Developer Options
            </button>
            {devOpen && (
              <div className="developer-options__content">
                <div className="developer-options__group">
                  <label className="board-settings__checkbox">
                    <input
                      type="checkbox"
                      checked={showColorDebug}
                      onChange={(e) => setShowColorDebug(e.target.checked)}
                    />
                    <span>Show Color Debug Badges</span>
                  </label>
                  <label className="board-settings__checkbox">
                    <input
                      type="checkbox"
                      checked={showMappingDebug}
                      onChange={(e) => setShowMappingDebug(e.target.checked)}
                    />
                    <span>Show Mapping Debug</span>
                  </label>
                </div>
                <div className="debug-info debug-info--inline">
                  <h4 className="debug-info__title">Runtime State</h4>
                  <div className="debug-info__content">
                    <div>Selected: {selectedSquare || 'none'}</div>
                    <div>Legal moves: {legalMoves.length}</div>
                    <div>Turn: {turn}</div>
                    <div>Pieces: {board.flat().filter((p) => p !== null).length}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Column */}
        <div className="layout-3col__center">
          <div className="app__board-container">
            <ChessBoard
              board={board}
              selectedSquare={selectedSquare}
              legalMoves={legalMoves}
              lastMove={lastMove}
              isCheck={isCheck}
              turn={turn}
              onSquareClick={handleSquareClick}
              orientation={boardOrientation}
              showCoordinates={showCoordinates}
              highlightActivePieces
              hintMove={hintMove}
              showColorDebug={showColorDebug}
              showMappingDebug={showMappingDebug}
            />
            {pendingPromotion && (
              <PromotionDialog
                color={turn}
                onSelect={(piece) => makeMove(pendingPromotion.from, pendingPromotion.to, piece)}
              />
            )}
            <div className="board-info" aria-live="polite">
              {gameLoading && (
                <div className="board-info__banner board-info__banner--loading">
                  ⏳ Connecting to {backends[backendId].label}…
                </div>
              )}
              {gameError && (
                <div className="board-info__banner board-info__banner--error">⚠️ {gameError}</div>
              )}
              <div className="board-info__row">
                <span className="board-info__status">{statusMessage}</span>
                {aiEnabled && turn !== playerColor && !isGameOver && !isTimeout && (
                  <span className="board-info__pill">🤖 AI {aiThinking ? 'Thinking' : 'Move'}</span>
                )}
                {isCheck && !isGameOver && !isTimeout && (
                  <span className="board-info__pill board-info__pill--warn">♚ Check</span>
                )}
                {(isGameOver || isTimeout) && (
                  <span className="board-info__pill board-info__pill--danger">
                    Result {finalResult}
                  </span>
                )}
              </div>
              <div className="board-info__meta">
                <span>{displayWhite} (White)</span>
                <span className="board-info__divider" />
                <span>Turn: {turn === 'white' ? displayWhite : displayBlack}</span>
                <span className="board-info__divider" />
                <span>
                  Orientation: {boardOrientation === 'white' ? displayWhite : displayBlack}
                </span>
                <span className="board-info__divider" />
                <span>Mode: {aiEnabled ? 'vs AI' : 'Local'}</span>
                <span className="board-info__divider" />
                <span>Engine: {backends[backendId].label}</span>
                <span className="board-info__divider" />
                <span>Moves: {history.length}</span>
                {timeControl.initialMs !== null && (
                  <>
                    <span className="board-info__divider" />
                    <span>
                      {tcPreset.m}+{tcPreset.inc}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="clock-bar" aria-label="Time remaining">
              <div
                className={`clock-bar__clock clock-bar__clock--white ${activeColor === 'white' && !isGameOver && !isTimeout ? 'active' : ''} ${whiteFlagged ? 'flagged' : ''}`}
              >
                ♔ {formatClock(whiteTimeMs)}
              </div>
              <div
                className={`clock-bar__clock clock-bar__clock--black ${activeColor === 'black' && !isGameOver && !isTimeout ? 'active' : ''} ${blackFlagged ? 'flagged' : ''}`}
              >
                ♚ {formatClock(blackTimeMs)}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="layout-3col__right">
          <div className="game-info">
            <h2 className="game-info__title">Game Info</h2>
            <div className="game-info__status">
              <span className="game-info__label">Status:</span>
              <span className="game-info__value">{statusMessage}</span>
            </div>
            <div className="game-info__turn">
              <span className="game-info__label">Turn:</span>
              <span className={`game-info__value game-info__value--${turn}`}>{turn}</span>
            </div>
            <div className="game-info__moves">
              <span className="game-info__label">Players:</span>
              <span className="game-info__value">
                {displayWhite} vs {displayBlack}
              </span>
            </div>
            <div className="game-info__moves">
              <span className="game-info__label">Moves:</span>
              <span className="game-info__value">{history.length}</span>
            </div>
            {(isGameOver || isTimeout) && (
              <div className="game-info__result">
                <span className="game-info__label">Result:</span>
                <span className="game-info__value">{finalResult}</span>
              </div>
            )}
            {timeControl.initialMs !== null && (
              <div className="game-info__result">
                <span className="game-info__label">Clock:</span>
                <span className="game-info__value">
                  {tcPreset.m}+{tcPreset.inc}
                </span>
              </div>
            )}
          </div>
          <div className="game-controls">
            <h3 className="game-controls__title">Controls</h3>
            <div className="game-controls__buttons">
              <button
                className="game-controls__button game-controls__button--secondary"
                onClick={() => setBoardOrientation((o) => (o === 'white' ? 'black' : 'white'))}
                title="Flip board orientation"
              >
                ⇄ Flip
              </button>
              <button
                className="game-controls__button game-controls__button--secondary"
                onClick={undoMove}
                disabled={!canUndo || !capabilities.undo}
                title={capabilities.undo ? 'Undo last move' : 'Undo not supported by this backend'}
              >
                ← Undo
              </button>
              <button
                className="game-controls__button game-controls__button--primary"
                onClick={() => resetGame(aiEnabled ? 'white' : playerColor)}
                title="Start new game"
              >
                ↻ New Game
              </button>
              <button
                className="game-controls__button game-controls__button--secondary"
                onClick={requestHint}
                disabled={aiThinking || isGameOver || isTimeout}
                title="Show a hint move"
              >
                💡 Hint
              </button>
            </div>
          </div>
          <MoveHistory
            history={history}
            engineContext={engine}
            currentPly={currentPly}
            onSelectMove={goToPly}
          />
        </div>
      </main>

      <footer className="app__footer">
        <p>
          Made with ♟️ by{' '}
          <a href="https://github.com/RumenDamyanov" target="_blank" rel="noopener noreferrer">
            Rumen Damyanov
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
