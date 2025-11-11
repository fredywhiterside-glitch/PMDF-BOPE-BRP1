import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, LogOut, FileText, Edit, Trash2, Search, Home, FolderOpen, Users, UserCheck, BookOpen, UserCircle, Settings, Database, AlertTriangle } from 'lucide-react';
import { getCurrentUser, logout, updateUserActivity, canEditRecords, canDeleteRecords, canCreateRecords, getRoleLabel, isAdmin, isOwner, getUsers, getPendingUsers, approveUser, rejectUser, updateUserRole, deleteUser } from '@/lib/auth';
import { getRecords, updateRecord, deleteRecord, createLog, getSettings, getAllIndividuals, getRecordsByIndividual, clearAllRecords, getStorageUsage } from '@/lib/supabase-storage';
import { PrisonRecord, User, UserRole } from '@/types';
import { toast } from 'sonner';

const APP_VERSION = 'v1.3.0';

export default function Dashboard() {
  const [records, setRecords] = useState<PrisonRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState<'home' | 'records' | 'pending' | 'members' | 'individuals' | 'settings'>('home');
  const [selectedIndividual, setSelectedIndividual] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<PrisonRecord | null>(null);
  const [editForm, setEditForm] = useState({
    individualName: '',
    location: '',
    reason: '',
    seizedItems: '',
    responsibleOfficers: ''
  });
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [storageUsage, setStorageUsage] = useState({ used: 0, total: 1000, percentage: 0 });
  const [individuals, setIndividuals] = useState<Array<{ name: string; count: number; lastRecord: PrisonRecord }>>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = getCurrentUser();
  const settings = getSettings();

  const filteredRecords = useMemo(() => {
    if (searchTerm.trim() === '') {
      return records;
    }
    const term = searchTerm.toLowerCase();
    return records.filter(record => 
      record.individualName.toLowerCase().includes(term) ||
      record.location.toLowerCase().includes(term) ||
      record.reason.toLowerCase().includes(term) ||
      record.responsibleOfficers.toLowerCase().includes(term) ||
      record.seizedItems.toLowerCase().includes(term)
    );
  }, [searchTerm, records]);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    loadData();
    
    const activityInterval = setInterval(() => {
      updateUserActivity();
      loadData();
    }, 30000);
    
    return () => clearInterval(activityInterval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allRecords, pending, users, individualsData, usage] = await Promise.all([
        getRecords(),
        getPendingUsers(),
        getUsers(),
        getAllIndividuals(),
        getStorageUsage()
      ]);
      
      setRecords(allRecords);
      setPendingUsers(pending);
      setAllUsers(users.filter(u => u.role !== 'pending'));
      setIndividuals(individualsData);
      setStorageUsage(usage);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleEdit = (record: PrisonRecord) => {
    if (!canEditRecords()) {
      toast.error('Você não tem permissão para editar registros');
      return;
    }
    
    setEditingRecord(record);
    setEditForm({
      individualName: record.individualName,
      location: record.location,
      reason: record.reason,
      seizedItems: record.seizedItems,
      responsibleOfficers: record.responsibleOfficers
    });
  };

  const handleSaveEdit = async () => {
    if (!editingRecord || !user) return;

    const success = await updateRecord(editingRecord.id, {
      ...editForm,
      editedBy: user.username,
      editedAt: new Date().toISOString()
    });

    if (success) {
      await createLog({
        action: 'edit',
        performedBy: user.username,
        details: `Editou o registro de prisão: ${editingRecord.individualName}`
      });

      toast.success('Registro atualizado com sucesso!');
      setEditingRecord(null);
      await loadData();
    } else {
      toast.error('Erro ao atualizar registro');
    }
  };

  const handleDelete = async (record: PrisonRecord) => {
    if (!canDeleteRecords()) {
      toast.error('Você não tem permissão para excluir registros');
      return;
    }

    if (!user) return;

    if (confirm(`Tem certeza que deseja excluir o registro de ${record.individualName}?`)) {
      const deletedRecord = await deleteRecord(record.id);
      
      if (deletedRecord) {
        await createLog({
          action: 'delete',
          performedBy: user.username,
          targetRecord: deletedRecord,
          details: `Excluiu o registro de prisão: ${deletedRecord.individualName}`
        });

        toast.success('Registro excluído com sucesso!');
        await loadData();
      } else {
        toast.error('Erro ao excluir registro');
      }
    }
  };

  const handleClearAllData = async () => {
    if (!isOwner()) {
      toast.error('Apenas o dono do aplicativo pode limpar todos os dados');
      return;
    }

    if (confirm('⚠️ ATENÇÃO: Isso irá apagar TODOS os registros permanentemente! Tem certeza?')) {
      if (confirm('Esta ação não pode ser desfeita. Confirma novamente?')) {
        const success = await clearAllRecords();
        if (success) {
          toast.success('Todos os registros foram removidos!');
          await loadData();
        } else {
          toast.error('Erro ao limpar registros');
        }
      }
    }
  };

  const handleNewRecord = () => {
    if (!canCreateRecords()) {
      toast.error('Você não tem permissão para criar registros');
      return;
    }
    navigate('/new-record');
  };

  const handleNewRecordForIndividual = (individualName: string) => {
    if (!canCreateRecords()) {
      toast.error('Você não tem permissão para criar registros');
      return;
    }
    
    // Get the latest record for this individual to pre-fill data
    const individualRecords = records.filter(r => r.individualName === individualName);
    const latestRecord = individualRecords.sort((a, b) => 
      new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
    )[0];
    
    // Store individual data including serverId and fixedId
    localStorage.setItem('individual_data', JSON.stringify({
      individualName: individualName,
      serverId: latestRecord?.serverId || '',
      fixedId: latestRecord?.fixedId || ''
    }));
    
    navigate('/new-record');
  };

  const handleApproveUser = useCallback(async (userId: string, role: UserRole) => {
    if (!isAdmin()) {
      toast.error('Você não tem permissão para aprovar usuários');
      return;
    }

    await approveUser(userId, role);
    const users = await getUsers();
    const approvedUser = users.find(u => u.id === userId);
    
    if (approvedUser && user) {
      await createLog({
        action: 'role_change',
        performedBy: user.username,
        targetUser: approvedUser.username,
        details: `Aprovou o usuário ${approvedUser.username} como ${getRoleLabel(role)}`
      });
    }

    toast.success('Usuário aprovado com sucesso!');
    await loadData();
  }, [user]);

  const handleRejectUser = async (userId: string) => {
    if (!isAdmin()) {
      toast.error('Você não tem permissão para rejeitar usuários');
      return;
    }

    const users = await getUsers();
    const rejectedUser = users.find(u => u.id === userId);
    await rejectUser(userId);
    
    if (rejectedUser && user) {
      await createLog({
        action: 'user_remove',
        performedBy: user.username,
        targetUser: rejectedUser.username,
        details: `Rejeitou o pedido de cadastro de ${rejectedUser.username}`
      });
    }

    toast.success('Usuário rejeitado!');
    await loadData();
  };

  const handlePromoteUser = useCallback(async (userId: string, newRole: UserRole) => {
    if (!isAdmin()) {
      toast.error('Você não tem permissão para promover usuários');
      return;
    }

    const targetUser = allUsers.find(u => u.id === userId);
    if (targetUser?.username === 'Matheus Schulmeister') {
      toast.error('Não é possível alterar o cargo do dono do aplicativo');
      return;
    }

    await updateUserRole(userId, newRole);
    
    if (targetUser && user) {
      await createLog({
        action: 'role_change',
        performedBy: user.username,
        targetUser: targetUser.username,
        details: `Alterou o cargo de ${targetUser.username} para ${getRoleLabel(newRole)}`
      });
    }

    toast.success('Cargo atualizado com sucesso!');
    await loadData();
  }, [allUsers, user]);

  const handleDeleteMember = async (userId: string) => {
    if (!isAdmin()) {
      toast.error('Você não tem permissão para remover usuários');
      return;
    }

    const targetUser = allUsers.find(u => u.id === userId);
    if (targetUser?.username === 'Matheus Schulmeister') {
      toast.error('Não é possível remover o dono do aplicativo');
      return;
    }

    if (confirm(`Tem certeza que deseja remover ${targetUser?.username}?`)) {
      await deleteUser(userId);
      
      if (targetUser && user) {
        await createLog({
          action: 'user_remove',
          performedBy: user.username,
          targetUser: targetUser.username,
          details: `Removeu o usuário ${targetUser.username}`
        });
      }

      toast.success('Usuário removido com sucesso!');
      await loadData();
    }
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900/80 backdrop-blur-xl border-r border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src={settings.brasiliaLogoUrl} 
              alt="Brasília" 
              className="h-10 w-10 object-contain rounded-full border-2 border-yellow-500"
            />
            <img 
              src={settings.bopeLogoUrl} 
              alt="BOPE" 
              className="h-10 w-10 object-contain rounded-full border-2 border-red-600"
            />
          </div>
          <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500 mb-1">
            {settings.appTitle}
          </h1>
          <p className="text-xs text-slate-400">{settings.appSubtitle}</p>
          <p className="text-xs text-slate-500 mt-2">{APP_VERSION}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Button
            onClick={() => setCurrentView('home')}
            variant={currentView === 'home' ? 'default' : 'ghost'}
            className={`w-full justify-start ${currentView === 'home' ? 'bg-gradient-to-r from-yellow-600 to-red-600' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <Home className="h-4 w-4 mr-3" />
            Início
          </Button>
          
          <Button
            onClick={() => setCurrentView('records')}
            variant={currentView === 'records' ? 'default' : 'ghost'}
            className={`w-full justify-start ${currentView === 'records' ? 'bg-gradient-to-r from-yellow-600 to-red-600' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <FolderOpen className="h-4 w-4 mr-3" />
            Registros
          </Button>

          <Button
            onClick={() => {
              setCurrentView('individuals');
              setSelectedIndividual(null);
            }}
            variant={currentView === 'individuals' ? 'default' : 'ghost'}
            className={`w-full justify-start ${currentView === 'individuals' ? 'bg-gradient-to-r from-yellow-600 to-red-600' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <UserCircle className="h-4 w-4 mr-3" />
            Indivíduos
          </Button>

          {isAdmin() && (
            <>
              <div className="border-t border-slate-700 my-2"></div>
              <Button
                onClick={() => setCurrentView('pending')}
                variant={currentView === 'pending' ? 'default' : 'ghost'}
                className={`w-full justify-start ${currentView === 'pending' ? 'bg-gradient-to-r from-yellow-600 to-red-600' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <UserCheck className="h-4 w-4 mr-3" />
                Aprovar Membros
                {pendingUsers.length > 0 && (
                  <Badge className="ml-auto bg-red-600">{pendingUsers.length}</Badge>
                )}
              </Button>

              <Button
                onClick={() => setCurrentView('members')}
                variant={currentView === 'members' ? 'default' : 'ghost'}
                className={`w-full justify-start ${currentView === 'members' ? 'bg-gradient-to-r from-yellow-600 to-red-600' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <Users className="h-4 w-4 mr-3" />
                Gerenciar Membros
              </Button>
            </>
          )}

          {isOwner() && (
            <Button
              onClick={() => setCurrentView('settings')}
              variant={currentView === 'settings' ? 'default' : 'ghost'}
              className={`w-full justify-start ${currentView === 'settings' ? 'bg-gradient-to-r from-yellow-600 to-red-600' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <Settings className="h-4 w-4 mr-3" />
              Configurações
            </Button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-3">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-white font-medium text-sm">{user.username}</p>
            <Badge className="bg-gradient-to-r from-yellow-600 to-red-600 mt-1">
              {getRoleLabel(user.role)}
            </Badge>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full bg-red-950/50 border-red-700 text-white hover:bg-red-900"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-white text-lg">Carregando...</div>
            </div>
          ) : (
            <>
              {/* Settings View - Only for Owner */}
              {currentView === 'settings' && isOwner() && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Configurações</h2>
                    <p className="text-slate-400">Gerencie o armazenamento e dados do sistema (Apenas Dono)</p>
                  </div>

                  {/* Storage Usage Card */}
                  <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Database className="h-5 w-5 text-blue-500" />
                        Uso de Armazenamento (Supabase)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-slate-400">Espaço utilizado</span>
                          <span className="text-white font-semibold">{storageUsage.used.toFixed(2)} MB / {storageUsage.total} MB</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              storageUsage.percentage > 90 ? 'bg-red-600' :
                              storageUsage.percentage > 70 ? 'bg-yellow-600' :
                              'bg-green-600'
                            }`}
                            style={{ width: `${storageUsage.percentage}%` }}
                          ></div>
                        </div>
                        <p className="text-slate-500 text-xs mt-2">
                          {storageUsage.percentage.toFixed(1)}% utilizado
                        </p>
                      </div>

                      {storageUsage.percentage > 80 && (
                        <div className="flex items-start gap-3 p-3 bg-yellow-900/20 border border-yellow-600 rounded-lg">
                          <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-yellow-200 font-semibold text-sm">Armazenamento quase cheio!</p>
                            <p className="text-yellow-300 text-xs mt-1">
                              Considere limpar registros antigos para liberar espaço.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t border-slate-700">
                        <p className="text-slate-400 text-sm mb-3">
                          <strong className="text-white">Total de registros:</strong> {records.length}
                        </p>
                        <p className="text-slate-400 text-sm mb-4">
                          As imagens são armazenadas no Supabase Storage. Você pode limpar todos os registros abaixo se necessário.
                        </p>
                        <Button
                          onClick={handleClearAllData}
                          variant="destructive"
                          className="w-full"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Limpar Todos os Registros
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* App Info Card */}
                  <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="text-white">Informações do Aplicativo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Versão:</span>
                        <span className="text-white font-semibold">{APP_VERSION}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Backend:</span>
                        <span className="text-white font-semibold">Supabase</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total de Usuários:</span>
                        <span className="text-white font-semibold">{allUsers.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total de Registros:</span>
                        <span className="text-white font-semibold">{records.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total de Indivíduos:</span>
                        <span className="text-white font-semibold">{individuals.length}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Home View */}
              {currentView === 'home' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Bem-vindo, {user.username}</h2>
                    <p className="text-slate-400">Sistema de Registro de Prisões PMDF/BOPE</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl hover:bg-slate-900 transition-all cursor-pointer" onClick={() => setCurrentView('records')}>
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <FolderOpen className="h-5 w-5 text-yellow-500" />
                          Registros
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-white mb-2">{records.length}</p>
                        <p className="text-slate-400 text-sm">Total de registros no sistema</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl hover:bg-slate-900 transition-all cursor-pointer" onClick={() => setCurrentView('individuals')}>
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <UserCircle className="h-5 w-5 text-blue-500" />
                          Indivíduos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-white mb-2">{individuals.length}</p>
                        <p className="text-slate-400 text-sm">Pessoas com registros</p>
                      </CardContent>
                    </Card>

                    {canCreateRecords() && (
                      <Card className="bg-slate-900/80 border-blue-500/30 backdrop-blur-xl hover:border-blue-500/50 transition-all cursor-pointer" onClick={handleNewRecord}>
                        <CardHeader>
                          <CardTitle className="text-white flex items-center gap-2">
                            <Plus className="h-5 w-5 text-blue-400" />
                            Novo Registro
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-slate-300 text-sm">Clique para criar um novo registro de prisão</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="text-white">Últimos Registros</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {records.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">Nenhum registro encontrado</p>
                      ) : (
                        <div className="space-y-3">
                          {records.slice(0, 5).map(record => (
                            <div key={record.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-all">
                              <div>
                                <p className="text-white font-medium">{record.individualName}</p>
                                <p className="text-slate-400 text-sm">{new Date(record.dateTime).toLocaleString('pt-BR')}</p>
                              </div>
                              <Badge className="bg-gradient-to-r from-yellow-600 to-red-600">
                                {record.createdBy}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-blue-500" />
                        Como Realizar um Registro
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ol className="space-y-3 text-slate-300">
                        <li className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center text-white text-sm font-bold">1</span>
                          <span>Vá para a aba "Indivíduos" e selecione a pessoa ou clique em "Novo Registro"</span>
                        </li>
                        <li className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center text-white text-sm font-bold">2</span>
                          <span>Se for um indivíduo existente, os dados serão preenchidos automaticamente</span>
                        </li>
                        <li className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center text-white text-sm font-bold">3</span>
                          <span>Preencha todos os campos obrigatórios: localização, motivo e oficiais responsáveis</span>
                        </li>
                        <li className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center text-white text-sm font-bold">4</span>
                          <span>O registro será salvo no Supabase e enviado para o Discord automaticamente</span>
                        </li>
                      </ol>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Records View */}
              {currentView === 'records' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-3xl font-bold text-white mb-2">Registros de Prisões</h2>
                      <p className="text-slate-400">Total: {records.length} registros</p>
                    </div>
                    {canCreateRecords() && (
                      <Button onClick={handleNewRecord} className="bg-gradient-to-r from-yellow-600 to-red-600">
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Registro
                      </Button>
                    )}
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                    <Input
                      placeholder="Buscar por nome, localização, motivo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-900/80 border-slate-700 text-white"
                    />
                  </div>

                  {filteredRecords.length === 0 ? (
                    <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
                      <CardContent className="py-12">
                        <p className="text-slate-400 text-center">Nenhum registro encontrado</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {filteredRecords.map(record => (
                        <Card key={record.id} className="bg-slate-900/80 border-slate-700 backdrop-blur-xl hover:bg-slate-900 transition-all">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-white text-xl">{record.individualName}</CardTitle>
                                <CardDescription className="text-slate-400 mt-1">
                                  {new Date(record.dateTime).toLocaleString('pt-BR')}
                                </CardDescription>
                              </div>
                              <div className="flex gap-2">
                                {canEditRecords() && (
                                  <Button
                                    onClick={() => handleEdit(record)}
                                    variant="outline"
                                    size="sm"
                                    className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                                {canDeleteRecords() && (
                                  <Button
                                    onClick={() => handleDelete(record)}
                                    variant="outline"
                                    size="sm"
                                    className="bg-red-950/50 border-red-700 text-white hover:bg-red-900"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <p className="text-slate-400 text-sm">Localização:</p>
                              <p className="text-white">{record.location}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-sm">Motivo:</p>
                              <p className="text-white">{record.reason}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-sm">Itens Apreendidos:</p>
                              <p className="text-white">{record.seizedItems}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-sm">Oficiais Responsáveis:</p>
                              <p className="text-white">{record.responsibleOfficers}</p>
                            </div>
                            {record.screenshots && record.screenshots.length > 0 && (
                              <div>
                                <p className="text-slate-400 text-sm mb-2">Evidências:</p>
                                <div className="flex gap-2 flex-wrap">
                                  {record.screenshots.map((screenshot, idx) => (
                                    <img
                                      key={idx}
                                      src={screenshot}
                                      alt={`Evidência ${idx + 1}`}
                                      className="h-20 w-20 object-cover rounded-lg border-2 border-slate-700"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="flex justify-between items-center pt-3 border-t border-slate-700">
                              <Badge className="bg-gradient-to-r from-yellow-600 to-red-600">
                                {record.createdBy}
                              </Badge>
                              {record.editedBy && (
                                <p className="text-slate-500 text-xs">
                                  Editado por {record.editedBy} em {new Date(record.editedAt!).toLocaleString('pt-BR')}
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Individuals View */}
              {currentView === 'individuals' && (
                <div className="space-y-6">
                  {selectedIndividual ? (
                    <>
                      <div className="flex items-center gap-4">
                        <Button
                          onClick={() => setSelectedIndividual(null)}
                          variant="outline"
                          className="bg-slate-800 border-slate-600 text-white"
                        >
                          ← Voltar
                        </Button>
                        <div>
                          <h2 className="text-3xl font-bold text-white">{selectedIndividual}</h2>
                          <p className="text-slate-400">
                            {records.filter(r => r.individualName === selectedIndividual).length} registros
                          </p>
                        </div>
                      </div>

                      {canCreateRecords() && (
                        <Button
                          onClick={() => handleNewRecordForIndividual(selectedIndividual)}
                          className="bg-gradient-to-r from-yellow-600 to-red-600"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Novo Registro para {selectedIndividual}
                        </Button>
                      )}

                      <div className="grid gap-4">
                        {records
                          .filter(r => r.individualName === selectedIndividual)
                          .map(record => (
                            <Card key={record.id} className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
                              <CardHeader>
                                <div className="flex justify-between items-start">
                                  <CardDescription className="text-slate-400">
                                    {new Date(record.dateTime).toLocaleString('pt-BR')}
                                  </CardDescription>
                                  <div className="flex gap-2">
                                    {canEditRecords() && (
                                      <Button
                                        onClick={() => handleEdit(record)}
                                        variant="outline"
                                        size="sm"
                                        className="bg-slate-800 border-slate-600 text-white"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {canDeleteRecords() && (
                                      <Button
                                        onClick={() => handleDelete(record)}
                                        variant="outline"
                                        size="sm"
                                        className="bg-red-950/50 border-red-700 text-white"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div>
                                  <p className="text-slate-400 text-sm">Localização:</p>
                                  <p className="text-white">{record.location}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400 text-sm">Motivo:</p>
                                  <p className="text-white">{record.reason}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400 text-sm">Itens Apreendidos:</p>
                                  <p className="text-white">{record.seizedItems}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400 text-sm">Oficiais:</p>
                                  <p className="text-white">{record.responsibleOfficers}</p>
                                </div>
                                {record.screenshots && record.screenshots.length > 0 && (
                                  <div>
                                    <p className="text-slate-400 text-sm mb-2">Evidências:</p>
                                    <div className="flex gap-2 flex-wrap">
                                      {record.screenshots.map((screenshot, idx) => (
                                        <img
                                          key={idx}
                                          src={screenshot}
                                          alt={`Evidência ${idx + 1}`}
                                          className="h-20 w-20 object-cover rounded-lg border-2 border-slate-700"
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <Badge className="bg-gradient-to-r from-yellow-600 to-red-600">
                                  {record.createdBy}
                                </Badge>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Indivíduos</h2>
                        <p className="text-slate-400">Total: {individuals.length} pessoas com registros</p>
                      </div>

                      {individuals.length === 0 ? (
                        <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
                          <CardContent className="py-12">
                            <p className="text-slate-400 text-center">Nenhum indivíduo registrado ainda</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {individuals.map(individual => (
                            <Card
                              key={individual.name}
                              className="bg-slate-900/80 border-slate-700 backdrop-blur-xl hover:bg-slate-900 transition-all cursor-pointer"
                              onClick={() => setSelectedIndividual(individual.name)}
                            >
                              <CardHeader>
                                <CardTitle className="text-white">{individual.name}</CardTitle>
                                <CardDescription className="text-slate-400">
                                  {individual.count} {individual.count === 1 ? 'registro' : 'registros'}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <p className="text-slate-400 text-sm">Último registro:</p>
                                <p className="text-white text-sm">
                                  {new Date(individual.lastRecord.dateTime).toLocaleString('pt-BR')}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Pending Users View */}
              {currentView === 'pending' && isAdmin() && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Aprovar Membros</h2>
                    <p className="text-slate-400">Usuários aguardando aprovação: {pendingUsers.length}</p>
                  </div>

                  {pendingUsers.length === 0 ? (
                    <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
                      <CardContent className="py-12">
                        <p className="text-slate-400 text-center">Nenhum usuário pendente</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {pendingUsers.map(pendingUser => (
                        <Card key={pendingUser.id} className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-white">{pendingUser.username}</CardTitle>
                                <CardDescription className="text-slate-400">
                                  Solicitado em {new Date(pendingUser.createdAt).toLocaleString('pt-BR')}
                                </CardDescription>
                              </div>
                              <Badge className="bg-yellow-600">Pendente</Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex gap-2">
                              <Select onValueChange={(value) => handleApproveUser(pendingUser.id, value as UserRole)}>
                                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                  <SelectValue placeholder="Selecione o cargo" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600">
                                  <SelectItem value="admin">Administrador</SelectItem>
                                  <SelectItem value="oficial">Oficial</SelectItem>
                                  <SelectItem value="dono_org">Dono de Org</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={() => handleRejectUser(pendingUser.id)}
                                variant="outline"
                                className="bg-red-950/50 border-red-700 text-white hover:bg-red-900"
                              >
                                Rejeitar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Members View */}
              {currentView === 'members' && isAdmin() && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Gerenciar Membros</h2>
                    <p className="text-slate-400">Total de membros ativos: {allUsers.length}</p>
                  </div>

                  <div className="grid gap-4">
                    {allUsers.map(member => (
                      <Card key={member.id} className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-white flex items-center gap-2">
                                {member.username}
                                {member.username === 'Matheus Schulmeister' && (
                                  <Badge className="bg-gradient-to-r from-purple-600 to-pink-600">Dono</Badge>
                                )}
                              </CardTitle>
                              <CardDescription className="text-slate-400">
                                Membro desde {new Date(member.createdAt).toLocaleDateString('pt-BR')}
                              </CardDescription>
                            </div>
                            <Badge className="bg-gradient-to-r from-yellow-600 to-red-600">
                              {getRoleLabel(member.role)}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {member.username !== 'Matheus Schulmeister' && (
                            <div className="flex gap-2">
                              <Select
                                value={member.role}
                                onValueChange={(value) => handlePromoteUser(member.id, value as UserRole)}
                              >
                                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600">
                                  <SelectItem value="admin">Administrador</SelectItem>
                                  <SelectItem value="oficial">Oficial</SelectItem>
                                  <SelectItem value="dono_org">Dono de Org</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                onClick={() => handleDeleteMember(member.id)}
                                variant="outline"
                                className="bg-red-950/50 border-red-700 text-white hover:bg-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          {member.username === 'Matheus Schulmeister' && (
                            <p className="text-slate-400 text-sm">O dono do aplicativo não pode ser removido ou ter o cargo alterado</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
            <DialogDescription className="text-slate-400">
              Faça as alterações necessárias no registro
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Indivíduo</Label>
              <Input
                value={editForm.individualName}
                onChange={(e) => setEditForm(prev => ({ ...prev, individualName: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Localização</Label>
              <Input
                value={editForm.location}
                onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea
                value={editForm.reason}
                onChange={(e) => setEditForm(prev => ({ ...prev, reason: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Itens Apreendidos</Label>
              <Textarea
                value={editForm.seizedItems}
                onChange={(e) => setEditForm(prev => ({ ...prev, seizedItems: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Oficiais Responsáveis</Label>
              <Input
                value={editForm.responsibleOfficers}
                onChange={(e) => setEditForm(prev => ({ ...prev, responsibleOfficers: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRecord(null)} className="bg-slate-800 border-slate-600 text-white">
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} className="bg-gradient-to-r from-yellow-600 to-red-600">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}