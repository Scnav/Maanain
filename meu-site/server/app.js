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

// Criar tabela de usuários se não existir
db.serialize(() => {
    // Na parte de criação da tabela, altere para:
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'frequentador'  -- 👈 NOVA COLUNA
    )
`);
});

// Rota: cadastro de usuário
app.post("/api/register", async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Nome de usuário e senha são obrigatórios." });
    }

    try {
        const hashed = await bcrypt.hash(password, 10);
        const stmt = db.prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");
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

// Rota: login
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Usuário e senha são obrigatórios." });
    }

    db.get(
        "SELECT id, username, email, password_hash FROM users WHERE username = ?",
        [username],
        async (err, row) => {
            if (err || !row) {
                return res.status(400).json({ error: "Usuário ou senha inválidos." });
            }
            const valid = await bcrypt.compare(password, row.password_hash);
            if (!valid) {
                return res.status(400).json({ error: "Usuário ou senha inválidos." });
            }
            res.json({
                message: "Login bem‑sucedido!",
                user: { id: row.id, username: row.username, email: row.email, role: row.role }
            });
        }
    );
});

// Servir arquivos estáticos do diretório /public
app.use("/", express.static(path.join(__dirname, "../public")));

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
