import { User, UserRole } from '@/types';

const USERS_KEY = 'pmdf_users';
const CURRENT_USER_KEY = 'pmdf_current_user';
const OWNER_USERNAME = 'admin'; // Usuário dono do sistema

export const initializeOwner = () => {
  const users = getUsers();
  const ownerExists = users.some(u => u.username === OWNER_USERNAME);
  
  if (!ownerExists) {
    const owner: User = {
      id: crypto.randomUUID(),
      username: OWNER_USERNAME,
      password: 'admin123', // Senha padrão do dono
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    users.push(owner);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
};

export const getUsers = (): User[] => {
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const register = (username: string, password: string): { success: boolean; message: string } => {
  const users = getUsers();
  
  if (users.some(u => u.username === username)) {
    return { success: false, message: 'Nome de usuário já existe' };
  }
  
  const newUser: User = {
    id: crypto.randomUUID(),
    username,
    password,
    role: 'pending',
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  saveUsers(users);
  
  return { success: true, message: 'Registro enviado para aprovação' };
};

export const login = (username: string, password: string): { success: boolean; message: string; user?: User } => {
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  
  if (!user) {
    return { success: false, message: 'Usuário ou senha incorretos' };
  }
  
  if (user.role === 'pending') {
    return { success: false, message: 'Seu cadastro ainda está pendente de aprovação' };
  }
  
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return { success: true, message: 'Login realizado com sucesso', user };
};

export const logout = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  return data ? JSON.parse(data) : null;
};

export const isAdmin = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'admin';
};

export const updateUserRole = (userId: string, role: UserRole) => {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    users[userIndex].role = role;
    saveUsers(users);
  }
};

export const deleteUser = (userId: string) => {
  const users = getUsers();
  const filteredUsers = users.filter(u => u.id !== userId);
  saveUsers(filteredUsers);
};