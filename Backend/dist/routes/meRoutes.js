"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/meRoutes.ts
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.get("/", authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.userId },
            select: { id: true, name: true, email: true, createdAt: true },
        });
        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }
        return res.json({
            message: "Dados do usuário carregados com sucesso.",
            user,
        });
    }
    catch (error) {
        console.error(error);
        return res
            .status(500)
            .json({ error: "Ocorreu um erro ao buscar os dados do usuário." });
    }
});
exports.default = router;
