// src/routes/contactRoutes.ts
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middlewares/authMiddleware";

const router = Router();

// Criar contato
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res
        .status(400)
        .json({ error: "name e phone são obrigatórios." });
    }

    const contact = await prisma.contact.create({
      data: {
        name,
        phone,
        ownerId: req.userId!,
      },
    }); // criação simples com Prisma [web:239][web:245]

    return res.status(201).json({
      message: "Contato criado com sucesso.",
      contact,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Ocorreu um erro ao criar o contato." });
  }
});

// Listar contatos do usuário
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const contacts = await prisma.contact.findMany({
      where: { ownerId: req.userId },
      orderBy: { createdAt: "desc" },
    }); // filtro por ownerId [web:239][web:286]

    return res.json({
      message: "Lista de contatos carregada com sucesso.",
      contacts,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Ocorreu um erro ao listar os contatos." });
  }
});

// Atualizar contato
router.put("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const contactId = Number(req.params.id);
    const { name, phone } = req.body;

    if (Number.isNaN(contactId)) {
      return res.status(400).json({ error: "ID de contato inválido." });
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact || contact.ownerId !== req.userId) {
      return res.status(404).json({ error: "Contato não encontrado." });
    } // validação de ownerId para segurança [web:239][web:188]

    const updated = await prisma.contact.update({
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
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Ocorreu um erro ao atualizar o contato." });
  }
});

// Deletar contato
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const contactId = Number(req.params.id);

    if (Number.isNaN(contactId)) {
      return res.status(400).json({ error: "ID de contato inválido." });
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact || contact.ownerId !== req.userId) {
      return res.status(404).json({ error: "Contato não encontrado." });
    } // impede apagar contato de outro usuário [web:239][web:188]

    await prisma.contact.delete({
      where: { id: contactId },
    });

    return res.json({ message: "Contato removido com sucesso." });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Ocorreu um erro ao remover o contato." });
  }
});

export default router;
