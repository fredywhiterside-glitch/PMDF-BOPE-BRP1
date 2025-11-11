import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { saveRecord, sendToDiscord } from '@/lib/storage';
import { PrisonRecord } from '@/types';
import { toast } from 'sonner';

export default function NewRecord() {
  const [loading, setLoading] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    individualName: '',
    dateTime: new Date().toISOString().slice(0, 16),
    location: '',
    reason: '',
    seizedItems: '',
    responsibleOfficers: ''
  });
  const navigate = useNavigate();
  const user = getCurrentUser();

  useEffect(() => {
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
  }, []);

  if (!user) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const record: PrisonRecord = {
      id: crypto.randomUUID(),
      ...formData,
      screenshots,
      createdBy: user.username,
      createdAt: new Date().toISOString()
    };

    try {
      saveRecord(record);
      const webhookSent = await sendToDiscord(record);
      
      if (webhookSent) {
        toast.success('Registro criado e enviado para Discord com sucesso!');
      } else {
        toast.warning('Registro criado, mas houve erro ao enviar para Discord');
      }
      
      navigate('/dashboard');
    } catch (error) {
      toast.error('Erro ao criar registro');
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="container mx-auto max-w-3xl py-8">
        <Button
          onClick={() => navigate('/dashboard')}
          variant="outline"
          className="mb-6 bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <div className="flex items-center gap-4 mb-2">
              <img 
                src="/assets/bope-logo_variant_2.png" 
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
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateTime" className="text-white">
                    Data e Hora *
                  </Label>
                  <Input
                    id="dateTime"
                    name="dateTime"
                    type="datetime-local"
                    value={formData.dateTime}
                    onChange={handleChange}
                    required
                    className="bg-slate-800 border-slate-600 text-white focus:border-yellow-500"
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
                  />
                </div>
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
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Evidências Fotográficas (Ctrl+V para colar)
                </Label>
                <div className="bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg p-4 text-center">
                  <p className="text-slate-400 text-sm mb-2">
                    Pressione Ctrl+V para colar screenshots da área de transferência
                  </p>
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