import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUser, findUserByEmail } from '../userStore';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, senha e nome são obrigatórios' });
    }

    try {
      const user = await createUser(email, password, name);

      return res.status(201).json({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      });
    } catch (err: any) {
      if (err.message === 'EMAIL_EXISTS') {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }
      console.error(err);
      return res.status(500).json({ error: 'Erro ao registrar usuário' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao fazer login' });
  }
};
