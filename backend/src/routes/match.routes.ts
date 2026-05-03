import { Router } from 'express';
import { analyzeSquad, applySubstitutions, getMatchHistory, getMatchReport, getMatchState, previewSubstitutions, resumeMatch, simulate, startMatch } from '../controllers/match.controller';

const router = Router();

router.get('/history', getMatchHistory);
router.post('/simulate', simulate);
router.post('/start', startMatch);
router.post('/analyze-squad', analyzeSquad);
router.post('/:matchId/substitution-preview', previewSubstitutions);
router.post('/:matchId/substitutions', applySubstitutions);
router.post('/:matchId/resume', resumeMatch);
router.get('/:matchId/state', getMatchState);
router.get('/:matchId/report', getMatchReport);

export default router;
