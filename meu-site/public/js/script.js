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
                    // Forçar recarregamento completo para atualizar o header
                    window.location.href = 'index.html';
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

    // Carregar cultos (se estiver na página de programação)
    if (document.getElementById('cultosContainer')) {
        carregarCultos();
    }

    // Carregar conteúdos da página inicial (se estiver na página inicial)
    if (document.getElementById('heroTitle')) {
        carregarConteudosPaginaInicial();
        carregarMinisterios();
    }

    // Carregar conteúdos da bíblía (mensagens)
    if (document.getElementById('mensagensContainer')) {
        carregarMensagensBiblia();
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
                        <button onclick="abrirInscricao(${evento.id}, '${evento.titulo.replace(/'/g, "\\'")}')" style="background: var(--verde-principal); color: white; border: none; padding: 0.8rem 1.5rem; border-radius: 8px; cursor: pointer; margin-top: 1rem;">📝 Inscrever-se</button>
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

// Carregar conteúdos da página inicial
async function carregarConteudosPaginaInicial() {
    try {
        const response = await fetch('/api/page-content');
        if (!response.ok) throw new Error('Erro ao carregar conteúdos');

        const conteudos = await response.json();

        // Atualizar Hero
        const heroTitle = document.getElementById('heroTitle');
        const heroSubtitle = document.getElementById('heroSubtitle');
        if (heroTitle && conteudos.hero?.title) heroTitle.textContent = conteudos.hero.title;
        if (heroSubtitle && conteudos.hero?.content) heroSubtitle.textContent = conteudos.hero.content;

        // Atualizar Sobre
        const sobreTitle = document.getElementById('sobreTitle');
        const sobreContent = document.getElementById('sobreContent');
        if (sobreTitle && conteudos.sobre?.title) sobreTitle.textContent = conteudos.sobre.title;
        if (sobreContent && conteudos.sobre?.content) sobreContent.textContent = conteudos.sobre.content;

        // Atualizar Mensagem
        const mensagemTitle = document.getElementById('mensagemTitle');
        const mensagemContent = document.getElementById('mensagemContent');
        if (mensagemTitle && conteudos.mensagem?.title) mensagemTitle.textContent = conteudos.mensagem.title;
        if (mensagemContent && conteudos.mensagem?.content) mensagemContent.textContent = conteudos.mensagem.content;

        // Atualizar Título dos Ministérios
        const ministeriosTitle = document.getElementById('ministeriosTitle');
        if (ministeriosTitle && conteudos.ministerios?.title) ministeriosTitle.textContent = conteudos.ministerios.title;

    } catch (error) {
        console.error('Erro ao carregar conteúdos da página inicial:', error);
        // Mantém o conteúdo padrão em caso de erro
    }
}

// Carregar ministérios dinamicamente
async function carregarMinisterios() {
    try {
        const response = await fetch('/api/ministerios');
        if (!response.ok) throw new Error('Erro ao carregar ministérios');

        const ministerios = await response.json();
        const container = document.getElementById('ministeriosContainer');

        if (ministerios.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Nenhum ministry disponível.</p>';
            return;
        }

        container.innerHTML = ministerios.map(ministerio => `
            <div class="ministerio">
                <div class="ministerio-icone"><i class="${ministerio.icone || 'fas fa-church'}"></i></div>
                <h4>${ministerio.titulo}</h4>
                <p>${ministerio.descricao || ''}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar ministérios:', error);
        document.getElementById('ministeriosContainer').innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Erro ao carregar ministérios.</p>';
    }
}

// Carregar cultos semanais dinamicamente
async function carregarCultos() {
    try {
        const response = await fetch('/api/cultos');
        if (!response.ok) throw new Error('Erro ao carregar cultos');

        const cultos = await response.json();
        const container = document.getElementById('cultosContainer');

        if (!container) return;

        if (cultos.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Nenhum culto disponível.</p>';
            return;
        }

        container.innerHTML = cultos.map(culto => `
            <div class="evento-card" style="background: white; border-radius: 20px; padding: 2.5rem; box-shadow: var(--sombra);">
                <div style="font-size: 3rem; color: var(--dourado); margin-bottom: 1rem;">
                    <i class="fas fa-music"></i>
                </div>
                <h4>${culto.titulo}</h4>
                <p style="font-size: 1.2rem; font-weight: 600; color: var(--verde-principal); margin-bottom: 1rem;">
                    ${culto.horario}
                </p>
                <p>${culto.local || 'Local a definir'}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar cultos:', error);
        const container = document.getElementById('cultosContainer');
        if (container) {
            container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Erro ao carregar cultos.</p>';
        }
    }
}

// Carregar mensagens na página da bíblía
async function carregarMensagensBiblia() {
    try {
        const response = await fetch('/api/page-content');
        const conteudos = await response.json();
        
        const container = document.getElementById('mensagensContainer');
        if (!container) return;
        
        // Encontrar conteúdo de mensagem
        const msg = conteudos.find(c => c.section === 'mensagem');
        
        // Criar cards de mensagens
        const cards = [
            {
                icon: 'fa-book-bible',
                titulo: 'Devocional Diário',
                descricao: 'Leitura e reflexão do dia para começar bem sua jornada espiritual.'
            },
            {
                icon: 'fa-graduation-cap',
                titulo: 'Estudos Semanais',
                descricao: 'Prepare-se para a Escola Bíblica Dominical com nossos estudos.'
            },
            {
                icon: 'fa-podcast',
                titulo: msg?.title || 'Mensagens',
                descricao: msg?.content || 'Ouvi ou leia as pregações dos últimos domingos.',
                link: msg?.link || null
            }
        ];
        
        container.innerHTML = cards.map(card => `
            <div style="background: white; border-radius: 20px; padding: 2rem; box-shadow: var(--sombra); text-align: center;">
                <i class="fas ${card.icon}" style="font-size: 3rem; color: var(--verde-principal); margin-bottom: 1rem;"></i>
                <h3>${card.titulo}</h3>
                <p>${card.descricao}</p>
                ${card.link ? `<a href="${card.link}" target="_blank" style="display: inline-block; margin-top: 1rem; padding: 0.8rem 1.5rem; background: var(--verde-principal); color: white; border-radius: 8px; text-decoration: none;"><i class="fas fa-play"></i> Assistir</a>` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
    }
}

// Funções para inscrição em eventos
function abrirInscricao(eventoId, eventoTitulo) {
    document.getElementById('eventoId').value = eventoId;
    document.getElementById('eventoTitulo').textContent = eventoTitulo;
    document.getElementById('modalInscricao').style.display = 'block';
}

function fecharModal() {
    document.getElementById('modalInscricao').style.display = 'none';
    document.getElementById('formInscricao').reset();
}

// Enviar inscrição
const formInscricao = document.getElementById('formInscricao');
if (formInscricao) {
    formInscricao.addEventListener('submit', async (e) => {
        e.preventDefault();
        const evento_id = document.getElementById('eventoId').value;
        const nome = document.getElementById('inscritoNome').value;
        const email = document.getElementById('inscritoEmail').value;
        const telefone = document.getElementById('inscritoTelefone').value;

        try {
            const response = await fetch('/api/inscricoes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ evento_id, nome, email, telefone })
            });
            const data = await response.json();
            if (data.error) {
                alert('❌ ' + data.error);
            } else {
                alert('✅ ' + data.message);
                fecharModal();
            }
        } catch (err) {
            alert('❌ Erro ao fazer inscrição');
        }
    });
}
