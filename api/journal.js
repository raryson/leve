import { createJournalHandler } from '../server/journal.js';
import { createRepository, getPool } from '../server/db.js';
import { authenticate } from '../server/auth.js';

const repository = {
  get: (...args) => createRepository(getPool()).get(...args),
  put: (...args) => createRepository(getPool()).put(...args),
};
export default { fetch: createJournalHandler({ authenticate, repository }) };
