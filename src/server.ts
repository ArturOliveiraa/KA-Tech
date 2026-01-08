import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import meRoutes from "./routes/meRoutes";
import userRoutes from "./routes/userRoutes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/me", meRoutes);
app.use("/api/users", userRoutes);

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
