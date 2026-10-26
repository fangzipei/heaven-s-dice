import fs from 'node:fs';

const QUOTES = ["'", '"', '`'];

function readArgs(s, open) {
  let i = open + 1, d = 0, cur = '', args = [], q = null;
  for (; i < s.length; i++) {
    const ch = s[i];
    if (q) { cur += ch; if (ch === q && s[i - 1] !== '\\') q = null; continue; }
    if (QUOTES.includes(ch)) { q = ch; cur += ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') d++;
    if (ch === ')' || ch === ']' || ch === '}') {
      if (d === 0 && ch === ')') { args.push(cur); return { args, end: i }; }
      d--;
    }
    if (ch === ',' && d === 0) { args.push(cur); cur = ''; continue; }
    cur += ch;
  }
  throw new Error('unbalanced parens');
}

function convert(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const idx = src.indexOf('assert.', i);
    if (idx === -1) { out += src.slice(i); break; }
    const m = /^assert\.(\w+)\s*\(/.exec(src.slice(idx));
    if (!m) { out += src.slice(i, idx + 7); i = idx + 7; continue; }
    out += src.slice(i, idx);
    const open = idx + m[0].length - 1;
    const { args, end } = readArgs(src, open);
    const a = args.map((x) => x.trim());
    let rep;
    switch (m[1]) {
      case 'equal': rep = `expect(${a[0]}).toBe(${a[1]})`; break;
      case 'notEqual': rep = `expect(${a[0]}).not.toBe(${a[1]})`; break;
      case 'deepEqual': rep = `expect(${a[0]}).toEqual(${a[1]})`; break;
      case 'match': rep = `expect(${a[0]}).toMatch(${a[1]})`; break;
      case 'ok': rep = `expect(${a[0]}).toBeTruthy()`; break;
      default: throw new Error('unhandled assert.' + m[1]);
    }
    out += rep;
    i = end + 1;
  }
  if (/assert\./.test(out)) throw new Error('leftover assert call');
  return out;
}

for (const n of ['scoring', 'engine', 'content']) {
  let s = fs.readFileSync(`tests/${n}.test.mjs`, 'utf8');
  s = s.replace(
    /import test from 'node:test';\s*[\r\n]+import assert from 'node:assert\/strict';\s*[\r\n]+/,
    'import { describe, expect, test } from "vitest";\n\n'
  );
  s = s.replace(/\.\.\/src\/(scoring|engine|data)\.js/g, '../../src/legacy/$1.js');
  fs.writeFileSync(`tests/unit/${n}.test.mjs`, convert(s));
  console.log('converted', n);
}
