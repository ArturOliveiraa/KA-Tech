"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/contactRoutes.ts
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Criar contato
router.post("/", authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const { name, phone } = req.body;
        if (!name || !phone) {
            return res
                .status(400)
                .json({ error: "name e phone são obrigatórios." });
        }
        const contact = await prisma_1.prisma.contact.create({
            data: {
                name,
                phone,
                ownerId: req.userId,
            },
        }); // criação simples com Prisma [web:239][web:245]
        return res.status(201).json({
            message: "Contato criado com sucesso.",
            contact,
        });
    }
    catch (error) {
        console.error(error);
        return res
            .status(500)
            .json({ error: "Ocorreu um erro ao criar o contato." });
    }
});
// Listar contatos do usuário
router.get("/", authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const contacts = await prisma_1.prisma.contact.findMany({
            where: { ownerId: req.userId },
            orderBy: { createdAt: "desc" },
        }); // filtro por ownerId [web:239][web:286]
        return res.json({
            message: "Lista de contatos carregada com sucesso.",
            contacts,
        });
    }
    catch (error) {
        console.error(error);
        return res
            .status(500)
            .json({ error: "Ocorreu um erro ao listar os contatos." });
    }
});
// Atualizar contato
router.put("/:id", authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const contactId = Number(req.params.id);
        const { name, phone } = req.body;
        if (Number.isNaN(contactId)) {
            return res.status(400).json({ error: "ID de contato inválido." });
        }
        const contact = await prisma_1.prisma.contact.findUnique({
            where: { id: contactId },
        });
        if (!contact || contact.ownerId !== req.userId) {
            return res.status(404).json({ error: "Contato não encontrado." });
        } // validação de ownerId para segurança [web:239][web:188]
        const updated = await prisma_1.prisma.contact.update({
            where: { id: contactId },
            data: {
                name: name ?? contact.name,
                phone: phone ?? contact.phone,
            },
        });
        return res.json({
            message: "Contato atualizado com sucesso.",
            contact: updated,
        });
    }
    catch (error) {
        console.error(error);
        return res
            .status(500)
            .json({ error: "Ocorreu um erro ao atualizar o contato." });
    }
});
// Deletar contato
router.delete("/:id", authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const contactId = Number(req.params.id);
        if (Number.isNaN(contactId)) {
            return res.status(400).json({ error: "ID de contato inválido." });
        }
        const contact = await prisma_1.prisma.contact.findUnique({
            where: { id: contactId },
        });
        if (!contact || contact.ownerId !== req.userId) {
            return res.status(404).json({ error: "Contato não encontrado." });
        } // impede apagar contato de outro usuário [web:239][web:188]
        await prisma_1.prisma.contact.delete({
            where: { id: contactId },
        });
        return res.json({ message: "Contato removido com sucesso." });
    }
    catch (error) {
        console.error(error);
        return res
            .status(500)
            .json({ error: "Ocorreu um erro ao remover o contato." });
    }
});
exports.default = router;
