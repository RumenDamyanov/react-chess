/**
 * Tests for provider type definitions and BACKEND_PRESETS.
 */
import { BACKEND_PRESETS, type BackendId } from '../../src/providers/types';

describe('BACKEND_PRESETS', () => {
  it('should have entries for all four backends', () => {
    const ids: BackendId[] = ['local', 'rust', 'go', 'js'];
    ids.forEach((id) => {
      expect(BACKEND_PRESETS[id]).toBeDefined();
      expect(BACKEND_PRESETS[id].id).toBe(id);
      expect(BACKEND_PRESETS[id].label).toBeTruthy();
      expect(BACKEND_PRESETS[id].description).toBeTruthy();
    });
  });

  it('should not have a URL for local backend', () => {
    expect(BACKEND_PRESETS.local.url).toBeUndefined();
  });

  it('should have default URLs for remote backends', () => {
    expect(BACKEND_PRESETS.rust.url).toBe('http://localhost:8082');
    expect(BACKEND_PRESETS.go.url).toBe('http://localhost:8080');
    expect(BACKEND_PRESETS.js.url).toBe('http://localhost:8081');
  });

  it('should have unique labels for each backend', () => {
    const labels = Object.values(BACKEND_PRESETS).map((p) => p.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
