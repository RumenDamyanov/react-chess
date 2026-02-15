/**
 * Provider barrel exports.
 */

export type {
  BackendId,
  BackendConfig,
  ChessProvider,
  CreateGameOptions,
  NormGameState,
  NormMove,
  NormPiece,
  NormLegalMove,
  NormAiMoveResult,
  NormAnalysis,
  PlayerColor,
  GameStatusNorm,
  ProviderCapabilities,
} from './types';

export { BACKEND_PRESETS } from './types';
export { LocalProvider } from './LocalProvider';
export { RemoteProvider } from './RemoteProvider';
export { BackendProvider, useBackend } from './BackendContext';
