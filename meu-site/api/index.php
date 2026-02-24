<?php
/**
 * API Principal MAANAIN - PHP
 * Substitui o servidor Node.js/Express
 */

require_once 'db.php';

// Obter método e URI da requisição
$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'];

// Remover query string e barras
$path = parse_url($uri, PHP_URL_PATH);
$path = trim($path, '/');

// Se a requisição for para /api/, adicionar o path
if (strpos($path, 'api/') === 0) {
    $path = substr($path, 4);
}

// Dividir path em partes
$parts = $path ? explode('/', $path) : [];

// Obter dados do request
$data = [];
if ($method === 'POST' || $method === 'PUT') {
    $rawData = file_get_contents('php://input');
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    
    if (strpos($contentType, 'application/json') !== false) {
        $data = json_decode($rawData, true) ?? [];
    } else {
        $data = $_POST;
    }
}

// Adicionar params da URL
foreach ($parts as $key => $value) {
    $data[$key] = $value;
}

// ============================================
// AUTENTICAÇÃO PÚBLICA
// ============================================

// POST /api/register
if ($method === 'POST' && $parts[0] === 'register') {
    $username = $data['username'] ?? '';
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    
    if (!$username || !$password) {
        respond(['error' => 'Nome e senha obrigatórios.'], 400);
    }
    
    $db = getDB();
    if (!$db) {
        respond(['error' => 'Erro na conexão com o banco de dados'], 500);
    }
    
    // Hash da senha
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    
    $stmt = $db->prepare("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'frequentador')");
    $stmt->bind_param("sss", $username, $email, $passwordHash);
    
    if ($stmt->execute()) {
        respond(['message' => 'Cadastro OK!', 'id' => $stmt->insert_id], 201);
    } else {
        if (strpos($stmt->error, 'UNIQUE') !== false) {
            respond(['error' => 'Usuário já existe.'], 400);
        }
        respond(['error' => $stmt->error], 500);
    }
}

// POST /api/login
if ($method === 'POST' && $parts[0] === 'login') {
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
    
    if (!$username || !$password) {
        respond(['error' => 'Usuário e senha obrigatórios.'], 400);
    }
    
    $db = getDB();
    if (!$db) {
        respond(['error' => 'Erro na conexão com o banco de dados'], 500);
    }
    
    $stmt = $db->prepare("SELECT id, username, email, password_hash, role FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        // Verificar cargo padrão
        if (!$row['role']) {
            $db->query("UPDATE users SET role = 'frequentador' WHERE id = " . $row['id']);
            $row['role'] = 'frequentador';
        }
        
        // Verificar senha
        if (password_verify($password, $row['password_hash'])) {
            respond([
                'message' => 'Login OK!',
                'user' => [
                    'id' => $row['id'],
                    'username' => $row['username'],
                    'email' => $row['email'],
                    'role' => $row['role']
                ]
            ]);
        } else {
            respond(['error' => 'Usuário ou senha inválidos.'], 400);
        }
    } else {
        respond(['error' => 'Usuário ou senha inválidos.'], 400);
    }
}

// POST /api/solicitar-redefinicao
if ($method === 'POST' && $parts[0] === 'solicitar-redefinicao') {
    $username = $data['username'] ?? '';
    
    if (!$username) {
        respond(['success' => false, 'message' => 'Nome de usuário obrigatório']);
    }
    
    $db = getDB();
    if (!$db) {
        respond(['success' => false, 'message' => 'Erro na conexão'], 500);
    }
    
    $stmt = $db->prepare("SELECT id, email FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        $codigo = gerarCodigo();
        
        // Armazenar código na sessão (em memória)
        $_SESSION['codigos_redefinicao'][$username] = [
            'codigo' => $codigo,
            'expiracao' => time() + 15 * 60 // 15 minutos
        ];
        
        // Em produção, enviar por email
        error_log("Código de redefinição para $username: $codigo");
        
        respond([
            'success' => true,
            'message' => 'Código enviado!',
            'codigo' => $codigo // Remover em produção!
        ]);
    } else {
        respond(['success' => false, 'message' => 'Usuário não encontrado']);
    }
}

// POST /api/redefinir-senha
if ($method === 'POST' && $parts[0] === 'redefinir-senha') {
    $username = $data['username'] ?? '';
    $novaSenha = $data['novaSenha'] ?? '';
    
    if (!$username || !$novaSenha) {
        respond(['success' => false, 'message' => 'Dados obrigatórios']);
    }
    
    // Verificar código
    $registroCodigo = $_SESSION['codigos_redefinicao'][$username] ?? null;
    if (!$registroCodigo) {
        respond(['success' => false, 'message' => 'Código expirado ou não solicitado']);
    }
    
    if (time() > $registroCodigo['expiracao']) {
        unset($_SESSION['codigos_redefinicao'][$username]);
        respond(['success' => false, 'message' => 'Código expirado']);
    }
    
    $db = getDB();
    if (!$db) {
        respond(['success' => false, 'message' => 'Erro na conexão'], 500);
    }
    
    $passwordHash = password_hash($novaSenha, PASSWORD_BCRYPT);
    
    $stmt = $db->prepare("UPDATE users SET password_hash = ? WHERE username = ?");
    $stmt->bind_param("ss", $passwordHash, $username);
    
    if ($stmt->execute()) {
        unset($_SESSION['codigos_redefinicao'][$username]);
        respond(['success' => true, 'message' => 'Senha atualizada com sucesso!']);
    } else {
        respond(['success' => false, 'message' => 'Erro ao atualizar senha']);
    }
}

// POST /api/admin/login
if ($method === 'POST' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'login') {
    $token = $data['token'] ?? '';
    
    if ($token === ADMIN_TOKEN) {
        // Gerar JWT manual
        $payload = [
            'id' => 0,
            'role' => 'admin',
            'isAdmin' => true,
            'loginTime' => date('c'),
            'exp' => time() + JWT_EXPIRES_IN
        ];
        
        $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
        $payloadEncoded = base64_encode(json_encode($payload));
        $signature = base64_encode(hash_hmac('sha256', "$header.$payloadEncoded", JWT_SECRET, true));
        $jwt = "$header.$payloadEncoded.$signature";
        
        respond([
            'success' => true,
            'token' => $jwt,
            'expiresIn' => JWT_EXPIRES_IN,
            'message' => 'Login admin realizado com sucesso'
        ]);
    } else {
        respond(['success' => false, 'error' => 'Token admin inválido'], 401);
    }
}

// GET /api/admin/verify
if ($method === 'GET' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'verify') {
    $admin = verifyAdmin();
    
    if ($admin) {
        respond(['valid' => true, 'admin' => $admin]);
    } else {
        respond(['error' => 'Token de autenticação não fornecido', 'code' => 'NO_TOKEN'], 401);
    }
}

// ============================================
// ROTAS ADMIN PROTEGIDAS
// ============================================

// Verificar se é rota de admin
$isAdminRoute = ($parts[0] ?? '') === 'admin';
$admin = null;

if ($isAdminRoute) {
    $admin = verifyAdmin();
    if (!$admin) {
        respond(['error' => 'Acesso não autorizado'], 403);
    }
}

// GET /api/admin/users
if ($method === 'GET' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'users' && count($parts) === 2) {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT id, username, email, role FROM users ORDER BY id DESC");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    respond($rows);
}

// PUT /api/admin/users/:id/role
if ($method === 'PUT' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'users' && preg_match('/^(\d+)\/role$/', $parts[2] ?? '', $matches)) {
    $id = $matches[1];
    $role = $data['role'] ?? '';
    
    $validRoles = ['frequentador', 'membro', 'conselho', 'admin'];
    if (!in_array($role, $validRoles)) {
        respond(['error' => 'Cargo inválido'], 400);
    }
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("UPDATE users SET role = ? WHERE id = ?");
    $stmt->bind_param("si", $role, $id);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        respond(['message' => 'Cargo atualizado']);
    } else {
        respond(['error' => 'Usuário não encontrado'], 404);
    }
}

// DELETE /api/admin/users/:id
if ($method === 'DELETE' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'users' && is_numeric($parts[2] ?? '')) {
    $id = (int)$parts[2];
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        respond(['message' => 'Usuário excluído']);
    } else {
        respond(['error' => 'Usuário não encontrado'], 404);
    }
}

// GET /api/admin/stats
if ($method === 'GET' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'stats') {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT role, COUNT(*) as count FROM users GROUP BY role");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    
    $stats = [
        'total' => 0,
        'frequentadores' => 0,
        'membros' => 0,
        'conselho' => 0,
        'admins' => 0
    ];
    
    foreach ($rows as $r) {
        $stats['total'] += $r['count'];
        if ($r['role'] === 'frequentador') $stats['frequentadores'] = (int)$r['count'];
        if ($r['role'] === 'membro') $stats['membros'] = (int)$r['count'];
        if ($r['role'] === 'conselho') $stats['conselho'] = (int)$r['count'];
        if ($r['role'] === 'admin') $stats['admins'] = (int)$r['count'];
    }
    
    respond($stats);
}

// ============================================
// NOTÍCIAS
// ============================================

// GET /api/admin/noticias
if ($method === 'GET' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'noticias' && count($parts) === 2) {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT * FROM noticias ORDER BY created_at DESC");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    respond($rows);
}

// POST /api/admin/noticias
if ($method === 'POST' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'noticias') {
    $titulo = $data['titulo'] ?? '';
    $conteudo = $data['conteudo'] ?? '';
    
    if (!$titulo || !$conteudo) {
        respond(['error' => 'Título e conteúdo obrigatórios'], 400);
    }
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'],