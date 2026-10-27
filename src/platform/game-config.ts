// platform/game-config.ts — fetch live difficulty once at the start of a run.
import { setDifficultyConfig } from '../content/index.ts';
import { fetchGameConfig } from './api.ts';

export async function loadGameConfig(): Promise<void> {
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
