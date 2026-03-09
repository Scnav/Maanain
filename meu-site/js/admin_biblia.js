// Funções para gerenciar tópicos bíblicos no admin

// Função para obter headers com JWT
function getAdminHeaders() {
    const token = localStorage.getItem('maanaim_admin_token');
    const expiry = localStorage.getItem('maanaim_admin_expiry');
    
    if (token && expiry && Date.now() < parseInt(expiry)) {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }
    
    return { 'Content-Type': 'application/json' };
}

// Carregar tópicos bíblicos
async function carregarTopicosBiblia() {
    console.log('🔍 carregarTopicosBiblia chamada!');
    const loading = document.getElementById('loadingTopicos');
    const lista = document.getElementById('listaTopicos');
    
    console.log('loading:', loading);
    console.log('lista:', lista);
    
    if (!loading || !lista) {
        console.error('❌ Elementos não encontrados!');
        return;
    }
    
    loading.style.display = 'block';
    lista.style.display = 'none';
    
    try {
        const response = await fetch('/api/admin/topicos-biblia', {
            headers: getAdminHeaders()
        });
        
        if (!response.ok) throw new Error('Erro ao carregar tópicos');
        
        const topicos = await response.json();
        exibirTopicos(topicos);
        
    } catch (error) {
        console.error('Erro:', error);
        loading.innerHTML = '❌ Erro ao carregar tópicos';
    }
}

// Exibir tópicos na lista
function exibirTopicos(topicos) {
    const loading = document.getElementById('loadingTopicos');
    const lista = document.getElementById('listaTopicos');
    
    if (!lista) return;
    
    loading.style.display = 'none';
    
    if (topicos.length === 0) {
        lista.innerHTML = '<p style="text-align: center; color: #666;">Nenhum tópico bíblico cadastrado ainda.</p>';
        lista.style.display = 'block';
        return;
    }
    
    // Função para verificar o status real do tópico
    function verificarStatus(topico) {
        console.log('Verificando status - data:', topico.data_publicacao, 'hora:', topico.hora_publicacao, 'ativo raw:', topico.ativo);
        
        const ativoNum = Number(topico.ativo);
        
        // Obter a data atual no fuso horário do Brasil (UTC-3)
        const agora = new Date();
        const agoraBRT = new Date(agora.getTime() - (3 * 60 * 60 * 1000)); // Converter para BRT
        
        console.log('Agora (UTC):', agora.toISOString());
        console.log('Agora (BRT):', agoraBRT.toISOString());
        
        // Se tem hora de publicação E não é "00:00" (que significa publicação imediata), verificar o agendamento
        // "00:00" significa que será publicado imediatamente (sem agendamento)
        if (topico.hora_publicacao && topico.hora_publicacao !== '' && topico.hora_publicacao !== '00:00') {
            // Determinar a data de publicação em UTC
            let dataPub;
            const horaParts = topico.hora_publicacao.split(':');
            const hora = parseInt(horaParts[0]);
            const minuto = parseInt(horaParts[1]) || 0;
            
            if (topico.data_publicacao && topico.data_publicacao !== '') {
                // Tem data específica
                let dataStr = String(topico.data_publicacao);
                let dataPart;
                
                // Handle diferentes formatos de data do banco
                if (dataStr.includes('T') && dataStr.includes('GMT')) {
                    // Formato Date object do SQLite: "Fri Mar 06 2026 00:00:00 GMT-0300"
                    const partes = dataStr.split(' ');
                    const meses = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
                    const mes = meses[partes[1]];
                    const dia = parseInt(partes[2]);
                    const ano = parseInt(partes[3]);
                    dataPart = `${ano}-${String(mes+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
                } else if (dataStr.includes('T')) {
                    // Formato ISO: "2026-03-06T03:00:00.000Z"
                    dataPart = dataStr.split('T')[0];
                } else {
                    // Formato YYYY-MM-DD
                    dataPart = dataStr;
                }
                
                const [ano, mes, dia] = dataPart.split('-').map(Number);
                
                // Criar dataPub em UTC (hora brasileira convertida para UTC)
                // Quando o usuário configura 22:00 BRT, o UTC é 22:00 - 3 = 01:00 do dia seguinte
                dataPub = new Date(Date.UTC(ano, mes - 1, dia, hora, minuto));
                
                console.log('Data pub (com data):', dataPub.toISOString());
            } else {
                // Não tem data - usar data de hoje com a hora especificada
                // Criar dataPub em UTC
                dataPub = new Date(Date.UTC(agoraBRT.getFullYear(), agoraBRT.getMonth(), agoraBRT.getDate(), hora, minuto));
                
                console.log('Data pub (sem data, com hora):', dataPub.toISOString());
                
                // Se a hora de hoje já passou (dataPub < agoraBRT), agendar para amanha
                if (dataPub.getTime() <= agoraBRT.getTime()) {
                    dataPub = new Date(Date.UTC(agoraBRT.getFullYear(), agoraBRT.getMonth(), agoraBRT.getDate() + 1, hora, minuto));
                    console.log('Data pub ajustada para amanha:', dataPub.toISOString());
                }
            }
            
            console.log('Data publicação:', dataPub.toISOString(), 'Agora BRT:', agoraBRT.toISOString());
            console.log('Comparacao:', dataPub.getTime(), '>', agoraBRT.getTime(), '=', dataPub.getTime() > agoraBRT.getTime());
            
            if (dataPub.getTime() > agoraBRT.getTime()) {
                // Data/hora ainda não chegou - está agendado
                // Converter de UTC para BRT para exibir corretamente
                const dataPubBRT = new Date(dataPub.getTime() + (3 * 60 * 60 * 1000));
                const dataFormatada = dataPubBRT.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const horaFormatada = dataPubBRT.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return { 
                    status: 'agendado', 
                    label: `⏰ Agendado para ${dataFormatada} às ${horaFormatada}`, 
                    cor: '#ffc107',
                    dataAgendamento: dataPub
                };
            }
            
            // Data/hora já passou - verificar se está ativo
            if (ativoNum === 1) {
                return { status: 'publicado', label: '✅Publicado', cor: '#28a745' };
            } else {
                return { status: 'expirado', label: '⏸️ Expirado', cor: '#6c757d' };
            }
        }
        
        // Se não tem hora de publicação
        if (ativoNum === 1) {
            return { status: 'publicado', label: '✅Publicado', cor: '#28a745' };
        } else {
            return { status: 'rascunho', label: '📝 Rascunho', cor: '#6c757d' };
        }
    }
    
    lista.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
            ${topicos.map(topico => {
                const statusInfo = verificarStatus(topico);
                const ativoNum = Number(topico.ativo);
                console.log('Topico:', topico.titulo, '- Status:', statusInfo.status, '- Label:', statusInfo.label);
                let statusBadge = `<span style="background: ${statusInfo.cor}; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.8rem; margin-left: 0.5rem;" title="${statusInfo.label}">${statusInfo.label}</span>`;
                return `
                <div style="background: white; border-radius: 10px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1rem;">
                        <i class="${topico.icone || 'fas fa-book-bible'}" style="font-size: 2rem; color: var(--verde-principal);"></i>
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 0.5rem 0; color: #333;">${topico.titulo} ${statusBadge}</h4>
                            <span style="background: #e9ecef; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.8rem; color: #666;">
                                ${topico.categoria || 'geral'}
                            </span>
                        </div>
                    </div>
                    ${topico.descricao ? `<p style="color: #666; font-size: 0.9rem; margin-bottom: 1rem;">${topico.descricao}</p>` : ''}
                    <div style="display: flex; gap: 0.5rem;">
                        <button onclick="editarTopico(${topico.id}, '${escapeHtml(topico.titulo)}', '${escapeHtml(topico.descricao || '')}', '${escapeHtml(topico.conteudo || '')}', '${topico.categoria || 'geral'}', '${topico.icone || 'fas fa-book-bible'}', ${topico.ordem || 0}, ${ativoNum}, '${topico.data_publicacao || ''}', '${topico.hora_publicacao || ''}')" 
                            class="btn-editar-cargo" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">✏️ Editar</button>
                        <button onclick="excluirTopico(${topico.id})" 
                            style="background: #dc3545; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem;">🗑️ Excluir</button>
                    </div>
                </div>
            `}).join('')}
        </div>
    `;
    
    lista.style.display = 'block';
}

// Função auxiliar para escapar HTML
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/\"/g, '"')
        .replace(/'/g, '&#039;');
}

// Abrir formulário para novo tópico
document.getElementById('btnNovoTopico')?.addEventListener('click', function() {
    document.getElementById('formTopico').style.display = 'block';
    document.getElementById('formTopicoTitle').textContent = 'Novo Tópico';
    document.getElementById('topicoId').value = '';
    document.getElementById('topicoTitulo').value = '';
    document.getElementById('topicoDescricao').value = '';
    document.getElementById('topicoConteudo').value = '';
    document.getElementById('topicoCategoria').value = 'geral';
    document.getElementById('topicoIcone').value = 'fas fa-book-bible';
    document.getElementById('topicoOrdem').value = '0';
    document.getElementById('topicoAtivo').checked = true;
    document.getElementById('topicoDataPublicacao').value = '';
    document.getElementById('topicoHoraPublicacao').value = '00:00';
});

// Cancelar formulário
document.getElementById('btnCancelarTopico')?.addEventListener('click', function() {
    document.getElementById('formTopico').style.display = 'none';
});

// Salvar tópico
document.getElementById('btnSalvarTopico')?.addEventListener('click', async function() {
    const id = document.getElementById('topicoId').value;
    const titulo = document.getElementById('topicoTitulo').value.trim();
    const descricao = document.getElementById('topicoDescricao').value.trim();
    const conteudo = document.getElementById('topicoConteudo').value.trim();
    const categoria = document.getElementById('topicoCategoria').value;
    const icone = document.getElementById('topicoIcone').value.trim();
    const ordem = parseInt(document.getElementById('topicoOrdem').value) || 0;
    const ativoCheckbox = document.getElementById('topicoAtivo');
    const ativo = ativoCheckbox.checked ? 1 : 0;
    const data_publicacao = document.getElementById('topicoDataPublicacao').value;
    const hora_publicacao = document.getElementById('topicoHoraPublicacao').value;
    
    // Converter "00:00" para vazio para publicação imediata
    const horaEnviar = hora_publicacao === '00:00' ? '' : hora_publicacao;
    
    console.log('Salvando - ativo:', ativo, 'data:', data_publicacao, 'hora:', horaEnviar);
    
    if (!titulo) {
        alert('Título é obrigatório!');
        return;
    }
    
    const url = id ? `/api/admin/topicos-biblia/${id}` : '/api/admin/topicos-biblia';
    const method = id ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: getAdminHeaders(),
            body: JSON.stringify({ 
                titulo, 
                descricao, 
                conteudo, 
                categoria, 
                icone, 
                ordem, 
                ativo,
                data_publicacao,
                hora_publicacao: horaEnviar
            })
        });
        
        if (!response.ok) throw new Error('Erro ao salvar');
        
        alert(id ? 'Tópico atualizado!' : 'Tópico criado!');
        document.getElementById('formTopico').style.display = 'none';
        carregarTopicosBiblia();
        
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao salvar tópico!');
    }
});

// Editar tópico
function editarTopico(id, titulo, descricao, conteudo, categoria, icone, ordem, ativo, data_publicacao = '', hora_publicacao = '') {
    document.getElementById('formTopico').style.display = 'block';
    document.getElementById('formTopicoTitle').textContent = 'Editar Tópico';
    document.getElementById('topicoId').value = id;
    document.getElementById('topicoTitulo').value = titulo;
    document.getElementById('topicoDescricao').value = descricao;
    document.getElementById('topicoConteudo').value = conteudo;
    document.getElementById('topicoCategoria').value = categoria;
    document.getElementById('topicoIcone').value = icone;
    document.getElementById('topicoOrdem').value = ordem;
    document.getElementById('topicoAtivo').checked = ativo === 1 || ativo === true || ativo === '1';
    document.getElementById('topicoDataPublicacao').value = data_publicacao;
    document.getElementById('topicoHoraPublicacao').value = hora_publicacao || '';
}

// Excluir tópico
async function excluirTopico(id) {
    if (!confirm('Tem certeza que deseja excluir este tópico?')) return;
    
    try {
        const user = JSON.parse(localStorage.getItem('maanaim_user') || '{}');
        const response = await fetch(`/api/admin/topicos-biblia/${id}`, {
            method: 'DELETE',
            headers: getAdminHeaders()
        });
        
        if (!response.ok) throw new Error('Erro ao excluir');
        
        alert('Tópico excluído!');
        carregarTopicosBiblia();
        
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao excluir tópico!');
    }
}

// Carregar tópicos quando a seção for clicada
document.addEventListener('DOMContentLoaded', function() {
    // Sobrescrever o comportamento do clique na sidebar para bíblia
    const bibliaLink = document.querySelector('[data-section="biblia"]');
    if (bibliaLink) {
        bibliaLink.addEventListener('click', function() {
            carregarTopicosBiblia();
        });
    }
});
