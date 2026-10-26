/* Phase 2a contract tests: the browser-side concerns (audio, persistence,
   debug hooks) live in src/platform exactly once, and the shape the CDP
   scripts under tools/ drive the game through has not shrunk.
   The assembly layer (ui/app.ts) is where those concerns get wired, so these
   source assertions are what catch a dropped hook or a renamed save key. */
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';

const read = (relative) => readFile(new URL(relative, import.meta.url), 'utf8');
const appSource = () => read('../../src/ui/app.ts');

/* Everything tools/{boss,campaign,codex,flow,shop-sell,tutorial,...}-test.mjs
   reach for. Dropping one of these fails a CDP script silently. */
const BRIDGE_KEYS = [
  'Engine', 'app', 'defeat', 'diceTable', 'diceTableEntries', 'intro', 'motion',
  'openCompendium', 'openRules', 'render', 'roll', 'run', 'score', 'setLevel',
  'setup', 'shop', 'showDefeat', 'showVictory', 'start', 'victory',
];

describe('platform layer', () => {
  it('installs the whole debug hook surface through the bridge', async () => {
    const source = await appSource();
    expect(source, 'app.ts must not assign window.HeavensDice directly').not.toMatch(/window\.HeavensDice\s*=/);
    const block = source.match(/installDebugBridge\(\{([\s\S]*?)\n\}\);/);
    expect(block, 'app.ts installs its debug hooks via installDebugBridge').toBeTruthy();
    const keys = [...block[1].matchAll(/^\s{2}(?:get\s+)?([A-Za-z_$][\w$]*)\s*[,(:]/gm)].map((m) => m[1]);
    expect([...new Set(keys)].sort()).toEqual(BRIDGE_KEYS);
  });

  it('owns the shipped storage keys in src/platform/storage', async () => {
    const [source, app] = [await read('../../src/platform/storage.ts'), await appSource()];
    expect(source).toContain("'heavensDice.codex.v1'");
    expect(source).toContain("'heavens-dice-sound'");
    for (const key of ['heavensDice.codex.v1', 'heavens-dice-sound', 'localStorage']) {
      expect(app, `app.ts still contains "${key}"`).not.toContain(key);
    }
    expect(app).toMatch(/from '\.\.\/platform\/storage\.ts'/);
  });

  it('keeps the synthesised audio out of the UI module', async () => {
    const [source, app] = [await read('../../src/platform/sound.ts'), await appSource()];
    expect(source).toMatch(/class SoundKit/);
    expect(source).toMatch(/export const sound = new SoundKit\(\)/);
    for (const stale of ['class SoundKit', 'AudioContext', 'createOscillator', 'createBuffer']) {
      expect(app, `app.ts still defines audio (${stale})`).not.toContain(stale);
    }
    expect(app).toMatch(/import \{ sound \} from '\.\.\/platform\/sound\.ts'/);
  });

  it('binds the codex store to app state during boot', async () => {
    const app = await appSource();
    const boot = app.match(/DOMContentLoaded', \(\) => \{([\s\S]*?)\n\}\);/);
    expect(boot, 'the DOMContentLoaded boot handler is missing').toBeTruthy();
    expect(boot[1]).toMatch(/app\.discovered = loadDiscovery\(\)/);
    expect(boot[1]).toMatch(/bindDiscovery\(app, /);
  });
});
