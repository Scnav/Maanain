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


// ✅ Static files (SEMPRE POR ÚLTIMO)
app.use("/", express.static(path.join(__dirname, "../public")));

app.listen(PORT, () => {
    console.log(`✅ MAANAIN Server: http://localhost:${PORT}`);
    console.log(`🔥 Criar admin: http://localhost:${PORT}/setar-admin`);
});
