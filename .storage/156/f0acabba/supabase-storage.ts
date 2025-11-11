import { supabase } from './supabase';
import { PrisonRecord, User, ActivityLog } from '@/types';

const APP_ID = 'd1fb97baaa';
const USERS_TABLE = `app_${APP_ID}_users`;
const RECORDS_TABLE = `app_${APP_ID}_records`;
const LOGS_TABLE = `app_${APP_ID}_logs`;
const STORAGE_BUCKET = `app_${APP_ID}_photos`;

// ============ USER MANAGEMENT ============

export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  
  return data.map(user => ({
    id: user.id,
    username: user.username,
    passwordHash: user.password_hash,
    role: user.role,
    createdAt: user.created_at,
    lastActivity: user.last_activity
  }));
};

export const createUser = async (user: Omit<User, 'id' | 'createdAt' | 'lastActivity'>): Promise<User | null> => {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .insert({
      username: user.username,
      password_hash: user.passwordHash,
      role: user.role
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating user:', error);
    return null;
  }
  
  return {
    id: data.id,
    username: data.username,
    passwordHash: data.password_hash,
    role: data.role,
    createdAt: data.created_at,
    lastActivity: data.last_activity
  };
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<boolean> => {
  const dbUpdates: Record<string, unknown> = {};
  
  if (updates.role) dbUpdates.role = updates.role;
  if (updates.lastActivity) dbUpdates.last_activity = updates.lastActivity;
  
  const { error } = await supabase
    .from(USERS_TABLE)
    .update(dbUpdates)
    .eq('id', userId);
  
  if (error) {
    console.error('Error updating user:', error);
    return false;
  }
  
  return true;
};

export const deleteUser = async (userId: string): Promise<boolean> => {
  const { error } = await supabase
    .from(USERS_TABLE)
    .delete()
    .eq('id', userId);
  
  if (error) {
    console.error('Error deleting user:', error);
    return false;
  }
  
  return true;
};

// ============ RECORD MANAGEMENT ============

export const getRecords = async (): Promise<PrisonRecord[]> => {
  const { data, error } = await supabase
    .from(RECORDS_TABLE)
    .select('*')
    .order('date_time', { ascending: false });
  
  if (error) {
    console.error('Error fetching records:', error);
    return [];
  }
  
  return data.map(record => ({
    id: record.id,
    individualName: record.individual_name,
    dateTime: record.date_time,
    location: record.location,
    reason: record.reason,
    seizedItems: record.seized_items,
    responsibleOfficers: record.responsible_officers,
    screenshots: record.screenshots || [],
    createdBy: record.created_by,
    createdAt: record.created_at,
    editedBy: record.edited_by,
    editedAt: record.edited_at
  }));
};

export const createRecord = async (record: Omit<PrisonRecord, 'id' | 'createdAt'>): Promise<PrisonRecord | null> => {
  const { data, error } = await supabase
    .from(RECORDS_TABLE)
    .insert({
      individual_name: record.individualName,
      date_time: record.dateTime,
      location: record.location,
      reason: record.reason,
      seized_items: record.seizedItems,
      responsible_officers: record.responsibleOfficers,
      screenshots: record.screenshots,
      created_by: record.createdBy,
      edited_by: record.editedBy,
      edited_at: record.editedAt
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating record:', error);
    return null;
  }
  
  return {
    id: data.id,
    individualName: data.individual_name,
    dateTime: data.date_time,
    location: data.location,
    reason: data.reason,
    seizedItems: data.seized_items,
    responsibleOfficers: data.responsible_officers,
    screenshots: data.screenshots || [],
    createdBy: data.created_by,
    createdAt: data.created_at,
    editedBy: data.edited_by,
    editedAt: data.edited_at
  };
};

export const updateRecord = async (recordId: string, updates: Partial<PrisonRecord>): Promise<boolean> => {
  const dbUpdates: Record<string, unknown> = {};
  
  if (updates.individualName) dbUpdates.individual_name = updates.individualName;
  if (updates.location) dbUpdates.location = updates.location;
  if (updates.reason) dbUpdates.reason = updates.reason;
  if (updates.seizedItems) dbUpdates.seized_items = updates.seizedItems;
  if (updates.responsibleOfficers) dbUpdates.responsible_officers = updates.responsibleOfficers;
  if (updates.editedBy) dbUpdates.edited_by = updates.editedBy;
  if (updates.editedAt) dbUpdates.edited_at = updates.editedAt;
  
  const { error } = await supabase
    .from(RECORDS_TABLE)
    .update(dbUpdates)
    .eq('id', recordId);
  
  if (error) {
    console.error('Error updating record:', error);
    return false;
  }
  
  return true;
};

export const deleteRecord = async (recordId: string): Promise<PrisonRecord | null> => {
  // First get the record to return it and delete associated images
  const { data: record, error: fetchError } = await supabase
    .from(RECORDS_TABLE)
    .select('*')
    .eq('id', recordId)
    .single();
  
  if (fetchError || !record) {
    console.error('Error fetching record for deletion:', fetchError);
    return null;
  }
  
  // Delete associated images from storage
  if (record.screenshots && record.screenshots.length > 0) {
    for (const screenshot of record.screenshots) {
      if (screenshot.startsWith('http')) {
        const path = screenshot.split('/').pop();
        if (path) {
          await deleteImage(path);
        }
      }
    }
  }
  
  // Delete the record
  const { error: deleteError } = await supabase
    .from(RECORDS_TABLE)
    .delete()
    .eq('id', recordId);
  
  if (deleteError) {
    console.error('Error deleting record:', deleteError);
    return null;
  }
  
  return {
    id: record.id,
    individualName: record.individual_name,
    dateTime: record.date_time,
    location: record.location,
    reason: record.reason,
    seizedItems: record.seized_items,
    responsibleOfficers: record.responsible_officers,
    screenshots: record.screenshots || [],
    createdBy: record.created_by,
    createdAt: record.created_at,
    editedBy: record.edited_by,
    editedAt: record.edited_at
  };
};

export const clearAllRecords = async (): Promise<boolean> => {
  // First, get all records to delete their images
  const records = await getRecords();
  
  // Delete all images from storage
  for (const record of records) {
    if (record.screenshots && record.screenshots.length > 0) {
      for (const screenshot of record.screenshots) {
        if (screenshot.startsWith('http')) {
          const path = screenshot.split('/').pop();
          if (path) {
            await deleteImage(path);
          }
        }
      }
    }
  }
  
  // Delete all records
  const { error } = await supabase
    .from(RECORDS_TABLE)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (error) {
    console.error('Error clearing records:', error);
    return false;
  }
  
  return true;
};

// ============ IMAGE MANAGEMENT ============

export const uploadImage = async (base64Image: string, filename: string): Promise<string | null> => {
  try {
    // Convert base64 to blob
    const base64Data = base64Image.split(',')[1];
    const mimeType = base64Image.split(',')[0].split(':')[1].split(';')[0];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, blob, {
        contentType: mimeType,
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filename);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    return null;
  }
};

export const deleteImage = async (filename: string): Promise<boolean> => {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([filename]);
  
  if (error) {
    console.error('Error deleting image:', error);
    return false;
  }
  
  return true;
};

// ============ INDIVIDUALS ============

export const getAllIndividuals = async (): Promise<Array<{ name: string; count: number; lastRecord: PrisonRecord }>> => {
  const records = await getRecords();
  const individualsMap = new Map<string, { count: number; lastRecord: PrisonRecord }>();
  
  records.forEach(record => {
    const existing = individualsMap.get(record.individualName);
    if (existing) {
      existing.count++;
      if (new Date(record.dateTime) > new Date(existing.lastRecord.dateTime)) {
        existing.lastRecord = record;
      }
    } else {
      individualsMap.set(record.individualName, { count: 1, lastRecord: record });
    }
  });
  
  return Array.from(individualsMap.entries()).map(([name, data]) => ({
    name,
    count: data.count,
    lastRecord: data.lastRecord
  })).sort((a, b) => b.count - a.count);
};

export const getRecordsByIndividual = async (individualName: string): Promise<PrisonRecord[]> => {
  const { data, error } = await supabase
    .from(RECORDS_TABLE)
    .select('*')
    .eq('individual_name', individualName)
    .order('date_time', { ascending: false });
  
  if (error) {
    console.error('Error fetching records by individual:', error);
    return [];
  }
  
  return data.map(record => ({
    id: record.id,
    individualName: record.individual_name,
    dateTime: record.date_time,
    location: record.location,
    reason: record.reason,
    seizedItems: record.seized_items,
    responsibleOfficers: record.responsible_officers,
    screenshots: record.screenshots || [],
    createdBy: record.created_by,
    createdAt: record.created_at,
    editedBy: record.edited_by,
    editedAt: record.edited_at
  }));
};

// ============ ACTIVITY LOGS ============

export const createLog = async (log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<boolean> => {
  const { error } = await supabase
    .from(LOGS_TABLE)
    .insert({
      action: log.action,
      performed_by: log.performedBy,
      target_user: log.targetUser,
      target_record: log.targetRecord ? JSON.stringify(log.targetRecord) : null,
      details: log.details
    });
  
  if (error) {
    console.error('Error creating log:', error);
    return false;
  }
  
  return true;
};

// ============ STORAGE USAGE ============

export const getStorageUsage = async (): Promise<{ used: number; total: number; percentage: number }> => {
  try {
    const { data: files, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list();
    
    if (error) {
      console.error('Error getting storage usage:', error);
      return { used: 0, total: 1000, percentage: 0 };
    }
    
    const totalBytes = files?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0;
    const totalMB = totalBytes / (1024 * 1024);
    const limitMB = 1000; // 1GB limit for free tier
    const percentage = (totalMB / limitMB) * 100;
    
    return {
      used: totalMB,
      total: limitMB,
      percentage: Math.min(percentage, 100)
    };
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    return { used: 0, total: 1000, percentage: 0 };
  }
};

// ============ SETTINGS ============

export const getSettings = () => {
  // Settings remain in localStorage for now
  const SETTINGS_KEY = 'pmdf_settings';
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : {
    webhookUrl: 'https://discord.com/api/webhooks/1437270427029475399/o8RDT25lZcZ8eAMv7Va5hC85EH8U38wGyR_IOmLY7U145IlYgFryAEfyM_2zJ7WmzcBS',
    discordMessageTemplate: `🚨 **REGISTRO DE PRISÃO - PMDF/BOPE**

👤 **Nome do Indivíduo:** {individualName}
📅 **Data e Hora:** {dateTime}
📍 **Localização:** {location}
⚖️ **Motivo:** {reason}
📦 **Itens Apreendidos:** {seizedItems}
👮 **Oficiais Responsáveis:** {responsibleOfficers}
📝 **Registrado por:** {createdBy}`,
    appTitle: 'PMDF/BOPE',
    appSubtitle: 'Sistema de Registro de Prisões',
    brasiliaLogoUrl: '/assets/brasilia-logo.jpg',
    bopeLogoUrl: '/assets/bope-logo.png'
  };
};