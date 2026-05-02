import { Router } from 'express';
import { listPlayers } from '../controllers/player.controller';

const router = Router();

router.get('/', listPlayers);

export default router;
