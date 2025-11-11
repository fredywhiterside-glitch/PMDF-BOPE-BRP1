import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, FileText, Camera, Users, Send } from 'lucide-react';
import { getSettings } from '@/lib/storage';

export default function Welcome() {
  const navigate = useNavigate();
  const settings = getSettings();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700 shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex gap-3">
                <img 
                  src={settings.brasiliaLogoUrl} 
                  alt="Brasília" 
                  className="h-12 w-12 object-contain rounded-full border-2 border-yellow-500"
                />
                <img 
                  src={settings.bopeLogoUrl} 
                  alt="BOPE" 
                  className="h-12 w-12 object-contain rounded-full border-2 border-red-600"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">
                  {settings.appTitle}
                </h1>
                <p className="text-sm text-slate-400">{settings.appSubtitle}</p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-gradient-to-r from-yellow-600 to-red-600 hover:from-yellow-700 hover:to-red-700 font-semibold"
            >
              Ir para Registros
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-3">Bem-vindo ao Sistema de Registros</h2>
          <p className="text-slate-400 text-lg">Aprenda como registrar uma prisão corretamente</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-yellow-600 to-red-600 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-white">Painel de Controle</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Acesse todas as funcionalidades do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="text-slate-300 space-y-2">
              <p>• <strong className="text-white">Dashboard:</strong> Visualize todos os registros de prisões</p>
              <p>• <strong className="text-white">Novo Registro:</strong> Crie um novo registro de prisão</p>
              <p>• <strong className="text-white">Membros Online:</strong> Veja quem está ativo no sistema</p>
              <p>• <strong className="text-white">Admin (Comando):</strong> Gerencie usuários e configurações</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-yellow-600 to-red-600 flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-white">Cargos e Permissões</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Entenda a hierarquia do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="text-slate-300 space-y-2">
              <p>• <strong className="text-yellow-400">Comando:</strong> Controle total do sistema</p>
              <p>• <strong className="text-blue-400">Oficial:</strong> Ver todos, criar, editar e excluir</p>
              <p>• <strong className="text-purple-400">Dono de Org:</strong> Ver seus registros, criar e editar</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-yellow-600 to-red-600 flex items-center justify-center">
                <Send className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-white text-2xl">Como Efetuar um Registro de Prisão</CardTitle>
            </div>
            <CardDescription className="text-slate-400">
              Siga este passo a passo para registrar uma prisão corretamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-r from-yellow-600 to-red-600 flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Clique em "Novo Registro"</h3>
                  <p className="text-slate-400">No dashboard, clique no botão "Novo Registro" no canto superior direito.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-r from-yellow-600 to-red-600 flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Preencha os Dados do Indivíduo</h3>
                  <p className="text-slate-400">Informe o nome completo da pessoa presa e a localização exata da ocorrência.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-r from-yellow-600 to-red-600 flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Descreva o Motivo da Prisão</h3>
                  <p className="text-slate-400">Explique detalhadamente o motivo da prisão e as circunstâncias da ocorrência.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-r from-yellow-600 to-red-600 flex items-center justify-center text-white font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Liste os Itens Apreendidos</h3>
                  <p className="text-slate-400">Se houver itens apreendidos, liste todos eles. Caso contrário, deixe em branco.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-r from-yellow-600 to-red-600 flex items-center justify-center text-white font-bold">
                  5
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Informe os Oficiais Responsáveis</h3>
                  <p className="text-slate-400">Liste os nomes de todos os oficiais que participaram da operação.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-r from-yellow-600 to-red-600 flex items-center justify-center text-white font-bold">
                  6
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Adicione Evidências Fotográficas
                  </h3>
                  <p className="text-slate-400 mb-2">Você pode adicionar fotos de duas formas:</p>
                  <ul className="text-slate-400 space-y-1 ml-4">
                    <li>• <strong className="text-white">Ctrl+V:</strong> Tire um print (PrintScreen) e cole com Ctrl+V no formulário</li>
                    <li>• <strong className="text-white">Carregar Arquivo:</strong> Clique no botão "Carregar Foto" e selecione imagens do seu computador</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-r from-yellow-600 to-red-600 flex items-center justify-center text-white font-bold">
                  7
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Salve o Registro</h3>
                  <p className="text-slate-400">Clique em "Salvar Registro" para finalizar. O registro será automaticamente enviado para o Discord!</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-yellow-950/30 border border-yellow-700 rounded-lg">
              <p className="text-yellow-200 text-sm">
                <strong>⚠️ Importante:</strong> A data e hora são ajustadas automaticamente pelo sistema. Certifique-se de preencher todos os campos obrigatórios marcados com *.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <Button
            onClick={() => navigate('/dashboard')}
            size="lg"
            className="bg-gradient-to-r from-yellow-600 to-red-600 hover:from-yellow-700 hover:to-red-700 font-semibold text-lg px-8"
          >
            Começar a Usar o Sistema
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}