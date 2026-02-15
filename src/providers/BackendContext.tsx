/* eslint-disable react-refresh/only-export-components */
/**
 * BackendContext — React context that manages the active chess backend.
 *
 * Wraps the provider selection, URL configuration, and health checking.
 * Components deep in the tree use `useBackend()` to access the current
 * provider without prop-drilling.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import { loadJSON, saveJSON } from '../utils/persist';
import { LocalProvider } from './LocalProvider';
import { RemoteProvider } from './RemoteProvider';
import type { BackendId, BackendConfig, ChessProvider, ProviderCapabilities } from './types';
import { BACKEND_PRESETS } from './types';

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

export interface BackendContextValue {
  /** Currently active backend id */
  backendId: BackendId;
  /** Current provider instance */
  provider: ChessProvider;
  /** Config for current backend */
  config: BackendConfig;
  /** Capabilities of the current backend */
  capabilities: ProviderCapabilities;
  /** Whether the remote backend is reachable (true for local, null = checking) */
  connected: boolean | null;
  /** Last connection error message */
  connectionError: string | null;
  /** Switch to a different backend */
  switchBackend: (id: BackendId, customUrl?: string) => void;
  /** Update the URL for a remote backend */
  setBackendUrl: (id: BackendId, url: string) => void;
  /** All available backend configs (with persisted URL overrides) */
  backends: Record<BackendId, BackendConfig>;
  /** Re-check connectivity */
  checkConnection: () => Promise<void>;
  /** True while checking connectivity */
  checking: boolean;
}

const BackendContext = createContext<BackendContextValue | null>(null);

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const STORAGE_KEY_BACKEND = 'rc_backend';
const STORAGE_KEY_URLS = 'rc_backendUrls';

// ---------------------------------------------------------------------------
// Env var defaults (Vite injects VITE_* at build time)
// ---------------------------------------------------------------------------

function envBackend(): BackendId {
  const val = import.meta.env?.VITE_CHESS_BACKEND;
  if (val === 'rust' || val === 'go' || val === 'js' || val === 'local') return val;
  return 'local';
}

function envUrls(): Partial<Record<BackendId, string>> {
  const urls: Partial<Record<BackendId, string>> = {};
  if (import.meta.env?.VITE_CHESS_RUST_URL) urls.rust = import.meta.env.VITE_CHESS_RUST_URL;
  if (import.meta.env?.VITE_CHESS_GO_URL) urls.go = import.meta.env.VITE_CHESS_GO_URL;
  if (import.meta.env?.VITE_CHESS_JS_URL) urls.js = import.meta.env.VITE_CHESS_JS_URL;
  return urls;
}

// ---------------------------------------------------------------------------
// Provider component
// ---------------------------------------------------------------------------

export function BackendProvider({ children }: { children: ReactNode }) {
  // Persisted backend choice (falls back to env var, then 'local')
  const [backendId, setBackendId] = useState<BackendId>(() =>
    loadJSON<BackendId>(STORAGE_KEY_BACKEND, envBackend())
  );

  // Persisted URL overrides per backend (seeded from env vars)
  const [urlOverrides, setUrlOverrides] = useState<Partial<Record<BackendId, string>>>(() => {
    const persisted = loadJSON<Partial<Record<BackendId, string>>>(STORAGE_KEY_URLS, {});
    // Merge: env vars as defaults, persisted overrides on top
    return { ...envUrls(), ...persisted };
  });

  // Connection state
  const [connected, setConnected] = useState<boolean | null>(
    backendId === 'local' || backendId === 'js' ? true : null
  );
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  // Build configs with URL overrides
  const backends = useMemo<Record<BackendId, BackendConfig>>(() => {
    const result = { ...BACKEND_PRESETS };
    for (const [id, url] of Object.entries(urlOverrides)) {
      if (result[id as BackendId]) {
        result[id as BackendId] = { ...result[id as BackendId], url };
      }
    }
    return result;
  }, [urlOverrides]);

  // Build provider (recreated when backend or URL changes)
  const provider = useMemo<ChessProvider>(() => {
    if (backendId === 'local' || backendId === 'js') return new LocalProvider();
    const cfg = backends[backendId];
    const url = cfg.url ?? BACKEND_PRESETS[backendId].url ?? 'http://localhost:8083';
    return new RemoteProvider(backendId, url);
  }, [backendId, backends]);

  // Health check for remote backends
  const checkConnection = useCallback(async () => {
    if (backendId === 'local' || backendId === 'js') {
      setConnected(true);
      setConnectionError(null);
      return;
    }
    setChecking(true);
    const cfg = backends[backendId];
    const url = cfg.url ?? BACKEND_PRESETS[backendId].url ?? '';
    try {
      const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        setConnected(true);
        setConnectionError(null);
      } else {
        setConnected(false);
        setConnectionError(`Health check returned ${res.status}`);
      }
    } catch (err) {
      setConnected(false);
      setConnectionError(err instanceof Error ? err.message : 'Cannot reach backend');
    } finally {
      setChecking(false);
    }
  }, [backendId, backends]);

  // Auto-check when backend changes
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Persist backend choice
  useEffect(() => {
    saveJSON(STORAGE_KEY_BACKEND, backendId);
  }, [backendId]);

  // Persist URL overrides
  useEffect(() => {
    saveJSON(STORAGE_KEY_URLS, urlOverrides);
  }, [urlOverrides]);

  const switchBackend = useCallback((id: BackendId, customUrl?: string) => {
    if (customUrl && id !== 'local') {
      setUrlOverrides((prev) => ({ ...prev, [id]: customUrl }));
    }
    setConnected(id === 'local' ? true : null);
    setConnectionError(null);
    setBackendId(id);
  }, []);

  const setBackendUrl = useCallback((id: BackendId, url: string) => {
    setUrlOverrides((prev) => ({ ...prev, [id]: url }));
  }, []);

  const value = useMemo<BackendContextValue>(
    () => ({
      backendId,
      provider,
      config: backends[backendId],
      capabilities: provider.capabilities,
      connected,
      connectionError,
      switchBackend,
      setBackendUrl,
      backends,
      checkConnection,
      checking,
    }),
    [
      backendId,
      provider,
      backends,
      connected,
      connectionError,
      switchBackend,
      setBackendUrl,
      checkConnection,
      checking,
    ]
  );

  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBackend(): BackendContextValue {
  const ctx = useContext(BackendContext);
  if (!ctx) {
    throw new Error('useBackend() must be used within a <BackendProvider>');
  }
  return ctx;
}
