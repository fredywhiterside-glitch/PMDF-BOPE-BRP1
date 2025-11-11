import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { login, register, initializeOwner } from '@/lib/auth';

export default function Login() {
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const navigate = useNavigate();

  // Inicializar dono do sistema
  useState(() => {
    initializeOwner();
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const result = login(loginUsername, loginPassword);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const result = register(registerUsername, registerPassword);
    
    setMessage({ 
      type: result.success ? 'success' : 'error', 
      text: result.message 
    });
    
    if (result.success) {
      setRegisterUsername('');
      setRegisterPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-4 rounded-full">
              <Shield className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">PMDF/BOPE</h1>
          <p className="text-blue-200">Sistema de Registro de Prisões</p>
          <p className="text-sm text-blue-300 mt-1">Brasília RP</p>
        </div>

        {message && (
          <Alert className={`mb-4 ${message.type === 'error' ? 'bg-red-900/50 border-red-700' : 'bg-green-900/50 border-green-700'}`}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-white">{message.text}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Acesso ao Sistema</CardTitle>
            <CardDescription className="text-slate-300">
              Entre com suas credenciais ou solicite acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                <TabsTrigger value="login" className="data-[state=active]:bg-blue-600">
                  Login
                </TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-blue-600">
                  Registro
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username" className="text-white">Nome de Usuário</Label>
                    <Input
                      id="login-username"
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      required
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Digite seu nome de usuário"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-white">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Digite sua senha"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                    Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-username" className="text-white">Nome de Usuário</Label>
                    <Input
                      id="register-username"
                      type="text"
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      required
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Escolha um nome de usuário"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-white">Senha</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Escolha uma senha"
                    />
                  </div>
                  <Alert className="bg-yellow-900/30 border-yellow-700">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-yellow-200 text-sm">
                      Seu registro será enviado para aprovação de um administrador
                    </AlertDescription>
                  </Alert>
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                    Solicitar Acesso
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-slate-400 text-sm mt-4">
          Credenciais padrão do administrador: admin / admin123
        </p>
      </div>
    </div>
  );
}