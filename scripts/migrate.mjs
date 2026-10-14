import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { verifiedConnection } from '../server/connection.js';

if (!process.env.DATABASE_URL_UNPOOLED) throw new Error('DATABASE_URL_UNPOOLED ausente. Baixe as variáveis do projeto Vercel.');
const sql = await readFile(new URL('../db/migrations/001_journals.sql', import.meta.url), 'utf8');
const hash = createHash('sha256').update(sql).digest('hex');
const client = new pg.Client({ connectionString: verifiedConnection(process.env.DATABASE_URL_UNPOOLED), connectionTimeoutMillis: 15000 });
try {
  await client.connect();
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(hashtext('leve-migrations'))");
  await client.query('CREATE TABLE IF NOT EXISTS leve_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const result = await client.query('SELECT checksum FROM leve_migrations WHERE name = $1', ['001_journals']);
  if (result.rows.length && result.rows[0].checksum !== hash) throw new Error('Uma migração já aplicada foi alterada.');
  if (!result.rows.length) {
    await client.query(sql);
    await client.query('INSERT INTO leve_migrations (name, checksum) VALUES ($1, $2)', ['001_journals', hash]);
  }
  await client.query('COMMIT');
  console.log(result.rows.length ? 'Schema já atualizado.' : 'Migração 001_journals aplicada. Nenhum registro pessoal importado.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Migração não concluída:', error.code || error.message);
  process.exitCode = 1;
} finally { await client.end(); }
