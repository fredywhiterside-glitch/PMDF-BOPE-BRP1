import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, LogOut, Settings, FileText, Users as UsersIcon, Edit, Trash2, BookOpen } from 'lucide-react';
import { getCurrentUser, logout, isComando, getOnlineUsers, updateUserActivity, canEditRecords, canDeleteRecords, canViewAllRecords, getRoleLabel } from '@/lib/auth';
import { getRecords, updateRecord, deleteRecord, addLog, getSettings } from '@/lib/storage';
import { PrisonRecord, User } from '@/types';
import { toast } from 'sonner';

export default function Dashboard() {
  const [records, setRecords] = useState<PrisonRecord[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [showOnline, setShowOnline] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PrisonRecord | null>(null);
  const [editForm, setEditForm] = useState({
    individualName: '',
    location: '',
    reason: '',
    seizedItems: '',
    responsibleOfficers: ''
  });
  const navigate = useNavigate();
  const user = getCurrentUser();
  const settings = getSettings();

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
  }, [user, navigate]);

  const loadData = () => {
    const allRecords = getRecords();
    if (canViewAllRecords()) {
      setRecords(allRecords);
    } else {
      setRecords(allRecords.filter(r => r.createdBy === user?.username));
    }
    setOnlineUsers(getOnlineUsers());
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleEdit = (record: PrisonRecord) => {
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

  if (!user) return null;

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
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate('/welcome')}
                variant="outline"
                className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Tutorial
              </Button>
              <Button
                onClick={() => setShowOnline(!showOnline)}
                variant="outline"
                className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
              >
                <UsersIcon className="h-4 w-4 mr-2" />
                Online ({onlineUsers.length})
              </Button>
              <div className="text-right">
                <p className="text-white font-medium">{user.username}</p>
                <Badge 
                  variant="default"
                  className="bg-gradient-to-r from-yellow-600 to-red-600"
                >
                  {getRoleLabel(user.role)}
                </Badge>
              </div>
              {isComando() && (
                <Button
                  onClick={() => navigate('/admin')}
                  variant="outline"
                  className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              )}
              <Button
                onClick={handleLogout}
                variant="outline"
                className="bg-red-950/50 border-red-700 text-white hover:bg-red-900"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {showOnline && (
          <Card className="bg-slate-900/80 border-slate-700 mb-6 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-green-500" />
                Membros Online
              </CardTitle>
              <CardDescription className="text-slate-400">
                Usuários ativos nos últimos 5 minutos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {onlineUsers.length === 0 ? (
                <p className="text-slate-500 text-center py-4">Nenhum membro online no momento</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {onlineUsers.map(u => (
                    <div 
                      key={u.id}
                      className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                    >
                      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                      <div>
                        <p className="text-white text-sm font-medium">{u.username}</p>
                        <p className="text-slate-500 text-xs">{getRoleLabel(u.role)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Registros de Prisões</h2>
            <p className="text-slate-400">
              {records.length} {records.length === 1 ? 'registro' : 'registros'} no sistema
            </p>
          </div>
          <Button
            onClick={() => navigate('/new-record')}
            className="bg-gradient-to-r from-yellow-600 to-red-600 hover:from-yellow-700 hover:to-red-700 font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Registro
          </Button>
        </div>

        {records.length === 0 ? (
          <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">Nenhum registro encontrado</p>
              <p className="text-slate-500 text-sm mt-2">Clique em "Novo Registro" para adicionar o primeiro</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {records.map((record) => (
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
                      <p className="text-slate-400 text-sm font-medium mb-2">Evidências Fotográficas:</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {record.screenshots.map((screenshot, idx) => (
                          <img
                            key={idx}
                            src={screenshot}
                            alt={`Evidência ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-slate-700 cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => window.open(screenshot, '_blank')}
                          />
                        ))}
                      </div>
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