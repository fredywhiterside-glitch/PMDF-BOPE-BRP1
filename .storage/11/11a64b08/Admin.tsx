import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, ArrowLeft, UserCheck, UserX, Trash2, Save, Users, Webhook } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <nav className="bg-slate-800/50 backdrop-blur border-b border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-400" />
              <div>
                <h1 className="text-xl font-bold text-white">Painel Administrativo</h1>
                <p className="text-sm text-slate-300">Gerenciamento do Sistema</p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 mb-6">
            <TabsTrigger value="pending" className="data-[state=active]:bg-blue-600">
              <UserCheck className="h-4 w-4 mr-2" />
              Pendentes ({pendingUsers.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-blue-600">
              <Users className="h-4 w-4 mr-2" />
              Usuários ({activeUsers.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600">
              <Webhook className="h-4 w-4 mr-2" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Solicitações Pendentes</CardTitle>
                <CardDescription className="text-slate-300">
                  Aprove ou rejeite novos usuários
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingUsers.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">Nenhuma solicitação pendente</p>
                ) : (
                  <div className="space-y-4">
                    {pendingUsers.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600"
                      >
                        <div>
                          <p className="text-white font-medium">{user.username}</p>
                          <p className="text-slate-400 text-sm">
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
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Usuários Ativos</CardTitle>
                <CardDescription className="text-slate-300">
                  Gerencie usuários do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-white font-medium">{user.username}</p>
                          <p className="text-slate-400 text-sm">
                            Cadastrado em {new Date(user.createdAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? 'Admin' : 'Oficial'}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        {user.role === 'user' && (
                          <Button
                            onClick={() => handleMakeAdmin(user.id)}
                            size="sm"
                            variant="outline"
                            className="bg-slate-600 border-slate-500 text-white hover:bg-slate-500"
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
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Configuração do Webhook</CardTitle>
                <CardDescription className="text-slate-300">
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
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="https://discord.com/api/webhooks/..."
                  />
                </div>
                <Button
                  onClick={handleSaveWebhook}
                  className="bg-blue-600 hover:bg-blue-700"
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