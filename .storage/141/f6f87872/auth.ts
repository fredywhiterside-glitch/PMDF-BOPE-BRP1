import { User, UserRole } from '@/types';
import { getUsers as getSupabaseUsers, createUser as createSupabaseUser, updateUser as updateSupabaseUser, deleteUser as deleteSupabaseUser } from './supabase-storage';

const CURRENT_USER_KEY = 'pmdf_current_user';

// Initialize with default admin user if no users exist
export const initializeAuth = async () => {
  const users = await getSupabaseUsers();
  
  if (users.length === 0) {
    // Create default admin user
    const defaultUser: Omit<User, 'id' | 'createdAt' | 'lastActivity'> = {
      username: 'Matheus Schulmeister',
      passwordHash: await hashPassword('admin123'),
      role: 'admin'
    };
    
    await createSupabaseUser(defaultUser);
  }
};

// Simple hash function (in production, use bcrypt or similar)
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const login = async (username: string, password: string): Promise<User | null> => {
  const users = await getSupabaseUsers();
  const passwordHash = await hashPassword(password);
  const user = users.find(u => u.username === username && u.passwordHash === passwordHash);
  
  if (user && user.role !== 'pending') {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    await updateUserActivity();
    return user;
  }
  
  return null;
};

export const register = async (username: string, password: string): Promise<boolean> => {
  const users = await getSupabaseUsers();
  
  if (users.some(u => u.username === username)) {
    return false;
  }
  
  const passwordHash = await hashPassword(password);
  const newUser: Omit<User, 'id' | 'createdAt' | 'lastActivity'> = {
    username,
    passwordHash,
    role: 'pending'
  };
  
  const created = await createSupabaseUser(newUser);
  return created !== null;
};

export const logout = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem(CURRENT_USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

export const updateUserActivity = async () => {
  const user = getCurrentUser();
  if (user) {
    user.lastActivity = new Date().toISOString();
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    await updateSupabaseUser(user.id, { lastActivity: user.lastActivity });
  }
};

export const getUsers = async (): Promise<User[]> => {
  return await getSupabaseUsers();
};

export const getPendingUsers = async (): Promise<User[]> => {
  const users = await getSupabaseUsers();
  return users.filter(u => u.role === 'pending');
};

export const approveUser = async (userId: string, role: UserRole) => {
  await updateSupabaseUser(userId, { role });
};

export const rejectUser = async (userId: string) => {
  await deleteSupabaseUser(userId);
};

export const updateUserRole = async (userId: string, role: UserRole) => {
  await updateSupabaseUser(userId, { role });
};

export const deleteUser = async (userId: string) => {
  await deleteSupabaseUser(userId);
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