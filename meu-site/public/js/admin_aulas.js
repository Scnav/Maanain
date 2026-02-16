// Admin - Gerenciamento de Vídeo Aulas
let aulas = [];
let editingId = null;

// Carregar aulas ao iniciar
document.addEventListener('DOMContentLoaded', () => {
    loadAulas();
    
    // Configurar evento de upload de thumbnail
    const thumbnailInput = document.getElementById('aulaThumbnailFile');
    if (thumbnailInput) {
        thumbnailInput.addEventListener('change', handleThumbnailUpload);
    }
    
    // Configurar extração automática de thumbnail do YouTube
    const videoUrlInput = document.getElementById('aulaVideoUrl');
    if (videoUrlInput) {
        videoUrlInput.addEventListener('blur', extractYoutubeThumbnail);
    }
});

console.log('Funções definidas: loadAulas, openModal, closeModal, editAula, saveAula, deleteAula');

async function loadAulas() {
    try {
        const response = await fetch('/api/admin/aulas', {
            headers: { 'x-admin-token': getAdminToken() }
        });
        
        if (!response.ok) throw new Error('Erro ao carregar');
        
        aulas = await response.json();
        renderAulas();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao carregar aulas');
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
    document.getElementById('aulaForm').reset();
    document.getElementById('aulaId').value = '';
    document.getElementById('modalTitle').textContent = 'Nova Aula';
    document.getElementById('aulaThumbnailPreview').innerHTML = '';
    document.getElementById('aulaThumbnail').value = '';
    document.getElementById('aulaModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('aulaModal').style.display = 'none';
}

function editAula(id) {
    const aula = aulas.find(a => a.id === id);
    if (!aula) return;
    
    editingId = id;
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
        duracao: document.getElementById('aulaDuracao').value,
        autor: document.getElementById('aulaAutor').value,
        categoria: document.getElementById('aulaCategoria').value,
        ativo: document.getElementById('aulaAtivo').checked ? 1 : 0
    };
    
    if (!data.titulo || !data.video_url) {
        alert('Título e URL do vídeo são obrigatórios');
        return;
    }
    
    try {
        let response;
        if (editingId) {
            response = await fetch(`/api/admin/aulas/${editingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-token': getAdminToken()
                },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch('/api/admin/aulas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-token': getAdminToken()
                },
                body: JSON.stringify(data)
            });
        }
        
        if (!response.ok) throw new Error('Erro ao salvar');
        
        closeModal();
        loadAulas();
        alert(editingId ? 'Aula atualizada!' : 'Aula criada!');
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao salvar aula');
    }
}

async function deleteAula(id) {
    if (!confirm('Tem certeza que deseja excluir esta aula?')) return;
    
    try {
        const response = await fetch(`/api/admin/aulas/${id}`, {
            method: 'DELETE',
            headers: { 'x-admin-token': getAdminToken() }
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
