import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, UserCheck, UserX, Trash2, Save, Users, Webhook } from 'lucide-react';
import { getCurrentUser, getUsers, updateUserRole, deleteUser, isAdmin } from '@/lib/auth';
import { getSettings, saveSettings } from '@/lib/storage';
import { User } from '@/types';
import { toast } from 'sonner';

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!currentUser || !isAdmin()) {
      navigate('/dashboard');
      return;
    }
    
    loadData();
  }, [currentUser, navigate]);

  const loadData = () => {
    setUsers(getUsers());
    const settings = getSettings();
    setWebhookUrl(settings.webhookUrl);
  };

  const handleApprove = (userId: string) => {
    updateUserRole(userId, 'user');
    loadData();
    toast.success('Usuário aprovado com sucesso!');
  };

  const handleReject = (userId: string) => {
    deleteUser(userId);
    loadData();
    toast.success('Usuário rejeitado e removido');
  };

  const handleDelete = (userId: string) => {
    if (confirm('Tem certeza que deseja remover este usuário?')) {
      deleteUser(userId);
      loadData();
      toast.success('Usuário removido com sucesso');
    }
  };

  const handleMakeAdmin = (userId: string) => {
    if (confirm('Tem certeza que deseja tornar este usuário um administrador?')) {
      updateUserRole(userId, 'admin');
      loadData();
      toast.success('Usuário promovido a administrador');
    }
  };

  const handleSaveWebhook = () => {
    saveSettings({ webhookUrl });
    toast.success('Webhook atualizado com sucesso!');
  };

  if (!currentUser || !isAdmin()) return null;

  const pendingUsers = users.filter(u => u.role === 'pending');
  const activeUsers = users.filter(u => u.role !== 'pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700 shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="/assets/bope-logo_variant_3.png" 
                alt="BOPE" 
                className="h-12 w-12 object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">
                  Painel Administrativo
                </h1>
                <p className="text-sm text-slate-400">Gerenciamento do Sistema</p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-900 mb-6 border border-slate-700">
            <TabsTrigger 
              value="pending" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-600 data-[state=active]:to-red-600"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Pendentes ({pendingUsers.length})
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-600 data-[state=active]:to-red-600"
            >
              <Users className="h-4 w-4 mr-2" />
              Usuários ({activeUsers.length})
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-600 data-[state=active]:to-red-600"
            >
              <Webhook className="h-4 w-4 mr-2" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Solicitações Pendentes</CardTitle>
                <CardDescription className="text-slate-400">
                  Aprove ou rejeite novos usuários
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingUsers.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">Nenhuma solicitação pendente</p>
                ) : (
                  <div className="space-y-4">
                    {pendingUsers.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                      >
                        <div>
                          <p className="text-white font-medium">{user.username}</p>
                          <p className="text-slate-500 text-sm">
                            Solicitado em {new Date(user.createdAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleApprove(user.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            onClick={() => handleReject(user.id)}
                            size="sm"
                            variant="destructive"
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Usuários Ativos</CardTitle>
                <CardDescription className="text-slate-400">
                  Gerencie usuários do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-white font-medium">{user.username}</p>
                          <p className="text-slate-500 text-sm">
                            Cadastrado em {new Date(user.createdAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <Badge 
                          variant={user.role === 'admin' ? 'default' : 'secondary'}
                          className={user.role === 'admin' ? 'bg-gradient-to-r from-yellow-600 to-red-600' : ''}
                        >
                          {user.role === 'admin' ? 'Admin' : 'Oficial'}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        {user.role === 'user' && (
                          <Button
                            onClick={() => handleMakeAdmin(user.id)}
                            size="sm"
                            variant="outline"
                            className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                          >
                            Tornar Admin
                          </Button>
                        )}
                        {user.username !== 'admin' && (
                          <Button
                            onClick={() => handleDelete(user.id)}
                            size="sm"
                            variant="destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Configuração do Webhook</CardTitle>
                <CardDescription className="text-slate-400">
                  Configure a URL do webhook do Discord para receber notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook" className="text-white">
                    URL do Webhook Discord
                  </Label>
                  <Input
                    id="webhook"
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white focus:border-yellow-500"
                    placeholder="https://discord.com/api/webhooks/..."
                  />
                </div>
                <Button
                  onClick={handleSaveWebhook}
                  className="bg-gradient-to-r from-yellow-600 to-red-600 hover:from-yellow-700 hover:to-red-700 font-semibold"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Webhook
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}