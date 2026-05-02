import { Router } from 'express';
import { applySubstitutions, getMatchState, resumeMatch, simulate, startMatch } from '../controllers/match.controller';

const router = Router();

router.post('/simulate', simulate);
router.post('/start', startMatch);
router.post('/:matchId/substitutions', applySubstitutions);
router.post('/:matchId/resume', resumeMatch);
router.get('/:matchId/state', getMatchState);

export default router;
