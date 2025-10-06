import type { Move } from '@rumenx/chess/types';
import { formatMove, chunkMoves } from './chessNotation';
import type { ChessEngine } from '../services/ChessEngine';

interface PGNOptions {
  event?: string;
  site?: string;
  date?: string; // YYYY.MM.DD
  round?: string;
  white?: string;
  black?: string;
  result?: string; // 1-0, 0-1, 1/2-1/2, *
}

export function buildPGN(moves: Move[], engine: ChessEngine, opts: PGNOptions = {}): string {
  const headers: Record<string, string> = {
    Event: opts.event || 'Casual Game',
    Site: opts.site || 'Local',
    Date: opts.date || new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
    Round: opts.round || '1',
    White: opts.white || 'White',
    Black: opts.black || 'Black',
    Result: opts.result || engine.getResult() || '*',
  };

  const headerSection = Object.entries(headers)
    .map(([k, v]) => `[${k} "${v}"]`)
    .join('\n');

  const rows = chunkMoves(moves);
  const moveTextParts: string[] = [];
  rows.forEach((row) => {
    const moveNumber = `${row.fullMove}.`;
    const whiteSan = row.white ? formatMove(row.white, (row.fullMove - 1) * 2, engine) : '';
    const blackSan = row.black ? formatMove(row.black, (row.fullMove - 1) * 2 + 1, engine) : '';
    if (blackSan) {
      moveTextParts.push(`${moveNumber} ${whiteSan} ${blackSan}`.trim());
    } else {
      moveTextParts.push(`${moveNumber} ${whiteSan}`.trim());
    }
  });

  const result = headers.Result;
  const body = moveTextParts.join(' ') + (result ? ` ${result}` : '');

  return `${headerSection}\n\n${body}`.trim();
}
