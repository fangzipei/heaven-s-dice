/* 物品详情除了固定文案，还要写出这一关的触发状态（停审令牌）。 */
import { beforeEach, describe, expect, test } from 'vitest';

import { createRun } from '../../src/core/engine.ts';
import { itemTooltip } from '../../src/ui/components/tooltip.ts';
import { app } from '../../src/ui/state.ts';

beforeEach(() => {
  app.run = createRun({ rng: () => 0.5 });
});

describe('停审令牌的物品详情', () => {
  test('本关没触发时写明尚未触发', () => {
    const html = itemTooltip('judge_relic');
    expect(html).toContain('本关尚未触发');
    expect(html).not.toContain('is-used');
  });

  test('触发之后写成已触发', () => {
    app.run.flags.judgeRelicUsed = true;
    const html = itemTooltip('judge_relic');
    expect(html).toContain('本关已触发');
    expect(html).toContain('tip-state is-used');
  });

  test('没有对局时按未触发处理', () => {
    app.run = null;
    expect(itemTooltip('judge_relic')).toContain('本关尚未触发');
  });

  test('普通物品不带这一行', () => {
    expect(itemTooltip('triple_charm')).not.toContain('tip-state');
  });
});
