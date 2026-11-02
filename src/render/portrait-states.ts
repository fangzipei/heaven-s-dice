// Resolve the four reserved portrait poses. Image files arrive separately;
// callers should fall back to portraitArt(art) when a state file is missing.
//
// State sets are keyed by the character id (slug) rather than the art id,
// because several distinct characters share one art id (boss-rat is used by
// both the Rotfang Count and the Twin Six Gambler) and must not overwrite
// each other's portraits.
export const PORTRAIT_STATES = ['idle', 'attack', 'hit', 'critical'] as const;
export type PortraitState = (typeof PORTRAIT_STATES)[number];

export const PORTRAIT_STATE_LABELS: Record<PortraitState, string> = {
  idle: '常态',
  attack: '攻击',
  hit: '受击',
  critical: '残血',
};

export function portraitStateArt(id: string, state: PortraitState): string {
  return `assets/portraits/paper/states/${id}/${state}.png`;
}

export function portraitStateThumb(id: string, state: PortraitState): string {
  return `assets/portraits/paper/states/${id}/thumb-${state}.png`;
}
