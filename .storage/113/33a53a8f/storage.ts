import { PrisonRecord, AppSettings, LogEntry } from '@/types';

const RECORDS_KEY = 'pmdf_records';
const SETTINGS_KEY = 'pmdf_settings';
const LOGS_KEY = 'pmdf_logs';
const DEFAULT_WEBHOOK = 'https://discord.com/api/webhooks/1437270427029475399/o8RDT25lZcZ8eAMv7Va5hC85EH8U38wGyR_IOmLY7U145IlYgFryAEfyM_2zJ7WmzcBS';
const DEFAULT_MESSAGE_TEMPLATE = `🚨 **REGISTRO DE PRISÃO - PMDF/BOPE**

👤 **Nome do Indivíduo:** {individualName}
📅 **Data e Hora:** {dateTime}
📍 **Localização:** {location}
⚖️ **Motivo:** {reason}
📦 **Itens Apreendidos:** {seizedItems}
👮 **Oficiais Responsáveis:** {responsibleOfficers}
📝 **Registrado por:** {createdBy}`;

// Compress image to reduce storage size
export const compressImage = (base64: string, maxWidth: number = 1200, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } else {
        resolve(base64);
      }
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
};

// Get localStorage usage in MB
export const getStorageUsage = (): { used: number; total: number; percentage: number } => {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  const usedMB = (total / (1024 * 1024)).toFixed(2);
  const totalMB = 10; // Most browsers allow ~5-10MB
  const percentage = Math.round((parseFloat(usedMB) / totalMB) * 100);
  
  return {
    used: parseFloat(usedMB),
    total: totalMB,
    percentage: Math.min(percentage, 100)
  };
};

export const getRecords = (): PrisonRecord[] => {
  try {
    const data = localStorage.getItem(RECORDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao ler registros:', error);
    return [];
  }
};

export const saveRecord = (record: PrisonRecord) => {
  try {
    const records = getRecords();
    records.unshift(record);
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      throw new Error('STORAGE_FULL');
    }
    throw error;
  }
};

export const updateRecord = (recordId: string, updates: Partial<PrisonRecord>) => {
  const records = getRecords();
  const index = records.findIndex(r => r.id === recordId);
  if (index !== -1) {
    records[index] = { ...records[index], ...updates };
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  }
};

export const deleteRecord = (recordId: string): PrisonRecord | null => {
  const records = getRecords();
  const record = records.find(r => r.id === recordId);
  if (record) {
    const filteredRecords = records.filter(r => r.id !== recordId);
    localStorage.setItem(RECORDS_KEY, JSON.stringify(filteredRecords));
    return record;
  }
  return null;
};

export const clearAllRecords = () => {
  localStorage.removeItem(RECORDS_KEY);
};

export const getSettings = (): AppSettings => {
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : {
    webhookUrl: DEFAULT_WEBHOOK,
    discordMessageTemplate: DEFAULT_MESSAGE_TEMPLATE,
    appTitle: 'PMDF/BOPE',
    appSubtitle: 'Sistema de Registro de Prisões',
    brasiliaLogoUrl: '/assets/brasilia-logo.jpg',
    bopeLogoUrl: '/assets/bope-logo.png'
  };
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const getLogs = (): LogEntry[] => {
  const data = localStorage.getItem(LOGS_KEY);
  return data ? JSON.parse(data) : [];
};

export const addLog = (log: Omit<LogEntry, 'id' | 'timestamp'>) => {
  const logs = getLogs();
  const newLog: LogEntry = {
    ...log,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString()
  };
  logs.unshift(newLog);
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
};

// Convert base64 to Blob
function base64ToBlob(base64: string): Blob {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1] || 'image/png';
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  
  return new Blob([uInt8Array], { type: contentType });
}

export const sendToDiscord = async (record: PrisonRecord): Promise<boolean> => {
  const settings = getSettings();
  
  try {
    const message = settings.discordMessageTemplate
      .replace('{individualName}', record.individualName)
      .replace('{dateTime}', new Date(record.dateTime).toLocaleString('pt-BR'))
      .replace('{location}', record.location)
      .replace('{reason}', record.reason)
      .replace('{seizedItems}', record.seizedItems || 'Nenhum')
      .replace('{responsibleOfficers}', record.responsibleOfficers)
      .replace('{createdBy}', record.createdBy);

    // Create FormData for sending files
    const formData = new FormData();
    
    // Add the text message as JSON payload
    formData.append('payload_json', JSON.stringify({
      content: message
    }));

    // Add images as file attachments (Discord supports this natively)
    if (record.screenshots && record.screenshots.length > 0) {
      record.screenshots.forEach((screenshot, index) => {
        const blob = base64ToBlob(screenshot);
        formData.append(`file${index}`, blob, `evidencia_${index + 1}.png`);
      });
    }

    // Send to Discord webhook
    const response = await fetch(settings.webhookUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      console.error('Failed to send to Discord:', response.status);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao enviar para Discord:', error);
    return false;
  }
};

export const getRecordsByIndividual = (individualName: string): PrisonRecord[] => {
  const records = getRecords();
  return records.filter(r => r.individualName.toLowerCase() === individualName.toLowerCase());
};

export const getAllIndividuals = (): Array<{ name: string; count: number; lastRecord: PrisonRecord }> => {
  const records = getRecords();
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