// render/dice-skins.ts 是 src/legacy/dice-skins.js 的搬运：值一个都不该变，只加类型。
// 这个门禁绝“顺手改美术”——皮肤表一旦漂移，WebGL 贴图和 DOM 内联样式会同时变样。
import { describe, it, expect } from 'vitest';
import * as Legacy from '../../src/legacy/dice-skins.js';
import * as Skins from '../../src/render/dice-skins.ts';

const DICE_IDS = [
  'standard',
  'wolf_whelp', 'wolf_hunter', 'wolf_bloodmoon', 'wolf_alpha', 'wolf_ancestor',
  'demon_imp', 'demon_taxman', 'demon_queen', 'demon_devourer',
  'odd_eye', 'even_twin', 'polar', 'ladder', 'mirror', 'five_fold', 'hex', 'echo',
  'ace', 'jack',
];

const SPECS = [
  ...DICE_IDS.map((id) => ({ id, probs: undefined, favored: undefined })),
  { id: 'wolf_hunter', probs: [0.2, 0.14, 0.2, 0.12, 0.19, 0.15] },
  { id: 'hex', favored: [3, 4, 5, 6] },
  { id: 'standard', probs: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6] },
];

describe('dice-skins port', () => {
  it('keeps the motif key list identical', () => {
    expect(Skins.MOTIF_KEYS).toEqual(Legacy.MOTIF_KEYS);
  });

  it('keeps every skin entry byte-identical', () => {
    for (const key of Legacy.MOTIF_KEYS) {
      expect(Skins.dieMotifBody(key), key).toBe(Legacy.dieMotifBody(key));
    }
    for (const id of DICE_IDS) {
      expect(Skins.DIE_SKINS[id], id).toEqual(Legacy.DIE_SKINS[id]);
      expect(Skins.DIE_FAMILY[id], id).toBe(Legacy.DIE_FAMILY[id]);
    }
  });

  it('produces the same inline custom properties', () => {
    for (const spec of SPECS) {
      expect(Skins.dieSkinStyle(spec)).toBe(Legacy.dieSkinStyle(spec));
      expect(Skins.dieMotifSvg(spec)).toBe(Legacy.dieMotifSvg(spec));
    }
  });

  it('produces the same weighting emphasis', () => {
    for (const spec of SPECS) {
      expect(Skins.favoredFaces(spec)).toEqual(Legacy.favoredFaces(spec));
      for (let face = 1; face <= 6; face += 1) {
        expect(Skins.faceEmphasis(spec, face)).toBe(Legacy.faceEmphasis(spec, face));
      }
    }
    expect(Skins.peakFace(SPECS[1])).toBe(Legacy.peakFace(SPECS[1]));
  });

  it('still falls back to the standard die for unknown ids', () => {
    expect(Skins.dieSkin({ id: 'not_a_die' })).toEqual(Skins.dieSkin({ id: 'standard' }));
    expect(Skins.dieFamily({ id: 'not_a_die' })).toBe('bone');
  });
});
