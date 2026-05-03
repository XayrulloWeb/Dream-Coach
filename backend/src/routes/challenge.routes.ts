import { Router } from 'express';
import { getDailyChallenge, listChallenges, runChallenge } from '../controllers/challenge.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', listChallenges);
router.get('/daily', getDailyChallenge);
router.post('/:id/run', requireAuth, runChallenge);

export default router;
