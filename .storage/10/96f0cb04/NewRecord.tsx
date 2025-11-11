import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { saveRecord, sendToDiscord } from '@/lib/storage';
import { PrisonRecord } from '@/types';
import { toast } from 'sonner';

export default function NewRecord() {
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="container mx-auto max-w-3xl py-8">
        <Button
          onClick={() => navigate('/dashboard')}
          variant="outline"
          className="mb-6 bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Novo Registro de Prisão</CardTitle>
            <CardDescription className="text-slate-300">
              Preencha todos os campos para registrar uma nova ocorrência
            </CardDescription>
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
                  className="bg-slate-700 border-slate-600 text-white"
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
                    className="bg-slate-700 border-slate-600 text-white"
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
                    className="bg-slate-700 border-slate-600 text-white"
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
                  className="bg-slate-700 border-slate-600 text-white min-h-24"
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
                  className="bg-slate-700 border-slate-600 text-white min-h-24"
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
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Nomes dos oficiais envolvidos"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
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