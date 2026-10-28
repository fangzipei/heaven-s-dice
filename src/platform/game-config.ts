// platform/game-config.ts — fetch live difficulty once at the start of a run.
import { setDifficultyConfig } from '../content/index.ts';
import { API_ENABLED, fetchGameConfig } from './api.ts';

export async function loadGameConfig(): Promise<void> {
  if (!API_ENABLED) {
    setDifficultyConfig({ multiplier: 1, targets: {} });
    return;
  }
  try {
    const config = await fetchGameConfig();
    setDifficultyConfig({
      multiplier: config.difficultyMultiplier,
      targets: config.levelTargets,
    });
  } catch {
    // Offline / pre-migration deployments keep the baked-in curve.
    setDifficultyConfig({ multiplier: 1, targets: {} });
  }
}
