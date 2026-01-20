import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

// 1. Registro Simples
export async function register(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "name, email e password são obrigatórios" });
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(409).json({ error: "E-mail já cadastrado" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: passwordHash },
    });

    return res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao registrar usuário" });
  }
}

// 2. Registro com Cargos (Roles)
export async function registerWithRole(req: Request, res: Response) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "name, email e password são obrigatórios" });
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(409).json({ error: "E-mail já cadastrado" });
    }

    const allowedRoles = ["STUDENT", "INSTRUCTOR", "ADMIN"] as const;
    type GlobalRole = (typeof allowedRoles)[number];

    let userRole: GlobalRole = "STUDENT";

    if (role) {
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: "role inválido" });
      }

      const authUser = (req as any).user as { role?: GlobalRole } | undefined;

      if (role !== "STUDENT") {
        if (!authUser || authUser.role !== "ADMIN") {
          return res
            .status(403)
            .json({ error: "Apenas admin pode criar instrutores ou admins" });
        }
      }

      userRole = role;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        role: userRole,
      },
    });

    return res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Erro ao registrar usuário com role" });
  }
}

// 3. Login Único (Mantendo a versão que suporta Roles)
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "email e password são obrigatórios" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role }, 
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao fazer login" });
  }
}