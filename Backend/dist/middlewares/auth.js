"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requireAdmin = requireAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: "Token não informado" });
    }
    const [, token] = authHeader.split(" ");
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        return next();
    }
    catch (error) {
        console.error(error);
        return res.status(401).json({ error: "Token inválido" });
    }
}
function requireAdmin(req, res, next) {
    const user = req.user;
    if (!user || user.role !== "ADMIN") {
        return res.status(403).json({ error: "Apenas administradores podem acessar." });
    }
    return next();
}
