import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const filePath = path.join(__dirname, '..', 'users.json');

interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: string;
}

const readUsers = (): User[] => {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const data = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(data) as User[];
  } catch {
    return [];
  }
};

const writeUsers = (users: User[]) => {
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
};

export const createUser = async (email: string, password: string, name: string) => {
  const users = readUsers();

  const existing = users.find((u) => u.email === email);
  if (existing) {
    throw new Error('EMAIL_EXISTS');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user: User = {
    id: String(Date.now()),
    email,
    password: hashedPassword,
    name,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  writeUsers(users);

  return user;
};

export const findUserByEmail = (email: string): User | undefined => {
  const users = readUsers();
  return users.find((u) => u.email === email);
};
