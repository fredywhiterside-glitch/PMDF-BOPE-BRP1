# Plano de Desenvolvimento - Sistema de Registro de Prisões PMDF/BOPE

## Arquitetura do Sistema
Este é um MVP focado em funcionalidade core com design profissional policial.

## Arquivos a Criar (8 arquivos máximo)

### 1. src/types/index.ts
- Tipos TypeScript para User, PrisonRecord, UserRole
- Interfaces para autenticação e dados

### 2. src/lib/auth.ts
- Sistema de autenticação com localStorage
- Gerenciamento de sessão e roles (admin, user, pending)
- Funções de login/registro/logout

### 3. src/lib/storage.ts
- Gerenciamento de dados no localStorage
- CRUD para registros de prisão
- Gerenciamento de usuários e webhook
- Função para enviar dados para Discord webhook

### 4. src/pages/Login.tsx
- Página de login/registro
- Design policial profissional
- Formulário com nome e senha

### 5. src/pages/Dashboard.tsx
- Dashboard principal para usuários aprovados
- Lista de registros de prisão
- Acesso ao formulário de novo registro

### 6. src/pages/NewRecord.tsx
- Formulário de novo registro de prisão
- Campos: nome, data/hora, localização, motivo, apreensões, oficiais
- Envio automático para webhook Discord

### 7. src/pages/Admin.tsx
- Painel administrativo
- Aprovação/rejeição de usuários pendentes
- Gerenciamento de usuários ativos
- Configuração de webhook (apenas admin)
- Visualização de todos os registros

### 8. src/App.tsx (modificar)
- Roteamento entre páginas
- Proteção de rotas baseada em autenticação
- Layout principal

## Fluxo de Funcionamento
1. Usuário faz registro → status "pending"
2. Admin aprova/rejeita usuário
3. Usuário aprovado pode fazer login
4. Usuário logado pode criar registros de prisão
5. Registros são enviados automaticamente para webhook Discord
6. Admin tem controle total sobre usuários e configurações

## Design
- Tema escuro/profissional para sistema policial
- Cores: azul escuro, cinza, branco
- Ícones de polícia/segurança
- Interface limpa e funcional