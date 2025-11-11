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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, LogOut, Edit, Trash2, Search, Home, FolderOpen, Users, UserCheck, UserCircle, Settings, Database, AlertTriangle, Menu, X } from 'lucide-react';
import { getCurrentUser, logout, updateUserActivity, canEditRecords, canDeleteRecords, canCreateRecords, getRoleLabel, isAdmin, isOwner, getUsers, getPendingUsers, approveUser, rejectUser, updateUserRole, deleteUser } from '@/lib/auth';
import { getRecords, updateRecord, deleteRecord, createLog, getSettings, getAllIndividuals, clearAllRecords, getStorageUsage } from '@/lib/supabase-storage';
import { PrisonRecord, User, UserRole } from '@/types';
import { toast } from 'sonner';

const APP_VERSION = 'v1.3.0';

const ARTICLE_OPTIONS = [
  { value: 'SU 351 - FUGA', label: 'SU 351 - FUGA' },
  { value: 'SU 163 - VANDALISMO', label: 'SU 163 - VANDALISMO' },
  { value: 'SU 33 - TRAFICO DE DROGAS', label: 'SU 33 - TRAFICO DE DROGAS' },
  { value: 'SU 12 - PORTE DE MATERIAIS ILEGAIS', label: 'SU 12 - PORTE DE MATERIAIS ILEGAIS' },
  { value: 'SU 16 - PORTE DE ARMAS', label: 'SU 16 - PORTE DE ARMAS' },
  { value: 'SU 308 - CORRIDA ILEGAL', label: 'SU 308 - CORRIDA ILEGAL' },
  { value: 'SU 155 - FURTO', label: 'SU 155 - FURTO' },
  { value: 'SU 129 - AGRESSÃO', label: 'SU 129 - AGRESSÃO' },
  { value: 'SU 233 - ATENTADO AO PUDOR', label: 'SU 233 - ATENTADO AO PUDOR' },
  { value: 'SU 20 - PRECONCEITO', label: 'SU 20 - PRECONCEITO' },
  { value: 'SU 330 - DESOBEDIENCIA A ORDEM POLICIAL', label: 'SU 330 - DESOBEDIENCIA A ORDEM POLICIAL' },
  { value: 'SU 121 - TENTATIVA DE HOMICIDIO', label: 'SU 121 - TENTATIVA DE HOMICIDIO' },
  { value: 'SU 131 - HOMICIDIO', label: 'SU 131 - HOMICIDIO' },
  { value: 'SU 180 - OCULTAÇÃO FACIAL', label: 'SU 180 - OCULTAÇÃO FACIAL' },
  { value: 'SU 147 - AMEAÇA', label: 'SU 147 - AMEAÇA' },
  { value: 'SU 340 - FALSA COMUNICAÇÃO', label: 'SU 340 - FALSA COMUNICAÇÃO' },
  { value: 'SU 42 - PERTUBAÇÃO DO SOSSEGO', label: 'SU 42 - PERTUBAÇÃO DO SOSSEGO' },
  { value: 'SU 135 - OMISSÃO DE SOCORRO', label: 'SU 135 - OMISSÃO DE SOCORRO' },
  { value: 'SU 288 - MEMBRO DE GANGUE', label: 'SU 288 - MEMBRO DE GANGUE' },
  { value: 'SU 319 - PREVARICAÇÃO', label: 'SU 319 - PREVARICAÇÃO' },
  { value: 'SU 317 - SUBORNO', label: 'SU 317 - SUBORNO' }
];

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
    articles: [] as string[],
    seizedItems: '',
    responsibleOfficers: ''
  });
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [storageUsage, setStorageUsage] = useState({ used: 0, total: 1000, percentage: 0 });
  const [individuals, setIndividuals] = useState<Array<{ name: string; fixedId: string; photo: string; count: number; lastRecord: PrisonRecord }>>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      articles: record.articles,
      seizedItems: record.seizedItems,
      responsibleOfficers: record.responsibleOfficers
    });
  };

  const handleArticleToggle = useCallback((article: string) => {
    setEditForm(prev => ({
      ...prev,
      articles: prev.articles.includes(article)
        ? prev.articles.filter(a => a !== article)
        : [...prev.articles, article]
    }));
  }, []);

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

  const handleNewRecordForIndividual = (individualName: string, fixedId: string, photo: string) => {
    if (!canCreateRecords()) {
      toast.error('Você não tem permissão para criar registros');
      return;
    }
    
    localStorage.setItem('prefilled_individual_data', JSON.stringify({
      individualName,
      fixedId,
      photo
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
      {/* Mobile Menu Button */}
      <Button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 md:hidden bg-slate-800 border-slate-600"
        size="icon"
        variant="outline"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-40 w-64 bg-slate-900/80 backdrop-blur-xl border-r border-slate-700 flex flex-col transition-transform duration-300 h-screen`}>
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src="/assets/brasilia-logo_variant_1.jpg" 
              alt="Brasília" 
              className="h-10 w-10 object-contain rounded-full border-2 border-yellow-500"
            />
            <img 
              src="/assets/bope-logo_variant_1.png" 
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

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Button
            onClick={() => {
              setCurrentView('home');
              setSidebarOpen(false);
            }}
            variant={currentView === 'home' ? 'default' : 'ghost'}
            className={`w-full justify-start ${currentView === 'home' ? 'bg-gradient-to-r from-yellow-600 to-red-600' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <Home className="h-4 w-4 mr-3" />
            Início
          </Button>
          
          <Button
            onClick={() => {
              setCurrentView('records');
              setSidebarOpen(false);
            }}
            variant={currentView === 'records' ? 'default' : 'ghost'}
            className={`w-full justify-start ${currentView === 'records' ? 'bg-gradient-to-r from-yellow-600 to-red-600' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <FolderOpen className="h-4 w-4 mr-3" />
            Histórico de Prisões
          </Button>

          <Button
            onClick={() => {
              setCurrentView('individuals');
              setSelectedIndividual(null);
              setSidebarOpen(false);
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
                onClick={() => {
                  setCurrentView('pending');
                  setSidebarOpen(false);
                }}
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
                onClick={() => {
                  setCurrentView('members');
                  setSidebarOpen(false);
                }}
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
              onClick={() => {
                setCurrentView('settings');
                setSidebarOpen(false);
              }}
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

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 md:px-8 py-8 pt-16 md:pt-8">
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
                    <p className="text-slate-400">Fichas Criminais PMDF/BOPE</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl hover:bg-slate-900 transition-all cursor-pointer" onClick={() => setCurrentView('records')}>
                      <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                          <FolderOpen className="h-5 w-5 text-yellow-500" />
                          Histórico de Prisões
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
                            Nova Ficha Criminal
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-slate-300 text-sm">Clique para criar uma nova ficha criminal</p>
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
                            <div key={record.id} className="flex items-center justify-between gap-4 p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-all">
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{record.individualName}</p>
                                <p className="text-slate-400 text-sm truncate">{new Date(record.dateTime).toLocaleString('pt-BR')}</p>
                              </div>
                              <Badge className="bg-gradient-to-r from-yellow-600 to-red-600 flex-shrink-0">
                                {record.createdBy}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Records View - Ultra Optimized */}
              {currentView === 'records' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-3xl font-bold text-white mb-2">Histórico de Prisões</h2>
                      <p className="text-slate-400">Total: {records.length} registros</p>
                    </div>
                    {canCreateRecords() && (
                      <Button onClick={handleNewRecord} className="bg-gradient-to-r from-yellow-600 to-red-600">
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Ficha
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
                    <div className="space-y-3">
                      {filteredRecords.map(record => (
                        <Card key={record.id} className="bg-slate-900/80 border-slate-700 backdrop-blur-xl hover:bg-slate-900 transition-all">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0 space-y-2">
                                <h3 className="text-white font-semibold text-lg truncate">{record.individualName}</h3>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                                  <div>
                                    <p className="text-slate-500 text-xs">Motivo:</p>
                                    <p className="text-white truncate">{record.reason}</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500 text-xs">Artigos:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {record.articles.slice(0, 2).map((article, idx) => {
                                        const match = article.match(/^(SU\s+\d+)/);
                                        const displayText = match ? match[1] : article.split(' - ')[0];
                                        return (
                                          <Badge key={idx} variant="outline" className="text-xs border-yellow-600 text-yellow-400">
                                            {displayText}
                                          </Badge>
                                        );
                                      })}
                                      {record.articles.length > 2 && (
                                        <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                                          +{record.articles.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-slate-500 text-xs">Oficial:</p>
                                    <p className="text-white truncate">{record.responsibleOfficers}</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex gap-2 flex-shrink-0">
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
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Individuals View - Optimized */}
              {currentView === 'individuals' && (
                <div className="space-y-6">
                  {selectedIndividual ? (
                    <>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <Button
                          onClick={() => setSelectedIndividual(null)}
                          variant="outline"
                          className="bg-slate-800 border-slate-600 text-white"
                        >
                          ← Voltar
                        </Button>
                        <div className="flex items-center gap-4 flex-1">
                          {individuals.find(i => i.name === selectedIndividual)?.photo && (
                            <img 
                              src={individuals.find(i => i.name === selectedIndividual)?.photo} 
                              alt={selectedIndividual}
                              className="w-16 h-16 object-cover rounded-lg border-2 border-yellow-500"
                            />
                          )}
                          <div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-white">{selectedIndividual}</h2>
                            <p className="text-slate-400 text-sm">
                              ID: {individuals.find(i => i.name === selectedIndividual)?.fixedId} • {records.filter(r => r.individualName === selectedIndividual).length} registros
                            </p>
                          </div>
                        </div>
                      </div>

                      {canCreateRecords() && (
                        <Button
                          onClick={() => {
                            const individual = individuals.find(i => i.name === selectedIndividual);
                            if (individual) {
                              handleNewRecordForIndividual(individual.name, individual.fixedId, individual.photo);
                            }
                          }}
                          className="bg-gradient-to-r from-yellow-600 to-red-600 w-full sm:w-auto"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Nova Ficha para {selectedIndividual}
                        </Button>
                      )}

                      <div className="space-y-3">
                        {records
                          .filter(r => r.individualName === selectedIndividual)
                          .map(record => (
                            <Card key={record.id} className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
                              <CardContent className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between">
                                    <p className="text-slate-400 text-sm">{new Date(record.dateTime).toLocaleString('pt-BR')}</p>
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
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <p className="text-slate-500 text-xs">Local:</p>
                                      <p className="text-white">{record.location}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-xs">Motivo:</p>
                                      <p className="text-white">{record.reason}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-xs">Oficial:</p>
                                      <p className="text-white">{record.responsibleOfficers}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-500 text-xs">Registrado por:</p>
                                      <Badge className="bg-gradient-to-r from-yellow-600 to-red-600">
                                        {record.createdBy}
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <p className="text-slate-500 text-xs">Artigos:</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {record.articles.map((article, idx) => {
                                        const match = article.match(/^(SU\s+\d+)/);
                                        const displayText = match ? match[1] : article;
                                        return (
                                          <Badge key={idx} variant="outline" className="text-xs border-yellow-600 text-yellow-400">
                                            {displayText}
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {individuals.map(individual => (
                            <Card
                              key={individual.name}
                              className="bg-slate-900/80 border-slate-700 backdrop-blur-xl hover:bg-slate-900 transition-all cursor-pointer"
                              onClick={() => setSelectedIndividual(individual.name)}
                            >
                              <CardContent className="p-4">
                                <div className="space-y-2">
                                  <CardTitle className="text-white text-lg truncate">{individual.name}</CardTitle>
                                  <p className="text-slate-500 text-xs">ID: {individual.fixedId}</p>
                                  <CardDescription className="text-slate-400">
                                    {individual.count} {individual.count === 1 ? 'registro' : 'registros'}
                                  </CardDescription>
                                  <p className="text-slate-400 text-xs">
                                    Último: {new Date(individual.lastRecord.dateTime).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
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
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <Label>Artigos (Selecione um ou mais)</Label>
              <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                {ARTICLE_OPTIONS.map((article) => (
                  <div key={article.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-${article.value}`}
                      checked={editForm.articles.includes(article.value)}
                      onCheckedChange={() => handleArticleToggle(article.value)}
                      className="border-slate-500 data-[state=checked]:bg-yellow-600"
                    />
                    <Label
                      htmlFor={`edit-${article.value}`}
                      className="text-slate-300 cursor-pointer select-none text-sm"
                    >
                      {article.label}
                    </Label>
                  </div>
                ))}
              </div>
              {editForm.articles.length > 0 && (
                <p className="text-slate-400 text-xs mt-2">
                  {editForm.articles.length} artigo(s) selecionado(s)
                </p>
              )}
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