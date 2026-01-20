"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: "Token não informado" });
    }
    const parts = authHeader.split(" ");
    // Validação extra para garantir que o formato é "Bearer <token>"
    if (parts.length !== 2) {
        return res.status(401).json({ error: "Erro no formato do token" });
    }
    const [, token] = parts;
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Inserção do ID no objeto de requisição
        req.userId = decoded.userId;
        return next();
    }
    catch (error) {
        return res.status(401).json({ error: "Token inválido ou expirado" });
    }
}
