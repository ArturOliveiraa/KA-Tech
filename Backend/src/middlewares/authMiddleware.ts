import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

// Alteramos de 'number' para 'any' para resolver o conflito de herança do TS
export interface AuthRequest extends Request {
  userId?: any;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: any;
    };

    // Inserção do ID no objeto de requisição
    req.userId = decoded.userId;
    
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}