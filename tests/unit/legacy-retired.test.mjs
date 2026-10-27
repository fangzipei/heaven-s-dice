/* tests/unit/legacy-retired.test.mjs — 3c-3 的收尾门禁。
 *
 * src/legacy/app.js 曾经是唯一的入口；拆完之后它必须真的消失，而 index.html
 * 必须指向 ui/app.ts。其它屏的 parity 测试通过 tests/helpers/legacy-app.mjs
 * 读取它：文件不在时返回空串，所以「不再自己声明」那类断言会继续成立。 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const root = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

describe('legacy 入口已退休', () => {
  test('src/legacy 整个目录与本机静态服务器都不存在了', () => {
    expect(existsSync(new URL('src/legacy', root))).toBe(false);
    expect(existsSync(new URL('src/compat', root))).toBe(false);
    expect(existsSync(new URL('server.js', root))).toBe(false);
  });

  test('index.html 指向 ui/app.ts', () => {
    const html = read('index.html');
    expect(html).toMatch(/<script type="module" src="src\/ui\/app\.ts/);
    expect(html).not.toMatch(/src\/legacy\/app\.js/);
  });

  test('组装层直接从 core 与 content 取用，不再经过 compat 中转', () => {
    const app = read('src/ui/app.ts');
    expect(app).toMatch(/from '\.\.\/core\/engine\.ts'/);
    expect(app).toMatch(/from '\.\.\/content\/index\.ts'/);
    expect(app).not.toMatch(/compat\/content/);
  });

  test('ui/app.ts 是唯一挂 DOMContentLoaded 的入口', () => {
    const app = read('src/ui/app.ts');
    expect(app).toMatch(/document\.addEventListener\('DOMContentLoaded'/);
    expect(app).toMatch(/setTrayRepaint\(renderGame\)/);
  });
});
