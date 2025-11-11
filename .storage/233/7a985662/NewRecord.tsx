import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Image as ImageIcon, X, Upload, AlertTriangle } from 'lucide-react';
import { getCurrentUser, canCreateRecords } from '@/lib/auth';
import { getSettings } from '@/lib/storage';
import { createRecord, createLog, uploadImage, getStorageUsage } from '@/lib/supabase-storage';
import { PrisonRecord } from '@/types';
import { toast } from 'sonner';

// Helper function to compress image
const compressImage = async (base64Image: string, maxSizeMB: number = 0.5): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      const maxDimension = 1920;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        
        let quality = 0.7;
        let compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        
        while (compressedBase64.length > maxSizeMB * 1024 * 1024 * 1.37 && quality > 0.1) {
          quality -= 0.1;
          compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(compressedBase64);
      } else {
        resolve(base64Image);
      }
    };
    img.src = base64Image;
  });
};

// Helper function to convert image URL to base64
const urlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting URL to base64:', error);
    return '';
  }
};

// Helper function to send to Discord
const sendToDiscord = async (
  webhookUrl: string, 
  record: Omit<PrisonRecord, 'id' | 'createdAt'>, 
  individualPhotoUrl: string, 
  screenshots: string[]
): Promise<boolean> => {
  try {
    const formData = new FormData();
    
    // Format articles list
    const articlesList = record.articles.join('\n');
    
    // Create the message content
    const content = `🚨 **REGISTRO DE PRISÃO - PMDF/BOPE**

**Oficial Responsável:** ${record.responsibleOfficers}
**Local da Ocorrência:** ${record.location}
**Motivo da Ocorrência:** ${record.reason}

**Nome no RP:** ${record.individualName}
**ID Fixo:** ${record.fixedId}
**Artigos Aplicados:**
${articlesList}
**Observações:** ${record.observations || 'Nenhuma'}

**Itens Apreendidos:** ${record.seizedItems || 'Nenhum'}

📝 **Registrado por:** ${record.createdBy}
📅 **Data/Hora:** ${new Date(record.dateTime).toLocaleString('pt-BR')}`;

    formData.append('content', content);

    // Add individual photo if available
    if (individualPhotoUrl) {
      try {
        let photoBase64 = individualPhotoUrl;
        if (individualPhotoUrl.startsWith('http')) {
          photoBase64 = await urlToBase64(individualPhotoUrl);
        }
        
        if (photoBase64) {
          const photoBlob = await fetch(photoBase64).then(r => r.blob());
          formData.append('files[0]', photoBlob, '/images/photo1762803460.jpg');
        }
      } catch (error) {
        console.error('Error adding individual photo:', error);
      }
    }

    // Add screenshot images
    for (let i = 0; i < screenshots.length; i++) {
      try {
        let screenshotBase64 = screenshots[i];
        if (screenshots[i].startsWith('http')) {
          screenshotBase64 = await urlToBase64(screenshots[i]);
        }
        
        if (screenshotBase64) {
          const blob = await fetch(screenshotBase64).then(r => r.blob());
          const fileIndex = individualPhotoUrl ? i + 1 : i;
          formData.append(`files[${fileIndex}]`, blob, `evidence_${i + 1}.png`);
        }
      } catch (error) {
        console.error(`Error adding screenshot ${i}:`, error);
      }
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending to Discord:', error);
    return false;
  }
};

const ARTICLE_OPTIONS = [
  { value: 'SU 351 - FUGA', label: 'SU 351 - FUGA' },
  { value: 'SU 163 - VANDALISMO', label: 'SU 163 - VANDALISMO' },
  { value: 'SU 33 - TRAFICO DE DROGAS', label: 'SU 33 - TRAFICO DE DROGAS' },
  { value: 'SU 12 - PORTE DE MATERIAIS ILEGAIS', label: 'SU 12 - PORTE DE MATERIAIS ILEGAIS' },
  { value: 'SU 16 - PORTE DE ARMAS', label: 'SU 16 - PORTE DE ARMAS' },
  { value: 'SU 308 - CORRIDA ILEGAL', label: 'SU 308 - CORRIDA ILEGAL' },
  { value: 'SU 155 - FURTO', label: 'SU 155 - FURTO' },
  { value: 'SU 129 - AGRESSÃO', label: 'SU 129 - AGRESSÃO' },
  { value: 'SU 233 - ATENTADO AO PUDOR', label: 'SU 233 - ATENTADO AO PUDOR' },
  { value: 'SU 20 - PRECONCEITO', label: 'SU 20 - PRECONCEITO' },
  { value: 'SU 330 - DESOBEDIENCIA A ORDEM POLICIAL', label: 'SU 330 - DESOBEDIENCIA A ORDEM POLICIAL' },
  { value: 'SU 121 - TENTATIVA DE HOMICIDIO', label: 'SU 121 - TENTATIVA DE HOMICIDIO' },
  { value: 'SU 131 - HOMICIDIO', label: 'SU 131 - HOMICIDIO' },
  { value: 'SU 180 - OCULTAÇÃO FACIAL', label: 'SU 180 - OCULTAÇÃO FACIAL' },
  { value: 'SU 147 - AMEAÇA', label: 'SU 147 - AMEAÇA' },
  { value: 'SU 340 - FALSA COMUNICAÇÃO', label: 'SU 340 - FALSA COMUNICAÇÃO' },
  { value: 'SU 42 - PERTUBAÇÃO DO SOSSEGO', label: 'SU 42 - PERTUBAÇÃO DO SOSSEGO' },
  { value: 'SU 135 - OMISSÃO DE SOCORRO', label: 'SU 135 - OMISSÃO DE SOCORRO' },
  { value: 'SU 288 - MEMBRO DE GANGUE', label: 'SU 288 - MEMBRO DE GANGUE' },
  { value: 'SU 319 - PREVARICAÇÃO', label: 'SU 319 - PREVARICAÇÃO' },
  { value: 'SU 317 - SUBORNO', label: 'SU 317 - SUBORNO' }
];

export default function NewRecord() {
  const [loading, setLoading] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [sendToDiscordEnabled, setSendToDiscordEnabled] = useState(true);
  const [saveToDatabase, setSaveToDatabase] = useState(true);
  const [storageWarning, setStorageWarning] = useState(false);
  const [prefilledData, setPrefilledData] = useState<{
    individualName: string;
    fixedId: string;
    photo: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    individualName: '',
    fixedId: '',
    location: '',
    reason: '',
    articles: [] as string[],
    observations: '',
    seizedItems: '',
    responsibleOfficers: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const user = getCurrentUser();
  const settings = getSettings();

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    if (!canCreateRecords()) {
      toast.error('Você não tem permissão para criar registros');
      navigate('/dashboard');
      return;
    }

    // Check storage usage
    const checkStorage = async () => {
      const usage = await getStorageUsage();
      if (usage.percentage > 80) {
        setStorageWarning(true);
        toast.warning(`Armazenamento em ${usage.percentage.toFixed(1)}% (${usage.used.toFixed(1)}MB/${usage.total}MB). Considere limpar registros antigos.`);
      }
    };
    checkStorage();

    // Load prefilled data if coming from individual profile
    const prefilledDataStr = localStorage.getItem('prefilled_individual_data');
    if (prefilledDataStr) {
      try {
        const data = JSON.parse(prefilledDataStr);
        setPrefilledData(data);
        setFormData(prev => ({
          ...prev,
          individualName: data.individualName || '',
          fixedId: data.fixedId || ''
        }));
        if (data.photo) {
          setScreenshots([data.photo]);
        }
        localStorage.removeItem('prefilled_individual_data');
        toast.success('Dados do indivíduo carregados!');
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        localStorage.removeItem('prefilled_individual_data');
      }
    }

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = async (event) => {
              const imageData = event.target?.result as string;
              toast.info('Comprimindo imagem...');
              const compressed = await compressImage(imageData);
              setScreenshots(prev => [...prev, compressed]);
              toast.success('Imagem colada e comprimida com sucesso!');
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [user, navigate]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const imageData = event.target?.result as string;
          toast.info(`Comprimindo ${file.name}...`);
          const compressed = await compressImage(imageData);
          setScreenshots(prev => [...prev, compressed]);
          toast.success(`${file.name} carregada e comprimida!`);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleReasonChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, reason: value }));
  }, []);

  const handleArticleToggle = useCallback((article: string) => {
    setFormData(prev => ({
      ...prev,
      articles: prev.articles.includes(article)
        ? prev.articles.filter(a => a !== article)
        : [...prev.articles, article]
    }));
  }, []);

  const handleDiscordChange = useCallback((checked: boolean) => {
    setSendToDiscordEnabled(checked);
  }, []);

  const handleDatabaseChange = useCallback((checked: boolean) => {
    setSaveToDatabase(checked);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    if (screenshots.length === 0) {
      toast.error('Adicione pelo menos uma foto antes de salvar');
      return;
    }

    if (!formData.reason) {
      toast.error('Selecione o motivo da ocorrência');
      return;
    }

    if (formData.articles.length === 0) {
      toast.error('Selecione pelo menos um artigo');
      return;
    }

    if (!saveToDatabase && !sendToDiscordEnabled) {
      toast.error('Selecione pelo menos uma opção: Discord ou Banco de Dados');
      return;
    }

    setLoading(true);

    try {
      const now = new Date();
      
      const uploadedImageUrls: string[] = [];
      
      if (saveToDatabase) {
        toast.info('Fazendo upload das imagens...');
        for (let i = 0; i < screenshots.length; i++) {
          const screenshot = screenshots[i];
          
          if (screenshot.startsWith('http')) {
            uploadedImageUrls.push(screenshot);
          } else {
            const filename = `${crypto.randomUUID()}.jpg`;
            const url = await uploadImage(screenshot, filename);
            if (url) {
              uploadedImageUrls.push(url);
            }
          }
        }
        
        if (uploadedImageUrls.length === 0) {
          throw new Error('Falha ao fazer upload das imagens');
        }
        
        toast.success('Imagens carregadas!');
      }
      
      const record: Omit<PrisonRecord, 'id' | 'createdAt'> = {
        individualName: formData.individualName.trim(),
        fixedId: formData.fixedId.trim(),
        individualPhoto: uploadedImageUrls[0] || screenshots[0],
        location: formData.location.trim(),
        reason: formData.reason.trim(),
        articles: formData.articles,
        observations: formData.observations.trim(),
        seizedItems: formData.seizedItems.trim(),
        responsibleOfficers: formData.responsibleOfficers.trim(),
        dateTime: now.toISOString(),
        screenshots: saveToDatabase ? uploadedImageUrls : screenshots,
        createdBy: user.username
      };

      let discordSuccess = false;
      let databaseSuccess = false;

      if (sendToDiscordEnabled) {
        toast.info('Enviando para Discord...');
        
        const individualPhotoToSend = prefilledData?.photo || (saveToDatabase ? uploadedImageUrls[0] : screenshots[0]);
        const screenshotsToSend = saveToDatabase ? uploadedImageUrls.slice(1) : screenshots.slice(1);
        
        discordSuccess = await sendToDiscord(
          settings.webhookUrl, 
          record,
          individualPhotoToSend,
          screenshotsToSend
        );
        
        if (discordSuccess) {
          toast.success('✅ Enviado para Discord!');
        } else {
          toast.warning('Erro ao enviar para Discord');
        }
      }

      if (saveToDatabase) {
        toast.info('Salvando no banco de dados...');
        
        const savedRecord = await createRecord(record);
        
        if (savedRecord) {
          databaseSuccess = true;
          toast.success('✅ Salvo no banco de dados!');
          
          await createLog({
            action: 'create',
            performedBy: user.username,
            details: `Criou um novo registro de prisão: ${record.individualName}`
          });
        } else {
          throw new Error('Falha ao salvar no banco de dados');
        }
      }

      if ((sendToDiscordEnabled && discordSuccess) || (saveToDatabase && databaseSuccess)) {
        toast.success('Registro criado com sucesso!');
        await new Promise(resolve => setTimeout(resolve, 500));
        navigate('/dashboard');
      } else {
        throw new Error('Falha ao salvar registro');
      }
      
    } catch (error) {
      console.error('Erro ao criar registro:', error);
      toast.error('Erro ao criar registro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
    toast.info('Imagem removida');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="container mx-auto max-w-3xl py-8">
        <Button
          onClick={() => navigate('/dashboard')}
          variant="outline"
          className="mb-6 bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
          disabled={loading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        {storageWarning && (
          <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-yellow-200 font-semibold">Armazenamento quase cheio!</p>
              <p className="text-yellow-300 text-sm mt-1">
                Vá em Configurações → Gerenciar Dados para limpar registros antigos e liberar espaço.
              </p>
            </div>
          </div>
        )}

        <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <img 
                  src={settings.bopeLogoUrl} 
                  alt="BOPE" 
                  className="h-12 w-12 object-contain"
                />
                <div>
                  <CardTitle className="text-white text-2xl">Novo Registro de Prisão</CardTitle>
                  <CardDescription className="text-slate-400">
                    Preencha todos os campos para registrar uma nova ocorrência
                  </CardDescription>
                </div>
              </div>
              {prefilledData && (
                <div className="flex flex-col items-end gap-2 bg-slate-800/50 p-3 rounded-lg border border-slate-600">
                  {prefilledData.photo && (
                    <img 
                      src={prefilledData.photo} 
                      alt={prefilledData.individualName}
                      className="w-20 h-20 object-cover rounded-lg border-2 border-yellow-500"
                    />
                  )}
                  <div className="text-right">
                    <p className="text-white font-semibold text-sm">{prefilledData.individualName}</p>
                    <p className="text-slate-400 text-xs">ID: {prefilledData.fixedId}</p>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="individualName" className="text-white">
                  Nome *
                </Label>
                <Input
                  id="individualName"
                  name="individualName"
                  value={formData.individualName}
                  onChange={handleChange}
                  required
                  className="bg-slate-800 border-slate-600 text-white focus:border-yellow-500"
                  placeholder="Nome completo do indivíduo"
                  disabled={loading || !!prefilledData}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fixedId" className="text-white">
                  ID Fixo *
                </Label>
                <Input
                  id="fixedId"
                  name="fixedId"
                  value={formData.fixedId}
                  onChange={handleChange}
                  required
                  className="bg-slate-800 border-slate-600 text-white focus:border-yellow-500"
                  placeholder="ID fixo do indivíduo"
                  disabled={loading || !!prefilledData}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-white">
                  Local da Ocorrência *
                </Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  className="bg-slate-800 border-slate-600 text-white focus:border-yellow-500"
                  placeholder="Ex: Asa Norte, Quadra 102"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason" className="text-white">
                  Motivo da Ocorrência *
                </Label>
                <Select
                  value={formData.reason}
                  onValueChange={handleReasonChange}
                  disabled={loading}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white focus:border-yellow-500">
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="Vidros Escuros" className="text-white hover:bg-slate-700">
                      Vidros Escuros
                    </SelectItem>
                    <SelectItem value="Motorista ou Passageiro Mascarado" className="text-white hover:bg-slate-700">
                      Motorista ou Passageiro Mascarado
                    </SelectItem>
                    <SelectItem value="Direção Perigosa" className="text-white hover:bg-slate-700">
                      Direção Perigosa
                    </SelectItem>
                    <SelectItem value="Entrar e Sair de Becos em Curto Período de Tempo" className="text-white hover:bg-slate-700">
                      Entrar e Sair de Becos em Curto Período de Tempo
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">
                  Artigos * (Selecione um ou mais)
                </Label>
                <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                  {ARTICLE_OPTIONS.map((article) => (
                    <div key={article.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={article.value}
                        checked={formData.articles.includes(article.value)}
                        onCheckedChange={() => handleArticleToggle(article.value)}
                        disabled={loading}
                        className="border-slate-500 data-[state=checked]:bg-yellow-600"
                      />
                      <Label
                        htmlFor={article.value}
                        className="text-slate-300 cursor-pointer select-none text-sm"
                      >
                        {article.label}
                      </Label>
                    </div>
                  ))}
                </div>
                {formData.articles.length > 0 && (
                  <p className="text-slate-400 text-xs mt-2">
                    {formData.articles.length} artigo(s) selecionado(s)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsibleOfficers" className="text-white">
                  Oficial Responsável *
                </Label>
                <Input
                  id="responsibleOfficers"
                  name="responsibleOfficers"
                  value={formData.responsibleOfficers}
                  onChange={handleChange}
                  required
                  className="bg-slate-800 border-slate-600 text-white focus:border-yellow-500"
                  placeholder="Nome do oficial responsável"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations" className="text-white">
                  Observações
                </Label>
                <Textarea
                  id="observations"
                  name="observations"
                  value={formData.observations}
                  onChange={handleChange}
                  className="bg-slate-800 border-slate-600 text-white min-h-24 focus:border-yellow-500"
                  placeholder="Observações adicionais sobre o caso (opcional)"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seizedItems" className="text-white">
                  Itens Apreendidos
                </Label>
                <Textarea
                  id="seizedItems"
                  name="seizedItems"
                  value={formData.seizedItems}
                  onChange={handleChange}
                  className="bg-slate-800 border-slate-600 text-white min-h-24 focus:border-yellow-500"
                  placeholder="Liste os itens apreendidos (opcional)"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Evidências Fotográficas * (imagens serão comprimidas automaticamente)
                </Label>

                <div className="bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg p-4">
                  <div className="text-center mb-3">
                    <p className="text-slate-400 text-sm mb-3">
                      Adicione fotos de duas formas:
                    </p>
                    <div className="flex gap-3 justify-center flex-wrap">
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                        disabled={loading}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Carregar
                      </Button>
                      <div className="text-slate-400 text-sm flex items-center">
                        ou <kbd className="px-2 py-1 bg-slate-700 rounded mx-1">Ctrl+V</kbd> para colar
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={loading}
                    />
                  </div>
                  {screenshots.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                      {screenshots.map((screenshot, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={screenshot}
                            alt={`Screenshot ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-slate-700"
                          />
                          <button
                            type="button"
                            onClick={() => removeScreenshot(idx)}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={loading}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Save Options */}
              <div className="space-y-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <Label className="text-white font-semibold">Opções de Salvamento</Label>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="discord"
                    checked={sendToDiscordEnabled}
                    onCheckedChange={handleDiscordChange}
                    disabled={loading}
                    className="border-slate-600 data-[state=checked]:bg-yellow-600"
                  />
                  <Label
                    htmlFor="discord"
                    className="text-slate-300 cursor-pointer select-none"
                  >
                    Enviar para Discord
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="database"
                    checked={saveToDatabase}
                    onCheckedChange={handleDatabaseChange}
                    disabled={loading}
                    className="border-slate-600 data-[state=checked]:bg-yellow-600"
                  />
                  <Label
                    htmlFor="database"
                    className="text-slate-300 cursor-pointer select-none"
                  >
                    Salvar no Banco de Dados (Supabase)
                  </Label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-yellow-600 to-red-600 hover:from-yellow-700 hover:to-red-700 font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Registro
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}