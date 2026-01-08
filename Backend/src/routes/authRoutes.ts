import { Router } from "express";
import { register, registerWithRole, login } from "../controllers/authController";
import { authMiddleware, requireAdmin } from "../middlewares/auth";

const router = Router();

router.post("/register", register);
router.post("/admin/register", authMiddleware, requireAdmin, registerWithRole);
router.post("/login", login);

export default router;
