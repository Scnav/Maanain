const sqlite3 = require("sqlite3").verbose();
const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");

const PORT = 3000;
const DB_PATH = path.join(__dirname, "db.sqlite3");

const app = express();
const db = new sqlite3.Database(DB_PATH);

// Middleware
app.use(express.json());
app.use(cors());

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
            local TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS page_content (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section TEXT UNIQUE NOT NULL,
            title TEXT,
            content TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
});

// ✅ REGISTER
app.post("/api/register", async (req, res) => {
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
app.post("/api/login", (req, res) => {
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

// Middleware de autenticação admin
const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers['x-admin-token'];
    const userData = req.headers['x-user-data'];
    
    // Verificar se tem token admin ou dados de usuário
    if (authHeader === 'maanain2026') {
        return next(); // Token direto (para compatibilidade)
    }
    
    // Verificar se tem dados de usuário válidos
    if (userData) {
        try {
            const user = JSON.parse(Buffer.from(userData, 'base64').toString('utf-8'));
            if (user && user.role === 'admin') {
                return next();
            }
        } catch (e) {
            // Invalid user data
        }
    }
    
    return res.status(403).json({ error: 'Acesso não autorizado' });
};

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
    const { titulo, data, local } = req.body;
    if (!titulo || !data) {
        return res.status(400).json({ error: 'Título e data obrigatórios' });
    }

    db.run("INSERT INTO eventos (titulo, data, local) VALUES (?, ?, ?)", [titulo, data, local || null], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, titulo, data, local, created_at: new Date().toISOString() });
    });
});

app.put('/api/admin/eventos/:id', verifyAdmin, (req, res) => {
    const { id } = req.params;
    const { titulo, data, local } = req.body;

    db.run("UPDATE eventos SET titulo = ?, data = ?, local = ? WHERE id = ?", [titulo, data, local, id], function(err) {
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

app.put('/api/admin/page-content/:section', (req, res) => {
    if (req.headers['x-admin-token'] !== 'maanain2026') {
        return res.status(403).json({ error: 'Token inválido' });
    }

    const { section } = req.params;
    const { title, content } = req.body;

    db.run("INSERT OR REPLACE INTO page_content (section, title, content, updated_at) VALUES (?, ?, ?, datetime('now'))",
        [section, title, content], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Conteúdo atualizado' });
    });
});

// Endpoint público para obter conteúdos
app.get('/api/page-content', (req, res) => {
    db.all("SELECT section, title, content FROM page_content", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const contentMap = {};
        rows.forEach(row => {
            contentMap[row.section] = { title: row.title, content: row.content };
        });
        res.json(contentMap);
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


// ✅ ENDPOINTS PÚBLICOS
app.get('/api/noticias', (req, res) => {
    db.all("SELECT id, titulo, conteudo, created_at FROM noticias ORDER BY created_at DESC LIMIT 10", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/eventos', (req, res) => {
    db.all("SELECT id, titulo, data, local, created_at FROM eventos WHERE data >= datetime('now') ORDER BY data ASC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ✅ Static files (SEMPRE POR ÚLTIMO)
app.use("/", express.static(path.join(__dirname, "../public")));

app.listen(PORT, () => {
    console.log(`✅ MAANAIN Server: http://localhost:${PORT}`);
    
});
