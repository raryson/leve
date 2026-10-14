export function createPhotoQuota(pool) {
  return async userId => {
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      // Short transaction serializes counters across devices and server instances.
      await db.query("SELECT pg_advisory_xact_lock(hashtext('leve-photo-quota'))");
      const day = "(now() AT TIME ZONE 'America/Sao_Paulo')::date";
      const userScope = `user:${userId}`;
      const { rows } = await db.query(`SELECT scope, attempts, last_attempt > now() - interval '20 seconds' AS recent FROM leve_photo_usage WHERE usage_date = ${day} AND scope = ANY($1::text[])`, [['global', userScope]]);
      const global = rows.find(r => r.scope === 'global');
      const user = rows.find(r => r.scope === userScope);
      const message = user?.recent ? 'Aguarde 20 segundos antes de analisar outra foto.' : (user?.attempts || 0) >= 10 ? 'Você usou as 10 tentativas de foto de hoje. O registro manual continua disponível.' : (global?.attempts || 0) >= 50 ? 'O limite de análises do app foi atingido por hoje. Use o registro manual.' : '';
      if (message) { await db.query('ROLLBACK'); return { allowed: false, message }; }
      await db.query(`INSERT INTO leve_photo_usage (usage_date, scope, attempts) SELECT ${day}, unnest($1::text[]), 1 ON CONFLICT (usage_date, scope) DO UPDATE SET attempts = leve_photo_usage.attempts + 1, last_attempt = now()`, [['global', userScope]]);
      // Keep only recent counters; no image, prompt, or result is stored here.
      await db.query(`DELETE FROM leve_photo_usage WHERE usage_date < ${day} - 7`);
      await db.query('COMMIT');
      return { allowed: true, remaining: 9 - (user?.attempts || 0) };
    } catch (error) { await db.query('ROLLBACK').catch(() => {}); throw error; }
    finally { db.release(); }
  };
}
