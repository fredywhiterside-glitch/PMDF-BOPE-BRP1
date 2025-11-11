import { AppSettings } from '@/types';

const SETTINGS_KEY = 'pmdf_settings';
const DEFAULT_WEBHOOK = 'https://discord.com/api/webhooks/1437270427029475399/o8RDT25lZcZ8eAMv7Va5hC85EH8U38wGyR_IOmLY7U145IlYgFryAEfyM_2zJ7WmzcBS';
const DEFAULT_MESSAGE_TEMPLATE = `🚨 **REGISTRO DE PRISÃO - PMDF/BOPE**

👤 **Nome do Indivíduo:** {individualName}
📅 **Data e Hora:** {dateTime}
📍 **Localização:** {location}
⚖️ **Motivo:** {reason}
📦 **Itens Apreendidos:** {seizedItems}
👮 **Oficiais Responsáveis:** {responsibleOfficers}
📝 **Registrado por:** {createdBy}`;

export const getSettings = (): AppSettings => {
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : {
    webhookUrl: DEFAULT_WEBHOOK,
    discordMessageTemplate: DEFAULT_MESSAGE_TEMPLATE,
    appTitle: 'PMDF/BOPE',
    appSubtitle: 'Sistema de Registro de Prisões',
    brasiliaLogoUrl: 'https://public-frontend-cos.metadl.com/mgx/img/favicon.png',
    bopeLogoUrl: 'https://public-frontend-cos.metadl.com/mgx/img/favicon.png'
  };
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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

export const sendToDiscord = async (webhookUrl: string, message: string, imageUrls: string[]): Promise<boolean> => {
  try {
    const formData = new FormData();
    
    formData.append('payload_json', JSON.stringify({
      content: message
    }));

    // Add images as attachments
    if (imageUrls && imageUrls.length > 0) {
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        
        // If it's a Supabase URL, fetch and attach
        if (imageUrl.startsWith('http')) {
          try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            formData.append(`file${i}`, blob, `evidencia_${i + 1}.jpg`);
          } catch (error) {
            console.error('Error fetching image:', error);
          }
        }
        // If it's base64, convert and attach
        else if (imageUrl.startsWith('data:image/')) {
          const blob = base64ToBlob(imageUrl);
          formData.append(`file${i}`, blob, `evidencia_${i + 1}.png`);
        }
      }
    }

    const response = await fetch(webhookUrl, {
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