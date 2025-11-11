export type UserRole = 'admin' | 'user' | 'pending';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  createdAt: string;
}

export interface PrisonRecord {
  id: string;
  individualName: string;
  dateTime: string;
  location: string;
  reason: string;
  seizedItems: string;
  responsibleOfficers: string;
  createdBy: string;
  createdAt: string;
}

export interface AppSettings {
  webhookUrl: string;
}