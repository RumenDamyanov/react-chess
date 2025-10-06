import { formatMove, chunkMoves } from '../../utils/chessNotation';
import type { ChessEngine } from '../../services/ChessEngine';
import type { Move } from '@rumenx/chess/types';
import './MoveHistory.scss';

interface MoveHistoryProps {
  history: Move[];
  onSelectMove?: (index: number) => void;
  engineContext?: ChessEngine;
  currentPly?: number; // current displayed ply index
}

export function MoveHistory({
  history,
  onSelectMove,
  engineContext,
  currentPly,
}: MoveHistoryProps) {
  const rows = chunkMoves(history);
  return (
    <div className="move-history">
      <h3 className="move-history__title">Moves</h3>
      {history.length === 0 && <div className="move-history__empty">No moves yet</div>}
      {history.length > 0 && (
        <ol className="move-history__list" start={1}>
          {rows.map((row, i) => (
            <li key={i} className="move-history__row">
              <span className="move-history__number">{row.fullMove}.</span>
              <button
                className={`move-history__move-btn ${currentPly !== undefined && currentPly > i * 2 ? 'is-active' : ''}`}
                onClick={() => onSelectMove?.(i * 2)}
                disabled={!row.white}
              >
                {row.white ? formatMove(row.white, i * 2, engineContext) : ''}
              </button>
              <button
                className={`move-history__move-btn ${currentPly !== undefined && currentPly > i * 2 + 1 ? 'is-active' : ''}`}
                onClick={() => onSelectMove?.(i * 2 + 1)}
                disabled={!row.black}
              >
                {row.black ? formatMove(row.black, i * 2 + 1, engineContext) : ''}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default MoveHistory;
