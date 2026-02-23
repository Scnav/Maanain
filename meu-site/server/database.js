// Módulo de Banco de Dados MySQL - Hostinger
// Apenas MySQL, sem SQLite

const mysql2 = require('mysql2/promise');
const dbConfig = require('./db.config');

let pool;
let isMySQL = false;

// Inicializar banco de dados MySQL
async function initDatabase() {
    console.log('📦 Conectando ao MySQL da Hostinger...');
    
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
            data DATE NOT NULL,
            horario TIME,
            local VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS page_content (
            id INT AUTO_INCREMENT PRIMARY KEY,
            section VARCHAR(255) UNIQUE NOT NULL,
            title VARCHAR(255),
            content TEXT,
            link VARCHAR(500),
            image VARCHAR(500),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS youtube_config (
            id INT AUTO_INCREMENT PRIMARY KEY CHECK (id = 1),
            channel_id VARCHAR(255),
            channel_name VARCHAR(255),
            enabled TINYINT(1) DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS mensagens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo TEXT NOT NULL,
            conteudo TEXT,
            video_url VARCHAR(500),
            data_publicacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ativa TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS ministerios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo TEXT NOT NULL,
            descricao TEXT,
            icone VARCHAR(100) DEFAULT 'fas fa-church',
            ordem INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS cultos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo TEXT NOT NULL,
            horario TIME,
            local VARCHAR(255),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS inscricoes_eventos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            evento_id INT NOT NULL,
            nome TEXT NOT NULL,
            email VARCHAR(255),
            telefone VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS topicos_biblia (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo TEXT NOT NULL,
            descricao TEXT,
            conteudo TEXT,
            categoria VARCHAR(100) DEFAULT 'geral',
            icone VARCHAR(100) DEFAULT 'fas fa-book-bible',
            ordem INT DEFAULT 0,
            ativo TINYINT(1) DEFAULT 1,
            data_publicacao DATETIME,
            hora_publicacao TIME,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS area_membro (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo TEXT NOT NULL,
            descricao TEXT,
            conteudo TEXT,
            pdf_path VARCHAR(500),
            categoria VARCHAR(100) NOT NULL,
            icone VARCHAR(100) DEFAULT 'fas fa-book',
            ordem INT DEFAULT 0,
            ativo TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS aulas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            titulo TEXT NOT NULL,
            descricao TEXT,
            video_url TEXT NOT NULL,
            thumbnail VARCHAR(500),
            pdf_path VARCHAR(500),
            duracao VARCHAR(10) DEFAULT '00:00',
            autor VARCHAR(100) DEFAULT 'MAANAIN',
            categoria VARCHAR(100) DEFAULT 'estudos',
            visualizacoes INT DEFAULT 0,
            ativo TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        
        `CREATE TABLE IF NOT EXISTS gallery (
            id INT AUTO_INCREMENT PRIMARY KEY,
            filename VARCHAR(255) NOT NULL,
            original_name VARCHAR(255),
            url VARCHAR(500) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    ];
    
    for (const sql of tables) {
        try {
            const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
            await pool.execute(sql);
            console.log(`  ✅ Tabela ${tableName}`);
        } catch (err) {
            if (!err.message.includes('already exists')) {
                console.log(`  ⚠️  Erro: ${err.message}`);
            }
        }
    }
    
    // Inserir configuração padrão do YouTube
    try {
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
};
