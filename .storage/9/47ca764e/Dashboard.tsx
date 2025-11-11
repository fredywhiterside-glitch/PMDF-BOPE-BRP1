import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, LogOut, Settings, FileText } from 'lucide-react';
import { getCurrentUser, logout, isAdmin } from '@/lib/auth';
import { getRecords } from '@/lib/storage';
import { PrisonRecord } from '@/types';

export default function Dashboard() {
  const [records, setRecords] = useState<PrisonRecord[]>([]);
  const navigate = useNavigate();
  const user = getCurrentUser();

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    const allRecords = getRecords();
    // Usuários normais veem apenas seus próprios registros
    if (user.role === 'user') {
      setRecords(allRecords.filter(r => r.createdBy === user.username));
    } else {
      setRecords(allRecords);
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <nav className="bg-slate-800/50 backdrop-blur border-b border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-400" />
              <div>
                <h1 className="text-xl font-bold text-white">PMDF/BOPE</h1>
                <p className="text-sm text-slate-300">Sistema de Registros</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-white font-medium">{user.username}</p>
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                  {user.role === 'admin' ? 'Administrador' : 'Oficial'}
                </Badge>
              </div>
              {isAdmin() && (
                <Button
                  onClick={() => navigate('/admin')}
                  variant="outline"
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              )}
              <Button
                onClick={handleLogout}
                variant="outline"
                className="bg-red-900/50 border-red-700 text-white hover:bg-red-800"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Registros de Prisões</h2>
            <p className="text-slate-300">
              {records.length} {records.length === 1 ? 'registro' : 'registros'} no sistema
            </p>
          </div>
          <Button
            onClick={() => navigate('/new-record')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Registro
          </Button>
        </div>

        {records.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">Nenhum registro encontrado</p>
              <p className="text-slate-500 text-sm mt-2">Clique em "Novo Registro" para adicionar o primeiro</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {records.map((record) => (
              <Card key={record.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white text-xl">{record.individualName}</CardTitle>
                      <CardDescription className="text-slate-400 mt-1">
                        {new Date(record.dateTime).toLocaleString('pt-BR')} • {record.location}
                      </CardDescription>
                    </div>
                    <Badge className="bg-blue-600">
                      {record.createdBy}
                    </Badge>
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
                  <div className="pt-2 border-t border-slate-700">
                    <p className="text-slate-500 text-xs">
                      Registrado em {new Date(record.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}