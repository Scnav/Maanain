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

// ✅ CORRIGIDO: Criação/migração da tabela SEM ERRO
db.serialize(() => {
    // Tenta criar tabela NOVA com role
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'frequentador'
        )
    `, (err) => {
        if (err && err.message.includes("users already exists")) {
            // ✅ SE TABELA JÁ EXISTE, ADICIONA COLUNA role
            db.run("PRAGMA table_info(users)", (err, rows) => {
                const temRole = rows.some(row => row.name === 'role');
                if (!temRole) {
                    db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'frequentador'");
                }
            });
        }
    });
});

// ✅ REGISTER PERFEITO (4 parâmetros)
app.post("/api/register", async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Nome de usuário e senha são obrigatórios." });
    }

    try {
        const hashed = await bcrypt.hash(password, 10);
        const stmt = db.prepare("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)");
        stmt.run(username, email || null, hashed, 'frequentador', function (err) {
            if (err) {
                if (err.message.includes("UNIQUE constraint failed")) {
                    return res.status(400).json({ error: "Usuário já existe." });
                }
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: "Usuário cadastrado com sucesso.", id: this.lastID });
        });
        stmt.finalize();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ LOGIN PERFEITO (busca role)
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Usuário e senha são obrigatórios." });
    }

    db.get(
        "SELECT id, username, email, password_hash, role FROM users WHERE username = ?",
        [username],
        async (err, row) => {
            if (err || !row) {
                return res.status(400).json({ error: "Usuário ou senha inválidos." });
            }
            
            // Se não tem role, define como frequentador
            if (!row.role) {
                db.run("UPDATE users SET role = 'frequentador' WHERE id = ?", [row.id]);
                row.role = 'frequentador';
            }
            
            const valid = await bcrypt.compare(password, row.password_hash);
            if (!valid) {
                return res.status(400).json({ error: "Usuário ou senha inválidos." });
            }
            
            res.json({
                message: "Login bem-sucedido!",
                user: { 
                    id: row.id, 
                    username: row.username, 
                    email: row.email, 
                    role: row.role 
                }
            });
        }
    );
});

// Servir arquivos estáticos
app.use("/", express.static(path.join(__dirname, "../public")));

app.listen(PORT, () => {
    console.log(`✅ Servidor MAANAIN rodando em http://localhost:${PORT}`);
});
