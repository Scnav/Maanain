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
    const loading = document.getElementById('loadingTopicos');
    const lista = document.getElementById('listaTopicos');
    
    if (!loading || !lista) return;
    
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
    
    // Função para verificar se tem agendamento (independentemente de já ter passado ou não)
    function verificarAgendamento(topico) {
        console.log('Verificando agendamento - data:', topico.data_publicacao, 'hora:', topico.hora_publicacao, 'ativo raw:', topico.ativo);
        if (!topico.data_publicacao || topico.data_publicacao === '') return null;
        const dataHoraPub = topico.data_publicacao + ' ' + (topico.hora_publicacao || '00:00');
        const dataPub = new Date(dataHoraPub.replace(' ', 'T'));
        const agora = new Date();
        // Retorna a data se ainda não passou, ou null se já passou
        return dataPub > agora ? dataPub : null;
    }
    
    lista.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
            ${topicos.map(topico => {
                const dataAgendamento = verificarAgendamento(topico);
                const ativoNum = Number(topico.ativo);
                console.log('Topico:', topico.titulo, 'ativo (raw):', topico.ativo, 'ativo (num):', ativoNum, 'dataAgendamento:', dataAgendamento);
                let statusBadge = '';
                if (dataAgendamento) {
                    // Ainda está agendado para o futuro
                    const dataFormatada = dataAgendamento.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    const horaFormatada = dataAgendamento.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    statusBadge = `<span style="background: #ffc107; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.8rem; margin-left: 0.5rem;" title="Agendado para ${dataFormatada} às ${horaFormatada}">⏰ Agendado</span>`;
                } else if (ativoNum === 1) {
                    // Ativo e data já passou (ou sem data)
                    statusBadge = `<span style="background: #28a745; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.8rem; margin-left: 0.5rem;">✅Publicado</span>`;
                } else {
                    statusBadge = `<span style="background: #6c757d; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.8rem; margin-left: 0.5rem;">❌ Inativo</span>`;
                }
                
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
                        <button onclick="editarTopico(${topico.id}, '${escapeHtml(topico.titulo)}', '${escapeHtml(topico.descricao || '')}', '${escapeHtml(topico.conteudo || '')}', '${topico.categoria || 'geral'}', '${topico.icone || 'fas fa-book-bible'}', ${topico.ordem || 0}, ${ativoNum}, '${topico.data_publicacao || ''}', '${topico.hora_publicacao || '00:00'}')" 
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
    
    console.log('Salvando - ativo:', ativo, 'data:', data_publicacao, 'hora:', hora_publicacao);
    
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
                hora_publicacao
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
function editarTopico(id, titulo, descricao, conteudo, categoria, icone, ordem, ativo, data_publicacao = '', hora_publicacao = '00:00') {
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
    document.getElementById('topicoHoraPublicacao').value = hora_publicacao || '00:00';
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
