import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
const folder = new URL('../distribution/google-play/assets/', import.meta.url);
await mkdir(folder, { recursive: true });
const icon = (await readFile(new URL('../public/icon.svg', import.meta.url))).toString('base64');
for (const [language, lines] of Object.entries({pt:['Tua rotina,','um dia de cada vez.','Comida, água e movimento.'],en:['Your routine,','one day at a time.','Food, water and movement.']})) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500"><rect width="1024" height="500" fill="#203e32"/><circle cx="960" cy="70" r="260" fill="#294a3b"/><g font-family="Segoe UI,Arial,sans-serif" fill="#f7faee"><text x="64" y="116" font-size="68" font-weight="800">leve<tspan fill="#c2e6a5">.</tspan></text><text x="64" y="231" font-size="43" font-weight="700">${lines[0]}</text><text x="64" y="288" font-size="43" font-weight="700">${lines[1]}</text><text x="66" y="379" font-size="23" fill="#c2e6a5">${lines[2]}</text></g><image href="data:image/svg+xml;base64,${icon}" x="742" y="146" width="220" height="220"/></svg>`;
  await writeFile(new URL(`feature-${language}.svg`,folder),svg);
  await writeFile(new URL(`feature-${language}.png`,folder),new Resvg(svg,{font:{loadSystemFonts:true,defaultFontFamily:'Segoe UI'}}).render().asPng());
}
await writeFile(new URL('icon-512.png',folder),await readFile(new URL('../public/icon-512.png',import.meta.url)));
console.log('Google Play: ícone 512 e artes 1024×500 pt/en gerados.');
