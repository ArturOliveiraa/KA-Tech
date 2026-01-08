import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.get('/me', authMiddleware, (req, res) => {
  return res.json({
    userId: req.userId,
    email: req.userEmail,
  });
});

export default router;
