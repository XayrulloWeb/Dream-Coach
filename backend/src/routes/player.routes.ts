import { Router } from 'express';
import { getPlayerPhoto, listPlayers } from '../controllers/player.controller';

const router = Router();

router.get('/', listPlayers);
router.get('/photo/:id', getPlayerPhoto);

export default router;
