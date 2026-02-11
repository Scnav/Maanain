// Sidebar Navigation
document.addEventListener('DOMContentLoaded', function() {
    carregarEstatisticas();
    carregarUsuarios();

    document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            document.getElementById(this.dataset.section).classList.add('active');
            this.classList.add('active');
        });
    });

    document.getElementById('logout').onclick = (e) => {
        e.preventDefault();
        localStorage.removeItem('maanainAdmin');
        if (confirm('Sair do painel?')) window.location.href = 'index.html';
    };
});

// Carregar Estatísticas
async function carregarEstatisticas() {
    try {
        const response = await fetch('/api/admin/stats', {
            headers: { 'x-admin-token': 'maanain2026' }
        });
        if (!response.ok) throw new Error('Erro ao carregar estatísticas');
        const stats = await response.json();
        document.getElementById('totalUsuarios').textContent = stats.total;
        document.getElementById('frequentadores').textContent = stats.frequentadores;
        document.getElementById('admins').textContent = stats.admins;
        // Adicionei online como placeholder, pode ser implementado depois
        document.getElementById('online').textContent = 'N/A';
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        mostrarToast('❌ Erro ao carregar estatísticas', 'error');
    }
}

// Carregar Usuários
async function carregarUsuarios() {
    try {
        const response = await fetch('/api/admin/users', {
            headers: { 'x-admin-token': 'maanain2026' }
        });
        if (!response.ok) throw new Error('Erro ao carregar usuários');
        const usuarios = await response.json();

        document.getElementById('usuariosBody').innerHTML = usuarios.map(criarLinhaUsuario).join('');
        document.getElementById('loadingUsuarios').style.display = 'none';
        document.getElementById('tabelaUsuarios').style.display = 'table';
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        mostrarToast('❌ Erro ao carregar usuários', 'error');
        document.getElementById('loadingUsuarios').textContent = 'Erro ao carregar usuários.';
    }
}

function criarLinhaUsuario(user) {
    const cargos = { 'frequentador': 'Frequentador', 'membro': 'Membro', 'conselho': 'Conselho', 'admin': 'Admin' };
    return `
        <tr>
            <td>${user.id}</td>
            <td><strong>${user.username}</strong></td>
            <td>${user.email || 'N/A'}</td>
            <td><span class="role-badge cargo-${user.role}">${cargos[user.role]}</span></td>
            <td>
                <div class="dropdown-cargo">
                    <button class="btn-editar-cargo" onclick="toggleDropdown(${user.id})">👑 Setar Cargo</button>
                    <div class="dropdown-menu" id="dropdown-${user.id}">
                        <button class="cargo-item" data-userid="${user.id}" data-cargo="frequentador">👤 Frequentador</button>
                        <button class="cargo-item" data-userid="${user.id}" data-cargo="membro">🥈 Membro</button>
                        <button class="cargo-item" data-userid="${user.id}" data-cargo="conselho">🥉 Conselho</button>
                        <button class="cargo-item" data-userid="${user.id}" data-cargo="admin">👑 Admin</button>
                    </div>
                </div>
                <button class="btn-delete" onclick="excluirUsuario(${user.id})">🗑️</button>
            </td>
        </tr>`;
}

// DROPDOWN FUNCTIONS - 100% CORRIGIDAS
function toggleDropdown(userId) {
    const dropdown = document.getElementById(`dropdown-${userId}`);
    const isVisible = dropdown.style.display === 'block';
    document.querySelectorAll('.dropdown-menu').forEach(d => d.style.display = 'none');
    dropdown.style.display = isVisible ? 'none' : 'block';
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('cargo-item')) {
        const userId = e.target.dataset.userid;
        const cargo = e.target.dataset.cargo;
        setarCargo(userId, cargo);
        document.getElementById(`dropdown-${userId}`).style.display = 'none';
    }
});

async function setarCargo(userId, cargo) {
    try {
        const response = await fetch(`/api/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-token': 'maanain2026'
            },
            body: JSON.stringify({ role: cargo })
        });

        if (!response.ok) throw new Error('Erro ao alterar cargo');

        // Atualiza visual
        const row = document.querySelector(`#dropdown-${userId}`).closest('tr');
        const badge = row.querySelector('.role-badge');
        const cargos = { 'frequentador': 'Frequentador', 'membro': 'Membro', 'conselho': 'Conselho', 'admin': 'Admin' };
        badge.textContent = cargos[cargo];
        badge.className = `role-badge cargo-${cargo}`;

        mostrarToast(`✅ Cargo alterado para: ${cargos[cargo]}`, 'success');
        // Recarregar estatísticas
        carregarEstatisticas();
    } catch (error) {
        console.error('Erro ao alterar cargo:', error);
        mostrarToast('❌ Erro ao alterar cargo', 'error');
    }
}

async function excluirUsuario(id) {
    if (!confirm(`Excluir usuário ${id}? Esta ação não pode ser desfeita.`)) return;

    try {
        const response = await fetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: { 'x-admin-token': 'maanain2026' }
        });

        if (!response.ok) throw new Error('Erro ao excluir usuário');

        mostrarToast('🗑️ Usuário excluído!', 'success');
        // Recarregar usuários e estatísticas
        carregarUsuarios();
        carregarEstatisticas();
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        mostrarToast('❌ Erro ao excluir usuário', 'error');
    }
}

// NOTÍCIAS
document.getElementById('btnNovaNoticia').addEventListener('click', () => mostrarFormNoticia());
document.getElementById('btnSalvarNoticia').addEventListener('click', salvarNoticia);
document.getElementById('btnCancelarNoticia').addEventListener('click', () => ocultarFormNoticia());

async function carregarNoticias() {
    try {
        const response = await fetch('/api/admin/noticias', {
            headers: { 'x-admin-token': 'maanain2026' }
        });
        if (!response.ok) throw new Error('Erro ao carregar notícias');
        const noticias = await response.json();

        document.getElementById('listaNoticias').innerHTML = noticias.map(criarItemNoticia).join('');
        document.getElementById('loadingNoticias').style.display = 'none';
    } catch (error) {
        console.error('Erro ao carregar notícias:', error);
        mostrarToast('❌ Erro ao carregar notícias', 'error');
        document.getElementById('loadingNoticias').textContent = 'Erro ao carregar notícias.';
    }
}

function criarItemNoticia(noticia) {
    return `
        <div style="background: white; border: 1px solid #eee; border-radius: 10px; padding: 1.5rem; margin-bottom: 1rem;">
            <h4 style="margin: 0 0 1rem 0; color: #dc3545;">${noticia.titulo}</h4>
            <p style="margin: 0 0 1rem 0; color: #666;">${noticia.conteudo.substring(0, 200)}${noticia.conteudo.length > 200 ? '...' : ''}</p>
            <small style="color: #999;">Criado em: ${new Date(noticia.created_at).toLocaleString('pt-BR')}</small>
            <div style="margin-top: 1rem;">
                <button onclick="editarNoticia(${noticia.id})" class="btn-editar-cargo" style="margin-right: 0.5rem;">✏️ Editar</button>
                <button onclick="excluirNoticia(${noticia.id})" class="btn-delete">🗑️ Excluir</button>
            </div>
        </div>`;
}

function mostrarFormNoticia(noticia = null) {
    const form = document.getElementById('formNoticia');
    const title = document.getElementById('formTitle');
    const id = document.getElementById('noticiaId');
    const titulo = document.getElementById('noticiaTitulo');
    const conteudo = document.getElementById('noticiaConteudo');

    if (noticia) {
        title.textContent = 'Editar Notícia';
        id.value = noticia.id;
        titulo.value = noticia.titulo;
        conteudo.value = noticia.conteudo;
    } else {
        title.textContent = 'Nova Notícia';
        id.value = '';
        titulo.value = '';
        conteudo.value = '';
    }

    form.style.display = 'block';
}

function ocultarFormNoticia() {
    document.getElementById('formNoticia').style.display = 'none';
}

async function salvarNoticia() {
    const id = document.getElementById('noticiaId').value;
    const titulo = document.getElementById('noticiaTitulo').value;
    const conteudo = document.getElementById('noticiaConteudo').value;

    if (!titulo || !conteudo) {
        mostrarToast('❌ Título e conteúdo são obrigatórios', 'error');
        return;
    }

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/admin/noticias/${id}` : '/api/admin/noticias';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-admin-token': 'maanain2026'
            },
            body: JSON.stringify({ titulo, conteudo })
        });

        if (!response.ok) throw new Error('Erro ao salvar notícia');

        mostrarToast(`✅ Notícia ${id ? 'atualizada' : 'criada'} com sucesso!`, 'success');
        ocultarFormNoticia();
        carregarNoticias();
    } catch (error) {
        console.error('Erro ao salvar notícia:', error);
        mostrarToast('❌ Erro ao salvar notícia', 'error');
    }
}

async function editarNoticia(id) {
    try {
        const response = await fetch(`/api/admin/noticias`, {
            headers: { 'x-admin-token': 'maanain2026' }
        });
        const noticias = await response.json();
        const noticia = noticias.find(n => n.id == id);
        if (noticia) mostrarFormNoticia(noticia);
    } catch (error) {
        console.error('Erro ao carregar notícia:', error);
        mostrarToast('❌ Erro ao carregar notícia', 'error');
    }
}

async function excluirNoticia(id) {
    if (!confirm('Tem certeza que deseja excluir esta notícia?')) return;

    try {
        const response = await fetch(`/api/admin/noticias/${id}`, {
            method: 'DELETE',
            headers: { 'x-admin-token': 'maanain2026' }
        });

        if (!response.ok) throw new Error('Erro ao excluir notícia');

        mostrarToast('🗑️ Notícia excluída!', 'success');
        carregarNoticias();
    } catch (error) {
        console.error('Erro ao excluir notícia:', error);
        mostrarToast('❌ Erro ao excluir notícia', 'error');
    }
}

// EVENTOS
document.getElementById('btnNovoEvento').addEventListener('click', () => mostrarFormEvento());
document.getElementById('btnSalvarEvento').addEventListener('click', salvarEvento);
document.getElementById('btnCancelarEvento').addEventListener('click', () => ocultarFormEvento());

async function carregarEventos() {
    try {
        const response = await fetch('/api/admin/eventos', {
            headers: { 'x-admin-token': 'maanain2026' }
        });
        if (!response.ok) throw new Error('Erro ao carregar eventos');
        const eventos = await response.json();

        document.getElementById('listaEventos').innerHTML = eventos.map(criarItemEvento).join('');
        document.getElementById('loadingEventos').style.display = 'none';
    } catch (error) {
        console.error('Erro ao carregar eventos:', error);
        mostrarToast('❌ Erro ao carregar eventos', 'error');
        document.getElementById('loadingEventos').textContent = 'Erro ao carregar eventos.';
    }
}

function criarItemEvento(evento) {
    return `
        <div style="background: white; border: 1px solid #eee; border-radius: 10px; padding: 1.5rem; margin-bottom: 1rem;">
            <h4 style="margin: 0 0 1rem 0; color: #dc3545;">${evento.titulo}</h4>
            <p style="margin: 0 0 0.5rem 0; color: #666;"><strong>Data:</strong> ${new Date(evento.data).toLocaleString('pt-BR')}</p>
            ${evento.local ? `<p style="margin: 0 0 1rem 0; color: #666;"><strong>Local:</strong> ${evento.local}</p>` : ''}
            <small style="color: #999;">Criado em: ${new Date(evento.created_at).toLocaleString('pt-BR')}</small>
            <div style="margin-top: 1rem;">
                <button onclick="editarEvento(${evento.id})" class="btn-editar-cargo" style="margin-right: 0.5rem;">✏️ Editar</button>
                <button onclick="excluirEvento(${evento.id})" class="btn-delete">🗑️ Excluir</button>
            </div>
        </div>`;
}

function mostrarFormEvento(evento = null) {
    const form = document.getElementById('formEvento');
    const title = document.getElementById('formEventoTitle');
    const id = document.getElementById('eventoId');
    const titulo = document.getElementById('eventoTitulo');
    const data = document.getElementById('eventoData');
    const local = document.getElementById('eventoLocal');

    if (evento) {
        title.textContent = 'Editar Evento';
        id.value = evento.id;
        titulo.value = evento.titulo;
        data.value = new Date(evento.data).toISOString().slice(0, 16);
        local.value = evento.local || '';
    } else {
        title.textContent = 'Novo Evento';
        id.value = '';
        titulo.value = '';
        data.value = '';
        local.value = '';
    }

    form.style.display = 'block';
}

function ocultarFormEvento() {
    document.getElementById('formEvento').style.display = 'none';
}

async function salvarEvento() {
    const id = document.getElementById('eventoId').value;
    const titulo = document.getElementById('eventoTitulo').value;
    const data = document.getElementById('eventoData').value;
    const local = document.getElementById('eventoLocal').value;

    if (!titulo || !data) {
        mostrarToast('❌ Título e data são obrigatórios', 'error');
        return;
    }

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/admin/eventos/${id}` : '/api/admin/eventos';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-admin-token': 'maanain2026'
            },
            body: JSON.stringify({ titulo, data, local })
        });

        if (!response.ok) throw new Error('Erro ao salvar evento');

        mostrarToast(`✅ Evento ${id ? 'atualizado' : 'criado'} com sucesso!`, 'success');
        ocultarFormEvento();
        carregarEventos();
    } catch (error) {
        console.error('Erro ao salvar evento:', error);
        mostrarToast('❌ Erro ao salvar evento', 'error');
    }
}

async function editarEvento(id) {
    try {
        const response = await fetch(`/api/admin/eventos`, {
            headers: { 'x-admin-token': 'maanain2026' }
        });
        const eventos = await response.json();
        const evento = eventos.find(e => e.id == id);
        if (evento) mostrarFormEvento(evento);
    } catch (error) {
        console.error('Erro ao carregar evento:', error);
        mostrarToast('❌ Erro ao carregar evento', 'error');
    }
}

async function excluirEvento(id) {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;

    try {
        const response = await fetch(`/api/admin/eventos/${id}`, {
            method: 'DELETE',
            headers: { 'x-admin-token': 'maanain2026' }
        });

        if (!response.ok) throw new Error('Erro ao excluir evento');

        mostrarToast('🗑️ Evento excluído!', 'success');
        carregarEventos();
    } catch (error) {
        console.error('Erro ao excluir evento:', error);
        mostrarToast('❌ Erro ao excluir evento', 'error');
    }
}

// Carregar conteúdo quando navegar para as seções
document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', function(e) {
        const section = this.dataset.section;
        if (section === 'noticias') {
            setTimeout(carregarNoticias, 100);
        } else if (section === 'eventos') {
            setTimeout(carregarEventos, 100);
        }
    });
});

function mostrarToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.background = type === 'success' ? '#28a745' : '#dc3545';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}