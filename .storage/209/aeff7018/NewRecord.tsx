import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Image as ImageIcon, X, Upload, Check, AlertTriangle } from 'lucide-react';
import { getCurrentUser, canCreateRecords } from '@/lib/auth';
import { sendToDiscord, getSettings } from '@/lib/storage';
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
    articles: '',
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

  const handleArticlesChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, articles: value }));
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

    if (!formData.articles) {
      toast.error('Selecione os artigos aplicados');
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
        location: formData.location.trim(),
        reason: formData.reason.trim(),
        articles: formData.articles.trim(),
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
        
        const message = settings.discordMessageTemplate
          .replace('{individualName}', record.individualName)
          .replace('{dateTime}', new Date(record.dateTime).toLocaleString('pt-BR'))
          .replace('{location}', record.location)
          .replace('{reason}', record.reason)
          .replace('{seizedItems}', record.seizedItems || 'Nenhum')
          .replace('{responsibleOfficers}', record.responsibleOfficers)
          .replace('{createdBy}', record.createdBy);
        
        discordSuccess = await sendToDiscord(settings.webhookUrl, message, saveToDatabase ? uploadedImageUrls : screenshots);
        
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
            <div className="flex items-center gap-4 mb-2">
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
                <Label htmlFor="articles" className="text-white">
                  Artigos *
                </Label>
                <Select
                  value={formData.articles}
                  onValueChange={handleArticlesChange}
                  disabled={loading}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white focus:border-yellow-500">
                    <SelectValue placeholder="Selecione os artigos" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600 max-h-[300px]">
                    <SelectItem value="SU 351 - FUGA" className="text-white hover:bg-slate-700">SU 351 - FUGA</SelectItem>
                    <SelectItem value="SU 163 - VANDALISMO" className="text-white hover:bg-slate-700">SU 163 - VANDALISMO</SelectItem>
                    <SelectItem value="SU 33 - TRAFICO DE DROGAS" className="text-white hover:bg-slate-700">SU 33 - TRAFICO DE DROGAS</SelectItem>
                    <SelectItem value="SU 12 - PORTE DE MATERIAIS ILEGAIS" className="text-white hover:bg-slate-700">SU 12 - PORTE DE MATERIAIS ILEGAIS</SelectItem>
                    <SelectItem value="SU 16 - PORTE DE ARMAS" className="text-white hover:bg-slate-700">SU 16 - PORTE DE ARMAS</SelectItem>
                    <SelectItem value="SU 308 - CORRIDA ILEGAL" className="text-white hover:bg-slate-700">SU 308 - CORRIDA ILEGAL</SelectItem>
                    <SelectItem value="SU 155 - FURTO" className="text-white hover:bg-slate-700">SU 155 - FURTO</SelectItem>
                    <SelectItem value="SU 129 - AGRESSÃO" className="text-white hover:bg-slate-700">SU 129 - AGRESSÃO</SelectItem>
                    <SelectItem value="SU 233 - ATENTADO AO PUDOR" className="text-white hover:bg-slate-700">SU 233 - ATENTADO AO PUDOR</SelectItem>
                    <SelectItem value="SU 20 - PRECONCEITO" className="text-white hover:bg-slate-700">SU 20 - PRECONCEITO</SelectItem>
                    <SelectItem value="SU 330 - DESOBEDIENCIA A ORDEM POLICIAL" className="text-white hover:bg-slate-700">SU 330 - DESOBEDIENCIA A ORDEM POLICIAL</SelectItem>
                    <SelectItem value="SU 121 - TENTATIVA DE HOMICIDIO" className="text-white hover:bg-slate-700">SU 121 - TENTATIVA DE HOMICIDIO</SelectItem>
                    <SelectItem value="SU 131 - HOMICIDIO" className="text-white hover:bg-slate-700">SU 131 - HOMICIDIO</SelectItem>
                    <SelectItem value="SU 180 - OCULTAÇÃO FACIAL" className="text-white hover:bg-slate-700">SU 180 - OCULTAÇÃO FACIAL</SelectItem>
                    <SelectItem value="SU 147 - AMEAÇA" className="text-white hover:bg-slate-700">SU 147 - AMEAÇA</SelectItem>
                    <SelectItem value="SU 340 - FALSA COMUNICAÇÃO" className="text-white hover:bg-slate-700">SU 340 - FALSA COMUNICAÇÃO</SelectItem>
                    <SelectItem value="SU 42 - PERTUBAÇÃO DO SOSSEGO" className="text-white hover:bg-slate-700">SU 42 - PERTUBAÇÃO DO SOSSEGO</SelectItem>
                    <SelectItem value="SU 135 - OMISSÃO DE SOCORRO" className="text-white hover:bg-slate-700">SU 135 - OMISSÃO DE SOCORRO</SelectItem>
                    <SelectItem value="SU 288 - MEMBRO DE GANGUE" className="text-white hover:bg-slate-700">SU 288 - MEMBRO DE GANGUE</SelectItem>
                    <SelectItem value="SU 319 - PREVARICAÇÃO" className="text-white hover:bg-slate-700">SU 319 - PREVARICAÇÃO</SelectItem>
                    <SelectItem value="SU 317 - SUBORNO" className="text-white hover:bg-slate-700">SU 317 - SUBORNO</SelectItem>
                  </SelectContent>
                </Select>
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