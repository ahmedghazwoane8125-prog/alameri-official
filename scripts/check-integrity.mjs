import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const errors = [];
const check = (ok, message) => { if (!ok) errors.push(message); };
const read = path => readFileSync(join(root, path), 'utf8');
const ids = html => Array.from(html.matchAll(/\bid=["']([^"']+)["']/g), match => match[1]);

const protectedBlobs = {
  'poems.json': 'fe1b86b547d5ce7409c8516738cf1af9081d6a70',
  'poems/AM-001.html': '0ee869477e579f37abbc17a324d49a8bd8c3fdfa',
  'poems/AM-002.html': '0bb1eecff4b492318748bb3b2bdffa9df28d1671',
  'poems/AM-003.html': 'f66b8bef3f203df1c59d4045e9e34542f1d2f447',
  'poems/AM-004.html': '564ed785fd0c27a57100c3ea59e628fa4cad8c92',
  'poems/AM-005.html': 'a94b4f8a5863c14b8fe8c25a06901d0ef3d43d2b',
  'poems/AM-011.html': 'e2a7c8e2d200da1f87ecf6a4f4409d06851066bb',
  'poems/AM-012.html': 'daccc80f362678be9c24d5c73c96e71fba0c957f',
  'poems/AM-013.html': '976da13effa38c1250dcba12b9194c01318bc7ca',
  'poems/AM-014.html': '82608d16c3725e62328b314a57372d8c8b954fd9',
  'poems/AM-015.html': '22f63615c872851d40356367189a25ea58e316f5'
};

for (const [path, expected] of Object.entries(protectedBlobs)) {
  if (!existsSync(join(root, path))) {
    check(false, 'Missing protected original: ' + path);
    continue;
  }
  const bytes = readFileSync(join(root, path));
  const header = Buffer.from('blob ' + bytes.length + '\0');
  const actual = createHash('sha1').update(header).update(bytes).digest('hex');
  check(actual === expected, 'Original poem file changed: ' + path);
}

const poems = JSON.parse(read('poems.json')).poems;
check(Array.isArray(poems), 'poems.json must contain a poems array');
const poemIds = new Set();
for (const p of poems || []) {
  check(/^AM-\d+$/.test(p.id || ''), 'Invalid poem ID: ' + p.id);
  check(!poemIds.has(p.id), 'Duplicate poem ID: ' + p.id);
  poemIds.add(p.id);
  check(Boolean(p.title && p.text), 'Incomplete original poem record: ' + p.id);
  check(existsSync(join(root, 'poems', p.id + '.html')), 'Missing original poem page: ' + p.id);
}
const pageFiles = readdirSync(join(root, 'poems')).filter(name => /^AM-\d+\.html$/.test(name));
check(pageFiles.length === poemIds.size, 'Mismatch between poem pages and the JSON catalog');

const sitemap = read('sitemap.xml');
for (const id of poemIds) check(sitemap.includes('/poems/' + id + '.html'), 'Poem missing from sitemap: ' + id);
check(sitemap.includes('/studio/'), 'Studio page missing from sitemap');
const robots = read('robots.txt');
check(/Sitemap:\s*https:\/\/\S+\/sitemap\.xml/i.test(robots), 'Missing sitemap location in robots.txt');

for (const page of ['index.html', 'studio/index.html']) {
  const html = read(page);
  const seen = new Set();
  for (const id of ids(html)) {
    check(!seen.has(id), 'Duplicate HTML id in ' + page + ': ' + id);
    seen.add(id);
  }
  check(/<html[^>]*\blang=["']ar["']/i.test(html), 'Arabic document language missing: ' + page);
  check(/<html[^>]*\bdir=["']rtl["']/i.test(html), 'RTL direction missing: ' + page);
  for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) {
    const value = match[1];
    if (/^(?:https?:|mailto:|tel:|data:|javascript:|\/\/|#|\/)/i.test(value)) continue;
    const local = value.split(/[?#]/)[0];
    if (!local) continue;
    check(existsSync(resolve(root, dirname(page), local)), 'Missing local asset in ' + page + ': ' + local);
  }
}

const studioIds = new Set(ids(read('studio/index.html')));
for (const script of ['studio/studio.js', 'studio/literary-modules.js']) {
  for (const match of read(script).matchAll(/\$\('([^']+)'\)/g)) {
    check(studioIds.has(match[1]), 'Missing HTML control for ' + script + ': ' + match[1]);
  }
}
for (const script of [
  'studio/config.js', 'studio/studio.js', 'studio/literary-modules.js',
  'member-guard.js', 'site-enhancements.js', 'poems/reading.js'
]) {
  const result = spawnSync(process.execPath, ['--check', join(root, script)], { encoding: 'utf8' });
  check(result.status === 0, 'JavaScript syntax error in ' + script + ': ' + (result.stderr || '').trim());
}
if (errors.length) {
  console.error('Integrity audit FAILED (' + errors.length + ' findings):');
  errors.forEach((error, i) => console.error((i + 1) + '. ' + error));
  process.exit(1);
}
console.log('Integrity audit passed: protected original poems, pages, links, sitemap, JS syntax and studio controls.');
