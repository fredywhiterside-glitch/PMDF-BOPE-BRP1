import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, UserCheck, UserX, Trash2, Save, Users, Webhook, FileText, Settings as SettingsIcon } from 'lucide-react';
import { getCurrentUser, getUsers, updateUserRole, deleteUser, isAdmin, getRoleLabel } from '@/lib/auth';
import { getSettings, saveSettings } from '@/lib/storage';
import { createLog } from '@/lib/supabase-storage';
import { User, UserRole } from '@/types';
import { toast } from 'sonner';

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState(getSettings());
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!currentUser || !isAdmin()) {
      navigate('/dashboard');
      return;
    }
    
    loadData();
  }, [currentUser, navigate]);

  const loadData = async () => {
    const allUsers = await getUsers();
    setUsers(allUsers);
  };

  const handleApprove = async (userId: string, role: UserRole = 'oficial') => {
    await updateUserRole(userId, role);
    
    if (currentUser) {
      await createLog({
        action: 'role_change',
        performedBy: currentUser.username,
        targetUser: users.find(u => u.id === userId)?.username,
        details: `Aprovou usuário com cargo: ${getRoleLabel(role)}`
      });
    }
    
    await loadData();
    toast.success('Usuário aprovado com sucesso!');
  };

  const handleReject = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    await deleteUser(userId);
    
    if (currentUser && user) {
      await createLog({
        action: 'user_remove',
        performedBy: currentUser.username,
        targetUser: user.username,
        details: 'Rejeitou solicitação de acesso'
      });
    }
    
    await loadData();
    toast.success('Usuário rejeitado e removido');
  };

  const handleDelete = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user?.username === 'Matheus Schulmeister') {
      toast.error('Não é possível remover o dono do aplicativo');
      return;
    }
    
    if (confirm(`Tem certeza que deseja remover ${user?.username}?`)) {
      await deleteUser(userId);
      
      if (currentUser && user) {
        await createLog({
          action: 'user_remove',
          performedBy: currentUser.username,
          targetUser: user.username,
          details: 'Removeu usuário do sistema'
        });
      }
      
      await loadData();
      toast.success('Usuário removido com sucesso');
    }
  };

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    const user = users.find(u => u.id === userId);
    if (user?.username === 'Matheus Schulmeister') {
      toast.error('Não é possível alterar o cargo do dono do aplicativo');
      return;
    }
    
    await updateUserRole(userId, newRole);
    
    if (currentUser && user) {
      await createLog({
        action: 'role_change',
        performedBy: currentUser.username,
        targetUser: user.username,
        details: `Alterou cargo para: ${getRoleLabel(newRole)}`
      });
    }
    
    await loadData();
    toast.success('Cargo atualizado com sucesso!');
  };

  const handleSaveSettings = () => {
    saveSettings(settings);
    toast.success('Configurações salvas com sucesso!');
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
                src={settings.bopeLogoUrl} 
                alt="BOPE" 
                className="h-12 w-12 object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">
                  Painel de Administração
                </h1>
                <p className="text-sm text-slate-400">Gerenciamento Completo do Sistema</p>
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
              <SettingsIcon className="h-4 w-4 mr-2" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white">Solicitações Pendentes</CardTitle>
                <CardDescription className="text-slate-400">
                  Aprove usuários e defina seus cargos
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
                            onClick={() => handleApprove(user.id, 'admin')}
                            size="sm"
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Administrador
                          </Button>
                          <Button
                            onClick={() => handleApprove(user.id, 'oficial')}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Oficial
                          </Button>
                          <Button
                            onClick={() => handleApprove(user.id, 'dono_org')}
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            Dono de Org
                          </Button>
                          <Button
                            onClick={() => handleReject(user.id)}
                            size="sm"
                            variant="destructive"
                          >
                            <UserX className="h-4 w-4" />
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
                <CardTitle className="text-white">Gerenciar Usuários</CardTitle>
                <CardDescription className="text-slate-400">
                  Altere cargos e remova usuários do sistema
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
                          <p className="text-white font-medium flex items-center gap-2">
                            {user.username}
                            {user.username === 'Matheus Schulmeister' && (
                              <Badge className="bg-gradient-to-r from-yellow-600 to-red-600">
                                Dono do App
                              </Badge>
                            )}
                          </p>
                          <p className="text-slate-500 text-sm">
                            Cadastrado em {new Date(user.createdAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <Badge 
                          variant="default"
                          className="bg-gradient-to-r from-yellow-600 to-red-600"
                        >
                          {getRoleLabel(user.role)}
                        </Badge>
                      </div>
                      <div className="flex gap-2 items-center">
                        {user.username !== 'Matheus Schulmeister' && (
                          <>
                            <Select
                              value={user.role}
                              onValueChange={(value) => handleChangeRole(user.id, value as UserRole)}
                            >
                              <SelectTrigger className="w-40 bg-slate-800 border-slate-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600">
                                <SelectItem value="admin" className="text-white">Administrador</SelectItem>
                                <SelectItem value="oficial" className="text-white">Oficial</SelectItem>
                                <SelectItem value="dono_org" className="text-white">Dono de Org</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              onClick={() => handleDelete(user.id)}
                              size="sm"
                              variant="destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    Webhook Discord
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Configure a URL do webhook e personalize a mensagem
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white">URL do Webhook</Label>
                    <Input
                      type="url"
                      value={settings.webhookUrl}
                      onChange={(e) => setSettings(prev => ({ ...prev, webhookUrl: e.target.value }))}
                      className="bg-slate-800 border-slate-600 text-white"
                      placeholder="https://discord.com/api/webhooks/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Template da Mensagem</Label>
                    <Textarea
                      value={settings.discordMessageTemplate}
                      onChange={(e) => setSettings(prev => ({ ...prev, discordMessageTemplate: e.target.value }))}
                      className="bg-slate-800 border-slate-600 text-white min-h-48 font-mono text-sm"
                      placeholder="Use {individualName}, {dateTime}, {location}, {reason}, {seizedItems}, {responsibleOfficers}, {createdBy}"
                    />
                    <p className="text-slate-500 text-xs">
                      Variáveis disponíveis: {'{individualName}'}, {'{dateTime}'}, {'{location}'}, {'{reason}'}, {'{seizedItems}'}, {'{responsibleOfficers}'}, {'{createdBy}'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white">Personalização Visual</CardTitle>
                  <CardDescription className="text-slate-400">
                    Altere títulos e logos do aplicativo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white">Título do Aplicativo</Label>
                    <Input
                      value={settings.appTitle}
                      onChange={(e) => setSettings(prev => ({ ...prev, appTitle: e.target.value }))}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Subtítulo</Label>
                    <Input
                      value={settings.appSubtitle}
                      onChange={(e) => setSettings(prev => ({ ...prev, appSubtitle: e.target.value }))}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">URL Logo Brasília</Label>
                    <Input
                      value={settings.brasiliaLogoUrl}
                      onChange={(e) => setSettings(prev => ({ ...prev, brasiliaLogoUrl: e.target.value }))}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">URL Logo BOPE</Label>
                    <Input
                      value={settings.bopeLogoUrl}
                      onChange={(e) => setSettings(prev => ({ ...prev, bopeLogoUrl: e.target.value }))}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={handleSaveSettings}
                className="w-full bg-gradient-to-r from-yellow-600 to-red-600 hover:from-yellow-700 hover:to-red-700 font-semibold"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Todas as Configurações
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}