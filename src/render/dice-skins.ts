/*
 * Per-die skins.
 *
 * Every die in the set has its own material ramp, surface grain, accent and
 * carved motif, so two dice of the same rarity still read as different objects.
 * The skin is consumed as CSS custom properties (inline on the die element,
 * which beats the rarity defaults in main.css) plus one watermark SVG drawn
 * behind the pips on every face.
 */

/* ── carved motifs ─────────────────────────────────────────────────────────
   Each returns inner markup for a 0 0 100 100 viewBox and paints with
   currentColor, so the accent tint comes from CSS. */
const MOTIFS: Record<string, string> = {
  /* wolf */
  paw: `<g fill="currentColor"><ellipse cx="31" cy="34" rx="7.5" ry="10" transform="rotate(-24 31 34)"/><ellipse cx="45" cy="26" rx="7.5" ry="11"/><ellipse cx="61" cy="28" rx="7.5" ry="11"/><ellipse cx="74" cy="38" rx="7" ry="9.5" transform="rotate(22 74 38)"/><path d="M50 44c13 0 23 10 23 21 0 8-7 13-15 13-5 0-8-2-8-2s-3 2-8 2c-8 0-15-5-15-13 0-11 10-21 23-21z"/></g>`,
  claw: `<g fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"><path d="M22 78C34 62 44 46 50 20"/><path d="M44 82C54 62 62 44 66 22"/><path d="M66 84C74 66 80 50 82 30"/></g><g fill="currentColor" opacity=".45"><path d="M20 82c4 6 10 8 14 4-6-2-10-5-14-4z"/></g>`,
  moon: `<path fill="currentColor" d="M62 12a44 44 0 1 0 26 66A40 40 0 0 1 62 12z"/><g fill="currentColor" opacity=".7"><circle cx="26" cy="24" r="3.4"/><circle cx="18" cy="58" r="2.4"/></g>`,
  fangs: `<g fill="currentColor"><path d="M30 22c8 4 12 14 12 26 0 10-4 18-10 22-3-12-4-34-2-48z"/><path d="M70 22c-8 4-12 14-12 26 0 10 4 18 10 22 3-12 4-34 2-48z"/></g><path fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" d="M32 82h36"/>`,
  /* raven */
  feather: `<path fill="currentColor" d="M74 14c-8 16-26 34-44 42-6 3-12 4-16 2 6-2 10-6 12-12-6 4-12 6-16 4 20-10 34-24 44-42 4-8 8-12 12-14 3-1 5 1 5 4 0 6-1 12 3 16z"/><path fill="none" stroke="currentColor" stroke-width="2.6" opacity=".55" d="M74 16C58 34 38 52 18 60"/>`,
  eye: `<path fill="none" stroke="currentColor" stroke-width="5" d="M10 50C24 28 76 28 90 50 76 72 24 72 10 50z"/><circle cx="50" cy="50" r="11" fill="currentColor"/><circle cx="46" cy="46" r="3.4" fill="#fff" opacity=".55"/>`,
  skull: `<path fill="currentColor" d="M50 12c22 0 34 15 34 33 0 10-5 15-11 17 1 6 2 9 4 12 1 2-1 3-4 3-8 0-13-4-15-9h-16c-2 5-7 9-15 9-3 0-5-1-4-3 2-3 3-6 4-12-6-2-11-7-11-17 0-18 12-33 34-33z"/><g fill="#000" opacity=".55"><circle cx="38" cy="44" r="8"/><circle cx="62" cy="44" r="8"/><path d="M47 58h6l-3 7z"/></g>`,
  trieye: `<g fill="none" stroke="currentColor" stroke-width="4"><path d="M14 40C24 26 44 26 54 40 44 54 24 54 14 40z"/><path d="M46 40C56 26 76 26 86 40 76 54 56 54 46 40z"/><path d="M28 68C38 56 62 56 72 68 62 80 38 80 28 68z"/></g><g fill="currentColor"><circle cx="34" cy="40" r="5"/><circle cx="66" cy="40" r="5"/><circle cx="50" cy="68" r="5"/></g>`,
  /* serpent */
  scales: `<g fill="none" stroke="currentColor" stroke-width="3.4"><path d="M18 34a16 16 0 0 0 32 0a16 16 0 0 0 32 0"/><path d="M18 50a16 16 0 0 0 32 0a16 16 0 0 0 32 0"/><path d="M18 66a16 16 0 0 0 32 0a16 16 0 0 0 32 0"/></g>`,
  fang: `<path fill="currentColor" d="M50 14c9 6 14 18 14 34 0 16-5 30-12 38-2-14-4-30-4-44 0-10-1-20 2-28z"/><path fill="none" stroke="currentColor" stroke-width="3" opacity=".6" d="M38 16c4 10 6 24 6 40"/>`,
  hydra: `<g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><path d="M50 92V60"/><path d="M50 60C40 50 30 44 22 30"/><path d="M50 60c10-10 20-16 28-30"/></g><g fill="currentColor"><path d="M22 30l-8-10 16-2z"/><path d="M78 30l8-10-16-2z"/><path d="M50 60l-9-11 18 0z"/></g>`,
  ouroboros: `<path fill="none" stroke="currentColor" stroke-width="6" d="M50 14a36 36 0 1 1-32 20"/><path fill="currentColor" d="M14 40c8-6 16-6 22 0-6 6-14 6-22 0z"/><g fill="currentColor"><path d="M50 36l3.4 7 7.6 1-5.5 5.3 1.3 7.6-6.8-3.6-6.8 3.6 1.3-7.6L39 44.5l7.6-1z"/></g>`,
  /* crown */
  crown: `<path fill="currentColor" d="M14 74h72l-6-14-16 10-14-22-14 22-16-10z"/><g fill="currentColor"><circle cx="50" cy="30" r="4.6"/><circle cx="22" cy="46" r="3.4"/><circle cx="78" cy="46" r="3.4"/></g><path fill="none" stroke="currentColor" stroke-width="4" d="M16 84h68"/>`,
  coin: `<g fill="none" stroke="currentColor" stroke-width="5"><circle cx="50" cy="42" r="24"/><path d="M38 34h24M38 50h24M50 26v32"/></g><path fill="none" stroke="currentColor" stroke-width="5" d="M20 78h60"/>`,
  seal: `<path fill="none" stroke="currentColor" stroke-width="5" d="M32 20h36l12 12v36l-12 12H32L20 68V32z"/><path fill="currentColor" d="M50 34l4 9 10 1-7.5 6.6 2.2 9.8L50 55.6 41.3 60.4l2.2-9.8L36 44l10-1z"/>`,
  brokencrown: `<path fill="currentColor" d="M14 74h72l-6-14-13 8-9-16-11 18-13-8z"/><path fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="6 5" d="M50 34v-6"/><path fill="none" stroke="currentColor" stroke-width="4" d="M16 84h68"/>`,
  /* astral */
  constellation: `<g fill="currentColor"><circle cx="22" cy="30" r="4"/><circle cx="50" cy="20" r="3"/><circle cx="74" cy="38" r="4"/><circle cx="36" cy="58" r="3.4"/><circle cx="66" cy="70" r="4"/><circle cx="26" cy="80" r="3"/></g><g fill="none" stroke="currentColor" stroke-width="2.2" opacity=".7"><path d="M22 30L50 20 74 38 66 70M22 30 36 58 26 80M36 58l30 12"/></g>`,
  comet: `<circle cx="66" cy="34" r="12" fill="currentColor"/><path fill="currentColor" opacity=".55" d="M66 22C52 26 38 40 26 60c-4 7-6 13-6 18 12-6 24-18 34-32 6-9 10-18 12-24z"/><g fill="currentColor" opacity=".6"><circle cx="20" cy="26" r="2.6"/><circle cx="34" cy="14" r="2"/></g>`,
  star: `<path fill="currentColor" d="M50 10l11 23 25 3-18 17 4.5 25L50 65.5 27.5 78 32 53 14 36l25-3z"/><circle cx="50" cy="44" r="6" fill="#fff" opacity=".5"/>`,
  fateeye: `<path fill="none" stroke="currentColor" stroke-width="4.5" d="M12 50C26 30 74 30 88 50 74 70 26 70 12 50z"/><circle cx="50" cy="50" r="10" fill="currentColor"/><g fill="none" stroke="currentColor" stroke-width="2.6" opacity=".75"><path d="M50 14v10M50 76v10M14 50h10M76 50h10M24 24l7 7M69 69l7 7M76 24l-7 7M31 69l-7 7"/></g>`,
  /* standard */
  cracks: `<g fill="none" stroke="currentColor" stroke-width="2.4" opacity=".8"><path d="M24 18l10 14-8 10 12 12-6 16"/><path d="M74 22l-12 12 8 12-14 8 4 18"/><path d="M40 84l8-12"/></g>`,
};

const ramp = (...stops: string[]) => `linear-gradient(150deg, ${stops.join(', ')})`;

/* Grain overlays: each family gets its own surface so the dice don't share
   one plastic sheen. */
export type GrainId = 'bone' | 'hair' | 'scale' | 'metal' | 'night' | 'ember';

const grain: Record<GrainId, (tint?: string) => string> = {
  bone: (tint = '90,60,26') => `repeating-linear-gradient(96deg, rgba(255,255,255,.03) 0 1px, rgba(${tint},.05) 1px 3px, rgba(255,255,255,0) 3px 11px)`,
  hair: (tint) => `repeating-linear-gradient(74deg, rgba(255,255,255,.05) 0 1px, rgba(${tint},.09) 1px 2px, rgba(255,255,255,0) 2px 5px)`,
  scale: (tint) => `repeating-linear-gradient(48deg, rgba(255,255,255,.035) 0 3px, rgba(${tint},.07) 3px 6px, rgba(255,255,255,0) 6px 12px), repeating-linear-gradient(-48deg, rgba(255,255,255,.03) 0 3px, rgba(${tint},.06) 3px 6px, rgba(255,255,255,0) 6px 12px)`,
  metal: (tint) => `conic-gradient(from 198deg at 30% 16%, rgba(255,246,214,.14), rgba(255,238,190,.04) 15%, rgba(255,255,255,0) 34%, rgba(255,255,255,0) 66%, rgba(238,206,138,.06) 80%, rgba(255,244,206,.12) 100%), repeating-linear-gradient(44deg, rgba(255,255,255,.03) 0 1px, rgba(${tint},.05) 1px 2px, rgba(255,255,255,0) 2px 8px)`,
  night: (tint) => `radial-gradient(circle at 76% 20%, rgba(206,224,255,.12), rgba(206,224,255,0) 52%), repeating-linear-gradient(112deg, rgba(255,255,255,.02) 0 1px, rgba(${tint},.05) 1px 4px, rgba(255,255,255,0) 4px 12px)`,
  ember: (tint) => `radial-gradient(ellipse at 50% 112%, rgba(255,116,52,.24), rgba(255,60,20,0) 56%), repeating-linear-gradient(64deg, rgba(255,170,120,.04) 0 1px, rgba(${tint},.08) 1px 3px, rgba(0,0,0,0) 3px 9px)`,
};

export interface DieSkin {
  face: string; pip: string; pipRim: string; edge: string;
  accent: string; motif: string; material: string; glow: string;
}

const S = (face: string, pip: string, pipRim: string, edge: string, accent: string, motif: string,
  material: string, glow: string): DieSkin => ({
  face, pip, pipRim, edge, accent, motif, material, glow,
});

export const DIE_SKINS: Record<string, DieSkin> = {
  standard: S(ramp('#e6d5ae', '#d2ba8c 48%', '#b3945f 76%', '#8a6b3f'), '#191209', '#6d5636',
    'rgba(238,222,184,.55)', 'rgba(224,193,121,.5)', 'cracks', grain.bone(), 'rgba(224,193,121,.4)'),

  /* ── wolf: aged bone, warm browns ─────────────────────────────────── */
  wolf_whelp: S(ramp('#f0e2c2', '#dcc59a 46%', '#b9995f 78%', '#8d6c3c'), '#241708', '#7a5f38',
    'rgba(244,228,192,.6)', 'rgba(226,180,118,.55)', 'paw', grain.bone('104,68,28'), 'rgba(226,180,118,.45)'),
  wolf_hunter: S(ramp('#dfe0d2', '#c0bfa4 44%', '#8d8f70 76%', '#5c6047'), '#171a10', '#7c8062',
    'rgba(232,238,214,.5)', 'rgba(196,206,150,.55)', 'claw', grain.hair('60,66,40'), 'rgba(196,206,150,.45)'),
  wolf_bloodmoon: S(ramp('#e8cdb4', '#cf9f83 42%', '#a3675a 74%', '#6b3b33'), '#210d09', '#8a5145',
    'rgba(246,214,194,.55)', 'rgba(232,142,112,.58)', 'moon', grain.bone('92,40,32'), 'rgba(232,142,112,.5)'),
  wolf_alpha: S(ramp('#eef1f2', '#cfd6d6 40%', '#9aa6a6 74%', '#65706f'), '#14191a', '#78838a',
    'rgba(240,248,250,.6)', 'rgba(202,224,232,.6)', 'fangs', grain.hair('60,74,80'), 'rgba(202,224,232,.5)'),

  /* ── raven: charcoal & iridescent blue-black ──────────────────────── */
  raven_feather: S(ramp('#cdd4dc', '#a7b1bd 44%', '#737f8d 76%', '#454f5c'), '#101419', '#6a7684',
    'rgba(226,234,244,.5)', 'rgba(178,204,232,.55)', 'feather', grain.hair('44,54,68'), 'rgba(178,204,232,.45)'),
  raven_nighteye: S(ramp('#d3dcea', '#a3b3ca 42%', '#6d7f9c 74%', '#3f4d66'), '#0d1220', '#63769a',
    'rgba(230,238,250,.55)', 'rgba(158,192,240,.62)', 'eye', grain.night('44,58,88'), 'rgba(158,192,240,.52)'),
  raven_death: S(ramp('#ded7c8', '#b6ab97 42%', '#7c7462 74%', '#4a4438'), '#141210', '#7b7261',
    'rgba(240,236,222,.5)', 'rgba(214,204,180,.55)', 'skull', grain.bone('70,62,48'), 'rgba(214,204,180,.45)'),
  raven_thousand: S(ramp('#c9c6e2', '#9d99c4 42%', '#6a6697 74%', '#3c3a5e'), '#100f1a', '#635f96',
    'rgba(232,230,252,.55)', 'rgba(184,178,246,.6)', 'trieye', grain.night('48,44,84'), 'rgba(184,178,246,.5)'),

  /* ── serpent: jade, venom, dark teal ──────────────────────────────── */
  serpent_scale: S(ramp('#dbe6d2', '#b3c7a6 44%', '#7f9770 76%', '#4d6150'), '#141a10', '#6d8270',
    'rgba(234,244,224,.5)', 'rgba(178,214,150,.55)', 'scales', grain.scale('56,80,52'), 'rgba(178,214,150,.45)'),
  serpent_fang: S(ramp('#e6e4c4', '#c8c795 42%', '#939a56 74%', '#5d6730'), '#181a08', '#828a4a',
    'rgba(246,248,214,.55)', 'rgba(206,224,110,.58)', 'fang', grain.scale('76,84,36'), 'rgba(206,224,110,.48)'),
  serpent_hydra: S(ramp('#cfe4e2', '#a0c4c4 42%', '#6b8f92 74%', '#3c575c'), '#0f1a1a', '#5e8686',
    'rgba(228,246,246,.5)', 'rgba(140,214,214,.58)', 'hydra', grain.scale('40,72,76'), 'rgba(140,214,214,.48)'),
  serpent_devourer: S(ramp('#cfc7b0', '#9e9582 38%', '#625c50 68%', '#332f28'), '#170f06', '#6f6552',
    'rgba(240,232,208,.55)', 'rgba(238,200,120,.62)', 'ouroboros', grain.metal('96,80,40'), 'rgba(238,200,120,.5)'),

  /* ── crown: brass, copper, gilt ───────────────────────────────────── */
  crown_court: S(ramp('#e8dcbe', '#cdb385 44%', '#9d8350 76%', '#6b5730'), '#1d1608', '#7e6a3e',
    'rgba(246,238,214,.55)', 'rgba(224,192,120,.6)', 'crown', grain.metal('104,84,32'), 'rgba(224,192,120,.5)'),
  crown_taxman: S(ramp('#e3d2bd', '#c19f78 40%', '#8f6a44 72%', '#5c4128'), '#1a1008', '#7a5a38',
    'rgba(244,230,204,.55)', 'rgba(214,166,104,.6)', 'coin', grain.metal('96,64,28'), 'rgba(214,166,104,.5)'),
  crown_seal: S(ramp('#f0e2b0', '#dfc172 36%', '#b5903c 62%', '#8a6a22 82%', '#543d10'), '#1e1404', '#9c7c34',
    'rgba(252,242,206,.7)', 'rgba(246,214,130,.7)', 'seal', grain.metal('108,80,20'), 'rgba(246,214,130,.55)'),
  demon_queen: S(ramp('#8d3a38', '#5e2124 42%', '#3a1216 72%', '#1e080a'), '#f0c0a8', '#a34a44',
    'rgba(238,150,132,.62)', 'rgba(255,168,142,.72)', 'brokencrown', grain.ember('64,16,16'), 'rgba(255,120,80,.55)'),

  /* ── astral: night sky, comet ice, starcore, fate ─────────────────── */
  astral_dust: S(ramp('#cdcfe6', '#a3a6c8 42%', '#7276a0 74%', '#44476e'), '#111226', '#5f6396',
    'rgba(232,234,252,.55)', 'rgba(186,190,246,.6)', 'constellation', grain.night('48,52,92'), 'rgba(186,190,246,.5)'),
  astral_comet: S(ramp('#d6e4ea', '#a8c4d2 40%', '#6e8fa4 72%', '#3f5a6c'), '#101a20', '#5e8092',
    'rgba(234,246,252,.55)', 'rgba(158,222,246,.62)', 'comet', grain.night('40,64,84'), 'rgba(158,222,246,.52)'),
  astral_core: S(ramp('#efe4c4', '#d9c088 38%', '#b1934a 66%', '#7a6224 86%', '#4a3a10'), '#1a1206', '#99803f',
    'rgba(252,244,214,.65)', 'rgba(250,222,150,.68)', 'star', grain.metal('104,84,36'), 'rgba(250,222,150,.55)'),
  astral_eye: S(ramp('#ded0ee', '#b8a4d8 40%', '#8570b4 72%', '#54406e'), '#150e24', '#6f5a9a',
    'rgba(244,232,252,.6)', 'rgba(214,178,250,.68)', 'fateeye', grain.night('60,44,96'), 'rgba(214,178,250,.55)'),

  /* ── wolf legend: the ancestor keeps the pack's bone-and-ivory palette ── */
  wolf_ancestor: S(ramp('#f7f0dd', '#e3d3b0 40%', '#bda173 72%', '#8a6f45'), '#1d1408', '#7d6438',
    'rgba(252,246,226,.7)', 'rgba(246,214,148,.7)', 'paw', grain.bone('110,84,40'), 'rgba(246,214,148,.55)'),

  /* ── demon: soot, chalk gold, then crimson ────────────────────────── */
  demon_imp: S(ramp('#8a5a4e', '#5a2f2a 44%', '#341a19 74%', '#1a0c0c'), '#f4c8b4', '#a85f4c',
    'rgba(240,178,150,.55)', 'rgba(255,140,104,.65)', 'claw', grain.ember('54,20,14'), 'rgba(255,132,96,.5)'),
  demon_taxman: S(ramp('#d9c9ae', '#b39674 42%', '#846849 74%', '#553f2a'), '#1c1208', '#7b5c36',
    'rgba(246,234,212,.55)', 'rgba(216,172,110,.58)', 'coin', grain.metal('92,64,30'), 'rgba(216,172,110,.48)'),
  demon_seal: S(ramp('#ecdcae', '#d8bc74 38%', '#ad8c40 66%', '#7d6122'), '#1d1404', '#96793a',
    'rgba(252,244,208,.65)', 'rgba(244,208,124,.68)', 'seal', grain.metal('104,78,24'), 'rgba(244,208,124,.55)'),
  demon_devourer: S(ramp('#5f5a52', '#38332c 44%', '#201c18 74%', '#0f0c0a'), '#f0e0c2', '#8a7a60',
    'rgba(240,224,196,.55)', 'rgba(255,196,120,.62)', 'ouroboros', grain.metal('44,38,28'), 'rgba(255,176,96,.52)'),

  /* ── free agents: each one gets its own material so the silhouette reads ── */
  odd_eye: S(ramp('#cdd6cc', '#a2aea2 44%', '#728076 74%', '#454f49'), '#101812', '#65786a',
    'rgba(232,244,232,.55)', 'rgba(176,222,190,.6)', 'trieye', grain.bone('52,72,58'), 'rgba(176,222,190,.5)'),
  even_twin: S(ramp('#e9edf0', '#c6ced6 40%', '#93a0ac 72%', '#5e6a76'), '#141a20', '#6f7d8a',
    'rgba(244,250,254,.6)', 'rgba(190,214,236,.6)', 'eye', grain.metal('70,84,98'), 'rgba(190,214,236,.5)'),
  polar: S(ramp('#f2f0e8', '#2a2723 50%', '#1a1815 72%', '#0c0b09'), '#f4efe2', '#8c857a',
    'rgba(250,246,236,.7)', 'rgba(246,238,214,.6)', 'moon', grain.bone('60,58,52'), 'rgba(246,238,214,.5)'),
  ladder: S(ramp('#eadfc6', '#d3c2a0 44%', '#a8946f 74%', '#7b6845'), '#1e1608', '#7e6a44',
    'rgba(248,240,220,.55)', 'rgba(226,200,140,.55)', 'cracks', grain.bone('96,78,40'), 'rgba(226,200,140,.42)'),
  mirror: S(ramp('#e2e6ea', '#b9c2ca 40%', '#87929c 72%', '#525b64'), '#12171c', '#6c7883',
    'rgba(246,250,254,.65)', 'rgba(196,220,238,.65)', 'fateeye', grain.metal('66,78,88'), 'rgba(196,220,238,.52)'),
  five_fold: S(ramp('#f2e6c2', '#dcc384 38%', '#b09444 66%', '#7f6720'), '#1d1406', '#9a7d34',
    'rgba(252,246,216,.65)', 'rgba(248,214,132,.68)', 'star', grain.metal('106,82,30'), 'rgba(248,214,132,.55)'),
  hex: S(ramp('#cfe2d6', '#a2c2ae 42%', '#6f9682 72%', '#456253'), '#0f1a14', '#5f8874',
    'rgba(232,248,238,.55)', 'rgba(170,224,196,.62)', 'constellation', grain.scale('44,74,58'), 'rgba(170,224,196,.5)'),
  echo: S(ramp('#e6dff0', '#c2b6d8 42%', '#9484b4 72%', '#615479'), '#150e22', '#7b6a98',
    'rgba(246,238,254,.6)', 'rgba(208,182,250,.66)', 'comet', grain.night('58,44,88'), 'rgba(208,182,250,.54)'),
  chain_note: S(ramp('#efe4c8', '#d3bd91 42%', '#a48658 72%', '#695334'), '#211608', '#8a6d42',
    'rgba(255,245,218,.6)', 'rgba(238,202,126,.66)', 'scales', grain.bone('84,64,34'), 'rgba(238,202,126,.5)'),
  scavenger: S(ramp('#e9dcc1', '#cdb68c 42%', '#a08458 72%', '#6d5636'), '#1e1608', '#806944',
    'rgba(248,238,214,.58)', 'rgba(216,184,126,.58)', 'coin', grain.bone('86,66,38'), 'rgba(216,184,126,.48)'),
  aftershock: S(ramp('#e4daf0', '#bdaed8 42%', '#8d7aae 72%', '#5c4c77'), '#140f20', '#756496',
    'rgba(246,238,254,.6)', 'rgba(206,180,246,.66)', 'comet', grain.night('54,42,84'), 'rgba(206,180,246,.54)'),
  bystander: S(ramp('#e7e0d2', '#c9bfa9 42%', '#998c74 72%', '#675c4b'), '#17130d', '#7d705c',
    'rgba(248,242,226,.58)', 'rgba(206,190,156,.58)', 'eye', grain.bone('82,72,56'), 'rgba(206,190,156,.48)'),
  ace: S(ramp('#6a5a52', '#3d2f2b 44%', '#241a18 72%', '#120c0b'), '#f6d8c8', '#9c6d5c',
    'rgba(250,216,196,.62)', 'rgba(255,142,112,.7)', 'skull', grain.ember('56,22,16'), 'rgba(255,132,96,.55)'),
  jack: S(ramp('#f4e8c6', '#e0c98c 36%', '#b89a4c 64%', '#886d26'), '#1c1404', '#9d8038',
    'rgba(254,248,220,.7)', 'rgba(252,220,140,.72)', 'crown', grain.metal('110,86,32'), 'rgba(252,220,140,.58)'),

  /* ── 扩充骰：计分触发、顺序互动与商店成长 ─────────────────────────── */
  balance: S(ramp('#e4e2da', '#c8c4b6 42%', '#9c9788 72%', '#6a665b'), '#17150f', '#7d7869',
    'rgba(244,242,230,.58)', 'rgba(210,202,178,.55)', 'coin', grain.metal('82,78,64'), 'rgba(210,202,178,.45)'),
  cliff: S(ramp('#d8c6b0', '#ab8c6f 42%', '#745741 72%', '#3f2d21'), '#1b0f08', '#8a6a4f',
    'rgba(244,222,198,.55)', 'rgba(226,160,104,.62)', 'moon', grain.bone('86,52,30'), 'rgba(226,160,104,.5)'),
  refrain: S(ramp('#dcd6ec', '#b3a8cf 42%', '#8375a8 72%', '#524774'), '#140f21', '#74669a',
    'rgba(242,236,254,.58)', 'rgba(198,176,246,.62)', 'comet', grain.night('58,44,92'), 'rgba(198,176,246,.52)'),
  shifting: S(ramp('#cfe0e4', '#a4c2c8 42%', '#71949c 72%', '#45636b'), '#0f1a1d', '#628892',
    'rgba(232,248,252,.58)', 'rgba(158,224,232,.62)', 'fateeye', grain.night('40,68,76'), 'rgba(158,224,232,.5)'),
  merchant: S(ramp('#f0dfb4', '#dcc080 38%', '#ad8c46 66%', '#7a5d20'), '#1c1304', '#9a7a34',
    'rgba(252,244,214,.68)', 'rgba(246,212,132,.7)', 'coin', grain.metal('108,82,26'), 'rgba(246,212,132,.58)'),
  gilded_trace: S(ramp('#f6e8b2', '#e4c86e 36%', '#b89532 66%', '#7d6114'), '#1d1402', '#a2832c',
    'rgba(255,250,224,.72)', 'rgba(255,222,120,.74)', 'seal', grain.metal('116,90,20'), 'rgba(255,222,120,.6)'),
  last_road: S(ramp('#d8d0c2', '#aaa08e 42%', '#746b5b 72%', '#423c32'), '#15120c', '#7c7262',
    'rgba(244,238,224,.55)', 'rgba(206,186,152,.55)', 'cracks', grain.bone('72,64,50'), 'rgba(206,186,152,.42)'),
  shadow: S(ramp('#b9b3c4', '#87808f 42%', '#585260 72%', '#2e2a35'), '#0d0b10', '#625b6b',
    'rgba(230,226,238,.52)', 'rgba(168,158,188,.58)', 'eye', grain.night('48,44,58'), 'rgba(168,158,188,.45)'),
  neighbor: S(ramp('#cfe4d2', '#a2c4a8 42%', '#6f9478 72%', '#456251'), '#0f1a12', '#5f8870',
    'rgba(232,248,236,.55)', 'rgba(166,222,182,.6)', 'scales', grain.scale('44,74,56'), 'rgba(166,222,182,.48)'),
  bias_one: S(ramp('#e8d8b0', '#c9b484 42%', '#977f4e 72%', '#65532d'), '#1a1206', '#7e683c',
    'rgba(246,234,206,.58)', 'rgba(226,190,116,.58)', 'star', grain.bone('98,76,36'), 'rgba(226,190,116,.46)'),
  bias_two: S(ramp('#d8e0c8', '#b2bf9c 42%', '#7e8c64 72%', '#505a3c'), '#121608', '#6d7a52',
    'rgba(240,248,226,.55)', 'rgba(190,214,146,.58)', 'moon', grain.bone('78,90,48'), 'rgba(190,214,146,.46)'),
  bias_three: S(ramp('#e0d2c4', '#bda68f 42%', '#8a7058 72%', '#5a4432'), '#180f08', '#806448',
    'rgba(248,236,222,.58)', 'rgba(214,166,116,.6)', 'claw', grain.bone('96,68,44'), 'rgba(214,166,116,.48)'),
  bias_four: S(ramp('#cfd8e4', '#a4b4c6 42%', '#70849a 72%', '#45566a'), '#0f141c', '#647a90',
    'rgba(234,242,252,.58)', 'rgba(166,194,226,.6)', 'coin', grain.metal('58,72,88'), 'rgba(166,194,226,.48)'),
  bias_five: S(ramp('#e8dcc8', '#cbb998 42%', '#9a8462 72%', '#69563c'), '#181106', '#826c4c',
    'rgba(250,242,228,.58)', 'rgba(230,196,140,.6)', 'seal', grain.bone('98,78,48'), 'rgba(230,196,140,.48)'),
  bias_six: S(ramp('#e4d6c0', '#c2a98c 42%', '#8d7256 72%', '#5b4632'), '#170f08', '#7e6448',
    'rgba(248,238,222,.58)', 'rgba(222,180,126,.6)', 'crown', grain.metal('96,68,40'), 'rgba(222,180,126,.48)'),
};

// 每颗骰子都能在这里找到皮肤；漏配时退回标准骰，而不是让 UI 报错。
const FALLBACK = DIE_SKINS.standard!;

export interface DieSkinSubject {
  id?: string;
  probs?: number[];
  /** 离线贴图画布可以显式指定加权面，运行时骰子靠 probs 推导。 */
  favored?: number[];
}

export function dieSkin(spec?: DieSkinSubject | null): DieSkin {
  return DIE_SKINS[spec?.id ?? 'standard'] || FALLBACK;
}

/* Inline custom properties. Inline styles outrank the rarity defaults in
   main.css, so a die keeps its own face while the tier frame/glow still works. */
export function dieSkinStyle(spec?: DieSkinSubject | null): string {
  const skin = dieSkin(spec);
  return `--die-face-bg:${skin.face};--die-pip:${skin.pip};--die-pip-rim:${skin.pipRim};`
    + `--die-edge:${skin.edge};--die-material:${skin.material};`
    + `--die-glyph-color:${skin.accent};--die-peak-glyph:${skin.accent};`
    + `--die-peak-glow:${skin.glow};--die-accent:${skin.accent}`;
}

/* Watermark drawn behind the pips on every face; brighter on weighted faces. */
export function dieMotifSvg(spec?: DieSkinSubject | null): string {
  const skin = dieSkin(spec);
  const body = MOTIFS[skin.motif] ?? MOTIFS.cracks ?? '';
  return `<svg class="die-motif" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${body}</svg>`;
}

/* Raw motif markup, for the WebGL path which paints it into a canvas texture
   instead of letting the browser lay out an SVG. Accepts a die spec or a
   bare motif key. */
export function dieMotifBody(spec?: DieSkinSubject | string | null): string {
  const key = typeof spec === 'string' ? spec : dieSkin(spec).motif;
  return MOTIFS[key] ?? MOTIFS.cracks ?? '';
}

/* Surface family per die. CSS derives grain from the `material` layer, but
   the WebGL renderer needs a named family to pick procedural noise, roughness
   and metalness. */
export const DIE_FAMILY: Record<string, GrainId> = {
  standard: 'bone',
  wolf_whelp: 'bone', wolf_hunter: 'hair', wolf_bloodmoon: 'bone', wolf_alpha: 'hair',
  wolf_ancestor: 'bone',
  demon_imp: 'ember', demon_taxman: 'metal', demon_seal: 'metal',
  demon_queen: 'ember', demon_devourer: 'metal',
  odd_eye: 'bone', even_twin: 'metal', polar: 'bone', ladder: 'bone',
  mirror: 'metal', five_fold: 'metal', hex: 'scale', echo: 'night', chain_note: 'bone',
  ace: 'ember', jack: 'metal',
  balance: 'metal', cliff: 'bone', refrain: 'night', shifting: 'night',
  merchant: 'metal', gilded_trace: 'metal', last_road: 'bone', shadow: 'night',
  scavenger: 'bone', aftershock: 'night', bystander: 'bone',
  neighbor: 'scale', bias_one: 'bone', bias_two: 'bone', bias_three: 'bone',
  bias_four: 'metal', bias_five: 'bone', bias_six: 'metal',
};

export function dieFamily(spec?: DieSkinSubject | null): GrainId {
  return DIE_FAMILY[spec?.id ?? 'standard'] || 'bone';
}

/* Faces whose odds are pushed get their motif burned brighter.
   Single source of truth: the texture baker and the WebGL runtime both ask
   this, so a face can never look weighted on screen and plain in the atlas. */
export function favoredFaces(spec?: DieSkinSubject | null): number[] {
  if (Array.isArray(spec?.favored)) return spec.favored;
  const probs = spec?.probs || [];
  if (!probs.length || spec?.id === 'standard') return [];
  return probs.map((weight, index) => (weight >= 0.2 ? index + 1 : 0)).filter(Boolean);
}

export function peakFace(spec?: DieSkinSubject | null): number {
  const probs = spec?.probs || [];
  if (!probs.length || spec?.id === 'standard') return 0;
  return probs.indexOf(Math.max(...probs)) + 1;
}

export type FaceEmphasis = 'peak' | 'favored' | 'none';

export function faceEmphasis(spec: DieSkinSubject | null | undefined, value: number): FaceEmphasis {
  if (peakFace(spec) === value) return 'peak';
  return favoredFaces(spec).includes(value) ? 'favored' : 'none';
}

export const MOTIF_KEYS = Object.keys(MOTIFS);
