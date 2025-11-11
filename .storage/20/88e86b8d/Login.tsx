import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { login, register, initializeOwner } from '@/lib/auth';

export default function Login() {
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const navigate = useNavigate();

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMzIzMjMiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCAzLjk5OC00SDQyVjE4aC0yLjAwMkE0IDQgMCAwIDAgMzYgMjJ2MTJ6bTAgMGMwIDIuMjEgMS43OSA0IDMuOTk4IDRINDB2MTZoLTIuMDAyQTQgNCAwIDAgMSAzNiA1MFYzNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center gap-6 mb-6">
            <img 
              src="/assets/brasilia-logo.jpg" 
              alt="Brasília Roleplay" 
              className="h-20 w-20 object-contain rounded-full border-2 border-yellow-500 shadow-lg shadow-yellow-500/50"
            />
            <img 
              src="/assets/bope-logo.png" 
              alt="PMDF BOPE" 
              className="h-20 w-20 object-contain rounded-full border-2 border-red-600 shadow-lg shadow-red-600/50"
            />
          </div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-yellow-400 mb-2">
            PMDF/BOPE
          </h1>
          <p className="text-yellow-400 font-semibold text-lg">Sistema de Registro de Prisões</p>
          <p className="text-sm text-slate-400 mt-2 font-medium">Brasília Roleplay</p>
        </div>

        {message && (
          <Alert className={`mb-4 ${message.type === 'error' ? 'bg-red-950/50 border-red-700' : 'bg-green-950/50 border-green-700'}`}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-white">{message.text}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-slate-900/80 border-slate-700 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white text-xl">Acesso ao Sistema</CardTitle>
            <CardDescription className="text-slate-400">
              Entre com suas credenciais ou solicite acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                <TabsTrigger value="login" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-600 data-[state=active]:to-red-600">
                  Login
                </TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-600 data-[state=active]:to-red-600">
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
                      className="bg-slate-800 border-slate-600 text-white focus:border-yellow-500"
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
                      className="bg-slate-800 border-slate-600 text-white focus:border-yellow-500"
                      placeholder="Digite sua senha"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-yellow-600 to-red-600 hover:from-yellow-700 hover:to-red-700 font-semibold">
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
                      className="bg-slate-800 border-slate-600 text-white focus:border-yellow-500"
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
                      className="bg-slate-800 border-slate-600 text-white focus:border-yellow-500"
                      placeholder="Escolha uma senha"
                    />
                  </div>
                  <Alert className="bg-yellow-950/30 border-yellow-700">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-yellow-200 text-sm">
                      Seu registro será enviado para aprovação de um administrador
                    </AlertDescription>
                  </Alert>
                  <Button type="submit" className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 font-semibold">
                    Solicitar Acesso
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-slate-500 text-sm mt-4">
          Credenciais padrão do administrador: admin / admin123
        </p>
      </div>
    </div>
  );
}