import { mkdir, writeFile } from 'node:fs/promises';
const [packageName, ...fingerprints] = process.argv.slice(2);
if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(packageName || '') || !fingerprints.length || fingerprints.some(value => !/^(?:[a-f\d]{2}:){31}[a-f\d]{2}$/i.test(value))) {
  throw new Error('Use: node scripts/build-assetlinks.mjs app.raryson.leve SHA256 [SHA256_ADICIONAL]. Copie o SHA-256 real do certificado Play App Signing, no formato AA:BB:… (32 bytes).');
}
const target = new URL('../public/.well-known/', import.meta.url);
await mkdir(target, { recursive: true });
await writeFile(new URL('assetlinks.json', target), JSON.stringify([{
  relation: ['delegate_permission/common.handle_all_urls'],
  target: { namespace: 'android_app', package_name: packageName, sha256_cert_fingerprints: [...new Set(fingerprints.map(value => value.toUpperCase()))] }
}], null, 2) + '\n');
console.log('Digital Asset Links gerado. Publique e valide com a versão instalada pela Play.');
