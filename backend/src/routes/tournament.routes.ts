import { Router } from 'express';
import { getTournamentState, submitTournamentResult } from '../controllers/tournament.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.get('/state', getTournamentState);
router.post('/result', submitTournamentResult);

export default router;
