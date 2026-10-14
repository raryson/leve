import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createRepository } from '../server/db.js';
import { verifiedConnection } from '../server/connection.js';
import { emptyState } from '../src/domain.js';

const client = new pg.Client({ connectionString: verifiedConnection(process.env.DATABASE_URL_UNPOOLED), connectionTimeoutMillis: 15000 });
try {
  await client.connect(); await client.query('BEGIN');
  const repo = createRepository(client), a = `verification-${randomUUID()}`, b = `verification-${randomUUID()}`;
  assert.equal((await repo.get(a)).revision, 0);
  const operation = randomUUID(), state = emptyState();
  const first = await repo.put(a, state, 0, operation);
  assert.equal(first.revision, 1);
  assert.equal((await repo.get(b)).state, null);
  assert.equal((await repo.put(a, state, 0, operation)).revision, 1);
  const conflict = await repo.put(a, state, 0, randomUUID());
  assert.equal(conflict.conflict, true);
  const second = await repo.put(a, state, 1, randomUUID());
  assert.equal(second.revision, 2);
  const actual = await client.query('SELECT count(*)::int AS journals FROM leve_journals WHERE user_id NOT LIKE $1', ['verification-%']);
  console.log('Banco verificado: isolamento por usuário, gravação, leitura, conflito e repetição idempotente.');
  console.log(`Diários reais já salvos pelo app: ${actual.rows[0].journals}. Conteúdo pessoal não foi lido.`);
} finally { await client.query('ROLLBACK').catch(() => {}); await client.end(); }
