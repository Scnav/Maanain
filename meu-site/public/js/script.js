// VARIÁVEL GLOBAL para controle
window.MAANAIN_AUTH = { usuario: null, atualizarHeader: null };

document.addEventListener("DOMContentLoaded", () => {
    let usuarioLogado = null;

    // ✅ HEADER CORRIGIDO COM "Entrar" para Visitante
    function atualizarHeader() {
        const nav = document.querySelector('.nav');
        if (!nav) return;

        nav.innerHTML = ''; // Limpa tudo

        let abasVisiveis;
        if (usuarioLogado?.role === 'admin') {
            abasVisiveis = ['inicio', 'programacao', 'biblia', 'admin'];
        } else if (usuarioLogado?.role === 'frequentador') {
            abasVisiveis = ['inicio', 'programacao', 'biblia'];
        } else {
            // 👇 VISITANTE: Início | Programação | Entrar
            abasVisiveis = ['inicio', 'programacao', 'entrar'];
        }

        const links = {
            'inicio': { href: 'index.html', texto: 'Início' },
            'programacao': { href: 'programacao.html', texto: 'Programação' },
            'biblia': { href: 'biblia.html', texto: 'Bíblia' },
            'admin': { href: 'admin.html', texto: 'Admin' },
            'entrar': { href: 'login.html', texto: 'Entrar' }
        };

        abasVisiveis.forEach(aba => {
            if (links[aba]) {
                const link = document.createElement('a');
                link.href = links[aba].href;
                link.textContent = links[aba].texto;
                link.dataset.aba = aba;
                nav.appendChild(link);
            }
        });

        // Botão Sair (se logado)
        if (usuarioLogado) {
            const logoutBtn = document.createElement('a');
            logoutBtn.href = '#';
            logoutBtn.id = 'logout-link';
            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sair';
            logoutBtn.style.cssText = 'color: #ff6b6b !important; font-weight: 600;';
            logoutBtn.onclick = (e) => { e.preventDefault(); fazerLogout(); };
            nav.appendChild(logoutBtn);
        }
    }

    // Carrega usuário
    function carregarUsuario() {
        const userData = localStorage.getItem('maanain_user');
        usuarioLogado = userData ? JSON.parse(userData) : null;
        atualizarHeader();

        // Redireciona se já logado
        if (usuarioLogado && (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html'))) {
            window.location.href = 'index.html';
        }
    }

    // Logout
    function fazerLogout() {
        localStorage.removeItem('maanain_user');
        usuarioLogado = null;
        atualizarHeader();
        setTimeout(() => window.location.reload(), 100);
    }

    // LOGIN
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const body = Object.fromEntries(new FormData(loginForm).entries());

            fetch("http://localhost:3000/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            })
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    alert("❌ " + data.error);
                } else {
                    localStorage.setItem('maanain_user', JSON.stringify(data.user));
                    usuarioLogado = data.user;
                    atualizarHeader();
                    setTimeout(() => window.location.href = 'index.html', 500);
                }
            })
            .catch(err => alert("❌ " + err.message));
        });
    }

    // REGISTER
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const body = Object.fromEntries(new FormData(registerForm).entries());

            fetch("http://localhost:3000/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            })
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    alert("❌ " + data.error);
                } else {
                    alert("✅ Cadastro OK!");
                    window.location.href = 'login.html';
                }
            })
            .catch(err => alert("❌ " + err.message));
        });
    }

    // Multi-abas
    window.addEventListener('storage', (e) => {
        if (e.key === 'maanain_user') window.location.reload();
    });

    // Carregar notícias (se estiver na página inicial)
    if (document.getElementById('noticiasContainer')) {
        carregarNoticias();
    }

    // Carregar eventos (se estiver na página inicial ou programação)
    if (document.getElementById('eventosContainer') || document.getElementById('eventosEspeciaisContainer')) {
        carregarEventos();
    }

    // Inicializa
    carregarUsuario();
});

// Função para carregar notícias
async function carregarNoticias() {
    try {
        const response = await fetch('/api/noticias');
        if (!response.ok) throw new Error('Erro ao carregar notícias');

        const noticias = await response.json();
        const container = document.getElementById('noticiasContainer');

        if (noticias.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Nenhuma notícia disponível no momento.</p>';
            return;
        }

        container.innerHTML = noticias.map(noticia => `
            <div class="noticia-card">
                <h4>${noticia.titulo}</h4>
                <p>${noticia.conteudo.length > 150 ? noticia.conteudo.substring(0, 150) + '...' : noticia.conteudo}</p>
                <div class="noticia-data">${new Date(noticia.created_at).toLocaleDateString('pt-BR')}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar notícias:', error);
        document.getElementById('noticiasContainer').innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Erro ao carregar notícias.</p>';
    }
}

// Função para carregar eventos
async function carregarEventos() {
    try {
        const response = await fetch('/api/eventos');
        if (!response.ok) throw new Error('Erro ao carregar eventos');

        const eventos = await response.json();

        // Carregar eventos no index (resumo)
        const containerIndex = document.getElementById('eventosContainer');
        if (containerIndex) {
            if (eventos.length === 0) {
                containerIndex.innerHTML = '<p>Nenhum evento programado.</p>';
            } else {
                // Mantém o evento padrão e adiciona os dinâmicos
                let html = '<p><strong>Culto de Domingo</strong><br>09:00 - Salão Principal</p>';

                eventos.slice(0, 3).forEach(evento => {
                    html += `<p><strong>${evento.titulo}</strong><br>${new Date(evento.data).toLocaleDateString('pt-BR')} ${evento.local ? '- ' + evento.local : ''}</p>`;
                });

                containerIndex.innerHTML = html;
            }
        }

        // Carregar eventos na programação (detalhados)
        const containerProgramacao = document.getElementById('eventosEspeciaisContainer');
        if (containerProgramacao) {
            if (eventos.length === 0) {
                containerProgramacao.innerHTML = '<p style="text-align: center; color: #666; font-style: italic; grid-column: 1 / -1;">Nenhum evento especial programado.</p>';
            } else {
                containerProgramacao.innerHTML = eventos.map(evento => `
                    <div class="evento-card" style="background: white; border-radius: 20px; padding: 2.5rem; box-shadow: var(--sombra);">
                        <div style="font-size: 3rem; color: var(--dourado); margin-bottom: 1rem;">
                            <i class="fas fa-calendar-alt"></i>
                        </div>
                        <h4>${evento.titulo}</h4>
                        <p style="font-size: 1.2rem; font-weight: 600; color: var(--verde-principal); margin-bottom: 1rem;">
                            ${new Date(evento.data).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <p>${evento.local || 'Local a definir'}</p>
                    </div>
                `).join('');
            }
        }

    } catch (error) {
        console.error('Erro ao carregar eventos:', error);
        // Mantém o conteúdo padrão em caso de erro
        const containerIndex = document.getElementById('eventosContainer');
        if (containerIndex) {
            containerIndex.innerHTML = '<p>Erro ao carregar eventos.</p>';
        }
        const containerProgramacao = document.getElementById('eventosEspeciaisContainer');
        if (containerProgramacao) {
            containerProgramacao.innerHTML = '<p style="text-align: center; color: #666; font-style: italic; grid-column: 1 / -1;">Erro ao carregar eventos especiais.</p>';
        }
    }
}
