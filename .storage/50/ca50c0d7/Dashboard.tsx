import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, LogOut, FileText, Edit, Trash2, Search, Home, FolderOpen, Image as ImageIcon, X } from 'lucide-react';
import { getCurrentUser, logout, updateUserActivity, canEditRecords, canDeleteRecords, canCreateRecords, getRoleLabel } from '@/lib/auth';
import { getRecords, updateRecord, deleteRecord, addLog, getSettings } from '@/lib/storage';
import { PrisonRecord } from '@/types';
import { toast } from 'sonner';

export default function Dashboard() {
  const [records, setRecords] = useState<PrisonRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<PrisonRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState<'home' | 'records' | 'gallery'>('home');
  const [editingRecord, setEditingRecord] = useState<PrisonRecord | null>(null);
  const [editForm, setEditForm] = useState({
    individualName: '',
    location: '',
    reason: '',
    seizedItems: '',
    responsibleOfficers: ''
  });
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showImageGallery, setShowImageGallery] = useState(false);
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

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredRecords(records);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = records.filter(record => 
        record.individualName.toLowerCase().includes(term) ||
        record.location.toLowerCase().includes(term) ||
        record.reason.toLowerCase().includes(term) ||
        record.responsibleOfficers.toLowerCase().includes(term) ||
        record.seizedItems.toLowerCase().includes(term)
      );
      setFilteredRecords(filtered);
    }
  }, [searchTerm, records]);

  const loadData = () => {
    const allRecords = getRecords();
    setRecords(allRecords);
    setFilteredRecords(allRecords);
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

  const getAllImages = () => {
    const allImages: Array<{ url: string; recordName: string; recordId: string }> = [];
    records.forEach(record => {
      if (record.screenshots && record.screenshots.length > 0) {
        record.screenshots.forEach(screenshot => {
          allImages.push({
            url: screenshot,
            recordName: record.individualName,
            recordId: record.id
          });
        });
      }
    });
    return allImages;
  };

  const toggleImageSelection = (imageUrl: string) => {
    setSelectedImages(prev => {
      if (prev.includes(imageUrl)) {
        return prev.filter(url => url !== imageUrl);
      } else {
        return [...prev, imageUrl];
      }
    });
  };

  const handleUseSelectedImages = () => {
    if (selectedImages.length === 0) {
      toast.error('Selecione pelo menos uma imagem');
      return;
    }
    
    localStorage.setItem('selected_images', JSON.stringify(selectedImages));
    toast.success(`${selectedImages.length} ${selectedImages.length === 1 ? 'imagem selecionada' : 'imagens selecionadas'}`);
    navigate('/new-record');
  };

  if (!user) return null;

  const allImages = getAllImages();

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
            onClick={() => setCurrentView('gallery')}
            variant={currentView === 'gallery' ? 'default' : 'ghost'}
            className={`w-full justify-start ${currentView === 'gallery' ? 'bg-gradient-to-r from-yellow-600 to-red-600' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <ImageIcon className="h-4 w-4 mr-3" />
            Galeria de Fotos
          </Button>
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

                <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl hover:bg-slate-900 transition-all cursor-pointer" onClick={() => setCurrentView('gallery')}>
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-blue-500" />
                      Galeria
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-white mb-2">{allImages.length}</p>
                    <p className="text-slate-400 text-sm">Fotos disponíveis para reutilizar</p>
                  </CardContent>
                </Card>

                {canCreateRecords() && (
                  <Card className="bg-gradient-to-br from-yellow-600/20 to-red-600/20 border-yellow-600/50 backdrop-blur-xl hover:from-yellow-600/30 hover:to-red-600/30 transition-all cursor-pointer" onClick={handleNewRecord}>
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Plus className="h-5 w-5" />
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
                    className="bg-gradient-to-r from-yellow-600 to-red-600 hover:from-yellow-700 hover:to-red-700 font-semibold"
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
          )}

          {/* Gallery View */}
          {currentView === 'gallery' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Galeria de Fotos</h2>
                  <p className="text-slate-400">
                    Selecione fotos para reutilizar em novos registros
                  </p>
                </div>
                {selectedImages.length > 0 && (
                  <Button
                    onClick={handleUseSelectedImages}
                    className="bg-gradient-to-r from-yellow-600 to-red-600 hover:from-yellow-700 hover:to-red-700 font-semibold"
                  >
                    Usar {selectedImages.length} {selectedImages.length === 1 ? 'Foto' : 'Fotos'}
                  </Button>
                )}
              </div>

              {allImages.length === 0 ? (
                <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl">
                  <CardContent className="py-12 text-center">
                    <ImageIcon className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg">Nenhuma foto disponível</p>
                    <p className="text-slate-500 text-sm mt-2">As fotos dos registros aparecerão aqui</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {allImages.map((image, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleImageSelection(image.url)}
                      className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImages.includes(image.url)
                          ? 'border-yellow-500 ring-2 ring-yellow-500'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={`Foto de ${image.recordName}`}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-sm font-medium truncate">{image.recordName}</p>
                        </div>
                      </div>
                      {selectedImages.includes(image.url) && (
                        <div className="absolute top-2 right-2 bg-yellow-500 text-black rounded-full p-1">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
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