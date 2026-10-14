import { authenticate } from '../server/auth.js';
import { getPool } from '../server/db.js';
import { createFoodsRepository } from '../server/foods-db.js';
import { createFoodsHandler } from '../server/foods.js';

export default {fetch:createFoodsHandler({authenticate,
  isModerator:userId=>(process.env.FOOD_MODERATOR_IDS||'').split(',').map(id=>id.trim()).filter(Boolean).includes(userId),
  repository:{list:(...args)=>createFoodsRepository(getPool()).list(...args),mutate:(...args)=>createFoodsRepository(getPool()).mutate(...args)},
})};
