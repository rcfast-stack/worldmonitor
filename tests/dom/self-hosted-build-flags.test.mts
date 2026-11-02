/**
 * Self-hosted Docker builds (VITE_SELF_HOSTED, VITE_SELF_HOST_ALL_PRO).
 *
 * Each case imports the modules fresh under stubbed build env and location,
 * because the flags and SITE_VARIANT are module-level constants. The memory
 * Storage mirrors desktop-runtime-variant-convergence.test.mts: variant.ts
 * reads the bare `localStorage` global, which is Node's stub here.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PanelConfig } from '@/types';

function memoryStorage(seed: Record<string, string>): Storage {
  const map = new Map(Object.entries(seed));
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => { map.delete(key); },
    setItem: (key: string, value: string) => { map.set(key, String(value)); },
  } as Storage;
}

function installHost(hostname: string, stored: string | null): void {
  vi.stubGlobal('localStorage', memoryStorage(stored ? { 'worldmonitor-variant': stored } : {}));
  vi.stubGlobal('location', {
    protocol: 'https:',
    host: hostname,
    hostname,
    origin: `https://${hostname}`,
  });
  vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0' });
}

async function variantUnder(env: Record<string, string>, hostname: string, stored: string | null) {
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  installHost(hostname, stored);
  vi.resetModules();
  return import('@/config/variant');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('self-hosted variant switching stays in place', () => {
  it('honours the stored variant on any host of a self-hosted build', async () => {
    const { SITE_VARIANT, switchesVariantInPlace } = await variantUnder({ VITE_SELF_HOSTED: 'true' }, 'wm.lan', 'finance');
    expect(SITE_VARIANT).toBe('finance');
    expect(switchesVariantInPlace('wm.lan')).toBe(true);
  });

  it('lets the stored choice win over a variant hostname prefix', async () => {
    const { SITE_VARIANT } = await variantUnder({ VITE_SELF_HOSTED: 'true' }, 'tech.wm.lan', 'energy');
    expect(SITE_VARIANT).toBe('energy');
  });

  it('still starts from the hostname prefix before anything is stored', async () => {
    const { SITE_VARIANT } = await variantUnder({ VITE_SELF_HOSTED: 'true' }, 'tech.wm.lan', null);
    expect(SITE_VARIANT).toBe('tech');
  });

  it('keeps hosted builds on subdomain navigation', async () => {
    const { SITE_VARIANT, switchesVariantInPlace } = await variantUnder({}, 'www.worldmonitor.app', 'finance');
    expect(SITE_VARIANT).toBe('full');
    expect(switchesVariantInPlace('www.worldmonitor.app')).toBe(false);
    expect(switchesVariantInPlace('localhost')).toBe(true);
  });
});

describe('self-hosted all-Pro build', () => {
  const lockedPanel = { name: 'Locked', enabled: true, priority: 1, premium: 'locked' } as PanelConfig;

  async function proSignalsUnder(env: Record<string, string>) {
    for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
    installHost('wm.lan', null);
    vi.resetModules();
    const [{ isProWidgetEnabled, isProUser }, { isPanelEntitled }] = await Promise.all([
      import('@/services/widget-store'),
      import('@/config/panels'),
    ]);
    return {
      proWidget: isProWidgetEnabled(),
      proUser: isProUser(),
      lockedPanel: isPanelEntitled('self-host-locked-panel', lockedPanel),
    };
  }

  it('grants every visitor Pro, including locked panels', async () => {
    expect(await proSignalsUnder({ VITE_SELF_HOST_ALL_PRO: 'true' })).toEqual({
      proWidget: true,
      proUser: true,
      lockedPanel: true,
    });
  });

  it('grants nothing without the flag', async () => {
    expect(await proSignalsUnder({})).toEqual({
      proWidget: false,
      proUser: false,
      lockedPanel: false,
    });
  });
});
