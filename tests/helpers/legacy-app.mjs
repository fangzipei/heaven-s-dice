/* tests/helpers/legacy-app.mjs — 读取已退休的 src/legacy/app.js。
 *
 * 3c-3 把 app.js 拆进 ui/ 之后，各屏的 parity 测试仍要回答一个问题：
 * 「这段实现是不是只剩一份？」。文件一旦删掉，那个问题的答案就是「是」，
 * 所以这里返回空串，让 `expect(legacy).not.toMatch(...)` 继续成立，
 * 而「入口是否指向新组装层」由 tests/unit/legacy-retired.test.mjs 单独钉住。 */
import { readFileSync } from 'node:fs';

export function legacyAppSource() {
  try {
    return readFileSync(new URL('../../src/legacy/app.js', import.meta.url), 'utf8');
  } catch {
    return '';
  }
}

/** 接替 app.js 的组装层：各屏「被谁取用」的断言现在打在这里。 */
export function assemblySource() {
  return readFileSync(new URL('../../src/ui/app.ts', import.meta.url), 'utf8');
}
