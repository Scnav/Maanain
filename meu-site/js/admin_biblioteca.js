// Admin Biblioteca - Controle de Visualizações de Aulas
console.log('[DEBUG] admin_biblioteca.js carregado');

let bibliotecaCarregada = false;

// Função para carregar a biblioteca quando a aba for aberta
function carregarBiblioteca() {
    if (bibliotecaCarregada) return;
    
    // Usar a função do admin-auth.js
    if (!isAdminLoggedIn()) {
        console.log('[DEBUG] Usuário não autenticado');
        const container = document.getElementById('bibliotecaEstatisticas');
        if (container) {
            container.innerHTML = '<p style="color: red;">Faça login para acessar esta seção.</p>';
        }
        const tbody = document.getElementById('bibliotecaTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Faça login para acessar esta seção.</td></tr>';
        }
        return;
    }
    
    bibliotecaCarregada = true;
    console.log('[DEBUG] Carregando biblioteca...');
    carregarEstatisticasBiblioteca();
    carregarHistoricoVisualizacoes();
}

// Carregar estatísticas por Vídeo
async function carregarEstatisticasBiblioteca() {
    const container = document.getElementById('bibliotecaEstatisticas');
    if (!container) return;
    
    try {
        // Usar getAdminToken do admin-auth.js
        const token = getAdminToken();
        const response = await fetch('/api/admin/biblioteca/estatisticas', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            container.innerHTML = '<p style="color: red;">Sessão expirada. Faça login novamente.</p>';
            return;
        }
        
        if (!response.ok) throw new Error('Erro ao carregar estatísticas');
        
        const dados = await response.json();
        console.log('[DEBUG] Estatísticas recebidas:', dados);
        
        if (dados.length === 0) {
            container.innerHTML = '<p style="color: #666;">Nenhum vídeo encontrado.</p>';
            return;
        }
        
        // Criar cards de estatísticas para cada vídeo
        container.innerHTML = dados.map(video => `
            <div class="stat-card">
                <div class="stat-number">${video.visualizacoes_total || 0}</div>
                <div class="stat-label">${video.titulo ? video.titulo.substring(0, 30) + '...' : 'Sem título'}</div>
                <div style="margin-top: 0.5rem; font-size: 0.85rem; color: #666;">
                    👤 ${video.usuarios_unicos || 0} usuários únicos<br>
                    📊 ${video.total_visualizacoes || 0} visualizações
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('[DEBUG] Erro ao carregar estatísticas:', error);
        container.innerHTML = '<p style="color: red;">Erro ao carregar estatísticas</p>';
    }
}

// Carregar histórico de visualizações (agrupado por vídeo)
async function carregarHistoricoVisualizacoes() {
    const tbody = document.getElementById('bibliotecaTableBody');
    if (!tbody) return;
    
    try {
        // Usar getAdminToken do admin-auth.js
        const token = getAdminToken();
        const response = await fetch('/api/admin/biblioteca/visualizacoes', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Sessão expirada. Faça login novamente.</td></tr>';
            return;
        }
        
        if (!response.ok) throw new Error('Erro ao carregar histórico');
        
        const dados = await response.json();
        console.log('[DEBUG] Histórico recebido:', dados);
        
        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666;">Nenhuma visualização registrada ainda.</td></tr>';
            return;
        }
        
        // Criar HTML agrupado por vídeo
        let html = '';
        dados.forEach((video, index) => {
            const totalViews = video.visualizacoes ? video.visualizacoes.length : 0;
            const uniqueUsers = new Set(video.visualizacoes.map(v => v.usuario_id || v.ip_address)).size;
            
            html += `
            <tr class="video-group-header" onclick="toggleVideoGroup(${index})" style="cursor: pointer; background: #f8f9fa;">
                <td colspan="5" style="padding: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 1.2em;">📺</span>
                        <div style="flex: 1;">
                            <strong>${video.aula_titulo || 'Vídeo #' + video.aula_id}</strong>
                            <div style="font-size: 0.85rem; color: #666;">
                                👁️ ${totalViews} visualizações &nbsp;|&nbsp; 👤 ${uniqueUsers} usuários únicos
                            </div>
                        </div>
                        <span class="toggle-icon" id="toggle-${index}">▼</span>
                    </div>
                </td>
            </tr>
            <tr class="video-group-details" id="video-details-${index}" style="display: none;">
                <td colspan="5" style="padding: 10px 12px 10px 48px; background: #fff;">
                    <table style="width: 100%; font-size: 0.9rem;">
                        <thead>
                            <tr style="background: #eee;">
                                <th style="padding: 6px; text-align: left;">Usuário</th>
                                <th style="padding: 6px; text-align: left;">IP</th>
                                <th style="padding: 6px; text-align: left;">Data</th>
                                <th style="padding: 6px; text-align: left;">Tempo</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            if (video.visualizacoes && video.visualizacoes.length > 0) {
                video.visualizacoes.forEach(v => {
                    html += `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 6px;">${v.usuario_nome || v.usuario_email || 'Anónimo'}</td>
                            <td style="padding: 6px; font-family: monospace;">${v.ip_address || '-'}</td>
                            <td style="padding: 6px;">${formatarData(v.data_visualizacao)}</td>
                            <td style="padding: 6px;">${formatarTempo(v.tempo_assistido)}</td>
                        </tr>
                    `;
                });
            } else {
                html += '<tr><td colspan="4" style="padding: 6px; color: #999;">Sem visualizações detalhadas</td></tr>';
            }
            
            html += '</tbody></table></td></tr>';
        });
        
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('[DEBUG] Erro ao carregar histórico:', error);
        tbody.innerHTML = '<tr><td colspan="5" style="color: red;">Erro ao carregar histórico</td></tr>';
    }
}

// Função para expandir/recruir grupo de vídeo
function toggleVideoGroup(index) {
    const detailsRow = document.getElementById('video-details-' + index);
    const toggleIcon = document.getElementById('toggle-' + index);
    
    if (detailsRow.style.display === 'none') {
        detailsRow.style.display = 'table-row';
        if (toggleIcon) toggleIcon.textContent = '▲';
    } else {
        detailsRow.style.display = 'none';
        if (toggleIcon) toggleIcon.textContent = '▼';
    }
}

// Função para formatar data
function formatarData(dataString) {
    if (!dataString) return '-';
    const data = new Date(dataString);
    return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Função para formatar tempo
function formatarTempo(segundos) {
    if (!segundos || segundos === 0) return '-';
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${min}m ${seg}s`;
}

// Observador para detectar quando a aba Biblioteca está visível
const observer = new MutationObserver((mutations) => {
    const bibliotecaSection = document.getElementById('biblioteca');
    if (bibliotecaSection && bibliotecaSection.classList.contains('active')) {
        carregarBiblioteca();
    }
});

// Iniciar observador quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const bibliotecaSection = document.getElementById('biblioteca');
        if (bibliotecaSection) {
            observer.observe(bibliotecaSection, {
                attributes: true,
                attributeFilter: ['class']
            });
            // Verificar se já está ativo
            if (bibliotecaSection.classList.contains('active')) {
                carregarBiblioteca();
            }
        }
    }, 1000);
});
