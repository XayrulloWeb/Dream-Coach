import { Router } from 'express';
import { createSavedSquad, deleteSavedSquad, listSavedSquads } from '../controllers/saved-squad.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.get('/saved', listSavedSquads);
router.post('/saved', createSavedSquad);
router.delete('/saved/:id', deleteSavedSquad);

export default router;
