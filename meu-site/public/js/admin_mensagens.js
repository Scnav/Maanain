// Funções para gerenciar mensagens

async function carregarMensagens() {
    try {
        const response = await fetch('/api/admin/mensagens', {
            headers: getAdminHeaders()
        });
        if (!response.ok) throw new Error('Erro ao carregar mensagens');
        const mensagens = await response.json();
        
        const container = document.getElementById('listaMensagens');
        if (!container) return;
        
        if (mensagens.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Nenhuma mensagem cadastrada.</p>';
        } else {
            container.innerHTML = `
                <table class="users-table">
                    <thead>
                        <tr><th>Título</th><th>Vídeo</th><th>Data</th><th>Status</th><th>Ações</th></tr>
                    </thead>
                    <tbody>
                        ${mensagens.map(msg => `
                            <tr>
                                <td><strong>${msg.titulo}</strong></td>
                                <td>${msg.video_url ? '📹 Sim' : '❌ Não'}</td>
                                <td>${new Date(msg.data_publicacao).toLocaleDateString('pt-BR')}</td>
                                <td>${msg.ativa ? '✅ Ativa' : '❌ Inativa'}</td>
                                <td>
                                    <button onclick="editarMensagem(${msg.id}, '${msg.titulo.replace(/'/g, "\\'")}', '${(msg.conteudo || '').replace(/'/g, "\\'")}', '${(msg.video_url || '').replace(/'/g, "\\'")}', ${msg.ativa})" class="btn-edit">✏️</button>
                                    <button onclick="excluirMensagem(${msg.id})" class="btn-delete">🗑️</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
        
        document.getElementById('loadingMensagens').style.display = 'none';
    } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
        document.getElementById('loadingMensagens').textContent = 'Erro ao carregar mensagens.';
    }
}

function abrirFormMensagem() {
    document.getElementById('mensagemId').value = '';
    document.getElementById('mensagemTitulo').value = '';
    document.getElementById('mensagemVideo').value = '';
    document.getElementById('mensagemAtiva').checked = true;
    document.getElementById('formMensagemTitle').textContent = 'Nova Mensagem';
    document.getElementById('formMensagem').style.display = 'block';
}

function editarMensagem(id, titulo, conteudo, video_url, ativa) {
    document.getElementById('mensagemId').value = id;
    document.getElementById('mensagemTitulo').value = titulo;
    document.getElementById('mensagemVideo').value = video_url || '';
    document.getElementById('mensagemAtiva').checked = ativa === 1;
    document.getElementById('formMensagemTitle').textContent = 'Editar Mensagem';
    document.getElementById('formMensagem').style.display = 'block';
}

function fecharFormMensagem() {
    document.getElementById('formMensagem').style.display = 'none';
}

async function salvarMensagem() {
    const id = document.getElementById('mensagemId').value;
    const titulo = document.getElementById('mensagemTitulo').value;
    const video_url = document.getElementById('mensagemVideo').value;
    const ativa = document.getElementById('mensagemAtiva').checked ? 1 : 0;

    if (!titulo) {
        mostrarToast('❌ Título é obrigatório', 'error');
        return;
    }

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/admin/mensagens/${id}` : '/api/admin/mensagens';
        
        const response = await fetch(url, {
            method: method,
            headers: getAdminHeaders(),
            body: JSON.stringify({ titulo, video_url, ativa })
        });

        if (!response.ok) throw new Error('Erro ao salvar mensagem');

        mostrarToast(`✅ Mensagem ${id ? 'atualizada' : 'criada'}!`, 'success');
        fecharFormMensagem();
        carregarMensagens();
    } catch (error) {
        console.error('Erro ao salvar mensagem:', error);
        mostrarToast('❌ Erro ao salvar mensagem', 'error');
    }
}

async function excluirMensagem(id) {
    if (!confirm('Tem certeza que deseja excluir esta mensagem?')) return;

    try {
        const response = await fetch(`/api/admin/mensagens/${id}`, {
            method: 'DELETE',
            headers: getAdminHeaders()
        });

        if (!response.ok) throw new Error('Erro ao excluir mensagem');

        mostrarToast('🗑️ Mensagem excluída!', 'success');
        carregarMensagens();
    } catch (error) {
        console.error('Erro ao excluir mensagem:', error);
        mostrarToast('❌ Erro ao excluir mensagem', 'error');
    }
}

// Carregar mensagens quando navegar para a seção
document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', function(e) {
        const section = this.dataset.section;
        if (section === 'mensagens') {
            setTimeout(carregarMensagens, 300);
        }
    });
});
