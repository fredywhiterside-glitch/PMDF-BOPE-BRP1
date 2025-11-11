import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2, Image as ImageIcon, X, Upload } from 'lucide-react';
import { getCurrentUser, canCreateRecords } from '@/lib/auth';
import { saveRecord, sendToDiscord, getSettings, addLog } from '@/lib/storage';
import { PrisonRecord } from '@/types';
import { toast } from 'sonner';

export default function NewRecord() {
  const [loading, setLoading] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>([]);
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

    // Load cloned record data
    const cloneData = localStorage.getItem('clone_record');
    if (cloneData) {
      try {
        const { individualName, screenshots: clonedScreenshots } = JSON.parse(cloneData);
        if (individualName) {
          setFormData(prev => ({ ...prev, individualName }));
        }
        if (clonedScreenshots && Array.isArray(clonedScreenshots)) {
          setScreenshots(clonedScreenshots);
        }
        localStorage.removeItem('clone_record');
        toast.success('Dados carregados! Preencha os demais campos.');
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        localStorage.removeItem('clone_record');
      }
    }

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const imageData = event.target?.result as string;
              setScreenshots(prev => [...prev, imageData]);
              toast.success('Imagem colada com sucesso!');
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [user, navigate]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageData = event.target?.result as string;
          setScreenshots(prev => [...prev, imageData]);
          toast.success(`Imagem ${file.name} carregada com sucesso!`);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Usuário não autenticado');
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

      // Save record locally first
      saveRecord(record);
      
      // Add log entry
      addLog({
        action: 'create',
        performedBy: user.username,
        details: `Criou um novo registro de prisão: ${record.individualName}`
      });

      // Show initial success message
      toast.success('Registro salvo! Enviando para Discord...');
      
      // Try to send to Discord (don't block on this)
      sendToDiscord(record)
        .then((success) => {
          if (success) {
            toast.success('Registro enviado para Discord com sucesso!');
          } else {
            toast.warning('Registro salvo, mas houve erro ao enviar para Discord');
          }
        })
        .catch((error) => {
          console.error('Erro ao enviar para Discord:', error);
          toast.warning('Registro salvo, mas houve erro ao enviar para Discord');
        });
      
      // Navigate immediately after saving locally
      navigate('/dashboard');
    } catch (error) {
      console.error('Erro ao criar registro:', error);
      toast.error('Erro ao criar registro. Tente novamente.');
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
                  Evidências Fotográficas
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