import { User, UserRole } from '@/types';

const USERS_KEY = 'pmdf_users';
const CURRENT_USER_KEY = 'pmdf_current_user';

// Initialize with default admin user if no users exist
export const initializeOwner = () => {
  const users = getUsers();
  
  if (users.length === 0) {
    // Create default admin user
    const defaultUser: User = {
      id: crypto.randomUUID(),
      username: 'Matheus Schulmeister',
      passwordHash: hashPassword('admin123'),
      role: 'admin',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    
    const allUsers = [defaultUser];
    localStorage.setItem(USERS_KEY, JSON.stringify(allUsers));
  }
};

// Simple hash function (in production, use bcrypt or similar)
const hashPassword = (password: string): string => {
  // Simple hash for demo purposes
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

export const login = (username: string, password: string): { success: boolean; message: string } => {
  const users = getUsers();
  const passwordHash = hashPassword(password);
  const user = users.find(u => u.username === username && u.passwordHash === passwordHash);
  
  if (user && user.role !== 'pending') {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    updateUserActivity();
    return { success: true, message: 'Login realizado com sucesso!' };
  }
  
  if (user && user.role === 'pending') {
    return { success: false, message: 'Seu cadastro ainda está pendente de aprovação.' };
  }
  
  return { success: false, message: 'Usuário ou senha incorretos.' };
};

export const register = (username: string, password: string): { success: boolean; message: string } => {
  const users = getUsers();
  
  if (users.some(u => u.username === username)) {
    return { success: false, message: 'Nome de usuário já existe.' };
  }
  
  const newUser: User = {
    id: crypto.randomUUID(),
    username,
    passwordHash: hashPassword(password),
    role: 'pending',
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };
  
  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  
  return { success: true, message: 'Solicitação enviada! Aguarde aprovação de um administrador.' };
};

export const logout = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem(CURRENT_USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

export const updateUserActivity = () => {
  const user = getCurrentUser();
  if (user) {
    user.lastActivity = new Date().toISOString();
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    
    const users = getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      users[index] = user;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  }
};

export const getUsers = (): User[] => {
  const usersStr = localStorage.getItem(USERS_KEY);
  return usersStr ? JSON.parse(usersStr) : [];
};

export const getPendingUsers = (): User[] => {
  return getUsers().filter(u => u.role === 'pending');
};

export const approveUser = (userId: string, role: UserRole) => {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    user.role = role;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
};

export const rejectUser = (userId: string) => {
  const users = getUsers().filter(u => u.id !== userId);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const updateUserRole = (userId: string, role: UserRole) => {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    user.role = role;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
};

export const deleteUser = (userId: string) => {
  const users = getUsers().filter(u => u.id !== userId);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const isAdmin = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'admin';
};

export const isOwner = (): boolean => {
  const user = getCurrentUser();
  return user?.username === 'Matheus Schulmeister';
};

export const canCreateRecords = (): boolean => {
  const user = getCurrentUser();
  return user !== null && user.role !== 'pending';
};

export const canEditRecords = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'admin' || user?.role === 'oficial';
};

export const canDeleteRecords = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'admin';
};

export const getRoleLabel = (role: UserRole): string => {
  const labels: Record<UserRole, string> = {
    admin: 'Administrador',
    oficial: 'Oficial',
    dono_org: 'Dono de Org',
    pending: 'Pendente'
  };
  return labels[role];
};