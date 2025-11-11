import { supabase, BUCKET_NAME } from './supabase';
import { PrisonRecord, User, LogEntry } from '@/types';

const APP_ID = 'd1fb97baaa';

// Upload image to Supabase Storage
export const uploadImage = async (base64Image: string, fileName: string): Promise<string | null> => {
  try {
    // Convert base64 to blob
    const base64Data = base64Image.split(',')[1];
    const contentType = base64Image.split(';')[0].split(':')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: contentType });

    // Upload to Supabase Storage
    const filePath = `${Date.now()}_${fileName}`;
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, blob, {
        contentType: contentType,
        upsert: false
      });

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    return null;
  }
};

// Delete image from Supabase Storage
export const deleteImage = async (imageUrl: string): Promise<boolean> => {
  try {
    const filePath = imageUrl.split(`${BUCKET_NAME}/`)[1];
    if (!filePath) return false;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting image:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteImage:', error);
    return false;
  }
};

// Users
export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from(`app_${APP_ID}_users`)
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
    .from(`app_${APP_ID}_users`)
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
  const updateData: any = {};
  if (updates.role) updateData.role = updates.role;
  if (updates.lastActivity) updateData.last_activity = updates.lastActivity;

  const { error } = await supabase
    .from(`app_${APP_ID}_users`)
    .update(updateData)
    .eq('id', userId);

  if (error) {
    console.error('Error updating user:', error);
    return false;
  }

  return true;
};

export const deleteUser = async (userId: string): Promise<boolean> => {
  const { error } = await supabase
    .from(`app_${APP_ID}_users`)
    .delete()
    .eq('id', userId);

  if (error) {
    console.error('Error deleting user:', error);
    return false;
  }

  return true;
};

// Records
export const getRecords = async (): Promise<PrisonRecord[]> => {
  const { data, error } = await supabase
    .from(`app_${APP_ID}_records`)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching records:', error);
    return [];
  }

  return data.map(record => ({
    id: record.id,
    individualName: record.individual_name,
    location: record.location,
    reason: record.reason,
    seizedItems: record.seized_items,
    responsibleOfficers: record.responsible_officers,
    dateTime: record.date_time,
    screenshots: record.screenshots,
    createdBy: record.created_by,
    createdAt: record.created_at,
    editedBy: record.edited_by,
    editedAt: record.edited_at
  }));
};

export const createRecord = async (record: Omit<PrisonRecord, 'id' | 'createdAt'>): Promise<PrisonRecord | null> => {
  const { data, error } = await supabase
    .from(`app_${APP_ID}_records`)
    .insert({
      individual_name: record.individualName,
      location: record.location,
      reason: record.reason,
      seized_items: record.seizedItems,
      responsible_officers: record.responsibleOfficers,
      date_time: record.dateTime,
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
    location: data.location,
    reason: data.reason,
    seizedItems: data.seized_items,
    responsibleOfficers: data.responsible_officers,
    dateTime: data.date_time,
    screenshots: data.screenshots,
    createdBy: data.created_by,
    createdAt: data.created_at,
    editedBy: data.edited_by,
    editedAt: data.edited_at
  };
};

export const updateRecord = async (recordId: string, updates: Partial<PrisonRecord>): Promise<boolean> => {
  const updateData: any = {};
  if (updates.individualName) updateData.individual_name = updates.individualName;
  if (updates.location) updateData.location = updates.location;
  if (updates.reason) updateData.reason = updates.reason;
  if (updates.seizedItems !== undefined) updateData.seized_items = updates.seizedItems;
  if (updates.responsibleOfficers) updateData.responsible_officers = updates.responsibleOfficers;
  if (updates.editedBy) updateData.edited_by = updates.editedBy;
  if (updates.editedAt) updateData.edited_at = updates.editedAt;

  const { error } = await supabase
    .from(`app_${APP_ID}_records`)
    .update(updateData)
    .eq('id', recordId);

  if (error) {
    console.error('Error updating record:', error);
    return false;
  }

  return true;
};

export const deleteRecord = async (recordId: string): Promise<PrisonRecord | null> => {
  // First get the record to return it
  const { data: record, error: fetchError } = await supabase
    .from(`app_${APP_ID}_records`)
    .select('*')
    .eq('id', recordId)
    .single();

  if (fetchError || !record) {
    console.error('Error fetching record for deletion:', fetchError);
    return null;
  }

  // Delete associated images
  if (record.screenshots && record.screenshots.length > 0) {
    for (const imageUrl of record.screenshots) {
      if (imageUrl.includes(BUCKET_NAME)) {
        await deleteImage(imageUrl);
      }
    }
  }

  // Delete the record
  const { error: deleteError } = await supabase
    .from(`app_${APP_ID}_records`)
    .delete()
    .eq('id', recordId);

  if (deleteError) {
    console.error('Error deleting record:', deleteError);
    return null;
  }

  return {
    id: record.id,
    individualName: record.individual_name,
    location: record.location,
    reason: record.reason,
    seizedItems: record.seized_items,
    responsibleOfficers: record.responsible_officers,
    dateTime: record.date_time,
    screenshots: record.screenshots,
    createdBy: record.created_by,
    createdAt: record.created_at,
    editedBy: record.edited_by,
    editedAt: record.edited_at
  };
};

export const clearAllRecords = async (): Promise<boolean> => {
  try {
    // Get all records first to delete their images
    const records = await getRecords();
    
    // Delete all images
    for (const record of records) {
      if (record.screenshots && record.screenshots.length > 0) {
        for (const imageUrl of record.screenshots) {
          if (imageUrl.includes(BUCKET_NAME)) {
            await deleteImage(imageUrl);
          }
        }
      }
    }

    // Delete all records
    const { error } = await supabase
      .from(`app_${APP_ID}_records`)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
      console.error('Error clearing all records:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in clearAllRecords:', error);
    return false;
  }
};

// Logs
export const getLogs = async (): Promise<LogEntry[]> => {
  const { data, error } = await supabase
    .from(`app_${APP_ID}_logs`)
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching logs:', error);
    return [];
  }

  return data.map(log => ({
    id: log.id,
    action: log.action,
    performedBy: log.performed_by,
    targetUser: log.target_user,
    targetRecord: log.target_record,
    details: log.details,
    timestamp: log.timestamp
  }));
};

export const createLog = async (log: Omit<LogEntry, 'id' | 'timestamp'>): Promise<boolean> => {
  const { error } = await supabase
    .from(`app_${APP_ID}_logs`)
    .insert({
      action: log.action,
      performed_by: log.performedBy,
      target_user: log.targetUser,
      target_record: log.targetRecord,
      details: log.details
    });

  if (error) {
    console.error('Error creating log:', error);
    return false;
  }

  return true;
};

// Helper functions
export const getRecordsByIndividual = async (individualName: string): Promise<PrisonRecord[]> => {
  const { data, error } = await supabase
    .from(`app_${APP_ID}_records`)
    .select('*')
    .ilike('individual_name', individualName)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching records by individual:', error);
    return [];
  }

  return data.map(record => ({
    id: record.id,
    individualName: record.individual_name,
    location: record.location,
    reason: record.reason,
    seizedItems: record.seized_items,
    responsibleOfficers: record.responsible_officers,
    dateTime: record.date_time,
    screenshots: record.screenshots,
    createdBy: record.created_by,
    createdAt: record.created_at,
    editedBy: record.edited_by,
    editedAt: record.edited_at
  }));
};

export const getAllIndividuals = async (): Promise<Array<{ name: string; count: number; lastRecord: PrisonRecord }>> => {
  const records = await getRecords();
  const individualsMap = new Map<string, PrisonRecord[]>();
  
  records.forEach(record => {
    const name = record.individualName.toLowerCase();
    if (!individualsMap.has(name)) {
      individualsMap.set(name, []);
    }
    individualsMap.get(name)!.push(record);
  });
  
  const individuals: Array<{ name: string; count: number; lastRecord: PrisonRecord }> = [];
  individualsMap.forEach((recordsList, name) => {
    recordsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    individuals.push({
      name: recordsList[0].individualName,
      count: recordsList.length,
      lastRecord: recordsList[0]
    });
  });
  
  return individuals.sort((a, b) => b.count - a.count);
};

// Get storage usage from Supabase
export const getStorageUsage = async (): Promise<{ used: number; total: number; percentage: number }> => {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list();

    if (error) {
      console.error('Error getting storage usage:', error);
      return { used: 0, total: 1000, percentage: 0 };
    }

    let totalSize = 0;
    if (data) {
      for (const file of data) {
        totalSize += file.metadata?.size || 0;
      }
    }

    const usedMB = totalSize / (1024 * 1024);
    const totalMB = 1000; // Supabase free tier: 1GB
    const percentage = Math.round((usedMB / totalMB) * 100);

    return {
      used: parseFloat(usedMB.toFixed(2)),
      total: totalMB,
      percentage: Math.min(percentage, 100)
    };
  } catch (error) {
    console.error('Error in getStorageUsage:', error);
    return { used: 0, total: 1000, percentage: 0 };
  }
};