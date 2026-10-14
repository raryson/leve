import { authenticate } from '../server/auth.js';
import { getPool } from '../server/db.js';
import { createPhotoHandler } from '../server/photo.js';
import { analyzePhoto, photoAvailability } from '../server/photo-analysis.js';
import { createPhotoQuota } from '../server/photo-quota.js';

export default { fetch: createPhotoHandler({
  authenticate, available: photoAvailability,
  reserve: userId => createPhotoQuota(getPool())(userId),
  analyze: analyzePhoto,
}) };
