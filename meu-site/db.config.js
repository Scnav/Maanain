// Configuração do Banco de Dados MySQL - Hostinger
// Credenciais da hospedagem
require('dotenv').config();

module.exports = {
    host: process.env.DB_HOST, // Host do MySQL
    user: process.env.DB_USER, // Seu usuário MySQL
    password: process.env.DB_PASSWORD, // Sua senha do MySQL
    database: process.env.DB_NAME, // Nome do banco de dados
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};
