import QRCode from 'qrcode';
import {mkdir,writeFile} from 'node:fs/promises';
import {pixPayload} from '../src/support.js';
await mkdir(new URL('../src/assets/',import.meta.url),{recursive:true});
await writeFile(new URL('../src/assets/support-pix.svg',import.meta.url),await QRCode.toString(pixPayload(),{type:'svg',errorCorrectionLevel:'H',margin:4,width:256,color:{dark:'#000000',light:'#ffffff'}}));
console.log('QR Pix gerado localmente, sem valor predefinido.');
