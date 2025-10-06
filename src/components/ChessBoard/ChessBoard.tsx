import { useMemo } from 'react';
import type { Piece as ChessPiece, Move as ChessMove } from '@rumenx/chess/types';
import { Square } from './Square';
import { ChessEngine } from '../../services/ChessEngine';
import './ChessBoard.scss';

export interface ChessBoardProps {
  board: (ChessPiece | null)[][];
  selectedSquare: string | null;
  legalMoves: ChessMove[];
  lastMove: ChessMove | null;
  isCheck: boolean;
  turn: 'white' | 'black';
  onSquareClick: (square: string) => void;
  orientation?: 'white' | 'black';
  showCoordinates?: boolean;
  highlightActivePieces?: boolean;
  hintMove?: { from: string; to: string } | null;
  showColorDebug?: boolean;
  showMappingDebug?: boolean;
}

export function ChessBoard({
  board,
  selectedSquare,
  legalMoves,
  lastMove,
  isCheck,
  turn,
  onSquareClick,
  orientation = 'white',
  showCoordinates = true,
  highlightActivePieces = false,
  hintMove = null,
  showColorDebug = false,
  showMappingDebug = false,
}: ChessBoardProps) {
  const checkedKingSquare = useMemo(() => {
    if (!isCheck) return null;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece?.type === 'king' && piece.color === turn) {
          return ChessEngine.coordsToSquare(row, col);
        }
      }
    }
    return null;
  }, [board, isCheck, turn]);

  const boardGrid = useMemo(() => {
    const rows: React.ReactNode[] = [];
    // Define display order of engine rows (engine row 0 = rank 8 top from white POV)
    // With new mapping row0=rank1, to render white orientation (rank8 at top) we iterate rows descending
    const rowOrder = orientation === 'white' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    const colOrder =
      orientation === 'white'
        ? [0, 1, 2, 3, 4, 5, 6, 7] // file a->h left->right
        : [7, 6, 5, 4, 3, 2, 1, 0]; // flipped

    for (const r of rowOrder) {
      const squares: React.ReactNode[] = [];
      for (const c of colOrder) {
        const square = ChessEngine.coordsToSquare(r, c);
        const piece = board[r][c];
        const isLight = (r + c) % 2 === 0;
        const isSelected = selectedSquare === square;
        const isValidMove = legalMoves.some((m) => m.to === square);
        const isLastMoveSquare = lastMove && (lastMove.from === square || lastMove.to === square);
        const isCheckSquare = checkedKingSquare === square;
        const isActivePiece = highlightActivePieces && piece?.color === turn;
        const isHintFrom = hintMove?.from === square;
        const isHintTo = hintMove?.to === square;
        squares.push(
          <Square
            key={square}
            piece={piece}
            square={square}
            isLight={isLight}
            isSelected={isSelected}
            isValidMove={isValidMove}
            isLastMove={!!isLastMoveSquare}
            isCheck={isCheckSquare}
            isActivePiece={isActivePiece}
            onClick={onSquareClick}
            isHintFrom={isHintFrom}
            isHintTo={isHintTo}
            showColorDebug={showColorDebug}
            debugInfo={
              showMappingDebug ? { engineRow: r, engineCol: c, renderedSquare: square } : undefined
            }
          />
        );
      }
      rows.push(
        <div key={r} className="chess-board__row" data-row={r}>
          {squares}
        </div>
      );
    }
    return rows;
  }, [
    board,
    orientation,
    selectedSquare,
    legalMoves,
    lastMove,
    checkedKingSquare,
    onSquareClick,
    highlightActivePieces,
    turn,
    hintMove?.from,
    hintMove?.to,
    showColorDebug,
    showMappingDebug,
  ]);

  const fileCoordinates = useMemo(() => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    return orientation === 'white' ? files : [...files].reverse();
  }, [orientation]);

  const rankCoordinates = useMemo(() => {
    const ranks = [8, 7, 6, 5, 4, 3, 2, 1];
    return orientation === 'white' ? ranks : [...ranks].reverse();
  }, [orientation]);

  return (
    <div className={`chess-board chess-board--${orientation}`} role="grid" aria-label="Chess board">
      {showCoordinates && (
        <>
          <div className="chess-board__ranks">
            {rankCoordinates.map((rank) => (
              <div key={rank} className="chess-board__rank-label">
                {rank}
              </div>
            ))}
          </div>
          <div className="chess-board__files">
            {fileCoordinates.map((file) => (
              <div key={file} className="chess-board__file-label">
                {file}
              </div>
            ))}
          </div>
        </>
      )}
      <div className="chess-board__grid">{boardGrid}</div>
    </div>
  );
}

export default ChessBoard;
