<?php
/**
 * Rotas adicionais da API MAANAIN
 * Inclui: eventos, mensagens, ministerios, cultos, topicos-biblia, 
 *         galeria, youtube, area-membro, aulas
 */

// ============================================
// EVENTOS (continuação)
// ============================================

// GET /api/admin/eventos
if ($method === 'GET' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'eventos' && count($parts) === 2) {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT * FROM eventos ORDER BY created_at DESC");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    respond($rows);
}

// POST /api/admin/eventos
if ($method === 'POST' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'eventos') {
    $titulo = $data['titulo'] ?? '';
    $data_evento = $data['data'] ?? '';
    $horario = $data['horario'] ?? null;
    $local = $data['local'] ?? null;
    
    if (!$titulo || !$data_evento) {
        respond(['error' => 'Título e data obrigatórios'], 400);
    }
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("INSERT INTO eventos (titulo, data, horario, local) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssss", $titulo, $data_evento, $horario, $local);
    
    if ($stmt->execute()) {
        respond(['id' => $stmt->insert_id, 'titulo' => $titulo, 'data' => $data_evento, 'horario' => $horario, 'local' => $local, 'created_at' => date('c')], 201);
    } else {
        respond(['error' => $stmt->error], 500);
    }
}

// PUT /api/admin/eventos/:id
if ($method === 'PUT' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'eventos' && is_numeric($parts[2] ?? '')) {
    $id = (int)$parts[2];
    $titulo = $data['titulo'] ?? '';
    $data_evento = $data['data'] ?? '';
    $horario = $data['horario'] ?? '';
    $local = $data['local'] ?? '';
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("UPDATE eventos SET titulo = ?, data = ?, horario = ?, local = ? WHERE id = ?");
    $stmt->bind_param("ssssi", $titulo, $data_evento, $horario, $local, $id);
    
    if ($stmt->execute() && $stmt->affected_rows >= 0) {
        respond(['message' => 'Evento atualizado']);
    } else {
        respond(['error' => 'Evento não encontrado'], 404);
    }
}

// DELETE /api/admin/eventos/:id
if ($method === 'DELETE' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'eventos' && is_numeric($parts[2] ?? '')) {
    $id = (int)$parts[2];
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("DELETE FROM eventos WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        respond(['message' => 'Evento excluído']);
    } else {
        respond(['error' => 'Evento não encontrado'], 404);
    }
}

// GET /api/eventos (público)
if ($method === 'GET' && $parts[0] === 'eventos') {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT id, titulo, data, horario, local, created_at FROM eventos WHERE data >= CURDATE() ORDER BY data ASC");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    respond($rows);
}

// POST /api/inscricoes
if ($method === 'POST' && $parts[0] === 'inscricoes') {
    $evento_id = $data['evento_id'] ?? '';
    $nome = $data['nome'] ?? '';
    $email = $data['email'] ?? null;
    $telefone = $data['telefone'] ?? null;
    
    if (!$evento_id || !$nome) {
        respond(['error' => 'Evento e nome são obrigatórios'], 400);
    }
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("INSERT INTO inscricoes_eventos (evento_id, nome, email, telefone) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("isss", $evento_id, $nome, $email, $telefone);
    
    if ($stmt->execute()) {
        respond(['message' => 'Inscrição realizada com sucesso!', 'id' => $stmt->insert_id], 201);
    } else {
        respond(['error' => $stmt->error], 500);
    }
}

// GET /api/inscricoes/:evento_id
if ($method === 'GET' && $parts[0] === 'inscricoes' && is_numeric($parts[1] ?? '')) {
    $evento_id = (int)$parts[1];
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("SELECT * FROM inscricoes_eventos WHERE evento_id = ? ORDER BY created_at DESC");
    $stmt->bind_param("i", $evento_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    respond($rows);
}

// GET /api/admin/inscricoes
if ($method === 'GET' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'inscricoes' && count($parts) === 2) {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT i.*, e.titulo as evento_titulo FROM inscricoes_eventos i LEFT JOIN eventos e ON i.evento_id = e.id ORDER BY i.created_at DESC");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    respond($rows);
}

// DELETE /api/admin/inscricoes/:id
if ($method === 'DELETE' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'inscricoes' && is_numeric($parts[2] ?? '')) {
    $id = (int)$parts[2];
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("DELETE FROM inscricoes_eventos WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        respond(['message' => 'Inscrição excluída']);
    } else {
        respond(['error' => 'Inscrição não encontrada'], 404);
    }
}

// ============================================
// MENSAGENS
// ============================================

// GET /api/admin/mensagens
if ($method === 'GET' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'mensagens' && count($parts) === 2) {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT * FROM mensagens ORDER BY data_publicacao DESC");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    respond($rows);
}

// POST /api/admin/mensagens
if ($method === 'POST' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'mensagens') {
    $titulo = $data['titulo'] ?? '';
    $conteudo = $data['conteudo'] ?? null;
    $video_url = $data['video_url'] ?? null;
    $ativa = $data['ativa'] ?? 1;
    
    if (!$titulo) {
        respond(['error' => 'Título é obrigatório'], 400);
    }
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("INSERT INTO mensagens (titulo, conteudo, video_url, ativa) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("sssi", $titulo, $conteudo, $video_url, $ativa);
    
    if ($stmt->execute()) {
        respond(['message' => 'Mensagem criada!', 'id' => $stmt->insert_id], 201);
    } else {
        respond(['error' => $stmt->error], 500);
    }
}

// PUT /api/admin/mensagens/:id
if ($method === 'PUT' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'mensagens' && is_numeric($parts[2] ?? '')) {
    $id = (int)$parts[2];
    $titulo = $data['titulo'] ?? '';
    $conteudo = $data['conteudo'] ?? '';
    $video_url = $data['video_url'] ?? '';
    $ativa = $data['ativa'] ?? 1;
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("UPDATE mensagens SET titulo = ?, conteudo = ?, video_url = ?, ativa = ? WHERE id = ?");
    $stmt->bind_param("sssii", $titulo, $conteudo, $video_url, $ativa, $id);
    
    if ($stmt->execute()) {
        respond(['message' => 'Mensagem atualizada!']);
    } else {
        respond(['error' => $stmt->error], 500);
    }
}

// DELETE /api/admin/mensagens/:id
if ($method === 'DELETE' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'mensagens' && is_numeric($parts[2] ?? '')) {
    $id = (int)$parts[2];
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("DELETE FROM mensagens WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        respond(['message' => 'Mensagem excluída!']);
    } else {
        respond(['error' => 'Mensagem não encontrada'], 404);
    }
}

// GET /api/mensagens (público)
if ($method === 'GET' && $parts[0] === 'mensagens') {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT * FROM mensagens WHERE ativa = 1 ORDER BY data_publicacao DESC");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    respond($rows);
}

// ============================================
// MINISTÉRIOS
// ============================================

// GET /api/admin/ministerios
if ($method === 'GET' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'ministerios' && count($parts) === 2) {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT * FROM ministerios ORDER BY ordem ASC");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    respond($rows);
}

// POST /api/admin/ministerios
if ($method === 'POST' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'ministerios') {
    $titulo = $data['titulo'] ?? '';
    $descricao = $data['descricao'] ?? '';
    $icone = $data['icone'] ?? 'fas fa-church';
    
    if (!$titulo) {
        respond(['error' => 'Título obrigatório'], 400);
    }
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("INSERT INTO ministerios (titulo, descricao, icone) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $titulo, $descricao, $icone);
    
    if ($stmt->execute()) {
        respond(['id' => $stmt->insert_id, 'titulo' => $titulo, 'descricao' => $descricao, 'icone' => $icone], 201);
    } else {
        respond(['error' => $stmt->error], 500);
    }
}

// PUT /api/admin/ministerios/:id
if ($method === 'PUT' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'ministerios' && is_numeric($parts[2] ?? '')) {
    $id = (int)$parts[2];
    $titulo = $data['titulo'] ?? '';
    $descricao = $data['descricao'] ?? '';
    $icone = $data['icone'] ?? '';
    $ordem = $data['ordem'] ?? 0;
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("UPDATE ministerios SET titulo = ?, descricao = ?, icone = ?, ordem = ? WHERE id = ?");
    $stmt->bind_param("sssii", $titulo, $descricao, $icone, $ordem, $id);
    
    if ($stmt->execute() && $stmt->affected_rows >= 0) {
        respond(['message' => 'Ministério atualizado']);
    } else {
        respond(['error' => 'Ministério não encontrado'], 404);
    }
}

// DELETE /api/admin/ministerios/:id
if ($method === 'DELETE' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'ministerios' && is_numeric($parts[2] ?? '')) {
    $id = (int)$parts[2];
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("DELETE FROM ministerios WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        respond(['message' => 'Ministério excluído']);
    } else {
        respond(['error' => 'Ministério não encontrado'], 404);
    }
}

// GET /api/ministerios (público)
if ($method === 'GET' && $parts[0] === 'ministerios') {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT id, titulo, descricao, icone FROM ministerios ORDER BY ordem ASC");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    respond($rows);
}

// ============================================
// CULTOS
// ============================================

// GET /api/admin/cultos
if ($method === 'GET' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'cultos' && count($parts) === 2) {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT * FROM cultos ORDER BY id ASC");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    respond($rows);
}

// GET /api/cultos (público)
if ($method === 'GET' && $parts[0] === 'cultos') {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT id, titulo, horario, local FROM cultos ORDER BY id ASC");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    respond($rows);
}

// POST /api/admin/cultos
if ($method === 'POST' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'cultos') {
    $titulo = $data['titulo'] ?? '';
    $horario = $data['horario'] ?? '';
    $local = $data['local'] ?? '';
    
    if (!$titulo) {
        respond(['error' => 'Título obrigatório'], 400);
    }
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("INSERT INTO cultos (titulo, horario, local) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $titulo, $horario, $local);
    
    if ($stmt->execute()) {
        respond(['id' => $stmt->insert_id, 'titulo' => $titulo, 'horario' => $horario, 'local' => $local], 201);
    } else {
        respond(['error' => $stmt->error], 500);
    }
}

// PUT /api/admin/cultos/:id
if ($method === 'PUT' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'cultos' && is_numeric($parts[2] ?? '')) {
    $id = (int)$parts[2];
    $titulo = $data['titulo'] ?? '';
    $horario = $data['horario'] ?? '';
    $local = $data['local'] ?? '';
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("UPDATE cultos SET titulo = ?, horario = ?, local = ? WHERE id = ?");
    $stmt->bind_param("sssi", $titulo, $horario, $local, $id);
    
    if ($stmt->execute() && $stmt->affected_rows >= 0) {
        respond(['message' => 'Culto atualizado']);
    } else {
        respond(['error' => 'Culto não encontrado'], 404);
    }
}

// DELETE /api/admin/cultos/:id
if ($method === 'DELETE' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'cultos' && is_numeric($parts[2] ?? '')) {
    $id = (int)$parts[2];
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("DELETE FROM cultos WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        respond(['message' => 'Culto excluído']);
    } else {
        respond(['error' => 'Culto não encontrado'], 404);
    }
}

// ============================================
// TÓPICOS BÍBLICOS
// ============================================

// GET /api/admin/topicos-biblia
if ($method === 'GET' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'topicos-biblia' && count($parts) === 2) {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT * FROM topicos_biblia ORDER BY ordem ASC");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    respond($rows);
}

// GET /api/topicos-biblia (público)
if ($method === 'GET' && $parts[0] === 'topicos-biblia') {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT id, titulo, descricao, conteudo, categoria, icone FROM topicos_biblia WHERE ativo = 1 ORDER BY ordem ASC");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    respond($rows);
}

// POST /api/admin/topicos-biblia
if ($method === 'POST' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'topicos-biblia') {
    $titulo = $data['titulo'] ?? '';
    $descricao = $data['descricao'] ?? '';
    $conteudo = $data['conteudo'] ?? '';
    $categoria = $data['categoria'] ?? 'geral';
    $icone = $data['icone'] ?? 'fas fa-book-bible';
    $ordem = $data['ordem'] ?? 0;
    $ativo = $data['ativo'] ?? 1;
    $data_publicacao = $data['data_publicacao'] ?? null;
    $hora_publicacao = $data['hora_publicacao'] ?? '00:00';
    
    if (!$titulo) {
        respond(['error' => 'Título é obrigatório'], 400);
    }
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("INSERT INTO topicos_biblia (titulo, descricao, conteudo, categoria, icone, ordem, ativo, data_publicacao, hora_publicacao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sssssiiss", $titulo, $descricao, $conteudo, $categoria, $icone, $ordem, $ativo, $data_publicacao, $hora_publicacao);
    
    if ($stmt->execute()) {
        respond(['message' => 'Tópico bíblico criado!', 'id' => $stmt->insert_id], 201);
    } else {
        respond(['error' => $stmt->error], 500);
    }
}

// PUT /api/admin/topicos-biblia/:id
if ($method === 'PUT' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'topicos-biblia' && is_numeric($parts[2] ?? '')) {
    $id = (int)$parts[2];
    $titulo = $data['titulo'] ?? '';
    $descricao = $data['descricao'] ?? '';
    $conteudo = $data['conteudo'] ?? '';
    $categoria = $data['categoria'] ?? 'geral';
    $icone = $data['icone'] ?? 'fas fa-book-bible';
    $ordem = $data['ordem'] ?? 0;
    $ativo = $data['ativo'] ?? 1;
    $data_publicacao = $data['data_publicacao'] ?? null;
    $hora_publicacao = $data['hora_publicacao'] ?? '00:00';
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("UPDATE topicos_biblia SET titulo = ?, descricao = ?, conteudo = ?, categoria = ?, icone = ?, ordem = ?, ativo = ?, data_publicacao = ?, hora_publicacao = ? WHERE id = ?");
    $stmt->bind_param("sssssiissi", $titulo, $descricao, $conteudo, $categoria, $icone, $ordem, $ativo, $data_publicacao, $hora_publicacao, $id);
    
    if ($stmt->execute() && $stmt->affected_rows >= 0) {
        respond(['message' => 'Tópico bíblico atualizado!']);
    } else {
        respond(['error' => 'Tópico não encontrado'], 404);
    }
}

// DELETE /api/admin/topicos-biblia/:id
if ($method === 'DELETE' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'topicos-biblia' && is_numeric($parts[2] ?? '')) {
    $id = (int)$parts[2];
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("DELETE FROM topicos_biblia WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        respond(['message' => 'Tópico bíblico excluído!']);
    } else {
        respond(['error' => 'Tópico não encontrado'], 404);
    }
}

// ============================================
// GALERIA
// ============================================

// GET /api/gallery
if ($method === 'GET' && $parts[0] === 'gallery') {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT * FROM gallery ORDER BY created_at DESC");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    respond($rows);
}

// POST /api/admin/gallery
if ($method === 'POST' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'gallery') {
    $image = $data['image'] ?? '';
    $filename = $data['filename'] ?? '';
    
    if (!$image) {
        respond(['error' => 'Imagem é obrigatória'], 400);
    }
    
    // Gerar nome único
    $ext = $filename ? pathinfo($filename, PATHINFO_EXTENSION) : 'png';
    $newFilename = 'gallery_' . time() . '_' . rand(1000, 9999) . '.' . $ext;
    $url = '/uploads/' . $newFilename;
    
    // Diretório de uploads
    $uploadsDir = __DIR__ . '/../uploads';
    if (!is_dir($uploadsDir)) {
        mkdir($uploadsDir, 0755, true);
    }
    
    // Decodificar base64 e salvar
    $base64Data = preg_replace('/^data:image\/\w+;base64,/', '', $image);
    $buffer = base64_decode($base64Data);
    
    if ($buffer === false) {
        respond(['error' => 'Erro ao decodificar imagem'], 400);
    }
    
    $filePath = $uploadsDir . '/' . $newFilename;
    if (file_put_contents($filePath, $buffer) === false) {
        respond(['error' => 'Erro ao salvar imagem'], 500);
    }
    
    // Salvar no banco
    $db = getDB();
    if (!$db) {
        @unlink($filePath);
        respond(['error' => 'Erro na conexão'], 500);
    }
    
    $stmt = $db->prepare("INSERT INTO gallery (filename, original_name, url) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $newFilename, $filename, $url);
    
    if ($stmt->execute()) {
        respond(['id' => $stmt->insert_id, 'filename' => $newFilename, 'url' => $url, 'message' => 'Imagem salva!'], 201);
    } else {
        @unlink($filePath);
        respond(['error' => $stmt->error], 500);
    }
}

// DELETE /api/admin/gallery/:id
if ($method === 'DELETE' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'gallery' && is_numeric($parts[2] ?? '')) {
    $id = (int)$parts[2];
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("SELECT filename FROM gallery WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        // Excluir arquivo
        $filepath = __DIR__ . '/../uploads/' . $row['filename'];
        if (file_exists($filepath)) {
            @unlink($filepath);
        }
        
        // Excluir do banco
        $stmt2 = $db->prepare("DELETE FROM gallery WHERE id = ?");
        $stmt2->bind_param("i", $id);
        
        if ($stmt2->execute()) {
            respond(['message' => 'Imagem excluída!']);
        } else {
            respond(['error' => 'Erro ao excluir'], 500);
        }
    } else {
        respond(['error' => 'Imagem não encontrada'], 404);
    }
}

// ============================================
// YOUTUBE CONFIG
// ============================================

// GET /api/admin/youtube-config
if ($method === 'GET' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'youtube-config') {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->query("SELECT channel_id, channel_name, enabled FROM youtube_config WHERE id = 1");
    $row = $stmt->fetch_assoc();
    
    respond($row ?: ['channel_id' => '', 'channel_name' => '', 'enabled' => 0]);
}

// PUT /api/admin/youtube-config
if ($method === 'PUT' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'youtube-config') {
    $channel_id = $data['channel_id'] ?? '';
    $channel_name = $data['channel_name'] ?? '';
    $enabled = $data['enabled'] ? 1 : 0;
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    // Verificar se existe
    $check = $db->query("SELECT id FROM youtube_config WHERE id = 1")->fetch_assoc();
    
    if ($check) {
        $stmt = $db->prepare("UPDATE youtube_config SET channel_id = ?, channel_name = ?, enabled = ?, updated_at = NOW() WHERE id = 1");
        $stmt->bind_param("ssi", $channel_id, $channel_name, $enabled);
    } else {
        $stmt = $db->prepare("INSERT INTO youtube_config (id, channel_id, channel_name, enabled) VALUES (1, ?, ?, ?)");
        $stmt->bind_param("ssi", $channel_id, $channel_name, $enabled);
    }
    
    if ($stmt->execute()) {
        respond(['message' => 'Configuração do YouTube atualizada!']);
    } else {
        respond(['error' => $stmt->error], 500);
    }
}

// GET /api/youtube-live (público)
if ($method === 'GET' && $parts[0] === 'youtube-live') {
    $db = getDB();
    if (!$db) respond(['isLive' => false, 'video' => null]);
    
    $stmt = $db->query("SELECT channel_id, enabled FROM youtube_config WHERE id = 1");
    $config = $stmt->fetch_assoc();
    
    if (!$config || !$config['enabled'] || !$config['channel_id']) {
        respond(['isLive' => false, 'video' => null]);
    }
    
    $channelId = trim($config['channel_id']);
    $apiKey = 'AIzaSyDCsgWBLSO56xE0T-HE2vmYvIOwe1nGx-s';
    
    // Verificar se é ID de canal válido (começa com UC)
    if (strpos($channelId, 'UC') !== 0) {
        respond(['isLive' => false, 'video' => null, 'message' => 'Use o ID do canal (começa com UC)']);
    }
    
    // Fazer requisição para API do YouTube
    $url = "https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=$channelId&eventType=live&type=video&key=$apiKey";
    
    $response = @file_get_contents($url);
    if ($response === false) {
        respond(['isLive' => false, 'video' => null]);
    }
    
    $data = json_decode($response, true);
    
    if (!empty($data['items'])) {
        $video = $data['items'][0];
        respond([
            'isLive' => true,
            'video' => [
                'videoId' => $video['id']['videoId'],
                'title' => $video['snippet']['title'],
                'thumbnail' => $video['snippet']['thumbnails']['high']['url'] ?? $video['snippet']['thumbnails']['medium']['url'],
                'channelTitle' => $video['snippet']['channelTitle']
            ]
        ]);
    }
    
    respond(['isLive' => false, 'video' => null]);
}

// GET /api/youtube/latest
if ($method === 'GET' && $parts[0] === 'youtube' && ($parts[1] ?? '') === 'latest') {
    $db = getDB();
    if (!$db) respond(['video' => null, 'message' => 'Canal não configurado']);
    
    $stmt = $db->query("SELECT channel_id FROM youtube_config WHERE id = 1");
    $config = $stmt->fetch_assoc();
    
    if (!$config || !$config['channel_id']) {
        respond(['video' => null, 'message' => 'Canal não configurado']);
    }
    
    $channelId = trim($config['channel_id']);
    $apiKey = 'AIzaSyDCsgWBLSO56xE0T-HE2vmYvIOwe1nGx-s';
    
    // Primeiro tenta live
    $url = "https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=$channelId&eventType=live&type=video&key=$apiKey";
    $response = @file_get_contents($url);
    
    if ($response) {
        $data = json_decode($response, true);
        if (!empty($data['items'])) {
            $video = $data['items'][0];
            respond([
                'video' => [
                    'videoId' => $video['id']['videoId'],
                    'title' => $video['snippet']['title'],
                    'description' => $video['snippet']['description'],
                    'thumbnail' => $video['snippet']['thumbnails']['high']['url'] ?? $video['snippet']['thumbnails']['medium']['url'],
                    'channelTitle' => $video['snippet']['channelTitle'],
                    'publishedAt' => $video['snippet']['publishedAt'],
                    'isLive' => true
                ]
            ]);
        }
    }
    
    // Se não tem live, buscar último vídeo
    $url = "https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=$channelId&type=video&order=date&maxResults=1&key=$apiKey";
    $response = @file_get_contents($url);
    
    if ($response) {
        $data = json_decode($response, true);
        if (!empty($data['items'])) {
            $video = $data['items'][0];
            respond([
                'video' => [
                    'videoId' => $video['id']['videoId'],
                    'title' => $video['snippet']['title'],
                    'description' => $video['snippet']['description'],
                    'thumbnail' => $video['snippet']['thumbnails']['high']['url'] ?? $video['snippet']['thumbnails']['medium']['url'],
                    'channelTitle' => $video['snippet']['channelTitle'],
                    'publishedAt' => $video['snippet']['publishedAt'],
                    'isLive' => false
                ]
            ]);
        }
    }
    
    respond(['video' => null, 'message' => 'Nenhum vídeo encontrado']);
}

// ============================================
// PAGE CONTENT
// ============================================

// GET /api/admin/page-content
if ($method === 'GET' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'page-content' && count($parts) === 2) {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT * FROM page_content ORDER BY section");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    respond($rows);
}

// PUT /api/admin/page-content/:section
if ($method === 'PUT' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'page-content' && count($parts) === 3) {
    $section = $parts[2];
    $title = $data['title'] ?? '';
    $content = $data['content'] ?? '';
    $link = $data['link'] ?? null;
    $image = $data['image'] ?? null;
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    if ($link || $image) {
        $stmt = $db->prepare("INSERT INTO page_content (section, title, content, link, image, updated_at) VALUES (?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE title = ?, content = ?, link = ?, image = ?, updated_at = NOW()");
        $stmt->bind_param("sssssssss", $section, $title, $content, $link, $image, $title, $content, $link, $image);
    } else {
        $stmt = $db->prepare("INSERT INTO page_content (section, title, content, updated_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE title = ?, content = ?, updated_at = NOW()");
        $stmt->bind_param("ssss", $section, $title, $content, $title, $content);
    }
    
    if ($stmt->execute()) {
        respond(['message' => 'Conteúdo atualizado']);
    } else {
        respond(['error' => $stmt->error], 500);
    }
}

// GET /api/page-content (público)
if ($method === 'GET' && $parts[0] === 'page-content') {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT section, title, content, link, image FROM page_content");
    $contentMap = [];
    
    while ($row = $result->fetch_assoc()) {
        $contentMap[$row['section']] = [
            'title' => $row['title'],
            'content' => $row['content'],
            'link' => $row['link'] ?? '',
            'image' => $row['image'] ?? ''
        ];
    }
    
    respond($contentMap);
}

// ============================================
// ÁREA DO MEMBRO
// ============================================

// GET /api/admin/area-membro
if ($method === 'GET' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'area-membro' && count($parts) === 2) {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT * FROM area_membro ORDER BY ordem ASC");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    respond($rows);
}

// GET /api/area-membro (público)
if ($method === 'GET' && $parts[0] === 'area-membro') {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT id, titulo, descricao, conteudo, pdf_path, categoria, icone, ordem FROM area_membro WHERE ativo = 1 ORDER BY ordem ASC");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    respond($rows);
}

// POST /api/admin/upload-pdf-base64
if ($method === 'POST' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'upload-pdf-base64') {
    $filename = $data['filename'] ?? '';
    $dataPdf = $data['data'] ?? '';
    
    if (!$filename || !$dataPdf) {
        respond(['error' => 'Nome do arquivo e dados são obrigatórios'], 400);
    }
    
    // Gerar nome único
    $ext = pathinfo($filename, PATHINFO_EXTENSION) ?: 'pdf';
    $uniqueSuffix = time() . '-' . rand(1000, 9999);
    $savedFilename = $uniqueSuffix . '.' . $ext;
    
    // Diretório
    $dir = __DIR__ . '/../uploads/pdfs';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    
    // Decodificar Base64
    $buffer = base64_decode($dataPdf);
    
    if ($buffer === false) {
        respond(['error' => 'Erro ao decodificar arquivo'], 400);
    }
    
    $filePath = $dir . '/' . $savedFilename;
    if (file_put_contents($filePath, $buffer) === false) {
        respond(['error' => 'Erro ao salvar arquivo'], 500);
    }
    
    $pdfPath = '/uploads/pdfs/' . $savedFilename;
    respond(['path' => $pdfPath, 'message' => 'Arquivo enviado com sucesso!']);
}

// POST /api/admin/area-membro
if ($method === 'POST' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'area-membro') {
    $titulo = $data['titulo'] ?? '';
    $descricao = $data['descricao'] ?? '';
    $conteudo = $data['conteudo'] ?? '';
    $pdfPath = $data['pdfPath'] ?? '';
    $categoria = $data['categoria'] ?? '';
    $icone = $data['icone'] ?? 'fas fa-book';
    $ordem = $data['ordem'] ?? 0;
    $ativo = $data['ativo'] ?? 1;
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("INSERT INTO area_membro (titulo, descricao, conteudo, pdf_path, categoria, icone, ordem, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssssii", $titulo, $descricao, $conteudo, $pdfPath, $categoria, $icone, $ordem, $ativo);
    
    if ($stmt->execute()) {
        respond(['id' => $stmt->insert_id, 'message' => 'Tópico criado!']);
    } else {
        respond(['error' => $stmt->error], 500);
    }
}

// PUT /api/admin/area-membro/:id
if ($method === 'PUT' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'area-membro' && is_numeric($parts[2] ?? '')) {
    $id = (int)$parts[2];
    $titulo = $data['titulo'] ?? '';
    $descricao = $data['descricao'] ?? '';
    $conteudo = $data['conteudo'] ?? '';
    $pdfPath = $data['pdfPath'] ?? '';
    $categoria = $data['categoria'] ?? '';
    $icone = $data['icone'] ?? 'fas fa-book';
    $ordem = $data['ordem'] ?? 0;
    $ativo = $data['ativo'] ?? 1;
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("UPDATE area_membro SET titulo = ?, descricao = ?, conteudo = ?, pdf_path = ?, categoria = ?, icone = ?, ordem = ?, ativo = ? WHERE id = ?");
    $stmt->bind_param("ssssssiii", $titulo, $descricao, $conteudo, $pdfPath, $categoria, $icone, $ordem, $ativo, $id);
    
    if ($stmt->execute() && $stmt->affected_rows >= 0) {
        respond(['message' => 'Tópico atualizado!']);
    } else {
        respond(['error' => 'Tópico não encontrado'], 404);
    }
}

// DELETE /api/admin/area-membro/:id
if ($method === 'DELETE' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'area-membro' && is_numeric($parts[2] ?? '')) {
    $id = (int)$parts[2];
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("DELETE FROM area_membro WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        respond(['message' => 'Tópico excluído!']);
    } else {
        respond(['error' => 'Tópico não encontrado'], 404);
    }
}

// ============================================
// AULAS / VÍDEO AULAS
// ============================================

// GET /api/aulas (público)
if ($method === 'GET' && $parts[0] === 'aulas') {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT * FROM aulas WHERE ativo = 1 ORDER BY created_at DESC");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    respond($rows);
}

// GET /api/admin/aulas
if ($method === 'GET' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'aulas' && count($parts) === 2) {
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $result = $db->query("SELECT * FROM aulas ORDER BY created_at DESC");
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    respond($rows);
}

// POST /api/admin/aulas
if ($method === 'POST' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'aulas') {
    $titulo = $data['titulo'] ?? '';
    $video_url = $data['video_url'] ?? '';
    $descricao = $data['descricao'] ?? '';
    $thumbnail = $data['thumbnail'] ?? '';
    $pdf_path = $data['pdf_path'] ?? '';
    $duracao = $data['duracao'] ?? '00:00';
    $autor = $data['autor'] ?? 'MAANAIN';
    $categoria = $data['categoria'] ?? 'estudos';
    $ativo = $data['ativo'] ?? 1;
    
    if (!$titulo || !$video_url) {
        respond(['error' => 'Título e URL do vídeo são obrigatórios'], 400);
    }
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("INSERT INTO aulas (titulo, descricao, video_url, thumbnail, pdf_path, duracao, autor, categoria, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssssssi", $titulo, $descricao, $video_url, $thumbnail, $pdf_path, $duracao, $autor, $categoria, $ativo);
    
    if ($stmt->execute()) {
        respond(['message' => 'Aula criada!', 'id' => $stmt->insert_id], 201);
    } else {
        respond(['error' => $stmt->error], 500);
    }
}

// PUT /api/admin/aulas/:id
if ($method === 'PUT' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'aulas' && is_numeric($parts[2] ?? '')) {
    $id = (int)$parts[2];
    $titulo = $data['titulo'] ?? '';
    $video_url = $data['video_url'] ?? '';
    $descricao = $data['descricao'] ?? '';
    $thumbnail = $data['thumbnail'] ?? '';
    $pdf_path = $data['pdf_path'] ?? '';
    $duracao = $data['duracao'] ?? '00:00';
    $autor = $data['autor'] ?? 'MAANAIN';
    $categoria = $data['categoria'] ?? 'estudos';
    $ativo = $data['ativo'] ?? 1;
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("UPDATE aulas SET titulo = ?, descricao = ?, video_url = ?, thumbnail = ?, pdf_path = ?, duracao = ?, autor = ?, categoria = ?, ativo = ?, updated_at = NOW() WHERE id = ?");
    $stmt->bind_param("ssssssssii", $titulo, $descricao, $video_url, $thumbnail, $pdf_path, $duracao, $autor, $categoria, $ativo, $id);
    
    if ($stmt->execute() && $stmt->affected_rows >= 0) {
        respond(['message' => 'Aula atualizada!']);
    } else {
        respond(['error' => 'Aula não encontrada'], 404);
    }
}

// DELETE /api/admin/aulas/:id
if ($method === 'DELETE' && $parts[0] === 'admin' && ($parts[1] ?? '') === 'aulas' && is_numeric($parts[2] ?? '')) {
    $id = (int)$parts[2];
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $stmt = $db->prepare("DELETE FROM aulas WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        respond(['message' => 'Aula excluída!']);
    } else {
        respond(['error' => 'Aula não encontrada'], 404);
    }
}

// POST /api/aulas/:id/views
if ($method === 'POST' && $parts[0] === 'aulas' && ($parts[1] ?? '') === 'views' && is_numeric($parts[2] ?? '')) {
    $id = (int)$parts[2];
    
    $db = getDB();
    if (!$db) respond(['error' => 'Erro na conexão'], 500);
    
    $db->query("UPDATE aulas SET visualizacoes = visualizacoes + 1 WHERE id = $id");
    respond(['message' => 'Visualização registrada']);
}
