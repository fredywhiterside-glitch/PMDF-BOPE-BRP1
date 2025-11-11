import { PrisonRecord, AppSettings } from '@/types';

const RECORDS_KEY = 'pmdf_records';
const SETTINGS_KEY = 'pmdf_settings';
const DEFAULT_WEBHOOK = 'https://discord.com/api/webhooks/1437270427029475399/o8RDT25lZcZ8eAMv7Va5hC85EH8U38wGyR_IOmLY7U145IlYgFryAEfyM_2zJ7WmzcBS';

export const getRecords = (): PrisonRecord[] => {
  const data = localStorage.getItem(RECORDS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveRecord = (record: PrisonRecord) => {
  const records = getRecords();
  records.unshift(record);
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
};

export const getSettings = (): AppSettings => {
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : { webhookUrl: DEFAULT_WEBHOOK };
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const sendToDiscord = async (record: PrisonRecord): Promise<boolean> => {
  const settings = getSettings();
  
  const embed = {
    title: '🚨 NOVO REGISTRO DE PRISÃO - PMDF/BOPE',
    color: 0x0099ff,
    fields: [
      {
        name: '👤 Nome do Indivíduo',
        value: record.individualName,
        inline: false
      },
      {
        name: '📅 Data e Hora',
        value: new Date(record.dateTime).toLocaleString('pt-BR'),
        inline: true
      },
      {
        name: '📍 Localização',
        value: record.location,
        inline: true
      },
      {
        name: '⚖️ Motivo da Ocorrência',
        value: record.reason,
        inline: false
      },
      {
        name: '📦 Itens Apreendidos',
        value: record.seizedItems || 'Nenhum',
        inline: false
      },
      {
        name: '👮 Oficiais Responsáveis',
        value: record.responsibleOfficers,
        inline: false
      },
      {
        name: '📝 Registrado por',
        value: record.createdBy,
        inline: true
      }
    ],
    timestamp: new Date(record.createdAt).toISOString(),
    footer: {
      text: 'Sistema de Registro PMDF/BOPE - Brasília RP'
    }
  };

  try {
    const response = await fetch(settings.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    });
    
    return response.ok;
  } catch (error) {
    console.error('Erro ao enviar para Discord:', error);
    return false;
  }
};