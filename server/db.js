import pg from 'pg';
import { attachDatabasePool } from '@vercel/functions';
import { verifiedConnection } from './connection.js';

let pool;
export function getPool() {
  if (!pool) {
    const connection = process.env.VERCEL_ENV==='production' ? process.env.DATABASE_URL : process.env.LEVE_DATABASE_URL;
    if (!connection) throw new Error('Banco isolado não configurado para este ambiente.');
    pool = new pg.Pool({ connectionString: verifiedConnection(connection), max: 3, connectionTimeoutMillis: 15000, idleTimeoutMillis: 5000 });
    pool.on('error', error => console.error('database_pool_error', { code: error.code || 'connection' }));
    if (process.env.VERCEL) attachDatabasePool(pool);
  }
  return pool;
}
const document = row => row ? { state: row.document, revision: Number(row.revision), updatedAt: row.updated_at, operationId: row.last_operation } : { state: null, revision: 0, updatedAt: null, operationId: null };
export function createRepository(db) {
  const get = async userId => document((await db.query('SELECT document, revision, updated_at, last_operation FROM leve_journals WHERE user_id = $1', [userId])).rows[0]);
  return {
    get,
    async put(userId, state, revision, operationId) {
      const data = JSON.stringify(state);
      const result = revision === 0
        ? await db.query('INSERT INTO leve_journals (user_id, document, revision, last_operation) VALUES ($1, $2::jsonb, 1, $3) ON CONFLICT (user_id) DO NOTHING RETURNING document, revision, updated_at, last_operation', [userId, data, operationId])
        : await db.query('UPDATE leve_journals SET document = $2::jsonb, revision = revision + 1, last_operation = $4, updated_at = now() WHERE user_id = $1 AND revision = $3 RETURNING document, revision, updated_at, last_operation', [userId, data, revision, operationId]);
      if (result.rows.length) return document(result.rows[0]);
      const current = await get(userId);
      // An acknowledgment may have been lost. Retrying one operation is safe.
      if (current.operationId === operationId) return current;
      return { ...current, conflict: true };
    },
  };
}
