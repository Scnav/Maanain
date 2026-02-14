// Funções para gerenciar tópicos bíblicos no admin

// Carregar tópicos bíblicos
async function carregarTopicosBiblia() {
    const loading = document.getElementById('loadingTopicos');
    const lista = document.getElementById('listaTopicos');
    
    if (!loading || !lista) return;
    
    loading.style.display = 'block';
    lista.style.display = 'none';
    
    try {
        const user = JSON.parse(localStorage.getItem('maanain_user') || '{}');
        const response = await fetch('/api/admin/topicos-biblia', {
            headers: {
                'x-admin-token': 'maanain2026',
                'x-user-data': btoa(JSON.stringify(user))
            }
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
    
    lista.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
            ${topicos.map(topico => `
                <div style="background: white; border-radius: 10px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1rem;">
                        <i class="${topico.icone || 'fas fa-book-bible'}" style="font-size: 2rem; color: var(--verde-principal);"></i>
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 0.5rem 0; color: #333;">${topico.titulo}</h4>
                            <span style="background: #e9ecef; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.8rem; color: #666;">
                                ${topico.categoria || 'geral'}
                            </span>
                            ${topico.ativo ? '' : '<span style="background: #ffc107; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.8rem; margin-left: 0.5rem;">Inativo</span>'}
                        </div>
                    </div>
                    ${topico.descricao ? `<p style="color: #666; font-size: 0.9rem; margin-bottom: 1rem;">${topico.descricao}</p>` : ''}
                    <div style="display: flex; gap: 0.5rem;">
                        <button onclick="editarTopico(${topico.id}, '${escapeHtml(topico.titulo)}', '${escapeHtml(topico.descricao || '')}', '${escapeHtml(topico.conteudo || '')}', '${topico.categoria || 'geral'}', '${topico.icone || 'fas fa-book-bible'}', ${topico.ordem || 0}, ${topico.ativo})" 
                            class="btn-editar-cargo" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">✏️ Editar</button>
                        <button onclick="excluirTopico(${topico.id})" 
                            style="background: #dc3545; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem;">🗑️ Excluir</button>
                    </div>
                </div>
            `).join('')}
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
    const ativo = document.getElementById('topicoAtivo').checked;
    
    if (!titulo) {
        alert('Título é obrigatório!');
        return;
    }
    
    const user = JSON.parse(localStorage.getItem('maanain_user') || '{}');
    const url = id ? `/api/admin/topicos-biblia/${id}` : '/api/admin/topicos-biblia';
    const method = id ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-admin-token': 'maanain2026',
                'x-user-data': btoa(JSON.stringify(user))
            },
            body: JSON.stringify({ titulo, descricao, conteudo, categoria, icone, ordem, ativo: ativo ? 1 : 0 })
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
function editarTopico(id, titulo, descricao, conteudo, categoria, icone, ordem, ativo) {
    document.getElementById('formTopico').style.display = 'block';
    document.getElementById('formTopicoTitle').textContent = 'Editar Tópico';
    document.getElementById('topicoId').value = id;
    document.getElementById('topicoTitulo').value = titulo;
    document.getElementById('topicoDescricao').value = descricao;
    document.getElementById('topicoConteudo').value = conteudo;
    document.getElementById('topicoCategoria').value = categoria;
    document.getElementById('topicoIcone').value = icone;
    document.getElementById('topicoOrdem').value = ordem;
    document.getElementById('topicoAtivo').checked = ativo === 1 || ativo === true;
}

// Excluir tópico
async function excluirTopico(id) {
    if (!confirm('Tem certeza que deseja excluir este tópico?')) return;
    
    try {
        const user = JSON.parse(localStorage.getItem('maanain_user') || '{}');
        const response = await fetch(`/api/admin/topicos-biblia/${id}`, {
            method: 'DELETE',
            headers: {
                'x-admin-token': 'maanain2026',
                'x-user-data': btoa(JSON.stringify(user))
            }
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
