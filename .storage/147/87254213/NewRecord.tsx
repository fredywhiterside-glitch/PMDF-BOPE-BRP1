import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, Loader2, Image as ImageIcon, X, Upload, Check, AlertTriangle } from 'lucide-react';
import { getCurrentUser, canCreateRecords } from '@/lib/auth';
import { saveRecord, sendToDiscord, getSettings, addLog, getRecords, compressImage, getStorageUsage } from '@/lib/storage';
import { PrisonRecord } from '@/types';
import { toast } from 'sonner';

// Helper function to validate if image is in base64 format
const isValidBase64Image = (str: string): boolean => {
  return str.startsWith('data:image/');
};

export default function NewRecord() {
  const [loading, setLoading] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [availablePhotos, setAvailablePhotos] = useState<string[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [sendToDiscordEnabled, setSendToDiscordEnabled] = useState(true);
  const [saveToDatabase, setSaveToDatabase] = useState(true);
  const [storageWarning, setStorageWarning] = useState(false);
  const [formData, setFormData] = useState({
    individualName: '',
    location: '',
    reason: '',
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
    const usage = getStorageUsage();
    if (usage.percentage > 80) {
      setStorageWarning(true);
      toast.warning(`Armazenamento em ${usage.percentage}% (${usage.used}MB/${usage.total}MB). Considere limpar registros antigos.`);
    }

    // Load individual data (for existing individuals)
    const individualData = localStorage.getItem('individual_data');
    if (individualData) {
      try {
        const parsed = JSON.parse(individualData);
        if (parsed.individualName) {
          setFormData(prev => ({ ...prev, individualName: parsed.individualName }));
        }
        if (parsed.availablePhotos && Array.isArray(parsed.availablePhotos)) {
          const validPhotos = parsed.availablePhotos.filter((photo: string) => isValidBase64Image(photo));
          setAvailablePhotos(validPhotos);
          if (validPhotos.length > 0) {
            toast.success(`${validPhotos.length} foto(s) disponível(is) para seleção`);
          }
        }
        localStorage.removeItem('individual_data');
      } catch (error) {
        console.error('Erro ao carregar dados do indivíduo:', error);
        localStorage.removeItem('individual_data');
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
              if (isValidBase64Image(imageData)) {
                toast.info('Comprimindo imagem...');
                const compressed = await compressImage(imageData);
                setScreenshots(prev => [...prev, compressed]);
                setSelectedPhotoIndex(null);
                toast.success('Imagem colada e comprimida com sucesso!');
              } else {
                toast.error('Formato de imagem inválido');
              }
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
          if (isValidBase64Image(imageData)) {
            toast.info(`Comprimindo ${file.name}...`);
            const compressed = await compressImage(imageData);
            setScreenshots(prev => [...prev, compressed]);
            setSelectedPhotoIndex(null);
            toast.success(`${file.name} carregada e comprimida!`);
          } else {
            toast.error(`Formato inválido: ${file.name}`);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSelectExistingPhoto = (index: number) => {
    setSelectedPhotoIndex(index);
    setScreenshots([availablePhotos[index]]);
    toast.success('Foto selecionada!');
  };

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

    if (!saveToDatabase && !sendToDiscordEnabled) {
      toast.error('Selecione pelo menos uma opção: Discord ou Banco de Dados');
      return;
    }

    // Validate all screenshots are in base64 format
    const invalidImages = screenshots.filter(img => !isValidBase64Image(img));
    if (invalidImages.length > 0) {
      console.error('❌ Imagens inválidas detectadas:', invalidImages);
      toast.error('Algumas imagens estão em formato inválido. Por favor, adicione novas fotos.');
      return;
    }

    setLoading(true);

    try {
      const now = new Date();
      const record: PrisonRecord = {
        id: crypto.randomUUID(),
        individualName: formData.individualName.trim(),
        location: formData.location.trim(),
        reason: formData.reason.trim(),
        seizedItems: formData.seizedItems.trim(),
        responsibleOfficers: formData.responsibleOfficers.trim(),
        dateTime: now.toISOString(),
        screenshots: screenshots,
        createdBy: user.username,
        createdAt: now.toISOString()
      };

      console.log('🔵 [SAVE DEBUG] ========================================');
      console.log('🔵 [SAVE DEBUG] Iniciando processo de salvamento');
      console.log('🔵 [SAVE DEBUG] ID do registro:', record.id);
      console.log('🔵 [SAVE DEBUG] Nome:', record.individualName);
      console.log('🔵 [SAVE DEBUG] Fotos:', record.screenshots.length);
      console.log('🔵 [SAVE DEBUG] Enviar Discord:', sendToDiscordEnabled);
      console.log('🔵 [SAVE DEBUG] Salvar BD:', saveToDatabase);

      let discordSuccess = false;
      let databaseSuccess = false;

      // Step 1: Send to Discord if enabled
      if (sendToDiscordEnabled) {
        console.log('🔵 [DISCORD] Enviando para Discord...');
        toast.info('Enviando para Discord...');
        discordSuccess = await sendToDiscord(record);
        
        if (!discordSuccess) {
          console.warn('⚠️ [DISCORD] Falha ao enviar para Discord');
          toast.warning('Erro ao enviar para Discord');
        } else {
          console.log('✅ [DISCORD] Enviado para Discord com sucesso');
          toast.success('✅ Enviado para Discord!');
        }
      } else {
        console.log('⏭️ [DISCORD] Envio para Discord desabilitado');
      }

      // Step 2: Save to database if enabled
      if (saveToDatabase) {
        console.log('🔵 [DATABASE] Iniciando salvamento no banco de dados...');
        
        const recordsBeforeSave = getRecords();
        console.log('🔵 [DATABASE] Registros ANTES do save:', recordsBeforeSave.length);
        
        toast.info('Salvando no banco de dados...');
        
        try {
          saveRecord(record);
          console.log('🔵 [DATABASE] saveRecord() executado');
          
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const recordsAfterSave = getRecords();
          console.log('🔵 [DATABASE] Registros APÓS save:', recordsAfterSave.length);
          
          const savedRecord = recordsAfterSave.find(r => r.id === record.id);
          
          if (savedRecord) {
            console.log('✅ [DATABASE] SUCESSO! Registro encontrado no banco');
            databaseSuccess = true;
            toast.success('✅ Salvo no banco de dados!');
          } else {
            throw new Error('Registro não encontrado após salvar');
          }
          
          addLog({
            action: 'create',
            performedBy: user.username,
            details: `Criou um novo registro de prisão: ${record.individualName}`
          });
        } catch (saveError) {
          if (saveError instanceof Error && saveError.message === 'STORAGE_FULL') {
            toast.error('❌ Armazenamento cheio! Limpe registros antigos nas configurações.');
            throw new Error('STORAGE_FULL');
          }
          throw saveError;
        }
      } else {
        console.log('⏭️ [DATABASE] Salvamento no banco desabilitado');
      }

      console.log('🔵 [FINAL] ========================================');
      console.log('🔵 [FINAL] Discord:', discordSuccess ? '✅' : '❌');
      console.log('🔵 [FINAL] Database:', databaseSuccess ? '✅' : '❌');

      if ((sendToDiscordEnabled && discordSuccess) || (saveToDatabase && databaseSuccess)) {
        toast.success('Registro criado com sucesso!');
        await new Promise(resolve => setTimeout(resolve, 200));
        navigate('/dashboard');
      } else {
        throw new Error('Falha ao salvar registro');
      }
      
    } catch (error) {
      console.error('❌ [ERROR] Erro ao criar registro:', error);
      if (error instanceof Error && error.message === 'STORAGE_FULL') {
        toast.error('Armazenamento cheio! Vá em Configurações → Gerenciar Dados para limpar registros antigos.');
      } else {
        toast.error('Erro ao criar registro. Verifique o console para detalhes.');
      }
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
    setSelectedPhotoIndex(null);
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
                  Nome do Indivíduo *
                </Label>
                <Input
                  id="individualName"
                  name="individualName"
                  value={formData.individualName}
                  onChange={handleChange}
                  required
                  className="bg-slate-800 border-slate-600 text-white focus:border-yellow-500"
                  placeholder="Nome completo do indivíduo preso"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-white">
                  Localização da Ocorrência *
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
                <Textarea
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  required
                  className="bg-slate-800 border-slate-600 text-white min-h-24 focus:border-yellow-500"
                  placeholder="Descreva o motivo da prisão e circunstâncias"
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
                <Label htmlFor="responsibleOfficers" className="text-white">
                  Oficiais Responsáveis *
                </Label>
                <Input
                  id="responsibleOfficers"
                  name="responsibleOfficers"
                  value={formData.responsibleOfficers}
                  onChange={handleChange}
                  required
                  className="bg-slate-800 border-slate-600 text-white focus:border-yellow-500"
                  placeholder="Nomes dos oficiais envolvidos"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Evidências Fotográficas * (imagens serão comprimidas automaticamente)
                </Label>

                {availablePhotos.length > 0 && (
                  <div className="mb-4">
                    <p className="text-slate-400 text-sm mb-3">
                      Selecione uma foto existente de {formData.individualName}:
                    </p>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                      {availablePhotos.map((photo, idx) => (
                        <div
                          key={idx}
                          className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                            selectedPhotoIndex === idx
                              ? 'border-yellow-500 ring-2 ring-yellow-500'
                              : 'border-slate-700 hover:border-slate-500'
                          }`}
                          onClick={() => handleSelectExistingPhoto(idx)}
                        >
                          <img
                            src={photo}
                            alt={`Foto ${idx + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          {selectedPhotoIndex === idx && (
                            <div className="absolute top-1 right-1 bg-yellow-500 rounded-full p-1">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg p-4">
                  <div className="text-center mb-3">
                    <p className="text-slate-400 text-sm mb-3">
                      {availablePhotos.length > 0 ? 'Ou adicione uma nova foto:' : 'Adicione fotos de duas formas:'}
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
                    onCheckedChange={(checked) => setSendToDiscordEnabled(checked as boolean)}
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
                    onCheckedChange={(checked) => setSaveToDatabase(checked as boolean)}
                    disabled={loading}
                    className="border-slate-600 data-[state=checked]:bg-yellow-600"
                  />
                  <Label
                    htmlFor="database"
                    className="text-slate-300 cursor-pointer select-none"
                  >
                    Salvar no Banco de Dados
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