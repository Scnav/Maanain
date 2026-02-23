// Admin - Gerenciamento de Vídeo Aulas
let aulas = [];
let editingId = null;
let aulaPdfPath = null; // Armazena o caminho do PDF

// Função para obter headers com JWT
function getAdminHeaders() {
    const token = localStorage.getItem('maanain_admin_token');
    const expiry = localStorage.getItem('maanain_admin_expiry');
    
    if (token && expiry && Date.now() < parseInt(expiry)) {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }
    
    // Fallback para requisições sem auth
    return { 'Content-Type': 'application/json' };
}

// Carregar aulas ao iniciar
document.addEventListener('DOMContentLoaded', () => {
    loadAulas();
    
    // Configurar evento de upload de thumbnail
    const thumbnailInput = document.getElementById('aulaThumbnailFile');
    if (thumbnailInput) {
        thumbnailInput.addEventListener('change', handleThumbnailUpload);
    }
    
    // Configurar evento de upload de PDF
    const pdfInput = document.getElementById('aulaPdfFile');
    if (pdfInput) {
        pdfInput.addEventListener('change', handlePdfUpload);
    }
    
    // Configurar extração automática de thumbnail do YouTube
    const videoUrlInput = document.getElementById('aulaVideoUrl');
    if (videoUrlInput) {
        videoUrlInput.addEventListener('blur', extractYoutubeThumbnail);
    }
});

console.log('Funções definidas: loadAulas, openModal, closeModal, editAula, saveAula, deleteAula');

async function loadAulas() {
    console.log('[DEBUG loadAulas] Carregando aulas...');
    try {
        const response = await fetch('/api/admin/aulas', {
            headers: getAdminHeaders()
        });
        
        if (!response.ok) throw new Error('Erro ao carregar');
        
        aulas = await response.json();
        console.log('[DEBUG loadAulas] Aulas carregadas:', aulas.length);
        console.log('[DEBUG loadAulas] Primeira aula (se existir):', aulas.length > 0 ? JSON.stringify(aulas[0]) : 'Nenhuma');
        renderAulas();
    } catch (error) {
        console.error('[DEBUG loadAulas] Erro:', error);
        console.log('Aguardando login...');
    }
}

function renderAulas() {
    const tbody = document.getElementById('aulasTableBody');
    if (!tbody) {
        console.error('Elemento aulasTableBody não encontrado!');
        return;
    }
    
    if (aulas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 3rem; color: #888;">
                    <i class="fas fa-video-slash" style="font-size: 2.5rem; margin-bottom: 1rem;"></i>
                    <p style="font-size: 1.1rem;">Nenhuma aula cadastrada ainda.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = aulas.map(aula => `
        <tr>
            <td>
                ${aula.thumbnail ? 
                    `<img src="${aula.thumbnail}" alt="${aula.titulo}" style="width: 100px; height: 56px; object-fit: cover; border-radius: 6px;">` : 
                    `<div style="width: 100px; height: 56px; background: #eee; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-video" style="color: #888;"></i>
                    </div>`
                }
            </td>
            <td style="font-weight: 500;">${aula.titulo}</td>
            <td>${aula.autor || 'MAANAIN'}</td>
            <td><span class="badge" style="background: #e3f2fd; color: #1565c0;">${getCategoriaLabel(aula.categoria)}</span></td>
            <td>${aula.duracao || '--:--'}</td>
            <td>${aula.visualizacoes || 0}</td>
            <td>
                <span class="badge ${aula.ativo ? 'badge-success' : 'badge-inactive'}">
                    ${aula.ativo ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="viewAula('${aula.url}')" title="Assistir">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="editAula(${aula.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteAula(${aula.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Função para visualizar aula
function viewAula(url) {
    if (url) {
        window.open(url, '_blank');
    }
}

function getCategoriaLabel(categoria) {
    const labels = {
        'estudos': 'Estudos Bíblicos',
        'pregcacoes': 'Pregações',
        'cursos': 'Cursos',
        'jovens': 'Juventude',
        'crianca': 'Crianças'
    };
    return labels[categoria] || categoria;
}

function openModal() {
    editingId = null;
    aulaPdfPath = null; // Resetar PDF
    document.getElementById('aulaForm').reset();
    document.getElementById('aulaId').value = '';
    document.getElementById('modalTitle').textContent = 'Nova Aula';
    document.getElementById('aulaThumbnailPreview').innerHTML = '';
    document.getElementById('aulaThumbnail').value = '';
    document.getElementById('aulaPdfPreview').style.display = 'none';
    document.getElementById('aulaModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('aulaModal').style.display = 'none';
}

function editAula(id) {
    const aula = aulas.find(a => a.id === id);
    if (!aula) return;
    
    editingId = id;
    aulaPdfPath = aula.pdf_path || null; // Carregar PDF existente
    document.getElementById('modalTitle').textContent = 'Editar Aula';
    document.getElementById('aulaId').value = aula.id;
    document.getElementById('aulaTitulo').value = aula.titulo;
    document.getElementById('aulaDescricao').value = aula.descricao || '';
    document.getElementById('aulaVideoUrl').value = aula.video_url;
    document.getElementById('aulaThumbnail').value = aula.thumbnail || '';
    document.getElementById('aulaDuracao').value = aula.duracao || '00:00';
    document.getElementById('aulaAutor').value = aula.autor || 'MAANAIN';
    document.getElementById('aulaCategoria').value = aula.categoria || 'estudos';
    document.getElementById('aulaAtivo').checked = aula.ativo !== 0;
    
    // Mostrar thumbnail atual
    if (aula.thumbnail) {
        document.getElementById('aulaThumbnailPreview').innerHTML = 
            `<img src="${aula.thumbnail}" style="max-width: 200px; border-radius: 8px; margin-top: 10px;">`;
    } else {
        document.getElementById('aulaThumbnailPreview').innerHTML = '';
    }
    
    // Mostrar PDF atual se existir
    if (aula.pdf_path) {
        const pdfName = aula.pdf_path.split('/').pop();
        document.getElementById('aulaPdfName').textContent = pdfName;
        document.getElementById('aulaPdfPreview').style.display = 'block';
    } else {
        document.getElementById('aulaPdfPreview').style.display = 'none';
    }
    
    document.getElementById('aulaModal').style.display = 'block';
}

// Upload de thumbnail (Base64)
function handleThumbnailUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validar tipo
    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione uma imagem.');
        return;
    }
    
    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const base64 = event.target.result;
        document.getElementById('aulaThumbnail').value = base64;
        document.getElementById('aulaThumbnailPreview').innerHTML = 
            `<img src="${base64}" style="max-width: 200px; border-radius: 8px; margin-top: 10px;">`;
    };
    reader.readAsDataURL(file);
}

// Extrair thumbnail automaticamente do YouTube
function extractYoutubeThumbnail() {
    const url = document.getElementById('aulaVideoUrl').value;
    if (!url) return;
    
    const videoId = extractVideoId(url);
    if (videoId) {
        const thumbnailUrl = 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg';
        document.getElementById('aulaThumbnail').value = thumbnailUrl;
        document.getElementById('aulaThumbnailPreview').innerHTML = 
            '<img src="' + thumbnailUrl + '" style="max-width: 200px; border-radius: 8px; margin-top: 10px;">';
        
        // Buscar duração do vídeo
        fetchYoutubeDuration(videoId);
    }
}

// Buscar duração do vídeo no YouTube usando API pública
async function fetchYoutubeDuration(videoId) {
    try {
        // Usar API pública do YouTube (não requer API key para este endpoint)
        const response = await fetch('https://www.googleapis.com/youtube/v3/videos?id=' + videoId + '&part=contentDetails&key=AIzaSyDCsgWBLSO56xE0T-HE2vmYvIOwe1nGx-s');
        if (!response.ok) {
            // Se falhar, tenta método alternativo
            await fetchYoutubeDurationAlt(videoId);
            return;
        }
        
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            const duration = data.items[0].contentDetails.duration;
            const formattedDuration = parseISO8601Duration(duration);
            document.getElementById('aulaDuracao').value = formattedDuration;
            console.log('Duração obtida:', formattedDuration);
        }
    } catch (e) {
        console.log('Erro ao buscar duração:', e);
    }
}

// Método alternativo usando oEmbed (sem duração)
async function fetchYoutubeDurationAlt(videoId) {
    // O oEmbed não fornece duração, então não hacemos nada aqui
    console.log('Usando método alternativo - duração não disponível via oEmbed');
}

// Função para converter ISO 8601 duration para formato legível
function parseISO8601Duration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '00:00';
    
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    if (hours > 0) {
        return hours + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    }
    return minutes + ':' + String(seconds).padStart(2, '0');
}

async function saveAula(e) {
    e.preventDefault();
    
    const data = {
        titulo: document.getElementById('aulaTitulo').value,
        descricao: document.getElementById('aulaDescricao').value,
        video_url: document.getElementById('aulaVideoUrl').value,
        thumbnail: document.getElementById('aulaThumbnail').value,
        pdf_path: aulaPdfPath, // Inclui o caminho do PDF
        duracao: document.getElementById('aulaDuracao').value,
        autor: document.getElementById('aulaAutor').value,
        categoria: document.getElementById('aulaCategoria').value,
        ativo: document.getElementById('aulaAtivo').checked ? 1 : 0
    };
    
    console.log('[DEBUG saveAula] Data a ser enviada:', JSON.stringify(data, null, 2));
    console.log('[DEBUG saveAula] aulaPdfPath no momento do save:', aulaPdfPath);
    
    if (!data.titulo || !data.video_url) {
        alert('Título e URL do vídeo são obrigatórios');
        return;
    }
    
    try {
        let response;
        if (editingId) {
            console.log('[DEBUG saveAula] PUT para:', `/api/admin/aulas/${editingId}`);
            response = await fetch(`/api/admin/aulas/${editingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-token': getAdminToken()
                },
                body: JSON.stringify(data)
            });
        } else {
            console.log('[DEBUG saveAula] POST para: /api/admin/aulas');
            response = await fetch('/api/admin/aulas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-token': getAdminToken()
                },
                body: JSON.stringify(data)
            });
        }
        
        console.log('[DEBUG saveAula] Response status:', response.status);
        if (!response.ok) throw new Error('Erro ao salvar');
        
        const result = await response.json();
        console.log('[DEBUG saveAula] Result:', result);
        
        closeModal();
        loadAulas();
        alert(editingId ? 'Aula atualizada!' : 'Aula criada!');
    } catch (error) {
        console.error('[DEBUG saveAula] Erro:', error);
        alert('Erro ao salvar aula');
    }
}

// Upload de PDF
async function handlePdfUpload(event) {
    console.log('[DEBUG handlePdfUpload] Início da função');
    const file = event.target.files[0];
    console.log('[DEBUG handlePdfUpload] File:', file ? file.name : 'Nenhum arquivo');
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
        console.log('[DEBUG handlePdfUpload] Tipo inválido:', file.type);
        alert('Por favor, selecione um arquivo PDF');
        event.target.value = '';
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB
        console.log('[DEBUG handlePdfUpload] Tamanho excedido:', file.size);
        alert('O arquivo deve ter no máximo 10MB');
        event.target.value = '';
        return;
    }
    
    console.log('[DEBUG handlePdfUpload] Convertendo para base64...');
    try {
        // Converter para base64
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                console.log('[DEBUG handlePdfUpload] Enviando para API...');
                const response = await fetch('/api/admin/upload-pdf-base64', {
                    method: 'POST',
                    headers: getAdminHeaders(),
                    body: JSON.stringify({
                        data: e.target.result.split(',')[1], // Remove o prefixo data:application/pdf;base64,
                        filename: file.name
                    })
                });
                
                console.log('[DEBUG handlePdfUpload] Response status:', response.status);
                if (!response.ok) throw new Error('Erro ao fazer upload');
                
                const result = await response.json();
                console.log('[DEBUG handlePdfUpload] Result:', result);
                
                aulaPdfPath = result.path;
                console.log('[DEBUG handlePdfUpload] aulaPdfPath definido:', aulaPdfPath);
                
                // Mostrar preview
                const preview = document.getElementById('aulaPdfPreview');
                const pdfName = document.getElementById('aulaPdfName');
                if (preview && pdfName) {
                    pdfName.textContent = file.name;
                    preview.style.display = 'block';
                }
                
                alert('PDF enviado com sucesso!');
            } catch (error) {
                console.error('[DEBUG handlePdfUpload] Erro upload PDF:', error);
                console.log('Aguardando login...');
            }
        };
        reader.readAsDataURL(file);
    } catch (error) {
        console.error('[DEBUG handlePdfUpload] Erro ao processar PDF:', error);
        alert('Erro ao processar PDF');
    }
}

// Remover PDF
function removerAulaPdf() {
    aulaPdfPath = null;
    const pdfInput = document.getElementById('aulaPdfFile');
    const preview = document.getElementById('aulaPdfPreview');
    if (pdfInput) pdfInput.value = '';
    if (preview) preview.style.display = 'none';
}

async function deleteAula(id) {
    if (!confirm('Tem certeza que deseja excluir esta aula?')) return;
    
    try {
        const response = await fetch(`/api/admin/aulas/${id}`, {
            method: 'DELETE',
            headers: getAdminHeaders()
        });
        
        if (!response.ok) throw new Error('Erro ao excluir');
        
        loadAulas();
        alert('Aula excluída!');
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao excluir aula');
    }
}

function getAdminToken() {
    return localStorage.getItem('adminToken') || 'maanain2026';
}

function extractVideoId(url) {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : '';
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('aulaModal');
    if (event.target === modal) {
        closeModal();
    }
}
