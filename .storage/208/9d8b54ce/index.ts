export type UserRole = 'admin' | 'oficial' | 'dono_org' | 'pending' | 'comando';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
  lastActivity?: string;
}

export interface PrisonRecord {
  id: string;
  individualName: string;
  fixedId: string;
  dateTime: string;
  location: string;
  reason: string;
  articles: string;
  observations: string;
  seizedItems: string;
  responsibleOfficers: string;
  screenshots: string[];
  createdBy: string;
  createdAt: string;
  editedBy?: string;
  editedAt?: string;
}

export interface ActivityLog {
  id: string;
  action: 'delete' | 'edit' | 'role_change' | 'user_remove' | 'create';
  performedBy: string;
  targetUser?: string;
  targetRecord?: PrisonRecord;
  details: string;
  timestamp: string;
}

export interface AppSettings {
  webhookUrl: string;
  discordMessageTemplate: string;
  appTitle: string;
  appSubtitle: string;
  brasiliaLogoUrl: string;
  bopeLogoUrl: string;
}