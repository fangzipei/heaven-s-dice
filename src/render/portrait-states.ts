// Resolve the four reserved portrait poses. Image files arrive separately;
// callers should fall back to portraitArt(art) when a state file is missing.
export const PORTRAIT_STATES = ['idle', 'attack', 'hit', 'critical'] as const;
export type PortraitState = (typeof PORTRAIT_STATES)[number];

export const PORTRAIT_STATE_LABELS: Record<PortraitState, string> = {
  idle: '常态',
  attack: '攻击',
  hit: '受击',
  critical: '残血',
};

export function portraitStateArt(art: string, state: PortraitState): string {
  return `assets/portraits/paper/states/${art}/${state}.png`;
}

export function portraitStateThumb(art: string, state: PortraitState): string {
  return `assets/portraits/paper/states/${art}/thumb-${state}.png`;
}
