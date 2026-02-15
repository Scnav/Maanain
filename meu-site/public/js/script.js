// VARIÁVEL GLOBAL para controle
window.MAANAIN_AUTH = { usuario: null, atualizarHeader: null };

// Variáveis globais para busca bíblica
let bibliaLivros = [];
let livroAtual = null;
let capituloAtual = null;
let buscaOffset = 0;
const buscaLimite = 10;
let termoBuscaAtual = '';

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
        carregarMensagensHome();
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
        // Buscar eventos especiais e cultos semanais em paralelo
        const [eventosResp, cultosResp] = await Promise.all([
            fetch('/api/eventos'),
            fetch('/api/cultos')
        ]);
        
        if (!eventosResp.ok || !cultosResp.ok) throw new Error('Erro ao carregar eventos');
        
        const eventos = await eventosResp.json();
        const cultos = await cultosResp.json();

        // Carregar eventos no index (resumo)
        const containerIndex = document.getElementById('eventosContainer');
        if (containerIndex) {
            let html = '';
            
            // Adicionar cultos semanais primeiro
            if (cultos.length > 0) {
                cultos.slice(0, 2).forEach(culto => {
                    html += `<p><strong>${culto.titulo}</strong><br>${culto.horario} - ${culto.local}</p>`;
                });
            }
            
            // Adicionar eventos especiais
            if (eventos.length > 0) {
                eventos.slice(0, 2).forEach(evento => {
                    html += `<p><strong>${evento.titulo}</strong><br>${new Date(evento.data).toLocaleDateString('pt-BR')} ${evento.local ? '- ' + evento.local : ''}</p>`;
                });
            }
            
            if (html === '') {
                containerIndex.innerHTML = '<p>Nenhum evento programado.</p>';
            } else {
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

// Carregar mensagens na página inicial
async function carregarMensagensHome() {
    try {
        const response = await fetch('/api/mensagens');
        const mensagens = await response.json();
        
        const container = document.getElementById('mensagensHomeContainer');
        if (!container) return;
        
        if (mensagens.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Nenhuma mensagem disponível.</p>';
            return;
        }
        
        container.innerHTML = mensagens.map(msg => `
            <div class="mensagens-card">
                <h4>${msg.titulo}</h4>
                <p>${msg.conteudo || 'Mensagem de video'}</p>
                ${msg.video_url ? `<a href="${msg.video_url}" target="_blank" style="display: inline-block; margin-top: 1rem; padding: 0.5rem 1rem; background: var(--verde-principal); color: white; border-radius: 5px; text-decoration: none;"><i class="fas fa-play"></i> Assistir</a>` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar mensagens:', error);
    }
}

// Carregar tópicos bíblicos na página bíblia
async function carregarTopicosBiblia() {
    console.log('Carregando tópicos bíblicos...');
    try {
        const response = await fetch('/api/topicos-biblia?_t=' + Date.now());
        const topicos = await response.json();
        console.log('Tópicos recebidos:', topicos);
        
        const container = document.getElementById('topicosBibliaContainer');
        if (!container) {
            console.error('Container não encontrado!');
            return;
        }
        
        if (topicos.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Nenhum tópico bíblico disponível.</p>';
            return;
        }
        
        // Debug detalhado
        console.log('Debug - Título 1:', topicos[0].titulo);
        console.log('Debug - Desc 1:', topicos[0].descricao);
        console.log('Debug - Conteúdo 1:', topicos[0].conteudo);
        console.log('Debug - Tem conteúdo?', topicos[0].hasOwnProperty('conteudo'));
        console.log('Debug - Tipo conteúdo:', typeof topicos[0].conteudo);
        
        container.innerHTML = `
            <div style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center;">
                ${topicos.map(topico => `
                    <div style="background: var(--verde-superclaro); border-radius: 12px; padding: 1rem 1.5rem; cursor: pointer; transition: all 0.3s; border: 2px solid transparent; min-width: 250px;" 
                         onclick="clicarTopico('${escapeHtml(topico.titulo)}', '${escapeHtml(topico.conteudo || '')}', '${escapeHtml(topico.categoria || '')}')"
                         onmouseover="this.style.borderColor='var(--verde-principal)';this.style.transform='translateY(-2px)'"
                         onmouseout="this.style.borderColor='transparent';this.style.transform='translateY(0)'">
                        <i class="${topico.icone || 'fas fa-book-bible'}" style="color: var(--verde-principal); margin-right: 0.5rem;"></i>
                        <strong>${topico.titulo}</strong>
                        ${topico.descricao ? `<div style="color: #666; font-size: 0.85rem; margin-top: 0.3rem;">${topico.descricao}</div>` : ''}
                        ${topico.conteudo ? `<div style="color: var(--verde-principal); font-size: 0.8rem; margin-top: 0.3rem; font-weight: bold;">📖 ${topico.conteudo}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Erro ao carregar tópicos bíblicos:', error);
    }
}

// Expor funções globalmente
window.carregarTopicosBiblia = carregarTopicosBiblia;
window.clicarTopico = clicarTopico;
window.carregarLivros = carregarLivros;
window.setupTabs = setupTabs;
window.setupBusca = setupBusca;
window.realizarBusca = realizarBusca;
window.irParaVerso = irParaVerso;
window.mudarPagina = mudarPagina;
window.carregarCapitulo = carregarCapitulo;

// Clique em tópico bíblico - navegar para a referência
function clicarTopico(titulo, conteudo, categoria) {
    if (!conteudo) {
        alert('Este tópico não tem conteúdo bíblico associado.');
        return;
    }
    
    // Se for categoria "leitura-diaria", ir para a aba de busca
    if (categoria === 'leitura-diaria') {
        // Ativar aba de busca
        document.querySelectorAll('.biblia-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.biblia-section').forEach(s => s.classList.remove('active'));
        document.querySelector('.biblia-tab[data-tab="busca"]').classList.add('active');
        document.getElementById('busca-section').classList.add('active');
        
        // Preencher e executar busca
        document.getElementById('buscaInput').value = conteudo;
        realizarBusca();
        return;
    }
    
    // Padrão: Ativar aba de leitura
    document.querySelectorAll('.biblia-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.biblia-section').forEach(s => s.classList.remove('active'));
    document.querySelector('.biblia-tab[data-tab="leitura"]').classList.add('active');
    document.getElementById('leitura-section').classList.add('active');
    
    // Preencher o campo de busca e executar
    document.getElementById('buscaInput').value = conteudo;
    realizarBusca();
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Realizar busca
async function realizarBusca() {
    const termo = document.getElementById('buscaInput').value.trim();
    if (termo.length < 2) {
        alert('Digite pelo menos 2 caracteres para buscar');
        return;
    }
    
    // Verificar se é uma referência bíblica
    const refMatch = termo.match(/^(\w+)\s+(\d+)(?:[:\s](\d+))?$/i);
    if (refMatch) {
        const [, livroAbrev, capitulo, versiculo] = refMatch;
        if (versiculo) {
            await buscarPorVersiculo(livroAbrev, parseInt(capitulo), parseInt(versiculo));
        } else {
            await buscarPorCapitulo(livroAbrev, parseInt(capitulo));
        }
        return;
    }
    
    termoBuscaAtual = termo;
    buscaOffset = 0;
    await executarBusca(termo, 0);
}

// Buscar por versículo específico
async function buscarPorVersiculo(livroAbrev, capitulo, versiculo) {
    const resultsContainer = document.getElementById('buscaResults');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = '<div class="biblia-loading"><i class="fas fa-spinner"></i><p>Buscando...</p></div>';
    
    try {
        const livroResponse = await fetch(`/api/biblia/livro/${livroAbrev}`);
        if (!livroResponse.ok) {
            resultsContainer.innerHTML = '<p style="text-align: center; color: #666;">Livro não encontrado.</p>';
            return;
        }
        const livroData = await livroResponse.json();
        
        const capResponse = await fetch(`/api/biblia/${livroData.abreviacao}/${capitulo}`);
        if (!capResponse.ok) {
            resultsContainer.innerHTML = '<p style="text-align: center; color: #666;">Capítulo não encontrado.</p>';
            return;
        }
        const capData = await capResponse.json();
        
        if (versiculo > capData.versos.length || versiculo < 1) {
            resultsContainer.innerHTML = `<p style="text-align: center; color: #666;">Versículo ${versiculo} não encontrado no capítulo ${capitulo}. O capítulo tem ${capData.versos.length} versículos.</p>`;
            return;
        }
        
        const textoVersiculo = capData.versos[versiculo - 1];
        
        resultsContainer.innerHTML = `
            <div class="biblia-result-item" onclick="irParaVerso('${livroData.abreviacao}', ${capitulo}, ${versiculo})">
                <div class="reference">${livroData.nome} ${capitulo}:${versiculo}</div>
                <div class="texto-destaque">${textoVersiculo}</div>
            </div>
        `;
        document.getElementById('buscaPagination').innerHTML = '';
        
    } catch (error) {
        console.error('Erro ao buscar versículo:', error);
        resultsContainer.innerHTML = '<p style="text-align: center; color: #666;">Erro ao buscar. Tente novamente.</p>';
    }
}

// Buscar por capítulo inteiro
async function buscarPorCapitulo(livroAbrev, capitulo) {
    const resultsContainer = document.getElementById('buscaResults');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = '<div class="biblia-loading"><i class="fas fa-spinner"></i><p>Buscando...</p></div>';
    
    try {
        const livroResponse = await fetch(`/api/biblia/livro/${livroAbrev}`);
        if (!livroResponse.ok) {
            resultsContainer.innerHTML = '<p style="text-align: center; color: #666;">Livro não encontrado.</p>';
            return;
        }
        const livroData = await livroResponse.json();
        
        const capResponse = await fetch(`/api/biblia/${livroData.abreviacao}/${capitulo}`);
        if (!capResponse.ok) {
            resultsContainer.innerHTML = '<p style="text-align: center; color: #666;">Capítulo não encontrado.</p>';
            return;
        }
        const capData = await capResponse.json();
        
        let html = `<h3 style="text-align: center; margin-bottom: 1rem;">${livroData.nome} ${capitulo}</h3>`;
        html += capData.versos.map((verso, index) => `
            <div class="biblia-result-item" onclick="irParaVerso('${livroData.abreviacao}', ${capitulo}, ${index + 1})">
                <div class="reference">${index + 1}</div>
                <div class="texto-destaque">${verso}</div>
            </div>
        `).join('');
        
        resultsContainer.innerHTML = html;
        document.getElementById('buscaPagination').innerHTML = '';
        
    } catch (error) {
        console.error('Erro ao buscar capítulo:', error);
        resultsContainer.innerHTML = '<p style="text-align: center; color: #666;">Erro ao buscar. Tente novamente.</p>';
    }
}

// Executar busca com paginação
async function executarBusca(termo, offset) {
    const resultsContainer = document.getElementById('buscaResults');
    const paginationContainer = document.getElementById('buscaPagination');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = '<div class="biblia-loading"><i class="fas fa-spinner"></i><p>Buscando...</p></div>';
    
    try {
        const url = `/api/biblia/busca?q=${encodeURIComponent(termo)}&limite=${buscaLimite}&offset=${offset}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
            resultsContainer.innerHTML = `<p style="text-align: center; color: #666;">Erro: ${data.error}</p>`;
            return;
        }
        
        if (data.resultados.length === 0) {
            resultsContainer.innerHTML = '<p style="text-align: center; color: #666;">Nenhum resultado encontrado.</p>';
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }
        
        const termoLower = termo.toLowerCase();
        
        let html = data.resultados.map(r => {
            const textoDestaque = r.texto.replace(
                new RegExp(`(${termo})`, 'gi'), 
                '<mark>$1</mark>'
            );
            return `
                <div class="biblia-result-item" onclick="irParaVerso('${r.abreviacao}', ${r.capitulo}, ${r.verso})">
                    <div class="reference">${r.livro} ${r.capitulo}:${r.verso}</div>
                    <div class="texto-destaque">${textoDestaque}</div>
                </div>
            `;
        }).join('');
        
        resultsContainer.innerHTML = html;
        
        // Paginação
        const totalPaginas = Math.ceil(data.total / buscaLimite);
        const paginaAtual = Math.floor(offset / buscaLimite) + 1;
        
        let paginationHtml = '';
        
        if (paginaAtual > 1) {
            paginationHtml += `<button onclick="mudarPagina(${offset - buscaLimite})">← Anterior</button>`;
        }
        
        for (let i = Math.max(1, paginaAtual - 2); i <= Math.min(totalPaginas, paginaAtual + 2); i++) {
            paginationHtml += `<button onclick="mudarPagina(${(i - 1) * buscaLimite})" class="${i === paginaAtual ? 'active' : ''}">${i}</button>`;
        }
        
        if (paginaAtual < totalPaginas) {
            paginationHtml += `<button onclick="mudarPagina(${offset + buscaLimite})">Próxima →</button>`;
        }
        
        if (paginationContainer) paginationContainer.innerHTML = paginationHtml;
        
    } catch (error) {
        console.error('Erro ao buscar:', error);
        resultsContainer.innerHTML = '<p style="text-align: center; color: #666;">Erro ao buscar. Tente novamente.</p>';
    }
}

// Ir para versículo
function irParaVerso(livroAbrev, capitulo, versiculo) {
    document.querySelectorAll('.biblia-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.biblia-section').forEach(s => s.classList.remove('active'));
    document.querySelector('.biblia-tab[data-tab="leitura"]').classList.add('active');
    document.getElementById('leitura-section').classList.add('active');
    
    carregarCapitulo(livroAbrev, capitulo).then(() => {
        setTimeout(() => {
            const versos = document.querySelectorAll('.biblia-content .verso');
            if (versos[versiculo - 1]) {
                versos[versiculo - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
                versos[versiculo - 1].style.background = 'var(--verde-superclaro)';
            }
        }, 500);
    });
}

// Carregar um capítulo específico
async function carregarCapitulo(livroAbrev, capitulo) {
    try {
        const response = await fetch(`/api/biblia/${livroAbrev}/${capitulo}`);
        const data = await response.json();
        
        capituloAtual = capitulo;
        
        // Salvar última posição
        localStorage.setItem('biblia_ultima_leitura', JSON.stringify({
            livro: livroAbrev,
            capitulo: capitulo
        }));
        
        // Renderizar conteúdo
        const content = document.getElementById('bibliaContent');
        if (!content) return;
        
        let html = `<h3 style="color: var(--verde-principal); margin-bottom: 1.5rem;">${data.livro} ${data.capitulo}</h3>`;
        
        data.versos.forEach((verso, index) => {
            html += `<div class="verso"><span class="verso-numero">${index + 1}</span>${verso}</div>`;
        });
        
        content.innerHTML = html;
        
        // Atualizar botões de navegação
        const btnAnterior = document.getElementById('capituloAnterior');
        const btnProximo = document.getElementById('proximoCapitulo');
        
        if (btnAnterior) {
            btnAnterior.disabled = capitulo <= 1;
            btnAnterior.onclick = () => {
                if (capitulo > 1) {
                    document.getElementById('capituloSelect').value = capitulo - 1;
                    carregarCapitulo(livroAbrev, capitulo - 1);
                }
            };
        }
        
        if (btnProximo && livroAtual) {
            btnProximo.disabled = capitulo >= livroAtual.capitulos.length;
            btnProximo.onclick = () => {
                if (capitulo < livroAtual.capitulos.length) {
                    document.getElementById('capituloSelect').value = parseInt(capitulo) + 1;
                    carregarCapitulo(livroAbrev, parseInt(capitulo) + 1);
                }
            };
        }
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('Erro ao carregar capítulo:', error);
    }
}

// Carregar lista de livros
async function carregarLivros() {
    try {
        const response = await fetch('/api/biblia/livros');
        bibliaLivros = await response.json();
        
        const select = document.getElementById('livroSelect');
        if (!select) return;
        
        bibliaLivros.forEach(livro => {
            const option = document.createElement('option');
            option.value = livro.abreviacao;
            option.textContent = livro.nome;
            select.appendChild(option);
        });
        
        // Event listener para mudança de livro
        select.addEventListener('change', async function() {
            if (this.value) {
                await carregarCapitulos(this.value);
                document.getElementById('capituloSelect').disabled = false;
            } else {
                document.getElementById('capituloSelect').disabled = true;
            }
        });
    } catch (error) {
        console.error('Erro ao carregar livros:', error);
    }
}

// Setup tabs
function setupTabs() {
    document.querySelectorAll('.biblia-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // Atualiza tabs
            document.querySelectorAll('.biblia-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Atualiza seções
            document.querySelectorAll('.biblia-section').forEach(s => s.classList.remove('active'));
            document.getElementById(`${tabId}-section`).classList.add('active');
            
            // Resetar tudo ao mudar de aba
            if (tabId === 'busca') {
                document.getElementById('buscaInput').value = '';
                document.getElementById('buscaResults').innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Digite pelo menos 2 caracteres para buscar na bíblia.</p>';
                document.getElementById('buscaPagination').innerHTML = '';
            } else if (tabId === 'leitura') {
                // Resetar selects da leitura
                document.getElementById('livroSelect').value = '';
                document.getElementById('capituloSelect').value = '';
                document.getElementById('capituloSelect').disabled = true;
            }
        });
    });
}

// Setup busca
function setupBusca() {
    const input = document.getElementById('buscaInput');
    if (!input) return;
    
    const autocomplete = document.getElementById('autocompleteResults');
    let debounceTimer;

    // Autocomplete
    input.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            if (this.value.length >= 1) {
                try {
                    const response = await fetch(`/api/biblia/autocomplete?q=${encodeURIComponent(this.value)}`);
                    const results = await response.json();
                    
                    if (results.length > 0 && autocomplete) {
                        autocomplete.innerHTML = results.map(r => 
                            `<div class="autocomplete-item" data-tipo="livro" data-valor="${r.abreviacao}">
                                <strong>${r.nome}</strong> (${r.abreviacao})
                            </div>`
                        ).join('');
                        autocomplete.classList.add('show');
                        
                        // Event listeners para autocomplete
                        autocomplete.querySelectorAll('.autocomplete-item').forEach(item => {
                            item.addEventListener('click', function() {
                                input.value = this.dataset.valor;
                                autocomplete.classList.remove('show');
                                realizarBusca();
                            });
                        });
                    } else if (autocomplete) {
                        autocomplete.classList.remove('show');
                    }
                } catch (error) {
                    console.error('Erro no autocomplete:', error);
                }
            } else if (autocomplete) {
                autocomplete.classList.remove('show');
            }
        }, 300);
    });

    // Fechar autocomplete ao clicar fora
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.autocomplete-container') && autocomplete) {
            autocomplete.classList.remove('show');
        }
    });

    // Botão buscar
    const buscarBtn = document.getElementById('buscarBtn');
    if (buscarBtn) {
        buscarBtn.addEventListener('click', realizarBusca);
    }
    
    // Enter para buscar
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            realizarBusca();
        }
    });
}

// Carregar capítulos de um livro
async function carregarCapitulos(livroAbrev) {
    try {
        const response = await fetch(`/api/biblia/livro/${livroAbrev}`);
        const livro = await response.json();
        
        livroAtual = livro;
        
        const select = document.getElementById('capituloSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">Selecione o Capítulo</option>';
        
        livro.capitulos.forEach(cap => {
            const option = document.createElement('option');
            option.value = cap.numero;
            option.textContent = `Capítulo ${cap.numero}`;
            select.appendChild(option);
        });
        
        // Event listener para mudança de capítulo
        select.addEventListener('change', async function() {
            if (this.value) {
                await carregarCapitulo(livroAbrev, this.value);
            }
        });
    } catch (error) {
        console.error('Erro ao carregar capítulos:', error);
    }
}

// Mudar página
async function mudarPagina(newOffset) {
    buscaOffset = newOffset;
    await executarBusca(termoBuscaAtual, buscaOffset);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Realizar busca por referência bíblica
async function buscarPorReferencia(termo) {
    if (!termo || termo.length < 2) {
        return;
    }
    
    // Verificar se é uma referência (ex: genesis 1:1 ou genesis 1 4 ou gn 1:1)
    const refMatch = termo.match(/^(\w+)\s+(\d+)(?:[:\s](\d+))?$/i);
    if (refMatch) {
        const [, livroAbrev, capitulo, versiculo] = refMatch;
        try {
            if (versiculo) {
                // Buscar versículo específico
                const response = await fetch(`/api/biblia/${livroAbrev}/${capitulo}`);
                const data = await response.json();
                
                // Mostrar apenas o versículo específico
                const versoIndex = parseInt(versiculo) - 1;
                if (versoIndex >= 0 && versoIndex < data.versos.length) {
                    mostrarResultadoBusca([{
                        livro: data.livro,
                        capitulo: data.capitulo,
                        versiculo: versiculo,
                        texto: data.versos[versoIndex]
                    }], true);
                }
            } else {
                // Buscar capítulo inteiro - mostrar na aba de leitura
                await carregarCapitulo(livroAbrev, parseInt(capitulo));
            }
        } catch (error) {
            console.error('Erro ao buscar referência:', error);
        }
    } else {
        // Busca por texto
        buscaOffset = 0;
        termoBuscaAtual = termo;
        await realizarBusca();
    }
}

// Mostrar resultados da busca
function mostrarResultadoBusca(resultados, isSingle = false) {
    const resultsContainer = document.getElementById('buscaResults');
    if (!resultsContainer) return;
    
    if (isSingle) {
        const r = resultados[0];
        resultsContainer.innerHTML = `
            <div class="biblia-result-item" onclick="irParaVersiculo('${r.livro}', ${r.capitulo}, ${r.versiculo})">
                <div class="reference">${r.livro} ${r.capitulo}:${r.versiculo}</div>
                <div class="texto-destaque">${r.texto}</div>
            </div>
        `;
    }
}

// Ir para versículo específico
function irParaVersiculo(livro, capitulo, versiculo) {
    document.querySelectorAll('.biblia-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.biblia-section').forEach(s => s.classList.remove('active'));
    document.querySelector('.biblia-tab[data-tab="leitura"]').classList.add('active');
    document.getElementById('leitura-section').classList.add('active');
    
    carregarCapitulo(livro, capitulo).then(() => {
        // Scroll para o versículo
        setTimeout(() => {
            const versos = document.querySelectorAll('.biblia-content .verso');
            if (versos[versiculo - 1]) {
                versos[versiculo - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
                versos[versiculo - 1].style.background = 'var(--verde-superclaro)';
            }
        }, 500);
    });
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
