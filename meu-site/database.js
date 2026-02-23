<<<<<<< HEAD:meu-site/database.js
// Módulo de Banco de Dados - MySQL com fallback SQLite
const mysql2 = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
=======
// Módulo de Banco de Dados MySQL - Hostinger
// Apenas MySQL, sem SQLite

const mysql2 = require('mysql2/promise');
>>>>>>> c859f57 (node22):meu-site/server/database.js
const dbConfig = require('./db.config');

let pool;
let isMySQL = false;

<<<<<<< HEAD:meu-site/database.js
// Wrapper para compatibilidade com código SQLite (callbacks)
const db = {
    // Para SELECT que retorna uma linha
    get: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        pool.query(sql, params, (err, rows) => {
            if (err) return callback(err);
            callback(null, rows[0] || null);
        });
    },
    
    // Para SELECT que retorna múltiplas linhas
    all: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        pool.query(sql, params, (err, rows) => {
            if (err) return callback(err);
            callback(null, rows);
        });
    },
    
    // Para INSERT, UPDATE, DELETE
    run: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        pool.query(sql, params, function(err, result) {
            if (err) return callback(err);
            callback(null, { 
                lastID: result.insertId || 0, 
                changes: result.affectedRows || 0 
            });
        });
    },
    
    // Para serialização (não necessária no MySQL, mas mantida para compatibilidade)
    serialize: (callback) => {
        callback();
    }
};

// Inicializar banco de dados MySQL
async function initDatabase() {
    console.log('📦 Conectando ao MySQL...');
    
    // Primeiro conecta sem banco para criar se não existir
    const initialPool = mysql2.createPool({
        host: dbConfig.host || 'localhost',
        user: dbConfig.user,
        password: dbConfig.password,
        waitForConnections: true,
        connectionLimit: 2,
        queueLimit: 0
    });
    
    try {
        // Criar banco se não existir
        await initialPool.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log('✅ Banco de dados verificado/criado!');
    } catch (err) {
        console.log('Erro ao criar banco:', err.message);
    }
    
    // Agora conecta ao banco específico
    await initialPool.end();
=======
// Inicializar banco de dados MySQL
async function initDatabase() {
    console.log('📦 Conectando ao MySQL da Hostinger...');
>>>>>>> c859f57 (node22):meu-site/server/database.js
    
    pool = mysql2.createPool({
        host: dbConfig.host || 'localhost',
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        waitForConnections: true,
        connectionLimit: dbConfig.connectionLimit || 10,
        queueLimit: 0
    });
    
    // Testar conexão
    const connection = await pool.getConnection();
    console.log('✅ Conectado ao MySQL com sucesso!');
    connection.release();
    isMySQL = true;
    
    // Criar tabelas automaticamente
    await createMySQLTables(pool);
    
    return { pool, isMySQL };
}

// Criar tabelas no MySQL automaticamente
async function createMySQLTables(pool) {
    console.log('📦 Criando tabelas no MySQL...');
    
    const tables = [
        `CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255),
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'frequentador',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS noticias (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo TEXT NOT NULL,
            conteudo TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS eventos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo TEXT NOT NULL,
<<<<<<< HEAD:meu-site/database.js
            data TEXT NOT NULL,
            horario TEXT,
            local TEXT,
=======
            data DATE NOT NULL,
            horario TIME,
            local VARCHAR(255),
>>>>>>> c859f57 (node22):meu-site/server/database.js
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS page_content (
            id INT AUTO_INCREMENT PRIMARY KEY,
            section VARCHAR(255) UNIQUE NOT NULL,
<<<<<<< HEAD:meu-site/database.js
            title TEXT,
            content TEXT,
            link TEXT,
            image TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
=======
            title VARCHAR(255),
            content TEXT,
            link VARCHAR(500),
            image VARCHAR(500),
>>>>>>> c859f57 (node22):meu-site/server/database.js
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS youtube_config (
<<<<<<< HEAD:meu-site/database.js
            id INT PRIMARY KEY CHECK (id = 1),
            channel_id VARCHAR(255),
            channel_name VARCHAR(255),
            enabled TINYINT DEFAULT 0,
=======
            id INT AUTO_INCREMENT PRIMARY KEY CHECK (id = 1),
            channel_id VARCHAR(255),
            channel_name VARCHAR(255),
            enabled TINYINT(1) DEFAULT 0,
>>>>>>> c859f57 (node22):meu-site/server/database.js
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS mensagens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo TEXT NOT NULL,
            conteudo TEXT,
<<<<<<< HEAD:meu-site/database.js
            video_url TEXT,
            data_publicacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ativa TINYINT DEFAULT 1,
=======
            video_url VARCHAR(500),
            data_publicacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ativa TINYINT(1) DEFAULT 1,
>>>>>>> c859f57 (node22):meu-site/server/database.js
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS ministerios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo TEXT NOT NULL,
            descricao TEXT,
<<<<<<< HEAD:meu-site/database.js
            icone VARCHAR(255) DEFAULT 'fas fa-church',
=======
            icone VARCHAR(100) DEFAULT 'fas fa-church',
>>>>>>> c859f57 (node22):meu-site/server/database.js
            ordem INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS cultos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo TEXT NOT NULL,
<<<<<<< HEAD:meu-site/database.js
            horario TEXT,
            local TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
=======
            horario TIME,
            local VARCHAR(255),
>>>>>>> c859f57 (node22):meu-site/server/database.js
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS inscricoes_eventos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            evento_id INT NOT NULL,
            nome TEXT NOT NULL,
<<<<<<< HEAD:meu-site/database.js
            email TEXT,
            telefone TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (evento_id) REFERENCES eventos(id)
=======
            email VARCHAR(255),
            telefone VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE
>>>>>>> c859f57 (node22):meu-site/server/database.js
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS topicos_biblia (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo TEXT NOT NULL,
            descricao TEXT,
            conteudo TEXT,
<<<<<<< HEAD:meu-site/database.js
            categoria VARCHAR(255) DEFAULT 'geral',
            icone VARCHAR(255) DEFAULT 'fas fa-book-bible',
            ordem INT DEFAULT 0,
            ativa TINYINT DEFAULT 1,
            data_publicacao TEXT,
            hora_publicacao TEXT,
=======
            categoria VARCHAR(100) DEFAULT 'geral',
            icone VARCHAR(100) DEFAULT 'fas fa-book-bible',
            ordem INT DEFAULT 0,
            ativo TINYINT(1) DEFAULT 1,
            data_publicacao DATETIME,
            hora_publicacao TIME,
>>>>>>> c859f57 (node22):meu-site/server/database.js
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS area_membro (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo TEXT NOT NULL,
            descricao TEXT,
            conteudo TEXT,
<<<<<<< HEAD:meu-site/database.js
            pdf_path TEXT,
            categoria TEXT NOT NULL,
            icone VARCHAR(255) DEFAULT 'fas fa-book',
            ordem INT DEFAULT 0,
            ativo TINYINT DEFAULT 1,
=======
            pdf_path VARCHAR(500),
            categoria VARCHAR(100) NOT NULL,
            icone VARCHAR(100) DEFAULT 'fas fa-book',
            ordem INT DEFAULT 0,
            ativo TINYINT(1) DEFAULT 1,
>>>>>>> c859f57 (node22):meu-site/server/database.js
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS aulas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo TEXT NOT NULL,
            descricao TEXT,
            video_url TEXT NOT NULL,
<<<<<<< HEAD:meu-site/database.js
            thumbnail TEXT,
            pdf_path TEXT,
            duracao VARCHAR(255) DEFAULT '00:00',
            autor VARCHAR(255) DEFAULT 'MAANAIN',
            categoria VARCHAR(255) DEFAULT 'estudos',
            visualizacoes INT DEFAULT 0,
            ativo TINYINT DEFAULT 1,
=======
            thumbnail VARCHAR(500),
            pdf_path VARCHAR(500),
            duracao VARCHAR(10) DEFAULT '00:00',
            autor VARCHAR(100) DEFAULT 'MAANAIN',
            categoria VARCHAR(100) DEFAULT 'estudos',
            visualizacoes INT DEFAULT 0,
            ativo TINYINT(1) DEFAULT 1,
>>>>>>> c859f57 (node22):meu-site/server/database.js
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS gallery (
            id INT AUTO_INCREMENT PRIMARY KEY,
<<<<<<< HEAD:meu-site/database.js
            filename TEXT NOT NULL,
            original_name TEXT,
            url TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
=======
            filename VARCHAR(255) NOT NULL,
            original_name VARCHAR(255),
            url VARCHAR(500) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
>>>>>>> c859f57 (node22):meu-site/server/database.js
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    ];
    
    for (const sql of tables) {
        try {
<<<<<<< HEAD:meu-site/database.js
            await pool.execute(sql);
        } catch (err) {
            console.log('Tabela já existe ou erro ao criar:', err.message);
=======
            const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
            await pool.execute(sql);
            console.log(`  ✅ Tabela ${tableName}`);
        } catch (err) {
            if (!err.message.includes('already exists')) {
                console.log(`  ⚠️  Erro: ${err.message}`);
            }
>>>>>>> c859f57 (node22):meu-site/server/database.js
        }
    }
    
    // Inserir configuração padrão do YouTube
    try {
<<<<<<< HEAD:meu-site/database.js
        await pool.execute('INSERT IGNORE INTO youtube_config (id, channel_id, channel_name, enabled) VALUES (1, "", "", 0)');
    } catch (e) {}
    
    console.log('✅ Tabelas MySQL criadas com sucesso!');
}

// Função para determinar se é MySQL
function checkIsMySQL() {
    return isMySQL;
}

module.exports = {
    initDatabase,
    db: db,
    getPool: () => pool,
    isMySQL: checkIsMySQL
=======
        await pool.execute(`INSERT IGNORE INTO youtube_config (id, channel_id, channel_name, enabled) VALUES (1, '', '', 0)`);
    } catch (err) {}
    
    console.log('✅ Tabelas MySQL criadas/verificadas!');
}

// Wrapper para compatibilidade com o código existente
class DatabaseWrapper {
    constructor() {
        this._pool = pool;
    }
    
    serialize(callback) {
        // MySQL não precisa de serialize, executa direto
        callback();
    }
    
    run(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        params = params || [];
        
        pool.execute(sql, params)
            .then(([result]) => {
                if (callback) callback(null);
            })
            .catch((err) => {
                if (callback) callback(err);
            });
    }
    
    get(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        params = params || [];
        
        pool.execute(sql, params)
            .then(([rows]) => {
                if (callback) callback(null, rows[0] || null);
            })
            .catch((err) => {
                if (callback) callback(err);
            });
    }
    
    all(sql, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        params = params || [];
        
        pool.execute(sql, params)
            .then(([rows]) => {
                if (callback) callback(null, rows);
            })
            .catch((err) => {
                if (callback) callback(err);
            });
    }
}

const dbWrapper = new DatabaseWrapper();

module.exports = { 
    initDatabase, 
    db: dbWrapper, 
    pool: () => pool,
    isMySQL: () => true
>>>>>>> c859f57 (node22):meu-site/server/database.js
};
