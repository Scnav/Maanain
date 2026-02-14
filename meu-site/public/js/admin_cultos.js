// CULTOS SEMANAIS
// Event listeners para botões de culto
document.getElementById('btnNovoCulto')?.addEventListener('click', () => mostrarFormCulto());
document.getElementById('btnSalvarCulto')?.addEventListener('click', salvarCulto);
document.getElementById('btnCancelarCulto')?.addEventListener('click', () => ocultarFormCulto());

function mostrarFormCulto(culto = null) {
    const form = document.getElementById('formCulto');
    const title = document.getElementById('formCultoTitle');
    const id = document.getElementById('cultoId');
    const titulo = document.getElementById('cultoTitulo');
    const horario = document.getElementById('cultoHorario');
    const local = document.getElementById('cultoLocal');

    if (culto) {
        title.textContent = 'Editar Culto';
        id.value = culto.id;
        titulo.value = culto.titulo;
        horario.value = culto.horario || '';
        local.value = culto.local || '';
    } else {
        title.textContent = 'Novo Culto';
        id.value = '';
        titulo.value = '';
        horario.value = '';
        local.value = '';
    }

    form.style.display = 'block';
}

function ocultarFormCulto() {
    document.getElementById('formCulto').style.display = 'none';
}

async function carregarCultos() {
    try {
        const response = await fetch('/api/admin/cultos', {
            headers: getAdminHeaders()
        });
        if (!response.ok) throw new Error('Erro ao carregar cultos');
        const cultos = await response.json();
        
        const container = document.getElementById('cultosAdminContainer');
        if (!container) return;
        
        if (cultos.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Nenhum culto cadastrado. Clique em "Novo Culto" para adicionar.</p>';
        } else {
            container.innerHTML = cultos.map(culto => `
                <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem;">
                    <h4 style="margin-bottom: 1rem;">🟣 ${culto.titulo}</h4>
                    <p style="margin-bottom: 0.5rem;"><strong>Horário:</strong> ${culto.horario || 'A definir'}</p>
                    <p style="margin-bottom: 1rem;"><strong>Local:</strong> ${culto.local || 'A definir'}</p>
                    <button onclick='editarCulto(${JSON.stringify(culto).replace(/'/g, "'")})' class="btn-editar-cargo" style="margin-right: 0.5rem;">✏️ Editar</button>
                    <button onclick="excluirCulto(${culto.id})" class="btn-delete">🗑️ Excluir</button>
                </div>
            `).join('');
        }
        
        container.style.display = 'block';
        document.getElementById('loadingCultos').style.display = 'none';
    } catch (error) {
        console.error('Erro ao carregar cultos:', error);
        mostrarToast('❌ Erro ao carregar cultos', 'error');
    }
}

async function salvarCulto() {
    const id = document.getElementById('cultoId').value;
    const titulo = document.getElementById('cultoTitulo').value;
    const horario = document.getElementById('cultoHorario').value;
    const local = document.getElementById('cultoLocal').value;

    if (!titulo) {
        mostrarToast('❌ Título é obrigatório', 'error');
        return;
    }

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/admin/cultos/${id}` : '/api/admin/cultos';

        const response = await fetch(url, {
            method,
            headers: getAdminHeaders(),
            body: JSON.stringify({ titulo, horario, local })
        });
        
        if (!response.ok) throw new Error('Erro ao salvar culto');
        
        mostrarToast(`✅ Culto ${id ? 'atualizado' : 'criado'} com sucesso!`, 'success');
        ocultarFormCulto();
        carregarCultos();
    } catch (error) {
        console.error('Erro ao salvar culto:', error);
        mostrarToast('❌ Erro ao salvar culto', 'error');
    }
}

function editarCulto(culto) {
    mostrarFormCulto(culto);
}

async function excluirCulto(id) {
    if (!confirm('Tem certeza que deseja excluir este culto?')) return;

    try {
        const response = await fetch(`/api/admin/cultos/${id}`, {
            method: 'DELETE',
            headers: getAdminHeaders()
        });

        if (!response.ok) throw new Error('Erro ao excluir culto');

        mostrarToast('🗑️ Culto excluído!', 'success');
        carregarCultos();
    } catch (error) {
        console.error('Erro ao excluir culto:', error);
        mostrarToast('❌ Erro ao excluir culto', 'error');
    }
}

// Carregar conteúdo quando navegar para as seções
document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', function(e) {
        const section = this.dataset.section;
        if (section === 'noticias') {
            setTimeout(carregarNoticias, 100);
        } else if (section === 'programacao') {
            setTimeout(carregarCultos, 100);
            setTimeout(carregarEventos, 200);
        } else if (section === 'pagina-inicial') {
            setTimeout(carregarConteudos, 100);
        } else if (section === 'ministerios') {
            setTimeout(carregarMinisterios, 100);
        }
    });
});
