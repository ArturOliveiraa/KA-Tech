import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

interface JwtPayload {
  userId: string;
  email: string;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const [, token] = authHeader.split(' '); // "Bearer token"

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // @ts-ignore – vamos só anexar ao req
    req.userId = decoded.userId;
    // @ts-ignore
    req.userEmail = decoded.email;

    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
};
