"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.registerWithRole = registerWithRole;
exports.login = login;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// 1. Registro Simples
async function register(req, res) {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res
                .status(400)
                .json({ error: "name, email e password são obrigatórios" });
        }
        const existing = await prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (existing) {
            return res.status(409).json({ error: "E-mail já cadastrado" });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: { name, email, password: passwordHash },
        });
        return res.status(201).json({
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao registrar usuário" });
    }
}
// 2. Registro com Cargos (Roles)
async function registerWithRole(req, res) {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res
                .status(400)
                .json({ error: "name, email e password são obrigatórios" });
        }
        const existing = await prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (existing) {
            return res.status(409).json({ error: "E-mail já cadastrado" });
        }
        const allowedRoles = ["STUDENT", "INSTRUCTOR", "ADMIN"];
        let userRole = "STUDENT";
        if (role) {
            if (!allowedRoles.includes(role)) {
                return res.status(400).json({ error: "role inválido" });
            }
            const authUser = req.user;
            if (role !== "STUDENT") {
                if (!authUser || authUser.role !== "ADMIN") {
                    return res
                        .status(403)
                        .json({ error: "Apenas admin pode criar instrutores ou admins" });
                }
            }
            userRole = role;
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
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
    }
    catch (error) {
        console.error(error);
        return res
            .status(500)
            .json({ error: "Erro ao registrar usuário com role" });
    }
}
// 3. Login Único (Mantendo a versão que suporta Roles)
async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res
                .status(400)
                .json({ error: "email e password são obrigatórios" });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return res.status(401).json({ error: "Credenciais inválidas" });
        }
        const validPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: "Credenciais inválidas" });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
        return res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Erro ao fazer login" });
    }
}
