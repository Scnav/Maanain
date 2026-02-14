// Funções para gerenciar inscrições em eventos

async function carregarInscricoes() {
    try {
        const response = await fetch('/api/admin/inscricoes', {
            headers: getAdminHeaders()
        });
        if (!response.ok) throw new Error('Erro ao carregar inscrições');
        const inscricoes = await response.json();
        
        const container = document.getElementById('listaInscricoes');
        if (!container) return;
        
        if (inscricoes.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Nenhuma inscrição registrada.</p>';
        } else {
            container.innerHTML = `
                <table class="users-table">
                    <thead>
                        <tr><th>Evento</th><th>Nome</th><th>Email</th><th>Telefone</th><th>Data</th><th>Ações</th></tr>
                    </thead>
                    <tbody>
                        ${inscricoes.map(insc => `
                            <tr>
                                <td>${insc.evento_titulo || 'Evento #' + insc.evento_id}</td>
                                <td><strong>${insc.nome}</strong></td>
                                <td>${insc.email || '-'}</td>
                                <td>${insc.telefone || '-'}</td>
                                <td>${new Date(insc.created_at).toLocaleDateString('pt-BR')}</td>
                                <td>
                                    <button onclick="excluirInscricao(${insc.id})" class="btn-delete">🗑️</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
        
        container.style.display = 'block';
        document.getElementById('loadingInscricoes').style.display = 'none';
    } catch (error) {
        console.error('Erro ao carregar inscrições:', error);
        document.getElementById('loadingInscricoes').textContent = 'Erro ao carregar inscrições.';
    }
}

async function excluirInscricao(id) {
    if (!confirm('Tem certeza que deseja excluir esta inscrição?')) return;

    try {
        const response = await fetch(`/api/admin/inscricoes/${id}`, {
            method: 'DELETE',
            headers: getAdminHeaders()
        });

        if (!response.ok) throw new Error('Erro ao excluir inscrição');

        mostrarToast('🗑️ Inscrição excluída!', 'success');
        carregarInscricoes();
    } catch (error) {
        console.error('Erro ao excluir inscrição:', error);
        mostrarToast('❌ Erro ao excluir inscrição', 'error');
    }
}

// Carregar inscrições quando navegar para a seção de programação
document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', function(e) {
        const section = this.dataset.section;
        if (section === 'programacao') {
            setTimeout(carregarInscricoes, 300);
        }
    });
});

// Carregar também quando a página carrega se já estiver na seção programação
if (document.getElementById('programacao')?.classList.contains('active')) {
    setTimeout(carregarInscricoes, 500);
}
