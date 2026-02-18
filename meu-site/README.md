# MAANAIN - Site da Igreja

Sistema web completo para gestão de conteúdo de igreja, desenvolvido com Node.js, Express e SQLite.

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### Instalação

```bash
npm install
```

### Executar em Desenvolvimento

```bash
npm run dev
# ou
node server/app.js
```

O servidor will start na porta 3000.

### Production Build

```bash
npm run build
```

## 📁 Estrutura do Projeto

```
meu-site/
├── server/
│   ├── app.js          # Servidor principal
│   ├── db.sqlite3     # Banco de dados SQLite (conteúdos)
│   └── biblia.db      # Banco de dados da Bíblia (busca)
├── public/
│   ├── index.html     # Página inicial
│   ├── admin.html     # Painel administrativo
│   ├── biblia.html    # Página da Bíblia
│   ├── aulas.html     # Vídeo aulas
│   ├── membro.html    # Área do membro
│   ├── editor.html    # Editor de conteúdo
│   ├── programacao.html
│   ├── login.html
│   ├── register.html
│   ├── css/           # Arquivos de estilo
│   ├── js/            # Scripts JavaScript
│   ├── uploads/       # Arquivos enviados
│   ├── sw.js          # Service Worker (PWA)
│   └── BibliaJSON-master/  # Arquivos da Bíblia
├── package.json
└── README.md
```

## 🔧 Funcionalidades

###Frontend
- ✅ Página inicial com seções configuráveis
- ✅ Sistema de login/cadastro
- ✅ Área do membro (conteúdo exclusivo)
- ✅ Biblioteca de vídeo-aulas
- ✅ Leitura da Bíblia (3 versões)
- ✅ Programação de cultos
- ✅ Editor rico de conteúdo
- ✅ Painel administrativo completo
- ✅ Design responsivo (PWA)

### Backend APIs
- ✅ Autenticação (login, registro, redefinição de senha)
- ✅ Gerenciamento de usuários (CRUD)
- ✅ Gerenciamento de notícias
- ✅ Gerenciamento de eventos e inscrições
- ✅ Gerenciamento de ministérios
- ✅ Gerenciamento de video-aulas
- ✅ Gerenciamento de tópicos bíblicos
- ✅ Gerenciamento de área do membro
- ✅ Sistema de galeria de imagens
- ✅ Integração YouTube Live
- ✅ API de busca na Bíblia (FTS5)
- ✅ Cache offline (Service Worker)

## 🔐 Credenciais Admin

O admin padrão pode ser criado através do painel admin ou via API de registro.

## 📝 Notas

- O Tailwind CSS foi removido em favor de CSS puro para melhor performance
- Os emojis do editor foram expandidos para mais de 130 opções organizadas em categorias
- O YouTube Live requer configuração do ID do canal no painel admin
