import { User, UserRole } from '@/types';

const USERS_KEY = 'pmdf_users';
const CURRENT_USER_KEY = 'pmdf_current_user';
const OWNER_USERNAME = 'Matheus Schulmeister';

export const initializeOwner = () => {
  const users = getUsers();
  const ownerExists = users.some(u => u.username === OWNER_USERNAME);
  
  // Remove old admin user if exists
  const adminIndex = users.findIndex(u => u.username === 'admin');
  if (adminIndex !== -1) {
    users.splice(adminIndex, 1);
  }
  
  if (!ownerExists) {
    const owner: User = {
      id: crypto.randomUUID(),
      username: OWNER_USERNAME,
      password: 'matheus21',
      role: 'admin',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };
    users.push(owner);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } else {
    // Update existing Matheus Schulmeister to admin if not already
    const ownerIndex = users.findIndex(u => u.username === OWNER_USERNAME);
    if (ownerIndex !== -1 && users[ownerIndex].role !== 'admin') {
      users[ownerIndex].role = 'admin';
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
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
  
  user.lastActive = new Date().toISOString();
  const userIndex = users.findIndex(u => u.id === user.id);
  users[userIndex] = user;
  saveUsers(users);
  
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

export const updateUserActivity = () => {
  const user = getCurrentUser();
  if (user) {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      users[userIndex].lastActive = new Date().toISOString();
      saveUsers(users);
      user.lastActive = new Date().toISOString();
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    }
  }
};

export const getOnlineUsers = (): User[] => {
  const users = getUsers();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  return users.filter(u => 
    u.role !== 'pending' && 
    u.lastActive && 
    u.lastActive > fiveMinutesAgo
  );
};

export const isAdmin = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'admin';
};

export const canManageUsers = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'admin';
};

export const canEditRecords = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'admin' || user?.role === 'oficial';
};

export const canDeleteRecords = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'admin';
};

export const canViewAllRecords = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'admin' || user?.role === 'oficial' || user?.role === 'dono_org';
};

export const canCreateRecords = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'admin' || user?.role === 'oficial';
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

export const getRoleLabel = (role: UserRole): string => {
  const labels: Record<UserRole, string> = {
    admin: 'Administrador',
    oficial: 'Oficial',
    dono_org: 'Dono de Org',
    pending: 'Pendente',
    comando: 'Comando'
  };
  return labels[role];
};

export const getPendingUsers = (): User[] => {
  const users = getUsers();
  return users.filter(u => u.role === 'pending');
};

export const approveUser = (userId: string, role: UserRole) => {
  updateUserRole(userId, role);
};

export const rejectUser = (userId: string) => {
  deleteUser(userId);
};