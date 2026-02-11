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

    // Inicializar cultos padrão se não existirem
    db.run("INSERT OR IGNORE INTO cultos (id, titulo, horario, local) VALUES (1, 'Culto de Adoração', '18:30', 'Salão Principal - MAANAIN')");
    db.run("INSERT OR IGNORE INTO cultos (id, titulo, horario, local) VALUES (2, 'Escola Bíblica Dominical', '08:30', 'Sala de Ensino - MAANAIN')");
    db.run("INSERT OR IGNORE INTO cultos (id, titulo, horario, local) VALUES (3, 'Culto de Ensino', '09:45', 'Salão Principal - MAANAIN')");
    db.run("INSERT OR IGNORE INTO cultos (id, titulo, horario, local) VALUES (4, 'Culto de Oração', '19:30', 'Salão Principal - MAANAIN')");
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

// ✅ ADMIN ROUTES
app.get('/api/admin/users', (req, res) => {
    if (req.headers['x-admin-token'] !== 'maanain2026') {
        return res.status(403).json({ error: 'Token inválido' });
    }

    db.all("SELECT id, username, email, role FROM users ORDER BY id DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.put('/api/admin/users/:id/role', (req, res) => {
    if (req.headers['x-admin-token'] !== 'maanain2026') {
        return res.status(403).json({ error: 'Token inválido' });
    }

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

app.delete('/api/admin/users/:id', (req, res) => {
    if (req.headers['x-admin-token'] !== 'maanain2026') {
        return res.status(403).json({ error: 'Token inválido' });
    }

    const { id } = req.params;

    db.run("DELETE FROM users WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json({ message: 'Usuário excluído' });
    });
});

app.get('/api/admin/stats', (req, res) => {
    if (req.headers['x-admin-token'] !== 'maanain2026') {
        return res.status(403).json({ error: 'Token inválido' });
    }

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
app.get('/api/admin/noticias', (req, res) => {
    if (req.headers['x-admin-token'] !== 'maanain2026') {
        return res.status(403).json({ error: 'Token inválido' });
    }

    db.all("SELECT * FROM noticias ORDER BY created_at DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/admin/noticias', (req, res) => {
    if (req.headers['x-admin-token'] !== 'maanain2026') {
        return res.status(403).json({ error: 'Token inválido' });
    }

    const { titulo, conteudo } = req.body;
    if (!titulo || !conteudo) {
        return res.status(400).json({ error: 'Título e conteúdo obrigatórios' });
    }

    db.run("INSERT INTO noticias (titulo, conteudo) VALUES (?, ?)", [titulo, conteudo], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, titulo, conteudo, created_at: new Date().toISOString() });
    });
});

app.put('/api/admin/noticias/:id', (req, res) => {
    if (req.headers['x-admin-token'] !== 'maanain2026') {
        return res.status(403).json({ error: 'Token inválido' });
    }

    const { id } = req.params;
    const { titulo, conteudo } = req.body;

    db.run("UPDATE noticias SET titulo = ?, conteudo = ? WHERE id = ?", [titulo, conteudo, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Notícia não encontrada' });
        res.json({ message: 'Notícia atualizada' });
    });
});

app.delete('/api/admin/noticias/:id', (req, res) => {
    if (req.headers['x-admin-token'] !== 'maanain2026') {
        return res.status(403).json({ error: 'Token inválido' });
    }

    const { id } = req.params;

    db.run("DELETE FROM noticias WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Notícia não encontrada' });
        res.json({ message: 'Notícia excluída' });
    });
});

// CRUD EVENTOS
app.get('/api/admin/eventos', (req, res) => {
    if (req.headers['x-admin-token'] !== 'maanain2026') {
        return res.status(403).json({ error: 'Token inválido' });
    }

    db.all("SELECT * FROM eventos ORDER BY created_at DESC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/admin/eventos', (req, res) => {
    if (req.headers['x-admin-token'] !== 'maanain2026') {
        return res.status(403).json({ error: 'Token inválido' });
    }

    const { titulo, data, local } = req.body;
    if (!titulo || !data) {
        return res.status(400).json({ error: 'Título e data obrigatórios' });
    }

    db.run("INSERT INTO eventos (titulo, data, local) VALUES (?, ?, ?)", [titulo, data, local || null], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, titulo, data, local, created_at: new Date().toISOString() });
    });
});

app.put('/api/admin/eventos/:id', (req, res) => {
    if (req.headers['x-admin-token'] !== 'maanain2026') {
        return res.status(403).json({ error: 'Token inválido' });
    }

    const { id } = req.params;
    const { titulo, data, local } = req.body;

    db.run("UPDATE eventos SET titulo = ?, data = ?, local = ? WHERE id = ?", [titulo, data, local, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Evento não encontrado' });
        res.json({ message: 'Evento atualizado' });
    });
});

app.delete('/api/admin/eventos/:id', (req, res) => {
    if (req.headers['x-admin-token'] !== 'maanain2026') {
        return res.status(403).json({ error: 'Token inválido' });
    }

    const { id } = req.params;

    db.run("DELETE FROM eventos WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Evento não encontrado' });
        res.json({ message: 'Evento excluído' });
    });
});

// CRUD CONTEÚDOS DA PÁGINA INICIAL
app.get('/api/admin/page-content', (req, res) => {
    if (req.headers['x-admin-token'] !== 'maanain2026') {
        return res.status(403).json({ error: 'Token inválido' });
    }

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
app.get('/api/admin/ministerios', (req, res) => {
    if (req.headers['x-admin-token'] !== 'maanain2026') {
        return res.status(403).json({ error: 'Token inválido' });
    }

    db.all("SELECT * FROM ministerios ORDER BY ordem ASC", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/admin/ministerios', (req, res) => {
    if (req.headers['x-admin-token'] !== 'maanain2026') {
        return res.status(403).json({ error: 'Token inválido' });
    }

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

app.put('/api/admin/ministerios/:id', (req, res) => {
    if (req.headers['x-admin-token'] !== 'maanain2026') {
        return res.status(403).json({ error: 'Token inválido' });
    }

    const { id } = req.params;
    const { titulo, descricao, icone, ordem } = req.body;

    db.run("UPDATE ministerios SET titulo = ?, descricao = ?, icone = ?, ordem = ? WHERE id = ?",
        [titulo, descricao, icone, ordem, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Ministério não encontrado' });
        res.json({ message: 'Ministério atualizado' });
    });
});

app.delete('/api/admin/ministerios/:id', (req, res) => {
    if (req.headers['x-admin-token'] !== 'maanain2026') {
        return res.status(403).json({ error: 'Token inválido' });
    }

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
app.get('/api/admin/cultos', (req, res) => {
    if (req.headers['x-admin-token'] !== 'maanain2026') {
        return res.status(403).json({ error: 'Token inválido' });
    }

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

app.put('/api/admin/cultos/:id', (req, res) => {
    if (req.headers['x-admin-token'] !== 'maanain2026') {
        return res.status(403).json({ error: 'Token inválido' });
    }

    const { id } = req.params;
    const { titulo, horario, local } = req.body;

    db.run("UPDATE cultos SET titulo = ?, horario = ?, local = ?, updated_at = datetime('now') WHERE id = ?",
        [titulo, horario, local, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Culto não encontrado' });
        res.json({ message: 'Culto atualizado' });
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
