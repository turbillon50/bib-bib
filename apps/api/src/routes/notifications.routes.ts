import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { query } from '../config/database';
import { success } from '../utils/response';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user!.id]
    );
    res.json(success(rows));
  } catch (err) { next(err); }
});

router.put('/read-all', async (req, res, next) => {
  try {
    await query(`UPDATE notifications SET is_read = true WHERE user_id = $1`, [req.user!.id]);
    res.json(success({ updated: true }));
  } catch (err) { next(err); }
});

export default router;
