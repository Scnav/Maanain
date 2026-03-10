// SISTEMA DE TRACKING DE TEMPO DE VIDEO - v3 - 2026-03-10
// Correção: agora o tempo é acumulado corretamente

let allVideos = [];
let currentPdfPath = '';
const cores = ['from-emerald-900/50 to-cyan-900/30', 'from-cyan-900/50 to-blue-900/30', 'from-purple-900/50 to-pink-900/30', 'from-amber-900/50 to-orange-900/30'];

// Inicializar partículas
function createParticles() {
    const particles = document.getElementById('particles');
    for(let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 8 + 's';
        particle.style.animationDuration = (Math.random() * 4 + 6) + 's';
        particles.appendChild(particle);
    }
}
createParticles();

// Carregar vídeos
async function loadVideos() {
    console.log('[DEBUG] Carregando vídeos...');
    try {
        const response = await fetch('/api/aulas');
        allVideos = await response.json();
        console.log('[DEBUG] Vídeos carregados:', allVideos.length);
        
        // Atualizar contadores
        document.getElementById('count-all').textContent = allVideos.length;
        document.getElementById('count-estudos').textContent = allVideos.filter(v => v.categoria === 'estudos').length;
        document.getElementById('count-pregcacoes').textContent = allVideos.filter(v => v.categoria === 'pregcacoes').length;
        document.getElementById('count-jovens').textContent = allVideos.filter(v => v.categoria === 'jovens').length;
        
        renderVideos(allVideos);
    } catch (error) {
        console.error('[DEBUG] Erro ao carregar:', error);
    }
}

// Renderizar vídeos
function renderVideos(videos) {
    const grid = document.getElementById('grid-aulas');
    if (videos.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12"><i class="fas fa-video-slash text-4xl text-gray-600 mb-4"></i><p class="text-gray-400">Nenhuma aula encontrada.</p></div>';
        return;
    }
    
    grid.innerHTML = videos.map((video, index) => {
        const videoId = extractVideoId(video.video_url);
        const thumbnail = video.thumbnail || 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg';
        const cor = cores[index % cores.length];
        const catBadge = getCatBadge(video.categoria);
        
        return `
            <div class="video-card glass rounded-2xl overflow-hidden cursor-pointer" onclick="showVideoById(${video.id})">
                <div class="relative h-44 overflow-hidden">
                    <img src="${thumbnail}" alt="${video.titulo}" class="w-full h-full object-cover transition-transform duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
                    <div class="play-overlay">
                        <div class="play-btn">
                            <i class="fas fa-play text-white text-xl ml-1"></i>
                        </div>
                    </div>
                    <div class="absolute top-3 right-3 glass px-2 py-1 rounded-lg text-xs font-bold">
                        <i class="fas fa-clock mr-1"></i>${video.duracao || '00:00'}
                    </div>
                    ${catBadge}
                </div>
                <div class="p-4">
                    <h3 class="font-bold text-sm line-clamp-2 mb-2">${video.titulo}</h3>
                    <div class="flex items-center text-xs text-gray-400">
                        <span>${video.autor || 'MAANAIM'}</span>
                        <span class="mx-2">•</span>
                        <span>${video.visualizacoes || 0} visualizações</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getCatBadge(categoria) {
    const badges = {
        'estudos': '<div class="absolute top-3 left-3 cat-badge-estudos px-2 py-1 rounded-lg text-xs font-bold">📖 Estudos</div>',
        'pregcacoes': '<div class="absolute top-3 left-3 cat-badge-pregcacoes px-2 py-1 rounded-lg text-xs font-bold">🎤 Pregação</div>',
        'cursos': '<div class="absolute top-3 left-3 cat-badge-cursos px-2 py-1 rounded-lg text-xs font-bold">🎓 Curso</div>',
        'jovens': '<div class="absolute top-3 left-3 cat-badge-jovens px-2 py-1 rounded-lg text-xs font-bold">🔥 Juventude</div>'
    };
    return badges[categoria] || '';
}

function extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : '';
}

// ============================================
// SISTEMA DE TRACKING DE TEMPO DE VIDEO
// ============================================

let currentVideoId = null;
let currentAulaId = null;
let watchStartTime = null;
let watchTimer = null;
let currentSessionTime = 0; // Tempo da sessão atual (desde o último start)
let totalWatchTime = 0; // Tempo total acumulado

console.log('[DEBUG TEMPO] aulas.js carregado - iniciando tracking!');

// Variáveis para o player YouTube
var player;

// Carregar API do YouTube
var tag = document.createElement('script');
tag.src = 'https://www.youtube.com/iframe_api';
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// Listener para mensagens do YouTube (funciona com iframe direto)
window.addEventListener('message', function(event) {
    // Verificar se a mensagem vem do YouTube
    if (!event.data || typeof event.data !== 'string') return;
    
    try {
        var data = JSON.parse(event.data);
        // playerState: 1=playing, 2=paused, 0=ended, 3=buffering
        if (data.event === 'infoDelivery' && data.info && data.info.playerState !== undefined) {
            console.log('[DEBUG TEMPO] Estado do player:', data.info.playerState);
            if (data.info.playerState === 1) {
                startWatchTimer();
            } else if (data.info.playerState === 2 || data.info.playerState === 0) {
                stopWatchTimer();
            }
        }
    } catch(e) {
        // Não é JSON válido
    }
});

// SOLUÇÃO: Usar MutationObserver para detectar quando o src do iframe muda
var videoIframe = document.getElementById('mainVideo');
var lastSrc = '';

var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
            var newSrc = videoIframe.src;
            if (newSrc && newSrc !== lastSrc && newSrc.includes('youtube.com/embed')) {
                console.log('[DEBUG TEMPO] Novo vídeo detectado no iframe!');
                lastSrc = newSrc;
                // Iniciar timer após 2 segundos
                setTimeout(function() {
                    if (currentAulaId) {
                        console.log('[DEBUG TEMPO] Vídeo carregado, iniciando timer automaticamente');
                        startWatchTimer();
                    }
                }, 2000);
            }
        }
    });
});

observer.observe(videoIframe, { 
    attributes: true, 
    attributeFilter: ['src'] 
});

// Também detectar quando a página fica visível/invisível
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('[DEBUG TEMPO] Página oculta - parando timer');
        stopWatchTimer();
    } else if (currentAulaId && videoIframe.src && videoIframe.src.includes('youtube.com/embed')) {
        console.log('[DEBUG TEMPO] Página visível - iniciando timer');
        startWatchTimer();
    }
});

function onYouTubeIframeAPIReady() {
    console.log('[DEBUG TEMPO] YouTube API Ready, criando player...');
    player = new YT.Player('mainVideo', {
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
    console.log('[DEBUG TEMPO] Player criado!');
}

function onPlayerStateChange(event) {
    console.log('[DEBUG TEMPO] Estado do player mudou:', event.data);
    // YT.PlayerState.PLAYING = 1
    if (event.data === 1) {
        startWatchTimer();
    } else if (event.data === 2 || event.data === 0) {
        // PAUSED = 2, ENDED = 0
        stopWatchTimer();
    }
}

function startWatchTimer() {
    if (watchTimer) return; // Já está contando
    console.log('[DEBUG TEMPO] Timer iniciado!');
    watchStartTime = Date.now();
    currentSessionTime = 0; // Resetar tempo da sessão
    watchTimer = setInterval(function() {
        // Calcular tempo da sessão atual
        currentSessionTime = Math.floor((Date.now() - watchStartTime) / 1000);
        // Tempo total = tempo anterior + tempo da sessão atual
        totalWatchTime = totalWatchTime + 1;
        
        // Enviar tempo a cada 10 segundos
        if (totalWatchTime > 0 && totalWatchTime % 10 === 0) {
            sendWatchTime();
        }
    }, 1000);
}

function stopWatchTimer() {
    if (watchTimer) {
        clearInterval(watchTimer);
        watchTimer = null;
    }
    if (totalWatchTime > 0) {
        sendWatchTime();
    }
}

async function sendWatchTime() {
    if (!currentAulaId || totalWatchTime < 1) return;
    
    console.log('[DEBUG TEMPO] Enviando tempo:', totalWatchTime, 'para aula:', currentAulaId);
    
    try {
        // Buscar token JWT do admin ou usuário logado
        const adminToken = localStorage.getItem('maanaim_admin_token');
        const userData = localStorage.getItem('maanaim_user');
        let token = adminToken;
        
        // Se não tem token admin, mas tem usuário logado, tenta usar
        if (!token && userData) {
            try {
                const user = JSON.parse(userData);
                // Para usuários, precisamos gerar um token JWT ou usar o IP
                // Por agora, we'll send without auth (o backend usa IP)
                token = null;
            } catch(e) {
                token = null;
            }
        }
        
        const response = await fetch('/api/aulas/' + currentAulaId + '/tempo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? 'Bearer ' + token : ''
            },
            body: JSON.stringify({
                tempo_assistido: totalWatchTime
            })
        });
        
        if (!response.ok) {
            console.log('Tempo enviado (IP registrado)');
        }
    } catch (e) {
        console.log('Erro ao enviar tempo:', e);
    }
}

function showVideoById(id) {
    // Resetar timer
    stopWatchTimer();
    currentSessionTime = 0;
    totalWatchTime = 0;
    
    const video = allVideos.find(v => v.id === id);
    if (video) showVideo(video);
}

function showVideo(video) {
    currentPdfPath = video.pdf_path || '';
    currentAulaId = video.id;
    currentVideoId = extractVideoId(video.video_url);
    
    // Usar API do YouTube - incluir origin para postMessage funcionar
    // Usar http://localhost:3000 diretamente pois o servidor é HTTP
    var videoUrl = 'https://www.youtube.com/embed/' + currentVideoId + '?rel=0&enablejsapi=1&origin=http://localhost:3000';
    document.getElementById('mainVideo').src = videoUrl;
    document.getElementById('mainVideoTitle').textContent = video.titulo;
    document.getElementById('mainVideoAuthor').innerHTML = '<i class="fas fa-user mr-1"></i> ' + (video.autor || 'MAANAIM');
    document.getElementById('mainVideoViews').textContent = (video.visualizacoes || 0) + ' visualizações';
    
    // Descrição
    const descContainer = document.getElementById('mainVideoDesc');
    if (video.descricao) {
        descContainer.innerHTML = '<strong class="text-emerald-400">Descrição:</strong><br>' + parseContentImages(video.descricao);
        descContainer.style.display = 'block';
    } else {
        descContainer.style.display = 'none';
    }
    
    // PDF
    const pdfContainer = document.getElementById('mainVideoPdf');
    pdfContainer.style.display = video.pdf_path ? 'block' : 'none';
    
    incrementViews(video.id);
    showPage('player');
}

function showPage(page) {
    document.getElementById('page-inicio').style.display = page === 'inicio' ? 'block' : 'none';
    document.getElementById('page-player').style.display = page === 'player' ? 'block' : 'none';
    
    if (page === 'inicio') {
        document.getElementById('mainVideo').src = '';
        stopWatchTimer(); // Parar o timer quando sair do player
        // NÃO resetar totalWatchTime aqui - o usuário pode voltar ao vídeo
    }
}

function showCategoria(categoria) {
    // Atualizar botões
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.cat === categoria) btn.classList.add('active');
    });
    
    // Atualizar título
    const titulos = {
        'all': 'Todas as Aulas',
        'estudos': '📖 Estudos Bíblicos',
        'pregcacoes': '🎤 Pregações',
        'cursos': '🎓 Cursos',
        'jovens': '🔥 Juventude'
    };
    document.getElementById('categoria-titulo').innerHTML = '<i class="fas fa-fire text-emerald-400 mr-2"></i>' + (titulos[categoria] || categoria);
    
    // Filtrar vídeos
    const filtrados = categoria === 'all' ? allVideos : allVideos.filter(v => v.categoria === categoria);
    renderVideos(filtrados);
}

async function incrementViews(id) {
    console.log('[AULAS] incrementViews chamado para ID:', id);
    try {
        // Verificar se há usuário logado
        let usuarioId = null;
        try {
            const userFromStorage = localStorage.getItem('maanaim_user');
            console.log('[AULAS] localStorage maanaim_user:', userFromStorage);
            if (userFromStorage && userFromStorage !== 'null') {
                const usuarioLogado = JSON.parse(userFromStorage);
                if (usuarioLogado && usuarioLogado.id) {
                    usuarioId = usuarioLogado.id;
                    console.log('[AULAS] Usuário logado ID:', usuarioId);
                }
            }
        } catch (e) {
            console.log('[AULAS] Erro ao ler usuário do localStorage:', e);
        }
        
        console.log('[AULAS] Enviando requisição para /api/aulas/' + id + '/views');
        await fetch('/api/aulas/' + id + '/views', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ usuario_id: usuarioId })
        }).then(response => {
            console.log('[AULAS] Response status:', response.status);
            return response.json();
        }).then(data => {
            console.log('[AULAS] Visualização registrada:', data);
        }).catch(err => {
            console.error('[AULAS] Erro ao registrar visualização:', err);
        });
    } catch (e) {
        console.error('Erro ao incrementar visualizações:', e);
    }
}

function openPdfViewer() {
    const modal = document.getElementById('pdfModal');
    const embed = document.getElementById('pdfModalEmbed');
    if (modal && embed && currentPdfPath) {
        embed.src = currentPdfPath;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closePdfViewer(event) {
    if (event.target.id === 'pdfModal') {
        const modal = document.getElementById('pdfModal');
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Função para remover acentos
function normalizeText(text) {
    if (!text) return '';
    return text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// Busca
document.getElementById('searchInput').addEventListener('input', function(e) {
    const termo = normalizeText(e.target.value);
    const filtrados = allVideos.filter(v => 
        normalizeText(v.titulo).includes(termo) || 
        (v.descricao && normalizeText(v.descricao).includes(termo))
    );
    renderVideos(filtrados);
});

// Carregar ao iniciar
loadVideos();
