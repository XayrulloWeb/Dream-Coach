import { Router } from 'express';
import { register, login, guest } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/guest', guest);

export default router;
