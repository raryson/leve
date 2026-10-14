import { Resvg } from '@resvg/resvg-js';
import { writeFile } from 'node:fs/promises';

// Shared vector source, inside the central 80% maskable safe zone.
const mark = `<circle cx="256" cy="283" r="119" fill="none" stroke="#f7faee" stroke-width="28"/>
  <path d="M254 246c-16-79 28-126 112-126 1 83-41 133-112 126Z" fill="#c2e6a5"/>
  <path d="m253 270 65-92" fill="none" stroke="#203e32" stroke-width="15" stroke-linecap="round"/>
  <path d="M193 290c0 35 28 63 63 63" fill="none" stroke="#f7faee" stroke-width="14" stroke-linecap="round"/>`;
const icon = rounded => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="#203e32"/>${mark}</svg>`;
const render = (svg, width) => new Resvg(svg, { fitTo: { mode:'width', value:width }, font: { loadSystemFonts:true, defaultFontFamily:'Segoe UI' } }).render().asPng();
const out = (file, data) => writeFile(new URL(`../public/${file}`, import.meta.url), data);
await out('icon.svg', icon(true));
await out('favicon.svg', icon(true));
for (const size of [192,512]) await out(`icon-${size}.png`, render(icon(false), size));
await out('icon-maskable-512.png', render(icon(false),512));
await out('apple-touch-icon.png',render(icon(false),180));
for (const size of [16,32,48]) await out(`favicon-${size}.png`,render(icon(true),size));
// ICO container embeds PNG images; no extra conversion dependency is needed.
const entries = [16,32,48].map(size => ({size, bytes:render(icon(true),size)}));
const header = Buffer.alloc(6 + 16 * entries.length);
header.writeUInt16LE(1,2); header.writeUInt16LE(entries.length,4);
let offset=header.length;
entries.forEach(({size,bytes},i)=>{const pos=6+i*16;header[pos]=size;header[pos+1]=size;header.writeUInt16LE(1,pos+4);header.writeUInt16LE(32,pos+6);header.writeUInt32LE(bytes.length,pos+8);header.writeUInt32LE(offset,pos+12);offset+=bytes.length;});
await out('favicon.ico',Buffer.concat([header,...entries.map(e=>e.bytes)]));
const cover = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#203e32"/>
  <circle cx="1110" cy="40" r="300" fill="#294a3b"/>
  <circle cx="1160" cy="640" r="240" fill="#294a3b"/>
  <g font-family="Segoe UI, Arial, sans-serif">
    <text x="68" y="151" fill="#f7faee" font-size="104" font-weight="800" letter-spacing="-6">leve<tspan fill="#c2e6a5">.</tspan></text>
    <text x="72" y="259" fill="#f7faee" font-size="52" font-weight="700" letter-spacing="-1.5">Tua rotina,</text>
    <text x="72" y="322" fill="#f7faee" font-size="52" font-weight="700" letter-spacing="-1.5">um dia de cada vez.</text>
    <text x="74" y="393" fill="#bdcfc0" font-size="24">Registre refeições, acompanhe seu peso</text>
    <text x="74" y="429" fill="#bdcfc0" font-size="24">e cuide dos pequenos hábitos.</text>
    <rect x="72" y="507" width="129" height="45" rx="22" fill="#c2e6a5"/>
    <text x="136" y="537" text-anchor="middle" font-size="19" font-weight="600" fill="#203e32">Comida</text>
    <rect x="213" y="507" width="108" height="45" rx="22" fill="#c2e6a5"/>
    <text x="267" y="537" text-anchor="middle" font-size="19" font-weight="600" fill="#203e32">Água</text>
    <rect x="333" y="507" width="164" height="45" rx="22" fill="#c2e6a5"/>
    <text x="415" y="537" text-anchor="middle" font-size="19" font-weight="600" fill="#203e32">Movimento</text>
    <text x="952" y="510" text-anchor="middle" font-size="21" fill="#bdcfc0">Teu diário de rotina.</text>
  </g>
  <rect x="800" y="132" width="304" height="304" rx="68" fill="#c2e6a5"/>
  <g transform="translate(810 142) scale(.5546875)"><rect width="512" height="512" rx="100" fill="#203e32"/>${mark}</g>
</svg>`;
await out('share-cover.svg',cover);
await out('share-cover.png',render(cover,1200));
console.log('Ícones PWA, Apple, favicons e capa social gerados localmente.');
