import { readdir, readFile, writeFile } from 'node:fs/promises';
const assets = (await readdir(new URL('../dist/assets/', import.meta.url))).map(name => `/assets/${name}`);
const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
await writeFile(new URL('../dist/sw.js', import.meta.url), source.replace('/* BUILD_ASSETS */ []', JSON.stringify(assets)).replace(/'leve-v\d+'/, `'leve-${Date.now()}'`));
console.log(`Service worker: ${assets.length} assets preparados para uso offline.`);
