"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const meRoutes_1 = __importDefault(require("./routes/meRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const contactRoutes_1 = __importDefault(require("./routes/contactRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/api/auth", authRoutes_1.default);
app.use("/api/me", meRoutes_1.default);
app.use("/api/users", userRoutes_1.default);
app.use("/api/contacts", contactRoutes_1.default);
// Rota de teste
app.get("/", (_req, res) => {
    res.send("🚀 Backend do KA Tech está rodando!");
});
app.get("/api/ping", (_req, res) => {
    res.json({ ok: true, message: "API OK" });
});
const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
