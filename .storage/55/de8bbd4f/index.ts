export type UserRole = 'comando' | 'oficial' | 'dono_org' | 'pending';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  createdAt: string;
  lastActive?: string;
}

export interface PrisonRecord {
  id: string;
  individualName: string;
  dateTime: string;
  location: string;
  reason: string;
  seizedItems: string;
  responsibleOfficers: string;
  screenshots: string[];
  createdBy: string;
  createdAt: string;
  editedBy?: string;
  editedAt?: string;
}

export interface LogEntry {
  id: string;
  action: 'delete' | 'edit' | 'role_change' | 'user_remove';
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