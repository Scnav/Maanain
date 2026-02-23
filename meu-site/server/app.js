const sqlite3 = require("sqlite3").verbose();
const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const fs = require("fs");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");

const PORT = process.env.PORT || 80;
const DB_PATH = path.join(__dirname, "db.sqlite3");
const BIBLIA_DB_PATH = path.join(__dirname, "biblia.db");

// Token admin via variável de ambiente (seguro)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'maanain2026';

// Segredo JWT - fixo para manter sessões entre reinicializações
const JWT_SECRET = process.env.JWT_SECRET || 'maanain_jwt_secret_2026_fixo';

// Tempo de expiração do token (24 horas)
const JWT_EXPIRES_IN = '24h';

// Rate Limiter para login - proteção contra força bruta
const loginRateLimiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 2 minutos
    max: 5, // 5 tentativas
    message: { error: 'Muitas tentativas de login. Tente novamente em 2 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate Limiter geral para APIs
const apiRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 100, // 100 requisições por minuto
    message: { error: 'Muitas requisições. Tente novamente mais tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Variável global para verificar se o SQLite está pronto
let bibliaSQLiteReady = false;

// Conexão com banco da Bíblia (FTS5)
const bibliaDb = new sqlite3.Database(BIBLIA_DB_PATH);

// Verificar se o banco da bíblia está disponível
bibliaDb.get("SELECT COUNT(*) as total FROM livros", (err, row) => {
    if (!err && row && row.total > 0) {
        bibliaSQLiteReady = true;
        console.log(`✅ Bíblia SQLite carregada: ${row.total} livros`);
    }
});

const app = express();
const db = new sqlite3.Database(DB_PATH);

// Middleware - não processar JSON para FormData
const jsonMiddleware = express.json({ limit: '50mb' });
app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('multipart/form-data')) {
            // Não usar express.json para FormData, deixe o multer tratar
            return next();
        }
    }
    jsonMiddleware(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS - permitir todas as origens para desenvolvimento
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-admin-token', 'x-user-data']
}));

// Middleware para converter URLs absolutas para relativas (suporte a ngrok)
app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
        if (data && typeof data === 'object') {
            const jsonStr = JSON.stringify(data);
            // Substituir URLs localhost por caminhos relativos
            const processed = jsonStr.replace(/http:\/\/localhost:\d+/g, '');
            return originalJson.call(this, JSON.parse(processed));
        }
        return originalJson.call(this, data);
    };
    next();
});

// Middleware para headers de cache
app.use((req, res, next) => {
    // APIs não devem ser cacheadas no cliente
    if (req.path.startsWith('/api/')) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    } else {
        // Arquivos estáticos podem ser cacheados
        res.set('Cache-Control', 'public, max-age=3600');
    }
    next();
});

// ✅ Tabelas
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'frequentador'
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS noticias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            conteudo TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS eventos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            data TEXT NOT NULL,
            horario TEXT,
            local TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Adicionar coluna horario se não existir (para banco existentes)
    db.run("ALTER TABLE eventos ADD COLUMN horario TEXT", (err) => {
        // Ignora erro se coluna já existe
    });

    db.run(`
        CREATE TABLE IF NOT EXISTS page_content (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section TEXT UNIQUE NOT NULL,
            title TEXT,
            content TEXT,
            link TEXT,
            image TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Adicionar coluna 'link' se não existir (para bancos de dados antigos)
    db.run(`ALTER TABLE page_content ADD COLUMN link TEXT`, (err) => {
        // Ignorar erro se a coluna já existe
    });

    // Adicionar coluna 'image' se não existir (para bancos de dados antigos)
    db.run(`ALTER TABLE page_content ADD COLUMN image TEXT`, (err) => {
        // Ignorar erro se a coluna já existe
    });

    // Tabela de configurações do YouTube
    db.run(`
        CREATE TABLE IF NOT EXISTS youtube_config (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            channel_id TEXT,
            channel_name TEXT,
            enabled INTEGER DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Inserir configuração padrão se não existir
    db.run(`INSERT OR IGNORE INTO youtube_config (id, channel_id, channel_name, enabled) VALUES (1, '', '', 0)`, (err) => {});

    // Tabela de mensagens
    db.run(`
        CREATE TABLE IF NOT EXISTS mensagens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            conteudo TEXT,
            video_url TEXT,
            data_publicacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            ativa INTEGER DEFAULT 1
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS ministerios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            descricao TEXT,
            icone TEXT DEFAULT 'fas fa-church',
            ordem INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS cultos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            horario TEXT,
            local TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabela de inscrições em eventos
    db.run(`
        CREATE TABLE IF NOT EXISTS inscricoes_eventos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            evento_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            email TEXT,
            telefone TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (evento_id) REFERENCES eventos(id)
        )
    `);

    // Tabela de tópicos bíblicos
    db.run(`
        CREATE TABLE IF NOT EXISTS topicos_biblia (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            descricao TEXT,
            conteudo TEXT,
            categoria TEXT DEFAULT 'geral',
            icone TEXT DEFAULT 'fas fa-book-bible',
            ordem INTEGER DEFAULT 0,
            ativo INTEGER DEFAULT 1,
            data_publicacao TEXT,
            hora_publicacao TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Adicionar colunas de agendamento se não existirem (com verificação mais robusta)
    db.run("ALTER TABLE topicos_biblia ADD COLUMN data_publicacao TEXT", (err) => {
        // Ignora erro se a coluna já existe
    });
    db.run("ALTER TABLE topicos_biblia ADD COLUMN hora_publicacao TEXT", (err) => {
        // Ignora erro se a coluna já existe
    });
    
    // Verificar e criar colunas via PRAGMA se necessário
    db.all("PRAGMA table_info(topicos_biblia)", (err, rows) => {
        if (!err && rows) {
            const columns = rows.map(r => r.name);
            if (!columns.includes('data_publicacao')) {
                db.run("ALTER TABLE topicos_biblia ADD COLUMN data_publicacao TEXT");
            }
            if (!columns.includes('hora_publicacao')) {
                db.run("ALTER TABLE topicos_biblia ADD COLUMN hora_publicacao TEXT");
            }
        }
    });

    // Tabela de conteúdos da Área do Membro
    db.run(`
        CREATE TABLE IF NOT EXISTS area_membro (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            descricao TEXT,
            conteudo TEXT,
            pdf_path TEXT,
            categoria TEXT NOT NULL,
            icone TEXT DEFAULT 'fas fa-book',
            ordem INTEGER DEFAULT 0,
            ativo INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Adicionar coluna pdf_path se não existir (para bancos existentes)
    db.run("ALTER TABLE area_membro ADD COLUMN pdf_path TEXT", (err) => {
        // Ignora erro se a coluna já existe
    });

    // Tabela de vídeo aulas
    db.run(`
        CREATE TABLE IF NOT EXISTS aulas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            descricao TEXT,
            video_url TEXT NOT NULL,
            thumbnail TEXT,
            pdf_path TEXT,
            duracao TEXT DEFAULT '00:00',
            autor TEXT DEFAULT 'MAANAIN',
            categoria TEXT DEFAULT 'estudos',
            visualizacoes INTEGER DEFAULT 0,
            ativo INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Adicionar coluna pdf_path se não existir (para bancos existentes)
    db.run("ALTER TABLE aulas ADD COLUMN pdf_path TEXT", (err) => {
        // Ignora erro se a coluna já existe
    });

    // Tabela de galeria de imagens
    db.run(`
        CREATE TABLE IF NOT EXISTS gallery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            original_name TEXT,
            url TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

// ✅ REGISTER
app.post("/api/register", loginRateLimiter, async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Nome e senha obrigatórios." });
    }

    try {
        const hashed = await bcrypt.hash(password, 10);
        db.run(
            "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
            [username, email || null, hashed, 'frequentador'],
            function(err) {
                if (err) {
                    if (err.message.includes("UNIQUE")) {
                        return res.status(400).json({ error: "Usuário já existe." });
                    }
                    return res.status(500).json({ error: err.message });
                }
                res.status(201).json({ message: "Cadastro OK!", id: this.lastID });
            }
        );
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ LOGIN
app.post("/api/login", loginRateLimiter, (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Usuário e senha obrigatórios." });
    }

    db.get(
        "SELECT id, username, email, password_hash, role FROM users WHERE username = ?",
        [username],
        async (err, row) => {
            if (err || !row) {
                return res.status(400).json({ error: "Usuário ou senha inválidos." });
            }

            if (!row.role) {
                db.run("UPDATE users SET role = 'frequentador' WHERE id = ?", [row.id]);
                row.role = 'frequentador';
            }

            const valid = await bcrypt.compare(password, row.password_hash);
            if (!valid) {
                return res.status(400).json({ error: "Usuário ou senha inválidos." });
            }

            res.json({
                message: "Login OK!",
                user: {
                    id: row.id,
                    username: row.username,
                    email: row.email || null,
                    role: row.role
                }
            });
        }
    );
});

// ✅ REDEFINIÇÃO DE SENHA
// Gerar código aleatório de 6 dígitos
function gerarCodigo() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Solicitar código de redefinição
app.post('/api/solicitar-redefinicao', loginRateLimiter, (req, res) => {
    const { username } = req.body;
    
    if (!username) {
        return res.json({ success: false, message: 'Nome de usuário obrigatório' });
    }
    
    db.get('SELECT id, email FROM users WHERE username = ?', [username], (err, row) => {
        if (err || !row) {
            return res.json({ success: false, message: 'Usuário não encontrado' });
        }
        
        // Gerar código de verificação
        const codigo = gerarCodigo();
        
        // Armazenar código temporariamente (em memória - em produção seria no banco com expiração)
        global.codigosRedefinicao = global.codigosRedefinicao || {};
        global.codigosRedefinicao[username] = {
            codigo: codigo,
            expiracao: Date.now() + 15 * 60 * 1000 // 15 minutos
        };
        
        console.log('Código de redefinição para ' + username + ': ' + codigo);
        
        res.json({ 
            success: true, 
            message: 'Código enviado!',
            codigo: codigo // Em produção, enviar por email
        });
    });
});

// Redefinir senha
app.post('/api/redefinir-senha', loginRateLimiter, async (req, res) => {
    const { username, novaSenha } = req.body;
    
    if (!username || !novaSenha) {
        return res.json({ success: false, message: 'Dados obrigatórios' });
    }
    
    // Verificar se o código foi validado recentemente
    const registroCodigo = global.codigosRedefinicao?.[username];
    if (!registroCodigo) {
        return res.json({ success: false, message: 'Código expirado ou não solicitado' });
    }
    
    if (Date.now() > registroCodigo.expiracao) {
        delete global.codigosRedefinicao[username];
        return res.json({ success: false, message: 'Código expirado' });
    }
    
    try {
        const passwordHash = await bcrypt.hash(novaSenha, 10);
        
        db.run('UPDATE users SET password_hash = ? WHERE username = ?', [passwordHash, username], function(err) {
            if (err) {
                return res.json({ success: false, message: 'Erro ao atualizar senha' });
            }
            
            delete global.codigosRedefinicao[username];
            res.json({ success: true, message: 'Senha atualizada com sucesso!' });
        });
    } catch (err) {
        res.json({ success: false, message: 'Erro ao processar senha' });
    }
});

// Middleware de autenticação admin com JWT (APENAS JWT - mais seguro)
const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    // Verificar se tem token JWT
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            error: 'Token de autenticação não fornecido',
            code: 'NO_TOKEN'
        });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer '
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ 
                error: 'Token expirado ou inválido. Faça login novamente.',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        // Verificar se é token de admin
        if (decoded.role === 'admin' || decoded.isAdmin === true) {
            req.adminUser = decoded;
            return next();
        }
        
        return res.status(403).json({ error: 'Acesso não autorizado' });
    });
};

// Endpoint de login admin (gera JWT)
app.post('/api/admin/login', loginRateLimiter, (req, res) => {
    const { token } = req.body;
    
    // Verificar o token admin
    if (token === ADMIN_TOKEN) {
        // Gerar JWT
        const adminToken = jwt.sign(
            {
                id: 0,
                role: 'admin',
                isAdmin: true,
                loginTime: new Date().toISOString()
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        return res.json({
            success: true,
            token: adminToken,
            expiresIn: 24 * 60 * 60, // 24 horas em segundos
            message: 'Login admin realizado com sucesso'
        });
    }
    
    return res.status(401).json({ 
        success: false, 
        error: 'Token admin inválido' 
    });
});

// Endpoint para verificar se o token é válido
app.get('/api/admin/verify', verifyAdmin, (req, res) => {
    res.json({ 
        valid: true, 
        admin: req.adminUser 
    });
});

// ✅ ADMIN ROUTES
app.get('/api/admin/users', verifyAdmin, (req, res) => {

    db.all("SELECT id, username, email, role FROM users ORDER BY id DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put('/api/admin/users/:id/role', verifyAdmin, (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!['frequentador', 'membro', 'conselho', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Cargo inválido' });
    }

    db.run("UPDATE users SET role = ? WHERE id = ?", [role, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json({ message: 'Cargo atualizado' });
    });
});

app.delete('/api/admin/users/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM users WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json({ message: 'Usuário excluído' });
    });
});

app.get('/api/admin/stats', verifyAdmin, (req, res) => {

    db.all("SELECT role, COUNT(*) as count FROM users GROUP BY role", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const stats = {
            total: rows.reduce((sum, r) => sum + r.count, 0),
            frequentadores: rows.find(r => r.role === 'frequentador')?.count || 0,
            membros: rows.find(r => r.role === 'membro')?.count || 0,
            conselho: rows.find(r => r.role === 'conselho')?.count || 0,
            admins: rows.find(r => r.role === 'admin')?.count || 0
        };
        res.json(stats);
    });
});

// CRUD NOTÍCIAS
app.get('/api/admin/noticias', verifyAdmin, (req, res) => {
    db.all("SELECT * FROM noticias ORDER BY created_at DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/admin/noticias', verifyAdmin, (req, res) => {
    const { titulo, conteudo } = req.body;
    if (!titulo || !conteudo) {
        return res.status(400).json({ error: 'Título e conteúdo obrigatórios' });
    }

    db.run("INSERT INTO noticias (titulo, conteudo) VALUES (?, ?)", [titulo, conteudo], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, titulo, conteudo, created_at: new Date().toISOString() });
    });
});

app.put('/api/admin/noticias/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    const { titulo, conteudo } = req.body;

    db.run("UPDATE noticias SET titulo = ?, conteudo = ? WHERE id = ?", [titulo, conteudo, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Notícia não encontrada' });
        res.json({ message: 'Notícia atualizada' });
    });
});

app.delete('/api/admin/noticias/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM noticias WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Notícia não encontrada' });
        res.json({ message: 'Notícia excluída' });
    });
});

// CRUD EVENTOS
app.get('/api/admin/eventos', verifyAdmin, (req, res) => {
    db.all("SELECT * FROM eventos ORDER BY created_at DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/admin/eventos', verifyAdmin, (req, res) => {
    const { titulo, data, horario, local } = req.body;
    if (!titulo || !data) {
        return res.status(400).json({ error: 'Título e data obrigatórios' });
    }

    db.run("INSERT INTO eventos (titulo, data, horario, local) VALUES (?, ?, ?, ?)", [titulo, data, horario || null, local || null], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, titulo, data, horario, local, created_at: new Date().toISOString() });
    });
});

app.put('/api/admin/eventos/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    const { titulo, data, horario, local } = req.body;

    db.run("UPDATE eventos SET titulo = ?, data = ?, horario = ?, local = ? WHERE id = ?", [titulo, data, horario, local, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Evento não encontrado' });
        res.json({ message: 'Evento atualizado' });
    });
});

app.delete('/api/admin/eventos/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM eventos WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Evento não encontrado' });
        res.json({ message: 'Evento excluído' });
    });
});

// INSCRIÇÕES EM EVENTOS (público)
app.post('/api/inscricoes', (req, res) => {
    const { evento_id, nome, email, telefone } = req.body;
    
    if (!evento_id || !nome) {
        return res.status(400).json({ error: 'Evento e nome são obrigatórios' });
    }

    db.run("INSERT INTO inscricoes_eventos (evento_id, nome, email, telefone) VALUES (?, ?, ?, ?)",
        [evento_id, nome, email || null, telefone || null], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Inscrição realizada com sucesso!', id: this.lastID });
    });
});

// Listar inscrições de um evento (público)
app.get('/api/inscricoes/:evento_id', (req, res) => {
    const { evento_id } = req.params;
    
    db.all("SELECT * FROM inscricoes_eventos WHERE evento_id = ? ORDER BY created_at DESC", [evento_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Listar todas as inscrições (admin)
app.get('/api/admin/inscricoes', verifyAdmin, (req, res) => {
    db.all(`
        SELECT i.*, e.titulo as evento_titulo 
        FROM inscricoes_eventos i 
        LEFT JOIN eventos e ON i.evento_id = e.id 
        ORDER BY i.created_at DESC
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Excluir inscrição (admin)
app.delete('/api/admin/inscricoes/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    
    db.run("DELETE FROM inscricoes_eventos WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Inscrição não encontrada' });
        res.json({ message: 'Inscrição excluída' });
    });
});

// CRUD CONTEÚDOS DA PÁGINA INICIAL
app.get('/api/admin/page-content', verifyAdmin, (req, res) => {

    db.all("SELECT * FROM page_content ORDER BY section", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put('/api/admin/page-content/:section', verifyAdmin, (req, res) => {
    const { section } = req.params;
    const { title, content, link, image } = req.body;

    // Verificar se link foi fornecido e não é vazio
    if (link || image) {
        db.run("INSERT OR REPLACE INTO page_content (section, title, content, link, image, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'))",
            [section, title, content, link || null, image || null], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Conteúdo atualizado' });
        });
    } else {
        db.run("INSERT OR REPLACE INTO page_content (section, title, content, updated_at) VALUES (?, ?, ?, datetime('now'))",
            [section, title, content], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Conteúdo atualizado' });
        });
    }
});

// Endpoint público para obter conteúdos
app.get('/api/page-content', (req, res) => {
    // Adicionar headers para evitar cache
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    // Verificar se a coluna 'image' existe
    db.all("PRAGMA table_info(page_content)", (err, columns) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const hasImage = columns.some(col => col.name === 'image');
        const selectFields = hasImage ? 'section, title, content, link, image' : 'section, title, content, link';
        
        db.all(`SELECT ${selectFields} FROM page_content`, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            const contentMap = {};
            rows.forEach(row => {
                contentMap[row.section] = { 
                    title: row.title, 
                    content: row.content, 
                    link: row.link || '',
                    image: row.image || ''
                };
            });
            res.json(contentMap);
        });
    });
});

// ========== GALERIA DE IMAGENS ==========
// Listar imagens da galeria (público)
app.get('/api/gallery', (req, res) => {
    // Adicionar headers para evitar cache
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    db.all("SELECT * FROM gallery ORDER BY created_at DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Converter URLs absolutas para relativas (suporte a ngrok)
        const processedRows = rows.map(row => {
            if (row.url && row.url.startsWith('http://localhost')) {
                row.url = row.url.replace(/^http:\/\/localhost:\d+/, '');
            }
            return row;
        });
        
        res.json(processedRows);
    });
});

// Upload de imagem (admin)
app.post('/api/admin/gallery', verifyAdmin, (req, res) => {
    // Simples upload via base64 (para evitar dependências extras)
    const { image, filename } = req.body;
    
    if (!image) {
        return res.status(400).json({ error: 'Imagem é obrigatória' });
    }
    
    // Gerar nome único
    const ext = filename ? filename.split('.').pop() : 'png';
    const newFilename = 'gallery_' + Date.now() + '.' + ext;
    const url = '/uploads/' + newFilename;
    
    // Salvar arquivo
    const uploadsDir = path.join(__dirname, '../public/uploads');
    const fs = require('fs');
    
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Log para debug
    console.log('Upload - image length:', image ? image.length : 0);
    console.log('Upload - filename:', filename);
    
    // Decodificar base64 e salvar
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    console.log('Upload - buffer length:', buffer.length);
    
    fs.writeFile(uploadsDir + '/' + newFilename, buffer, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Salvar no banco
        db.run("INSERT INTO gallery (filename, original_name, url) VALUES (?, ?, ?)",
            [newFilename, filename || newFilename, url],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ id: this.lastID, filename: newFilename, url: url, message: 'Imagem salva!' });
            }
        );
    });
});

// Excluir imagem (admin)
app.delete('/api/admin/gallery/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    const fs = require('fs');
    
    db.get("SELECT filename FROM gallery WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Imagem não encontrada' });
        
        // Excluir arquivo
        const filepath = path.join(__dirname, '../public/uploads/', row.filename);
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }
        
        // Excluir do banco
        db.run("DELETE FROM gallery WHERE id = ?", [id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Imagem excluída!' });
        });
    });
});

// ========== YOUTUBE CONFIG ==========
// Get YouTube config (admin)
app.get('/api/admin/youtube-config', verifyAdmin, (req, res) => {
    db.get("SELECT channel_id, channel_name, enabled FROM youtube_config WHERE id = 1", (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || { channel_id: '', channel_name: '', enabled: 0 });
    });
});

// Update YouTube config (admin)
app.put('/api/admin/youtube-config', verifyAdmin, (req, res) => {
    const { channel_id, channel_name, enabled } = req.body;
    
    db.run("UPDATE youtube_config SET channel_id = ?, channel_name = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
        [channel_id || '', channel_name || '', enabled ? 1 : 0],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Configuração do YouTube atualizada!' });
        }
    );
});

// Get YouTube live status (público)
app.get('/api/youtube-live', async (req, res) => {
    try {
        // Primeiro pega a configuração
        db.get("SELECT channel_id, enabled FROM youtube_config WHERE id = 1", async (err, config) => {
            console.log('YouTube config from DB:', config);
            
            if (err || !config || !config.enabled || !config.channel_id) {
                console.log('YouTube config not found or disabled');
                return res.json({ isLive: false, video: null });
            }
            
            let channelId = config.channel_id.trim();
            
            // Detectar se é URL ou @username e converter para ID
            if (channelId.includes('youtube.com/')) {
                // Extrair o @username ou ID da URL
                const match = channelId.match(/@(.[^/]+)|channel\/([^/]+)|c\/([^/]+)/);
                if (match) {
                    const identifier = match[1] || match[2] || match[3];
                    // Se parece ser um ID (começa com UC), usa direto
                    if (identifier.startsWith('UC')) {
                        channelId = identifier;
                    } else {
                        // É um @username, precisa resolver para ID
                        console.log('Resolving username:', identifier);
                        // Por enquanto, retornamos que não está em live
                        // (implementar resolução de username requer API adicional)
                        return res.json({ isLive: false, video: null, message: 'Use o ID do canal (começa com UC)' });
                    }
                }
            }
            
            console.log('Checking live for channel:', channelId);
            
            // Usando a API do YouTube com a API Key
            const youtubeApiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=AIzaSyDCsgWBLSO56xE0T-HE2vmYvIOwe1nGx-s`;
            
            try {
                const response = await fetch(youtubeApiUrl);
                const data = await response.json();
                console.log('YouTube API response:', data);
                
                if (data.items && data.items.length > 0) {
                    const video = data.items[0];
                    res.json({
                        isLive: true,
                        video: {
                            videoId: video.id.videoId,
                            title: video.snippet.title,
                            thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url,
                            channelTitle: video.snippet.channelTitle
                        }
                    });
                } else {
                    res.json({ isLive: false, video: null });
                }
            } catch (apiError) {
                console.error('YouTube API error:', apiError);
                res.json({ isLive: false, video: null });
            }
        });
    } catch (error) {
        res.json({ isLive: false, video: null });
    }
});

// Endpoint para buscar o último vídeo uploadado do canal
app.get('/api/youtube/latest', async (req, res) => {
    try {
        // Buscar configuração do canal
        db.get("SELECT channel_id FROM youtube_config WHERE id = 1", async (err, config) => {
            if (err || !config || !config.channel_id) {
                return res.json({ video: null, message: 'Canal não configurado' });
            }
            
            const channelId = config.channel_id.trim();
            console.log('Buscando último vídeo para canal:', channelId);
            
            // Primeiro tenta buscar live atual
            const liveUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=AIzaSyDCsgWBLSO56xE0T-HE2vmYvIOwe1nGx-s`;
            
            try {
                const liveResponse = await fetch(liveUrl);
                const liveData = await liveResponse.json();
                
                // Se tem live agora, retorna
                if (liveData.items && liveData.items.length > 0) {
                    const video = liveData.items[0];
                    res.json({
                        video: {
                            videoId: video.id.videoId,
                            title: video.snippet.title,
                            description: video.snippet.description,
                            thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url,
                            channelTitle: video.snippet.channelTitle,
                            publishedAt: video.snippet.publishedAt,
                            isLive: true
                        }
                    });
                    return;
                }
                
                // Se não tem live, buscar última transmissão (broadcast completed)
                const broadcastUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=completed&type=video&maxResults=1&key=AIzaSyDCsgWBLSO56xE0T-HE2vmYvIOwe1nGx-s`;
                
                const broadcastResponse = await fetch(broadcastUrl);
                const broadcastData = await broadcastResponse.json();
                
                if (broadcastData.items && broadcastData.items.length > 0) {
                    const video = broadcastData.items[0];
                    res.json({
                        video: {
                            videoId: video.id.videoId,
                            title: video.snippet.title,
                            description: video.snippet.description,
                            thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url,
                            channelTitle: video.snippet.channelTitle,
                            publishedAt: video.snippet.publishedAt,
                            isLive: false
                        }
                    });
                    return;
                }
                
                // Se não tem broadcast, buscar último vídeo normal
                const videoUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=1&key=AIzaSyDCsgWBLSO56xE0T-HE2vmYvIOwe1nGx-s`;
                
                const videoResponse = await fetch(videoUrl);
                const videoData = await videoResponse.json();
                
                if (videoData.items && videoData.items.length > 0) {
                    const video = videoData.items[0];
                    res.json({
                        video: {
                            videoId: video.id.videoId,
                            title: video.snippet.title,
                            description: video.snippet.description,
                            thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url,
                            channelTitle: video.snippet.channelTitle,
                            publishedAt: video.snippet.publishedAt,
                            isLive: false
                        }
                    });
                    return;
                }
                
                res.json({ video: null, message: 'Nenhum vídeo encontrado' });
            } catch (apiError) {
                console.error('YouTube API error:', apiError);
                res.json({ video: null, error: apiError.message });
            }
        });
    } catch (error) {
        res.json({ video: null, error: error.message });
    }
});

// CRUD MENSAGENS
// Listar todas as mensagens (público - só ativas)
app.get('/api/mensagens', (req, res) => {
    db.all("SELECT * FROM mensagens WHERE ativa = 1 ORDER BY data_publicacao DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Listar todas as mensagens (admin)
app.get('/api/admin/mensagens', verifyAdmin, (req, res) => {
    db.all("SELECT * FROM mensagens ORDER BY data_publicacao DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Criar mensagem
app.post('/api/admin/mensagens', verifyAdmin, (req, res) => {
    const { titulo, conteudo, video_url, ativa } = req.body;
    
    if (!titulo) {
        return res.status(400).json({ error: 'Título é obrigatório' });
    }

    db.run("INSERT INTO mensagens (titulo, conteudo, video_url, ativa) VALUES (?, ?, ?, ?)",
        [titulo, conteudo || null, video_url || null, ativa !== undefined ? ativa : 1], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Mensagem criada!', id: this.lastID });
    });
});

// Atualizar mensagem
app.put('/api/admin/mensagens/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    const { titulo, conteudo, video_url, ativa } = req.body;

    db.run("UPDATE mensagens SET titulo = ?, conteudo = ?, video_url = ?, ativa = ? WHERE id = ?",
        [titulo, conteudo, video_url, ativa, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Mensagem atualizada!' });
    });
});

// Excluir mensagem
app.delete('/api/admin/mensagens/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM mensagens WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Mensagem excluída!' });
    });
});

// CRUD MINISTÉRIOS
app.get('/api/admin/ministerios', verifyAdmin, (req, res) => {

    db.all("SELECT * FROM ministerios ORDER BY ordem ASC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/admin/ministerios', verifyAdmin, (req, res) => {
    const { titulo, descricao, icone } = req.body;
    if (!titulo) {
        return res.status(400).json({ error: 'Título obrigatório' });
    }

    db.run("INSERT INTO ministerios (titulo, descricao, icone) VALUES (?, ?, ?)",
        [titulo, descricao || '', icone || 'fas fa-church'], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, titulo, descricao, icone });
    });
});

app.put('/api/admin/ministerios/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    const { titulo, descricao, icone, ordem } = req.body;

    db.run("UPDATE ministerios SET titulo = ?, descricao = ?, icone = ?, ordem = ? WHERE id = ?",
        [titulo, descricao, icone, ordem, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Ministério não encontrado' });
        res.json({ message: 'Ministério atualizado' });
    });
});

app.delete('/api/admin/ministerios/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM ministerios WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Ministério não encontrado' });
        res.json({ message: 'Ministério excluído' });
    });
});

// Endpoint público para ministérios
app.get('/api/ministerios', (req, res) => {
    db.all("SELECT id, titulo, descricao, icone FROM ministerios ORDER BY ordem ASC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// CRUD CULTOS SEMANAIS (Admin)
app.get('/api/admin/cultos', verifyAdmin, (req, res) => {

    db.all("SELECT * FROM cultos ORDER BY id ASC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/cultos', (req, res) => {
    db.all("SELECT id, titulo, horario, local FROM cultos ORDER BY id ASC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put('/api/admin/cultos/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    const { titulo, horario, local } = req.body;

    db.run("UPDATE cultos SET titulo = ?, horario = ?, local = ?, updated_at = datetime('now') WHERE id = ?",
        [titulo, horario, local, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Culto não encontrado' });
        res.json({ message: 'Culto atualizado' });
    });
});

app.post('/api/admin/cultos', verifyAdmin, (req, res) => {
    const { titulo, horario, local } = req.body;
    if (!titulo) {
        return res.status(400).json({ error: 'Título obrigatório' });
    }

    db.run("INSERT INTO cultos (titulo, horario, local) VALUES (?, ?, ?)",
        [titulo, horario || '', local || ''], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, titulo, horario, local });
    });
});

app.delete('/api/admin/cultos/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM cultos WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Culto não encontrado' });
        res.json({ message: 'Culto excluído' });
    });
});

// CRUD TÓPICOS BÍBLICOS (Admin)
app.get('/api/admin/topicos-biblia', verifyAdmin, (req, res) => {
    db.all("SELECT * FROM topicos_biblia ORDER BY ordem ASC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Listar tópicos ativos (público) - apenas publicados ou sem agendamento
app.get('/api/topicos-biblia', (req, res) => {
    // Só retorna tópicos onde: não tem agendamento OU data/hora já passou
    const query = `
        SELECT id, titulo, descricao, conteudo, categoria, icone 
        FROM topicos_biblia 
        WHERE ativo = 1 
        AND (data_publicacao IS NULL OR data_publicacao = '' 
             OR (data_publicacao || ' ' || COALESCE(hora_publicacao, '00:00') <= datetime('now', 'localtime')))
        ORDER BY ordem ASC`;
    
    console.log('Query:', query);
    
    db.all(query, 
        (err, rows) => {
        if (err) {
            console.error('Erro na query:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Tópicos retornados:', rows.length);
        res.json(rows);
    });
});

// Criar tópico bíblico
app.post('/api/admin/topicos-biblia', verifyAdmin, (req, res) => {
    const { titulo, descricao, conteudo, categoria, icone, ordem, ativo, data_publicacao, hora_publicacao } = req.body;
    
    console.log('Recebido data_publicacao:', data_publicacao, 'hora_publicacao:', hora_publicacao);
    
    if (!titulo) {
        return res.status(400).json({ error: 'Título é obrigatório' });
    }

    db.run("INSERT INTO topicos_biblia (titulo, descricao, conteudo, categoria, icone, ordem, ativo, data_publicacao, hora_publicacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [titulo, descricao || '', conteudo || '', categoria || 'geral', icone || 'fas fa-book-bible', ordem || 0, ativo !== undefined ? ativo : 1, data_publicacao || null, hora_publicacao || '00:00'], 
        function(err) {
        if (err) {
            console.error('Erro ao criar tópico:', err);
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'Tópico bíblico criado!', id: this.lastID });
    });
});

// Atualizar tópico bíblico
app.put('/api/admin/topicos-biblia/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    const { titulo, descricao, conteudo, categoria, icone, ordem, ativo, data_publicacao, hora_publicacao } = req.body;
    
    console.log('Atualizando - data_publicacao:', data_publicacao, 'hora_publicacao:', hora_publicacao);

    db.run("UPDATE topicos_biblia SET titulo = ?, descricao = ?, conteudo = ?, categoria = ?, icone = ?, ordem = ?, ativo = ?, data_publicacao = ?, hora_publicacao = ? WHERE id = ?",
        [titulo, descricao, conteudo, categoria, icone, ordem, ativo, data_publicacao || null, hora_publicacao || '00:00', id], function(err) {
        if (err) {
            console.error('Erro ao atualizar:', err);
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) return res.status(404).json({ error: 'Tópico não encontrado' });
        res.json({ message: 'Tópico bíblico atualizado!' });
    });
});

// Excluir tópico bíblico
app.delete('/api/admin/topicos-biblia/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM topicos_biblia WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Tópico não encontrado' });
        res.json({ message: 'Tópico bíblico excluído!' });
    });
});


// ✅ ENDPOINTS PÚBLICOS
app.get('/api/noticias', (req, res) => {
    db.all("SELECT id, titulo, conteudo, created_at FROM noticias ORDER BY created_at DESC LIMIT 10", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/eventos', (req, res) => {
    console.log('[DEBUG] GET /api/eventos - Buscando eventos');
    db.all("SELECT id, titulo, data, horario, local, created_at FROM eventos WHERE data >= datetime('now') ORDER BY data ASC", (err, rows) => {
        if (err) {
            console.log('[DEBUG] ERRO ao buscar eventos:', err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log('[DEBUG] Eventos encontrados:', rows.length);
        if (rows.length > 0) {
            console.log('[DEBUG] Primeiro evento:', JSON.stringify(rows[0]));
        }
        res.json(rows);
    });
});

// ========== BÍBLIA API ==========

// Mapeamento de IDs para nomes completos
const NOMES_LIVROS = {
    1: 'Gênesis', 2: 'Êxodo', 3: 'Levítico', 4: 'Números', 5: 'Deuteronômio',
    6: 'Josué', 7: 'Juízes', 8: 'Rute', 9: '1 Samuel', 10: '2 Samuel',
    11: '1 Reis', 12: '2 Reis', 13: '1 Crônicas', 14: '2 Crônicas', 15: 'Esdras',
    16: 'Neemias', 17: 'Ester', 18: 'Jó', 19: 'Salmos', 20: 'Provérbios',
    21: 'Eclesiastes', 22: 'Cânticos', 23: 'Isaías', 24: 'Jeremias', 25: 'Lamentações',
    26: 'Ezequiel', 27: 'Daniel', 28: 'Oséias', 29: 'Joel', 30: 'Amós',
    31: 'Obadias', 32: ' Jonas', 33: 'Miquéias', 34: 'Naum', 35: 'Habacuque',
    36: 'Sofonias', 37: 'Ageu', 38: 'Zacarias', 39: 'Malaquias', 40: 'Mateus',
    41: 'Marcos', 42: 'Lucas', 43: 'João', 44: 'Atos', 45: 'Romanos',
    46: '1 Coríntios', 47: '2 Coríntios', 48: 'Gálatas', 49: 'Efésios', 50: 'Filipenses',
    51: 'Colossenses', 52: '1 Tessalonicenses', 53: '2 Tessalonicenses', 54: '1 Timóteo', 55: '2 Timóteo',
    56: 'Tito', 57: 'Filemom', 58: 'Hebreus', 59: 'Tiago', 60: '1 Pedro',
    61: '2 Pedro', 62: '1 João', 63: '2 João', 64: '3 João', 65: 'Judas',
    66: 'Apocalipse'
};

// Mapeamento de IDs para abreviações
const ABREVIACOES_LIVROS = {
    1: 'genesis', 2: 'exodo', 3: 'levitico', 4: 'numeros', 5: 'deuteronomio',
    6: 'josue', 7: 'juizes', 8: 'rute', 9: '1samuel', 10: '2samuel',
    11: '1reis', 12: '2reis', 13: '1cronicas', 14: '2cronicas', 15: 'esdras',
    16: 'neemias', 17: 'ester', 18: 'jo', 19: 'salmos', 20: 'proverbios',
    21: 'eclesiastes', 22: 'canticos', 23: 'isaias', 24: 'jeremias', 25: 'lamentacoes',
    26: 'ezequiel', 27: 'daniel', 28: 'oseias', 29: 'joel', 30: 'amos',
    31: 'obadias', 32: 'jonas', 33: 'miqueias', 34: 'naum', 35: 'habacuque',
    36: 'sofonias', 37: 'ageu', 38: 'zacarias', 39: 'malaquias', 40: 'mateus',
    41: 'marcos', 42: 'lucas', 43: 'joao', 44: 'atos', 45: 'romanos',
    46: '1corintios', 47: '2corintios', 48: 'galatas', 49: 'efesios', 50: 'filipenses',
    51: 'colossenses', 52: '1tessalonicenses', 53: '2tessalonicenses', 54: '1timoteo', 55: '2timoteo',
    56: 'tito', 57: 'filemom', 58: 'hebreus', 59: 'tiago', 60: '1pedro',
    61: '2pedro', 62: '1joao', 63: '2joao', 64: '3joao', 65: 'judas', 66: 'apocalipse'
};

// Contagem de capítulos por livro
const CAPITULOS_LIVRO = {
    1: 50, 2: 40, 3: 27, 4: 36, 5: 34, 6: 24, 7: 21, 8: 4, 9: 31, 10: 24,
    11: 22, 12: 25, 13: 29, 14: 36, 15: 10, 16: 13, 17: 10, 18: 42, 19: 150, 20: 31,
    21: 12, 22: 8, 23: 66, 24: 52, 25: 5, 26: 48, 27: 12, 28: 14, 29: 3, 30: 9,
    31: 1, 32: 4, 33: 7, 34: 3, 35: 3, 36: 3, 37: 2, 38: 14, 39: 4, 40: 28,
    41: 16, 42: 24, 43: 21, 44: 28, 45: 16, 46: 16, 47: 13, 48: 6, 49: 6, 50: 4,
    51: 4, 52: 5, 53: 3, 54: 6, 55: 4, 56: 3, 57: 1, 58: 13, 59: 5, 60: 5,
    61: 3, 62: 5, 63: 1, 64: 1, 65: 1, 66: 22
};

// Listar todos os livros da Bíblia
app.get('/api/biblia/livros', (req, res) => {
    if (bibliaSQLiteReady) {
        // Usar SQLite - retornar array de objetos com id, nome, abreviacao, capitulos
        const livros = [];
        for (let id = 1; id <= 66; id++) {
            livros.push({
                id: id,
                nome: NOMES_LIVROS[id],
                abreviacao: ABREVIACOES_LIVROS[id],
                capitulos: CAPITULOS_LIVRO[id]
            });
        }
        res.json(livros);
    } else {
        res.status(500).json({ error: 'Banco de dados da bíblia não encontrado' });
    }
});

// Obter livro específico com todos os capítulos
app.get('/api/biblia/livro/:idOuAbrev', (req, res) => {
    const { idOuAbrev } = req.params;
    
    if (bibliaSQLiteReady) {
        // Primeiro, encontrar o ID do livro
        let livroId = null;
        let nomeLivro = null;
        
        // Verificar se é um ID numérico
        const idNum = parseInt(idOuAbrev);
        if (!isNaN(idNum) && idNum >= 1 && idNum <= 66) {
            livroId = idNum;
            nomeLivro = NOMES_LIVROS[idNum];
        } else {
            // Procurar por abreviação ou nome
            const busca = idOuAbrev.toLowerCase();
            for (const [id, abreviacao] of Object.entries(ABREVIACOES_LIVROS)) {
                if (abreviacao === busca || NOMES_LIVROS[parseInt(id)].toLowerCase().includes(busca)) {
                    livroId = parseInt(id);
                    nomeLivro = NOMES_LIVROS[id];
                    break;
                }
            }
        }
        
        if (!livroId) {
            return res.status(404).json({ error: 'Livro não encontrado' });
        }
        
        // Gerar array de capítulos
        const capitulos = [];
        for (let i = 1; i <= CAPITULOS_LIVRO[livroId]; i++) {
            capitulos.push({ numero: i });
        }
        
        res.json({
            id: livroId,
            nome: nomeLivro,
            abreviacao: ABREVIACOES_LIVROS[livroId],
            capitulos: capitulos
        });
    } else {
        res.status(500).json({ error: 'Banco de dados da bíblia não encontrado' });
    }
});

// Obter capítulo específico
app.get('/api/biblia/:livro/:capitulo', (req, res) => {
    const { livro, capitulo } = req.params;
    const capituloNum = parseInt(capitulo);
    
    if (bibliaSQLiteReady) {
        // Mapa de abreviações para nomes de livros
        const abreviacoes = {
            'genesis': 1, 'gen': 1, 'gn': 1,
            'exodo': 2, 'ex': 2, 'exo': 2,
            'levitico': 3, 'lv': 3, 'lev': 3,
            'numeros': 4, 'nm': 4, 'num': 4,
            'deuteronomio': 5, 'dt': 5, 'deut': 5,
            'josue': 6, 'js': 6, 'jos': 6,
            'juizes': 7, 'jz': 7, 'juiz': 7,
            'rute': 8, 'rt': 8, 'rute': 8,
            '1samuel': 9, '1 sm': 9, '1sam': 9,
            '2samuel': 10, '2 sm': 10, '2sam': 10,
            '1reis': 11, '1 rs': 11, '1reis': 11,
            '2reis': 12, '2 rs': 12, '2reis': 12,
            '1cronicas': 13, '1 cr': 13, '1cr': 13,
            '2cronicas': 14, '2 cr': 14, '2cr': 14,
            'esdras': 15, 'ed': 15, 'esd': 15,
            'neemias': 16, 'ne': 16, 'neem': 16,
            'ester': 17, 'et': 17, 'ester': 17,
            'jo': 18, 'jó': 18, 'job': 18,
            'salmos': 19, 'sl': 19, 'salm': 19,
            'proverbios': 20, 'pv': 20, 'prov': 20,
            'eclesiastes': 21, 'ec': 21, 'ecl': 21,
            'canticos': 22, 'ct': 22, 'cant': 22,
            'isaias': 23, 'is': 23, 'isa': 23,
            'jeremias': 24, 'jr': 24, 'jer': 24,
            'lamentacoes': 25, 'lm': 25, 'lam': 25,
            'ezequiel': 26, 'ez': 26, 'ezeq': 26,
            'daniel': 27, 'dn': 27, 'dan': 27,
            'oseias': 28, 'os': 28, 'ose': 28,
            'joel': 29, 'jl': 29, 'joel': 29,
            'amos': 30, 'am': 30, 'amos': 30,
            'obadias': 31, 'ob': 31, 'obad': 31,
            'jonas': 32, 'jn': 32, 'jonas': 32,
            'miqueias': 33, 'mq': 33, 'miq': 33,
            'naum': 34, 'na': 34, 'naum': 34,
            'habacuque': 35, 'hc': 35, 'hab': 35,
            'sofonias': 36, 'sf': 36, 'sof': 36,
            'ageu': 37, 'ag': 37, 'ageu': 37,
            'zacarias': 38, 'zc': 38, 'zac': 38,
            'malaquias': 39, 'ml': 39, 'mal': 39,
            'mateus': 40, 'mt': 40, 'mate': 40,
            'marcos': 41, 'mc': 41, 'mar': 41,
            'lucas': 42, 'lc': 42, 'luc': 42,
            'joao': 43, 'jo': 43, 'joao': 43,
            'atos': 44, 'at': 44, 'atos': 44,
            'romanos': 45, 'rm': 45, 'rom': 45,
            '1corintios': 46, '1 co': 46, '1cor': 46,
            '2corintios': 47, '2 co': 47, '2cor': 47,
            'galatas': 48, 'gl': 48, 'gal': 48,
            'efesios': 49, 'ef': 49, 'efes': 49,
            'filipenses': 50, 'fp': 50, 'fil': 50,
            'colossenses': 51, 'cl': 51, 'col': 51,
            '1tessalonicenses': 52, '1 ts': 52, '1 tess': 52,
            '2tessalonicenses': 53, '2 ts': 53, '2 tess': 53,
            '1timoteo': 54, '1 tm': 54, '1tim': 54,
            '2timoteo': 55, '2 tm': 55, '2tim': 55,
            'tito': 56, 'tt': 56, 'tito': 56,
            'filemom': 57, 'fm': 57, 'filem': 57,
            'hebreus': 58, 'hb': 58, 'heb': 58,
            'tiago': 59, 'tg': 59, 'tiag': 59,
            '1pedro': 60, '1 pe': 60, '1ped': 60,
            '2pedro': 61, '2 pe': 61, '2ped': 61,
            '1joao': 62, '1 jo': 62, '1 joao': 62,
            '2joao': 63, '2 jo': 63, '2 joao': 63,
            '3joao': 64, '3 jo': 64, '3 joao': 64,
            'judas': 65, 'jd': 65, 'judas': 65,
            'apocalipse': 66, 'ap': 66, 'apoc': 66
        };
        
        const livroBusca = livro.toLowerCase().replace(/\s/g, '');
        let livroId = abreviacoes[livroBusca];
        
        if (!livroId) {
            // Tentar buscar por nome no banco
            const nomeBusca = livro.toLowerCase();
            bibliaDb.get(`
                SELECT id FROM livros 
                WHERE LOWER(nome) LIKE ? OR LOWER(nome) LIKE REPLACE(?, 'ã', 'a')
                LIMIT 1
            `, [`%${nomeBusca}%`, `%${nomeBusca}%`], (err, row) => {
                if (err || !row) return res.status(404).json({ error: 'Livro não encontrado' });
                livroId = row.id;
                buscarCapitulo(livroId);
            });
        } else {
            buscarCapitulo(livroId);
        }
        
        function buscarCapitulo(livroId) {
            bibliaDb.get(`SELECT nome FROM livros WHERE id = ?`, [livroId], (err, livroRow) => {
                if (err || !livroRow) return res.status(404).json({ error: 'Livro não encontrado' });
                
                bibliaDb.all(`
                    SELECT v.versiculo, v.texto
                    FROM versos v
                    WHERE v.livro_id = ? AND v.capitulo_numero = ?
                    ORDER BY v.versiculo
                `, [livroId, capituloNum], (err2, versos) => {
                    if (err2) return res.status(500).json({ error: err2.message });
                    if (versos.length === 0) return res.status(404).json({ error: 'Capítulo não encontrado' });
                    
                    res.json({
                        livro: livroRow.nome,
                        capitulo: capituloNum,
                        versos: versos.map(v => v.texto)
                    });
                });
            });
        }
    } else {
        res.status(500).json({ error: 'Banco de dados da bíblia não encontrado' });
    }
});

// Busca na Bíblia com paginação (FTS5)
app.get('/api/biblia/busca', (req, res) => {
    const { q, limite = 20, offset = 0 } = req.query;
    
    if (!q || q.length < 2) {
        return res.status(400).json({ error: 'Termo de busca deve ter pelo menos 2 caracteres' });
    }
    
    if (bibliaSQLiteReady) {
        // Usar FTS5 para busca
        const termo = q + '*'; // Adicionar wildcard para prefix search
        
        // Primeiro, contar total de resultados
        bibliaDb.get(`
            SELECT COUNT(*) as total
            FROM versos_fts
            WHERE versos_fts MATCH ?
        `, [termo], (err, countRow) => {
            if (err) {
                console.error('Erro na busca FTS5:', err.message);
                return res.status(500).json({ error: err.message });
            }
            
            const total = countRow.total || 0;
            
            // Buscar resultados com paginação
            bibliaDb.all(`
                SELECT v.versiculo, v.texto, v.capitulo_numero, l.nome as livro_nome
                FROM versos v
                JOIN livros l ON l.id = v.livro_id
                JOIN versos_fts ON versos_fts.rowid = v.id
                WHERE versos_fts MATCH ?
                ORDER BY v.livro_id, v.capitulo_numero, v.versiculo
                LIMIT ? OFFSET ?
            `, [termo, parseInt(limite), parseInt(offset)], (err2, rows) => {
                if (err2) return res.status(500).json({ error: err2.message });
                
                const resultados = rows.map(r => ({
                    livro: r.livro_nome,
                    abreviacao: (ABREVIACOES_LIVROS[r.livro_id] || r.livro_nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')).replace(/\s/g, ''),
                    capitulo: r.capitulo_numero,
                    verso: r.versiculo,
                    texto: r.texto
                }));
                
                res.json({
                    total,
                    limite: parseInt(limite),
                    offset: parseInt(offset),
                    resultados
                });
            });
        });
    } else {
        res.status(500).json({ error: 'Banco de dados da bíblia não encontrado' });
    }
});

// Autocomplete para busca
app.get('/api/biblia/autocomplete', (req, res) => {
    const { q } = req.query;
    
    if (!q || q.length < 1) {
        return res.json([]);
    }
    
    if (bibliaSQLiteReady) {
        // Buscar livros pelo nome
        bibliaDb.all(`
            SELECT nome
            FROM livros
            WHERE LOWER(nome) LIKE LOWER(?)
            LIMIT 10
        `, [`%${q}%`], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            
            const sugestoes = rows.map(r => ({
                tipo: 'livro',
                nome: r.nome
            }));
            
            res.json(sugestoes);
        });
    } else {
        res.json([]);
    }
});

// ========== ÁREA DO MEMBRO ==========

// Configuração do multer para upload de PDFs
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '..', 'public', 'uploads', 'pdfs');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } });

// CRUD ÁREA DO MEMBRO (Admin)
app.get('/api/admin/area-membro', verifyAdmin, (req, res) => {
    db.all("SELECT * FROM area_membro ORDER BY ordem ASC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Listar tópicos da área do membro (público)
app.get('/api/area-membro', (req, res) => {
    db.all("SELECT id, titulo, descricao, conteudo, pdf_path, categoria, icone, ordem FROM area_membro WHERE ativo = 1 ORDER BY ordem ASC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Upload de PDF (via Base64)
app.post('/api/admin/upload-pdf-base64', verifyAdmin, (req, res) => {
    console.log('[DEBUG API] upload-pdf-base64 chamado');
    console.log('[DEBUG API] req.body:', JSON.stringify(req.body).substring(0, 500));
    try {
        const { filename, data } = req.body;
        
        if (!filename || !data) {
            console.log('[DEBUG API] Erro: Nome do arquivo ou dados faltando');
            return res.status(400).json({ error: 'Nome do arquivo e dados são obrigatórios' });
        }
        
        console.log('[DEBUG API] Recebendo arquivo:', filename, '- Tamanho dos dados:', data.length);
        
        // Decodificar Base64
        const buffer = Buffer.from(data, 'base64');
        console.log('[DEBUG API] Buffer criado, tamanho:', buffer.length);
        
        // Gerar nome de arquivo único
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = filename.split('.').pop() || 'pdf';
        const savedFilename = uniqueSuffix + '.' + ext;
        
        // Salvar arquivo
        const dir = path.join(__dirname, '..', 'public', 'uploads', 'pdfs');
        if (!fs.existsSync(dir)) {
            console.log('[DEBUG API] Criando diretório:', dir);
            fs.mkdirSync(dir, { recursive: true });
        }
        
        const filePath = path.join(dir, savedFilename);
        console.log('[DEBUG API] Salvando em:', filePath);
        fs.writeFileSync(filePath, buffer);
        
        const pdfPath = '/uploads/pdfs/' + savedFilename;
        console.log('[DEBUG API] PDF salvo com sucesso, path:', pdfPath);
        res.json({ path: pdfPath, message: 'Arquivo enviado com sucesso!' });
    } catch (error) {
        console.error('[DEBUG API] Erro ao salvar PDF:', error);
        res.status(500).json({ error: 'Erro ao salvar arquivo: ' + error.message });
    }
});

// Criar tópico da área do membro
app.post('/api/admin/area-membro', verifyAdmin, (req, res) => {
    const { titulo, descricao, conteudo, pdfPath, categoria, icone, ordem, ativo } = req.body;
    
    db.run("INSERT INTO area_membro (titulo, descricao, conteudo, pdf_path, categoria, icone, ordem, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", 
        [titulo, descricao || '', conteudo || '', pdfPath || '', categoria, icone || 'fas fa-book', ordem || 0, ativo !== undefined ? ativo : 1], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, message: 'Tópico criado!' });
        });
});

// Atualizar tópico da área do membro
app.put('/api/admin/area-membro/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    const { titulo, descricao, conteudo, pdfPath, categoria, icone, ordem, ativo } = req.body;
    
    db.run("UPDATE area_membro SET titulo = ?, descricao = ?, conteudo = ?, pdf_path = ?, categoria = ?, icone = ?, ordem = ?, ativo = ? WHERE id = ?",
        [titulo, descricao || '', conteudo || '', pdfPath || '', categoria, icone || 'fas fa-book', ordem || 0, ativo !== undefined ? ativo : 1, id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Tópico não encontrado' });
            res.json({ message: 'Tópico atualizado!' });
        });
});

// Excluir tópico da área do membro
app.delete('/api/admin/area-membro/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    
    db.run("DELETE FROM area_membro WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Tópico não encontrado' });
        res.json({ message: 'Tópico excluído!' });
    });
});

// ========== VÍDEO AULAS ==========

// Listar todas as aulas (público)
app.get('/api/aulas', (req, res) => {
    console.log('[DEBUG API] GET /api/aulas - Buscando aulas ativas');
    db.all("SELECT * FROM aulas WHERE ativo = 1 ORDER BY created_at DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        console.log('[DEBUG API] GET /api/aulas - Aulas encontradas:', rows.length);
        if (rows.length > 0) {
            console.log('[DEBUG API] GET /api/aulas - Primeira aula:', JSON.stringify(rows[0]));
        }
        res.json(rows);
    });
});

// Listar todas as aulas (admin)
app.get('/api/admin/aulas', verifyAdmin, (req, res) => {
    console.log('[DEBUG API] GET /api/admin/aulas - Buscando todas as aulas');
    db.all("SELECT * FROM aulas ORDER BY created_at DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        console.log('[DEBUG API] GET /api/admin/aulas - Aulas encontradas:', rows.length);
        if (rows.length > 0) {
            console.log('[DEBUG API] GET /api/admin/aulas - Primeira aula:', JSON.stringify(rows[0]));
        }
        res.json(rows);
    });
});

// Criar aula
app.post('/api/admin/aulas', verifyAdmin, (req, res) => {
    const { titulo, descricao, video_url, thumbnail, pdf_path, duracao, autor, categoria, ativo } = req.body;
    
    console.log('[DEBUG API] POST /api/admin/aulas recebido');
    console.log('[DEBUG API] pdf_path recebido:', pdf_path);
    
    if (!titulo || !video_url) {
        return res.status(400).json({ error: 'Título e URL do vídeo são obrigatórios' });
    }

    db.run("INSERT INTO aulas (titulo, descricao, video_url, thumbnail, pdf_path, duracao, autor, categoria, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [titulo, descricao || '', video_url, thumbnail || '', pdf_path || '', duracao || '00:00', autor || 'MAANAIN', categoria || 'estudos', ativo !== undefined ? ativo : 1],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            console.log('[DEBUG API] Aula criada com ID:', this.lastID, '- pdf_path:', pdf_path);
            res.status(201).json({ message: 'Aula criada!', id: this.lastID });
        });
});

// Atualizar aula
app.put('/api/admin/aulas/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    const { titulo, descricao, video_url, thumbnail, pdf_path, duracao, autor, categoria, ativo } = req.body;
    
    console.log('[DEBUG API] PUT /api/admin/aulas/' + id + ' recebido');
    console.log('[DEBUG API] pdf_path recebido:', pdf_path);

    db.run("UPDATE aulas SET titulo = ?, descricao = ?, video_url = ?, thumbnail = ?, pdf_path = ?, duracao = ?, autor = ?, categoria = ?, ativo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [titulo, descricao || '', video_url, thumbnail || '', pdf_path || '', duracao || '00:00', autor || 'MAANAIN', categoria || 'estudos', ativo !== undefined ? ativo : 1, id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Aula não encontrada' });
            console.log('[DEBUG API] Aula atualizada, ID:', id, '- pdf_path:', pdf_path);
            res.json({ message: 'Aula atualizada!' });
        });
});

// Excluir aula
app.delete('/api/admin/aulas/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;

    db.run("DELETE FROM aulas WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Aula não encontrada' });
        res.json({ message: 'Aula excluída!' });
    });
});

// Incrementar visualizações
app.post('/api/aulas/:id/views', (req, res) => {
    const { id } = req.params;
    
    db.run("UPDATE aulas SET visualizacoes = visualizacoes + 1 WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Visualização registrada' });
    });
});

// ✅ Static files (SEMPRE POR ÚLTIMO)
app.use("/", express.static(path.join(__dirname, "../public")));

app.listen(PORT, () => {
    console.log(`✅ MAANAIN Server: http://localhost:${PORT}`);
    
});
