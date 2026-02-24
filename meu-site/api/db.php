<?php
/**
 * Conexão com Banco de Dados MySQL - MAANAIN
 * Configurações do banco de dados da Hostinger
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, x-admin-token, x-user-data');

// Responder a requisições OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configurações do banco de dados (Hostinger)
$db_config = [
    'host' => 'localhost',
    'user' => 'u669041569_DbMaanaim',
    'password' => '=f1fH1Yycv7K',
    'database' => 'u669041569_DbMaanaim'
];

// Token admin (mesmo do Node.js)
define('ADMIN_TOKEN', 'maanain2026');

// JWT Secret (mesmo do Node.js)
define('JWT_SECRET', 'maanain_jwt_secret_2026_fixo');

// Tempo de expiração do token (24 horas em segundos)
define('JWT_EXPIRES_IN', 86400);

// Variável global de conexão
$conn = null;

/**
 * Conectar ao banco de dados MySQL
 */
function getDB() {
    global $db_config, $conn;
    
    if ($conn !== null) {
        return $conn;
    }
    
    try {
        $conn = new mysqli(
            $db_config['host'],
            $db_config['user'],
            $db_config['password'],
            $db_config['database']
        );
        
        if ($conn->connect_error) {
            throw new Exception("Erro na conexão: " . $conn->connect_error);
        }
        
        // Definir charset UTF-8
        $conn->set_charset("utf8mb4");
        
        return $conn;
    } catch (Exception $e) {
        error_log("Erro de conexão MySQL: " . $e->getMessage());
        return null;
    }
}

/**
 * Fechar conexão
 */
function closeDB() {
    global $conn;
    if ($conn !== null) {
        $conn->close();
        $conn = null;
    }
}

/**
 * Verificar se o usuário é admin via JWT
 */
function verifyAdmin() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (!empty($authHeader) && strpos($authHeader, 'Bearer ') === 0) {
        $token = substr($authHeader, 7);
        
        // Decodificar JWT manualmente (sem biblioteca)
        $parts = explode('.', $token);
        if (count($parts) === 3) {
            $payload = json_decode(base64_decode($parts[1]), true);
            
            if ($payload && isset($payload['role']) && ($payload['role'] === 'admin' || !empty($payload['isAdmin']))) {
                // Verificar expiração
                if (isset($payload['exp']) && $payload['exp'] > time()) {
                    return $payload;
                }
            }
        }
    }
    
    return false;
}

/**
 * Responder com erro
 */
function respondError($message, $code = 500) {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit();
}

/**
 * Responder com sucesso
 */
function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit();
}

/**
 * Gerar código aleatório para redefinição de senha
 */
function gerarCodigo() {
    return str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
}

// Iniciar sessão para armazenar códigos de redefinição
session_start();

// Armazenar códigos de redefinição na sessão
if (!isset($_SESSION['codigos_redefinicao'])) {
    $_SESSION['codigos_redefinicao'] = [];
}
