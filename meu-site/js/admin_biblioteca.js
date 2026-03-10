// Admin Biblioteca - Controle de Visualizações de Aulas v14
console.log('[DEBUG v14] Carregando admin_biblioteca.js');

let aulasData = [];
let visualizacoesData = [];
let bibliotecaCarregada = false;

// Função principal
window.carregarBiblioteca = async function() {
    if (bibliotecaCarregada) return;
    bibliotecaCarregada = true;
    
    console.log('[DEBUG v14] Iniciando carregarBiblioteca');
    
    const container = document.getElementById('bibliotecaEstatisticas');
    if (!container) {
        console.log('[DEBUG v14] Container não encontrado!');
        return;
    }
    
    container.innerHTML = '<p style="color: blue;">🔄 Carregando dados...</p>';
    
    try {
        const token = localStorage.getItem('maanaim_admin_token');
        console.log('[DEBUG v14] Token:', token ? 'OK' : 'NULO');
        
        if (!token) {
            container.innerHTML = '<p style="color: red;">❌ Faça login novamente</p>';
            return;
        }
        
        // Buscar aulas
        const aulasResp = await fetch('/api/admin/aulas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!aulasResp.ok) throw new Error('Erro aulas: ' + aulasResp.status);
        aulasData = await aulasResp.json();
        console.log('[DEBUG v14] Aulas:', aulasData.length);
        
        // Buscar visualizações
        const vizResp = await fetch('/api/admin/biblioteca/visualizacoes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!vizResp.ok) throw new Error('Erro visualizações: ' + vizResp.status);
        visualizacoesData = await vizResp.json();
        console.log('[DEBUG v14] Visualizações:', visualizacoesData.length);
        
        // Renderizar
        renderizarBiblioteca(container);
        
    } catch (err) {
        console.error('[DEBUG v14] Erro:', err);
        container.innerHTML = `<p style="color: red;">❌ Erro: ${err.message}</p>`;
    }
};

function renderizarBiblioteca(container) {
    console.log('[DEBUG v14] Renderizando...');
    
    let html = '<h3 style="margin-bottom: 16px;">📚 Biblioteca - Vídeos</h3>';
    html += '<p style="color: #666; margin-bottom: 20px;">Clique em um vídeo para ver as visualizações</p>';
    html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">';
    
    for (const aula of aulasData) {
        // Buscar visualizações para esta aula
        const aulaStats = visualizacoesData.find(v => String(v.aula_id) === String(aula.id));
        const viz = aulaStats?.visualizacoes || [];
        const totalViews = viz.length;
        
        const thumbnail = aula.thumbnail || '';
        const titulo = aula.titulo || 'Sem título';
        const viewsAula = aula.visualizacoes || 0;
        
        html += `
        <div onclick="mostrarDetalhes(${aula.id})" style="
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            cursor: pointer;
            transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
            <div style="position: relative;">
                <img src="${thumbnail}" 
                     style="width: 100%; height: 180px; object-fit: cover;"
                     onerror="this.style.display='none'"
                >
                <div style="
                    position: absolute;
                    bottom: 8px;
                    right: 8px;
                    background: rgba(0,0,0,0.8);
                    color: white;
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-size: 0.85rem;
                ">
                    👁️ ${viewsAula}
                </div>
            </div>
            <div style="padding: 16px;">
                <h4 style="margin: 0 0 8px; font-size: 1rem; color: #333;">${titulo}</h4>
                <div style="font-size: 0.9rem; color: #666;">
                    📊 <strong>${totalViews}</strong> visualizações registradas
                </div>
            </div>
        </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
    console.log('[DEBUG v14] Renderização concluída');
}

// Voltar para biblioteca
window.voltarBiblioteca = function() {
    const container = document.getElementById('bibliotecaEstatisticas');
    if (container) {
        renderizarBiblioteca(container);
    }
};

// Mostrar detalhes de uma aula
window.mostrarDetalhes = function(aulaId) {
    console.log('[DEBUG v14] mostrarDetalhes:', aulaId);
    
    const container = document.getElementById('bibliotecaEstatisticas');
    const aula = aulasData.find(a => a.id === aulaId);
    const aulaStats = visualizacoesData.find(v => String(v.aula_id) === String(aulaId));
    const viz = aulaStats?.visualizacoes || [];
    
    if (!container || !aula) return;
    
    let html = `
        <div style="margin-bottom: 20px;">
        <button onclick="voltarBiblioteca()" style="
            display: inline-block;
            width: auto;
            padding: 10px 20px;
            background: #4a90d9;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
        ">← Voltar para Biblioteca</button>
        </div>
        
        <div style="
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            width: 100%;
            box-sizing: border-box;
        ">
            <div style="flex-shrink: 0;">
                <img src="${aula.thumbnail || ''}" 
                     style="width: 280px; max-width: 100%; height: auto; aspect-ratio: 16/9; object-fit: cover; border-radius: 8px;"
                     onerror="this.style.display='none'"
                >
            </div>
            <div style="flex: 1; min-width: 250px; overflow: hidden;">
                <h2 style="margin: 0 0 10px 0; word-wrap: break-word;">${aula.titulo || 'Sem título'}</h2>
                <p style="color: #666; margin: 0 0 10px 0; word-wrap: break-word;">${aula.descricao || 'Sem descrição'}</p>
                <div style="font-size: 1rem; white-space: nowrap;">
                    <span style="margin-right: 20px;">👁️ <strong>${aula.visualizacoes || 0}</strong> visualizações totais</span>
                    <span>📊 <strong>${viz.length}</strong> registros</span>
                </div>
            </div>
        </div>
        
        <h3 style="margin: 20px 0 16px 0;">📋 Histórico de Visualizações</h3>
    `;
    
    if (viz.length === 0) {
        html += '<p style="color: #999;">Nenhuma visualização registrada para este vídeo.</p>';
    } else {
        html += `
        <div style="overflow-x: auto;">
        <table style="
            width: 100%;
            min-width: 500px;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        ">
            <thead>
                <tr style="background: #f5f5f5;">
                    <th style="padding: 12px; text-align: left; white-space: nowrap;">Usuário</th>
                    <th style="padding: 12px; text-align: left; white-space: nowrap;">IP</th>
                    <th style="padding: 12px; text-align: left; white-space: nowrap;">Data</th>
                    <th style="padding: 12px; text-align: left; white-space: nowrap;">Tempo</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        for (const v of viz) {
            const data = v.data_visualizacao ? new Date(v.data_visualizacao).toLocaleString('pt-BR') : '-';
            const tempo = (v.tempo_assistido !== null && v.tempo_assistido !== undefined) ? Math.floor(v.tempo_assistido / 60) + 'm ' + (v.tempo_assistido % 60) + 's' : '0s';
            const usuario = v.usuario_nome || v.usuario_email || 'Anónimo';
            
            html += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 12px;">${usuario}</td>
                    <td style="padding: 12px; font-family: monospace; font-size: 0.85rem;">${v.ip_address || '-'}</td>
                    <td style="padding: 12px;">${data}</td>
                    <td style="padding: 12px;">${tempo}</td>
                </tr>
            `;
        }
        
        html += '</tbody></table></div>';
    }
    
    container.innerHTML = html;
};

// Observador para detectar clique na aba
document.addEventListener('DOMContentLoaded', () => {
    console.log('[DEBUG v14] DOM carregado');
    
    setTimeout(() => {
        const sec = document.getElementById('biblioteca');
        
        if (sec && sec.classList.contains('active')) {
            console.log('[DEBUG v14] Já ativo!');
            window.carregarBiblioteca();
        }
        
        if (sec) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mut) => {
                    if (mut.attributeName === 'class' && sec.classList.contains('active')) {
                        console.log('[DEBUG v14] Ativado!');
                        window.carregarBiblioteca();
                    }
                });
            });
            observer.observe(sec, { attributes: true, attributeFilter: ['class'] });
        }
    }, 1000);
});
