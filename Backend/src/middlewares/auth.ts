import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthUserPayload {
  userId: number;
  role?: "STUDENT" | "INSTRUCTOR" | "ADMIN";
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Token não informado" });
  }

  const [, token] = authHeader.split(" ");

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as AuthUserPayload;

    (req as any).user = decoded;
    return next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ error: "Token inválido" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthUserPayload | undefined;

  if (!user || user.role !== "ADMIN") {
    return res.status(403).json({ error: "Apenas administradores podem acessar." });
  }

  return next();
}
