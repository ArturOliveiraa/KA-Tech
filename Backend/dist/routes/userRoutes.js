"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
// Criar usuário
router.post("/", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res
                .status(400)
                .json({ error: "name, email e password são obrigatórios" });
        }
        const user = await prisma_1.prisma.user.create({
            data: { name, email, password },
        });
        return res.status(201).json(user);
    }
    catch (error) {
        console.error(error);
        if (error.code === "P2002") {
            return res.status(409).json({ error: "E-mail já cadastrado" });
        }
        return res.status(500).json({ error: "Erro ao criar usuário" });
    }
});
router.get("/", async (_req, res) => {
    try {
        const users = await prisma_1.prisma.user.findMany();
        return res.json(users);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao listar usuários" });
    }
});
exports.default = router;
