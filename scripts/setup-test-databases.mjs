import pg from 'pg';
import { readFile, writeFile } from 'node:fs/promises';
import { verifiedConnection } from '../server/connection.js';

const source = process.env.DATABASE_URL_UNPOOLED;
if (!source || !process.env.DATABASE_URL) throw new Error('Baixe as variáveis existentes primeiro.');
const db = new pg.Client({ connectionString: verifiedConnection(source), connectionTimeoutMillis:15000 });
try {
  await db.connect();
  for (const environment of ['preview','development']) {
    const name = `leve_${environment}`;
    const exists = await db.query('SELECT 1 FROM pg_database WHERE datname=$1',[name]);
    if (!exists.rows.length) await db.query(`CREATE DATABASE ${name} TEMPLATE template0`);
    const direct = new URL(source), pooled = new URL(process.env.DATABASE_URL);
    direct.pathname = pooled.pathname = `/${name}`;
    await writeFile(`.env.foods-${environment}.local`, `LEVE_DATABASE_URL=${pooled}\nLEVE_DATABASE_URL_UNPOOLED=${direct}\n`);
  }
  console.log('Bancos vazios de preview/development preparados no projeto existente. Nenhum diário copiado ou alterado.');
} finally { await db.end(); }
