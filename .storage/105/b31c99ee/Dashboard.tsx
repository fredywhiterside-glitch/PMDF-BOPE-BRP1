import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, LogOut, FileText, Edit, Trash2, Search, Home, FolderOpen, Users, UserCheck, BookOpen, UserCircle } from 'lucide-react';
import { getCurrentUser, logout, updateUserActivity, canEditRecords, canDeleteRecords, canCreateRecords, getRoleLabel, isAdmin, getUsers, getPendingUsers, approveUser, rejectUser, updateUserRole, deleteUser } from '@/lib/auth';
import { getRecords, updateRecord, deleteRecord, addLog, getSettings, getAllIndividuals, getRecordsByIndividual } from '@/lib/storage';
import { PrisonRecord, User, UserRole } from '@/types';
import { toast } from 'sonner';

export default function Dashboard() {
  const [records, setRecords] = useState<PrisonRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState<'home' | 'records' | 'pending' | 'members' | 'individuals'>('home');
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

  const individuals = useMemo(() => getAllIndividuals(), [records]);

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

  const loadData = () => {
    const allRecords = getRecords();
    setRecords(allRecords);
    setPendingUsers(getPendingUsers());
    setAllUsers(getUsers().filter(u => u.role !== 'pending'));
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

  const handleSaveEdit = () => {
    if (!editingRecord || !user) return;

    updateRecord(editingRecord.id, {
      ...editForm,
      editedBy: user.username,
      editedAt: new Date().toISOString()
    });

    addLog({
      action: 'edit',
      performedBy: user.username,
      details: `Editou o registro de prisão: ${editingRecord.individualName}`
    });

    toast.success('Registro atualizado com sucesso!');
    setEditingRecord(null);
    loadData();
  };

  const handleDelete = (record: PrisonRecord) => {
    if (!canDeleteRecords()) {
      toast.error('Você não tem permissão para excluir registros');
      return;
    }

    if (!user) return;

    if (confirm(`Tem certeza que deseja excluir o registro de ${record.individualName}?`)) {
      const deletedRecord = deleteRecord(record.id);
      
      if (deletedRecord) {
        addLog({
          action: 'delete',
          performedBy: user.username,
          targetRecord: deletedRecord,
          details: `Excluiu o registro de prisão: ${deletedRecord.individualName}`
        });

        toast.success('Registro excluído com sucesso!');
        loadData();
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

  const handleNewRecordForIndividual = (individualName: string, existingPhotos: string[]) => {
    if (!canCreateRecords()) {
      toast.error('Você não tem permissão para criar registros');
      return;
    }
    
    // Store individual data with all their photos for selection
    localStorage.setItem('individual_data', JSON.stringify({
      individualName: individualName,
      availablePhotos: existingPhotos
    }));
    
    navigate('/new-record');
  };

  const handleApproveUser = (userId: string, role: UserRole) => {
    if (!isAdmin()) {
      toast.error('Você não tem permissão para aprovar usuários');
      return;
    }

    approveUser(userId, role);
    const approvedUser = getUsers().find(u => u.id === userId);
    
    if (approvedUser && user) {
      addLog({
        action: 'role_change',
        performedBy: user.username,
        targetUser: approvedUser.username,
        details: `Aprovou o usuário ${approvedUser.username} como ${getRoleLabel(role)}`
      });
    }

    toast.success('Usuário aprovado com sucesso!');
    loadData();
  };

  const handleRejectUser = (userId: string) => {
    if (!isAdmin()) {
      toast.error('Você não tem permissão para rejeitar usuários');
      return;
    }

    const rejectedUser = getUsers().find(u => u.id === userId);
    rejectUser(userId);
    
    if (rejectedUser && user) {
      addLog({
        action: 'user_remove',
        performedBy: user.username,
        targetUser: rejectedUser.username,
        details: `Rejeitou o pedido de cadastro de ${rejectedUser.username}`
      });
    }

    toast.success('Usuário rejeitado!');
    loadData();
  };

  const handlePromoteUser = (userId: string, newRole: UserRole) => {
    if (!isAdmin()) {
      toast.error('Você não tem permissão para promover usuários');
      return;
    }

    const targetUser = allUsers.find(u => u.id === userId);
    if (targetUser?.username === 'Matheus Schulmeister') {
      toast.error('Não é possível alterar o cargo do dono do aplicativo');
      return;
    }

    updateUserRole(userId, newRole);
    
    if (targetUser && user) {
      addLog({
        action: 'role_change',
        performedBy: user.username,
        targetUser: targetUser.username,
        details: `Alterou o cargo de ${targetUser.username} para ${getRoleLabel(newRole)}`
      });
    }

    toast.success('Cargo atualizado com sucesso!');
    loadData();
  };

  const handleDeleteMember = (userId: string) => {
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
      deleteUser(userId);
      
      if (targetUser && user) {
        addLog({
          action: 'user_remove',
          performedBy: user.username,
          targetUser: targetUser.username,
          details: `Removeu o usuário ${targetUser.username}`
        });
      }

      toast.success('Usuário removido com sucesso!');
      loadData();
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
                      <span>Se for um indivíduo existente, selecione uma foto já cadastrada</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center text-white text-sm font-bold">3</span>
                      <span>Preencha todos os campos obrigatórios: localização, motivo e oficiais responsáveis</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center text-white text-sm font-bold">4</span>
                      <span>O registro será salvo localmente e enviado para o Discord automaticamente</span>
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
                  <p className="text-slate-400">
                    {filteredRecords.length} {filteredRecords.length === 1 ? 'registro encontrado' : 'registros encontrados'}
                  </p>
                </div>
                {canCreateRecords() && (
                  <Button
                    onClick={handleNewRecord}
                    className="bg-blue-600 hover:bg-blue-700 font-semibold"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Registro
                  </Button>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder="Pesquisar por nome, localização, motivo, oficiais ou itens..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-600 text-white focus:border-yellow-500"
                />
              </div>

              {filteredRecords.length === 0 ? (
                <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
                  <CardContent className="py-12 text-center">
                    <FileText className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg">
                      {searchTerm ? 'Nenhum registro encontrado para sua pesquisa' : 'Nenhum registro encontrado'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredRecords.map((record) => (
                    <Card key={record.id} className="bg-slate-900/80 border-slate-700 hover:bg-slate-900 transition-all backdrop-blur-xl">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-white text-xl">{record.individualName}</CardTitle>
                            <CardDescription className="text-slate-400 mt-1">
                              {new Date(record.dateTime).toLocaleString('pt-BR')} • {record.location}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-gradient-to-r from-yellow-600 to-red-600">
                              {record.createdBy}
                            </Badge>
                            {canEditRecords() && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(record)}
                                className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDeleteRecords() && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(record)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-slate-400 text-sm font-medium mb-1">Motivo da Ocorrência:</p>
                          <p className="text-white">{record.reason}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm font-medium mb-1">Itens Apreendidos:</p>
                          <p className="text-white">{record.seizedItems || 'Nenhum'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm font-medium mb-1">Oficiais Responsáveis:</p>
                          <p className="text-white">{record.responsibleOfficers}</p>
                        </div>
                        {record.screenshots && record.screenshots.length > 0 && (
                          <div>
                            <p className="text-slate-400 text-sm font-medium mb-2">Foto do Indivíduo:</p>
                            <img
                              src={record.screenshots[0]}
                              alt={record.individualName}
                              className="w-48 h-48 object-cover rounded-lg border border-slate-700 cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => window.open(record.screenshots[0], '_blank')}
                            />
                          </div>
                        )}
                        <div className="pt-2 border-t border-slate-700">
                          <p className="text-slate-500 text-xs">
                            Registrado em {new Date(record.createdAt).toLocaleString('pt-BR')}
                            {record.editedBy && ` • Editado por ${record.editedBy} em ${new Date(record.editedAt!).toLocaleString('pt-BR')}`}
                          </p>
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
              {!selectedIndividual ? (
                <>
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Indivíduos Registrados</h2>
                    <p className="text-slate-400">
                      {individuals.length} {individuals.length === 1 ? 'pessoa com registro' : 'pessoas com registros'}
                    </p>
                  </div>

                  {individuals.length === 0 ? (
                    <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
                      <CardContent className="py-12 text-center">
                        <UserCircle className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 text-lg">Nenhum indivíduo registrado</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {individuals.map((individual) => {
                        const individualRecords = getRecordsByIndividual(individual.name);
                        const allPhotos = individualRecords
                          .flatMap(r => r.screenshots || [])
                          .filter(photo => photo && photo.startsWith('data:image/'));
                        const firstPhoto = allPhotos[0];

                        return (
                          <Card 
                            key={individual.name} 
                            className="bg-slate-900/80 border-slate-700 hover:bg-slate-900 transition-all backdrop-blur-xl cursor-pointer"
                            onClick={() => setSelectedIndividual(individual.name)}
                          >
                            <CardContent className="p-6">
                              {firstPhoto ? (
                                <img
                                  src={firstPhoto}
                                  alt={individual.name}
                                  className="w-full h-48 object-cover rounded-lg mb-4 border border-slate-700"
                                />
                              ) : (
                                <div className="w-full h-48 bg-slate-800 rounded-lg mb-4 flex items-center justify-center">
                                  <UserCircle className="h-24 w-24 text-slate-600" />
                                </div>
                              )}
                              <h3 className="text-white text-lg font-bold mb-1">{individual.name}</h3>
                              <p className="text-slate-400 text-sm mb-2">
                                {individual.count} {individual.count === 1 ? 'prisão' : 'prisões'}
                              </p>
                              <p className="text-slate-500 text-xs">
                                {allPhotos.length} {allPhotos.length === 1 ? 'foto disponível' : 'fotos disponíveis'}
                              </p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedIndividual(null)}
                        className="text-slate-400 hover:text-white mb-2"
                      >
                        ← Voltar para lista
                      </Button>
                      <h2 className="text-3xl font-bold text-white mb-2">{selectedIndividual}</h2>
                      <p className="text-slate-400">
                        {getRecordsByIndividual(selectedIndividual).length} {getRecordsByIndividual(selectedIndividual).length === 1 ? 'prisão registrada' : 'prisões registradas'}
                      </p>
                    </div>
                    {canCreateRecords() && (
                      <Button
                        onClick={() => {
                          const individualRecords = getRecordsByIndividual(selectedIndividual);
                          const allPhotos = individualRecords
                            .flatMap(r => r.screenshots || [])
                            .filter(photo => photo && photo.startsWith('data:image/'));
                          handleNewRecordForIndividual(selectedIndividual, allPhotos);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 font-semibold"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Registro
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4">
                    {getRecordsByIndividual(selectedIndividual).map((record, index) => (
                      <Card key={record.id} className="bg-slate-900/80 border-slate-700 hover:bg-slate-900 transition-all backdrop-blur-xl">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-white text-xl">Prisão #{index + 1}</CardTitle>
                              <CardDescription className="text-slate-400 mt-1">
                                {new Date(record.dateTime).toLocaleString('pt-BR')} • {record.location}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-gradient-to-r from-yellow-600 to-red-600">
                                {record.createdBy}
                              </Badge>
                              {canEditRecords() && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(record)}
                                  className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canDeleteRecords() && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDelete(record)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-slate-400 text-sm font-medium mb-1">Motivo da Ocorrência:</p>
                            <p className="text-white">{record.reason}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-sm font-medium mb-1">Itens Apreendidos:</p>
                            <p className="text-white">{record.seizedItems || 'Nenhum'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-sm font-medium mb-1">Oficiais Responsáveis:</p>
                            <p className="text-white">{record.responsibleOfficers}</p>
                          </div>
                          {record.screenshots && record.screenshots.length > 0 && (
                            <div>
                              <p className="text-slate-400 text-sm font-medium mb-2">Foto do Indivíduo:</p>
                              <img
                                src={record.screenshots[0]}
                                alt={record.individualName}
                                className="w-48 h-48 object-cover rounded-lg border border-slate-700 cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => window.open(record.screenshots[0], '_blank')}
                              />
                            </div>
                          )}
                          <div className="pt-2 border-t border-slate-700">
                            <p className="text-slate-500 text-xs">
                              Registrado em {new Date(record.createdAt).toLocaleString('pt-BR')}
                              {record.editedBy && ` • Editado por ${record.editedBy} em ${new Date(record.editedAt!).toLocaleString('pt-BR')}`}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Pending Users View */}
          {currentView === 'pending' && isAdmin() && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Aprovar Membros</h2>
                <p className="text-slate-400">
                  {pendingUsers.length} {pendingUsers.length === 1 ? 'solicitação pendente' : 'solicitações pendentes'}
                </p>
              </div>

              {pendingUsers.length === 0 ? (
                <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
                  <CardContent className="py-12 text-center">
                    <UserCheck className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg">Nenhuma solicitação pendente</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {pendingUsers.map((pendingUser) => (
                    <Card key={pendingUser.id} className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-white text-xl">{pendingUser.username}</CardTitle>
                            <CardDescription className="text-slate-400 mt-1">
                              Solicitou acesso em {new Date(pendingUser.createdAt).toLocaleString('pt-BR')}
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="border-yellow-600 text-yellow-600">
                            Pendente
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-3">
                          <Select onValueChange={(value) => handleApproveUser(pendingUser.id, value as UserRole)}>
                            <SelectTrigger className="flex-1 bg-slate-800 border-slate-600 text-white">
                              <SelectValue placeholder="Aprovar como..." />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600">
                              <SelectItem value="admin" className="text-white">Administrador</SelectItem>
                              <SelectItem value="oficial" className="text-white">Oficial</SelectItem>
                              <SelectItem value="dono_org" className="text-white">Dono de Org</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="destructive"
                            onClick={() => handleRejectUser(pendingUser.id)}
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

          {/* Members Management View */}
          {currentView === 'members' && isAdmin() && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Gerenciar Membros</h2>
                <p className="text-slate-400">
                  {allUsers.length} {allUsers.length === 1 ? 'membro ativo' : 'membros ativos'}
                </p>
              </div>

              {allUsers.length === 0 ? (
                <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
                  <CardContent className="py-12 text-center">
                    <Users className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg">Nenhum membro encontrado</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {allUsers.map((member) => (
                    <Card key={member.id} className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-white text-xl flex items-center gap-2">
                              {member.username}
                              {member.username === 'Matheus Schulmeister' && (
                                <Badge className="bg-gradient-to-r from-yellow-600 to-red-600">
                                  Dono do App
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="text-slate-400 mt-1">
                              Membro desde {new Date(member.createdAt).toLocaleString('pt-BR')}
                            </CardDescription>
                          </div>
                          <Badge className="bg-gradient-to-r from-yellow-600 to-red-600">
                            {getRoleLabel(member.role)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {member.username !== 'Matheus Schulmeister' && (
                          <div className="flex gap-3">
                            <Select 
                              value={member.role} 
                              onValueChange={(value) => handlePromoteUser(member.id, value as UserRole)}
                            >
                              <SelectTrigger className="flex-1 bg-slate-800 border-slate-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600">
                                <SelectItem value="admin" className="text-white">Administrador</SelectItem>
                                <SelectItem value="oficial" className="text-white">Oficial</SelectItem>
                                <SelectItem value="dono_org" className="text-white">Dono de Org</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="destructive"
                              onClick={() => handleDeleteMember(member.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {member.username === 'Matheus Schulmeister' && (
                          <p className="text-slate-400 text-sm">
                            Este é o dono do aplicativo e não pode ser modificado ou removido.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
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