import { PrisonRecord, AppSettings, LogEntry } from '@/types';
import { uploadMultipleImages } from './imageUpload';

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

export const getRecords = (): PrisonRecord[] => {
  const data = localStorage.getItem(RECORDS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveRecord = (record: PrisonRecord) => {
  const records = getRecords();
  records.unshift(record);
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
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

    // Send text message first
    await fetch(settings.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: message
      })
    });

    // Upload images to ImgBB and send to Discord
    if (record.screenshots && record.screenshots.length > 0) {
      // Wait a bit to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Upload images to ImgBB
      const imageUrls = await uploadMultipleImages(record.screenshots);
      
      if (imageUrls.length > 0) {
        // Send images as embeds (Discord supports up to 10 embeds)
        const embeds = imageUrls.slice(0, 10).map((url, index) => ({
          title: index === 0 ? '📸 Evidências Fotográficas' : undefined,
          image: {
            url: url
          },
          color: 0xff0000,
          footer: index === imageUrls.length - 1 ? {
            text: 'Sistema de Registro PMDF/BOPE - Brasília RP'
          } : undefined
        }));

        await fetch(settings.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            embeds: embeds
          })
        });
      }
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