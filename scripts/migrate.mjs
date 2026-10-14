import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { verifiedConnection } from '../server/connection.js';

const production = process.argv.includes('--production');
const connection = production ? process.env.DATABASE_URL_UNPOOLED : process.env.LEVE_DATABASE_URL_UNPOOLED;
if (!connection) throw new Error('Banco do ambiente não configurado. Desenvolvimento exige LEVE_DATABASE_URL_UNPOOLED; produção exige --production explícito.');
const directory = new URL('../db/migrations/', import.meta.url);
const files = (await readdir(directory)).filter(name=>/^\d+_.+\.sql$/.test(name)).sort();
const client = new pg.Client({ connectionString: verifiedConnection(connection), connectionTimeoutMillis:15000 });
try {
  await client.connect();
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(hashtext('leve-migrations'))");
  await client.query('CREATE TABLE IF NOT EXISTS leve_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const applied=[];
  for (const file of files) {
    const name=file.replace(/\.sql$/,'');
    const sql=await readFile(new URL(file,directory),'utf8');
    const hash=createHash('sha256').update(sql).digest('hex');
    const result=await client.query('SELECT checksum FROM leve_migrations WHERE name=$1',[name]);
    if(result.rows.length && result.rows[0].checksum!==hash) throw new Error('Uma migração aplicada foi alterada.');
    if(!result.rows.length) {await client.query(sql);await client.query('INSERT INTO leve_migrations(name,checksum) VALUES($1,$2)',[name,hash]);applied.push(name);}
  }
  await client.query('COMMIT');
  console.log(`Schema ${production?'principal':'isolado'} atualizado. Migrações: ${applied.join(', ') || 'nenhuma'}. Diários existentes não foram modificados.`);
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Migração não concluída:', error.code || error.message);
  process.exitCode = 1;
} finally { await client.end(); }
