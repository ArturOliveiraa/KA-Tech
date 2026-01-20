"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByEmail = exports.createUser = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const filePath = path_1.default.join(__dirname, '..', 'users.json');
const readUsers = () => {
    if (!fs_1.default.existsSync(filePath)) {
        return [];
    }
    const data = fs_1.default.readFileSync(filePath, 'utf-8');
    try {
        return JSON.parse(data);
    }
    catch {
        return [];
    }
};
const writeUsers = (users) => {
    fs_1.default.writeFileSync(filePath, JSON.stringify(users, null, 2));
};
const createUser = async (email, password, name) => {
    const users = readUsers();
    const existing = users.find((u) => u.email === email);
    if (existing) {
        throw new Error('EMAIL_EXISTS');
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    const user = {
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
exports.createUser = createUser;
const findUserByEmail = (email) => {
    const users = readUsers();
    return users.find((u) => u.email === email);
};
exports.findUserByEmail = findUserByEmail;
