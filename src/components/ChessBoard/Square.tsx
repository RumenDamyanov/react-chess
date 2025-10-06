import type { Piece as ChessPiece } from '@rumenx/chess/types';
import './Square.scss';

export interface SquareProps {
  /**
   * The piece on this square (null if empty)
   */
  piece: ChessPiece | null;

  /**
   * Square notation (e.g., "e4")
   */
  square: string;

  /**
   * Is this a light or dark square
   */
  isLight: boolean;

  /**
   * Is this square currently selected
   */
  isSelected: boolean;

  /**
   * Is this square a valid move target
   */
  isValidMove: boolean;

  /**
   * Is this square part of the last move
   */
  isLastMove: boolean;

  /**
   * Is the king on this square in check
   */
  isCheck: boolean;

  /**
   * Click handler for the square
   */
  onClick: (square: string) => void;

  /**
   * Size of the square in pixels
   */
  size?: number;

  /** Is this piece belonging to side to move */
  isActivePiece?: boolean;
  /** Hint move origin */
  isHintFrom?: boolean;
  /** Hint move destination */
  isHintTo?: boolean;
  /** Show debug badge with piece color */
  showColorDebug?: boolean;
  /** Extra mapping debug info */
  debugInfo?: { engineRow: number; engineCol: number; renderedSquare: string };
}

/**
 * Square component - Represents a single square on the chess board
 * Displays the piece (if any) and handles visual states like selection and highlighting
 */
export function Square({
  piece,
  square,
  isLight,
  isSelected,
  isValidMove,
  isLastMove,
  isCheck,
  onClick,
  size,
  isActivePiece = false,
  isHintFrom = false,
  isHintTo = false,
  showColorDebug = false,
  debugInfo,
}: SquareProps) {
  const handleClick = () => {
    onClick(square);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(square);
    }
  };

  const classNames = [
    'chess-square',
    isLight ? 'chess-square--light' : 'chess-square--dark',
    isSelected && 'chess-square--selected',
    isValidMove && 'chess-square--valid-move',
    isLastMove && 'chess-square--last-move',
    isCheck && 'chess-square--check',
    isActivePiece && 'chess-square--active-piece',
    isHintFrom && 'chess-square--hint-from',
    isHintTo && 'chess-square--hint-to',
  ]
    .filter(Boolean)
    .join(' ');

  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <div
      className={classNames}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Square ${square}${piece ? `, ${piece.color} ${piece.type}` : ', empty'}`}
      data-square={square}
      style={style}
    >
      {piece &&
        (() => {
          const colorPrefix = piece.color === 'white' ? 'w' : 'b';
          const typeMap: Record<string, string> = {
            king: 'k',
            queen: 'q',
            rook: 'r',
            bishop: 'b',
            knight: 'n',
            pawn: 'p',
          };
          const filename = `${colorPrefix}_${typeMap[piece.type]}.png`;
          return (
            <img
              src={`/assets/pieces/${filename}`}
              alt={`${piece.color} ${piece.type}`}
              className="chess-square__piece"
              draggable={false}
            />
          );
        })()}
      {piece && showColorDebug && (
        <span className="chess-square__debug-badge" data-color={piece.color}>
          {piece.color[0].toUpperCase()}
        </span>
      )}
      {debugInfo && (
        <span className="chess-square__mapping-badge">
          r{debugInfo.engineRow} c{debugInfo.engineCol}\n{debugInfo.renderedSquare}
        </span>
      )}
      {isValidMove && !piece && <div className="chess-square__move-indicator" />}
      {isValidMove && piece && <div className="chess-square__capture-indicator" />}
    </div>
  );
}

export default Square;
