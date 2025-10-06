import './PromotionDialog.scss';
import type { Color } from '@rumenx/chess/types';

interface PromotionDialogProps {
  color: Color;
  onSelect: (piece: 'queen' | 'rook' | 'bishop' | 'knight') => void;
}

export function PromotionDialog({ color, onSelect }: PromotionDialogProps) {
  const pieces: Array<'queen' | 'rook' | 'bishop' | 'knight'> = [
    'queen',
    'rook',
    'bishop',
    'knight',
  ];
  return (
    <div className="promotion-dialog" role="dialog" aria-label="Select promotion piece">
      <div className="promotion-dialog__inner">
        <h4 className="promotion-dialog__title">Promote to</h4>
        <div className="promotion-dialog__choices">
          {pieces.map((p) => {
            const typeMap: Record<string, string> = {
              queen: 'q',
              rook: 'r',
              bishop: 'b',
              knight: 'n',
            };
            const filename = `${color === 'white' ? 'w' : 'b'}_${typeMap[p]}.png`;
            return (
              <button key={p} className="promotion-dialog__choice" onClick={() => onSelect(p)}>
                <img src={`/assets/pieces/${filename}`} alt={p} />
                <span>{p}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PromotionDialog;
