document.addEventListener("DOMContentLoaded", () => {
    // ========== SISTEMA DE ROLES ==========
    const ROLES = {
        VISITANTE: 'visitante',
        FREQUENTADOR: 'frequentador',
        MEMBRO: 'membro',
        CONSELHO: 'conselho',
        ADMIN: 'admin'
    };

    // CORREÇÃO: Nomes EXATOS das abas que aparecem no HTML
    const ABAS_POR_ROLE = {
        [ROLES.VISITANTE]: ['inicio', 'programacao'],
        [ROLES.FREQUENTADOR]: ['inicio', 'programacao', 'biblia'],
        [ROLES.MEMBRO]: ['inicio', 'programacao', 'biblia', 'membros'],
        [ROLES.CONSELHO]: ['inicio', 'programacao', 'biblia', 'membros', 'relatorios'],
        [ROLES.ADMIN]: ['inicio', 'programacao', 'biblia', 'membros', 'relatorios', 'admin']
    };

    let usuarioLogado = null;

    // Carrega usuário do localStorage
    function carregarUsuario() {
        const userData = localStorage.getItem('maanain_user');
        if (userData) {
            usuarioLogado = JSON.parse(userData);
            atualizarHeader();
            // 👇 REDIRECIONA PARA INÍCIO SE ACABOU DE LOGAR
            if (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html')) {
                window.location.href = 'index.html';
            }
        }
    }

    // CORREÇÃO: Header dinâmico COMPLETO
    function atualizarHeader() {
        const nav = document.querySelector('.nav');
        if (!nav) return;

        // Limpa links existentes
        nav.innerHTML = '';

        // Define abas baseado na role
        const abasVisiveis = usuarioLogado ? 
            ABAS_POR_ROLE[usuarioLogado.role] || ABAS_POR_ROLE[ROLES.VISITANTE] : 
            ABAS_POR_ROLE[ROLES.VISITANTE];

        // Cria links das abas permitidas
        const links = {
            'inicio': { href: 'index.html', texto: 'Início' },
            'programacao': { href: 'programacao.html', texto: 'Programação' },
            'biblia': { href: 'biblia.html', texto: 'Bíblia' },
            'membros': { href: 'membros.html', texto: 'Membros' },
            'relatorios': { href: 'relatorios.html', texto: 'Relatórios' },
            'admin': { href: 'admin.html', texto: 'Admin' }
        };

        abasVisiveis.forEach(aba => {
            if (links[aba]) {
                const link = document.createElement('a');
                link.href = links[aba].href;
                link.textContent = links[aba].texto;
                link.setAttribute('data-aba', aba);
                nav.appendChild(link);
            }
        });

        // 👇 BOTÃO SAIR (só se logado)
        if (usuarioLogado) {
            const logoutBtn = document.createElement('a');
            logoutBtn.href = '#';
            logoutBtn.id = 'logout-link';
            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sair';
            logoutBtn.style.cssText = `
                color: #ff6b6b !important;
                font-weight: 600;
                padding: 0.8rem 1.5rem !important;
            `;
            logoutBtn.onclick = fazerLogout;
            nav.appendChild(logoutBtn);
        }
    }

    // Logout
    function fazerLogout(e) {
        e.preventDefault();
        localStorage.removeItem('maanain_user');
        usuarioLogado = null;
        atualizarHeader();
        alert('Você saiu da Área do Membro. Volte sempre!');
    }

    // ========== LOGIN ==========
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const fd = new FormData(loginForm);
            const body = Object.fromEntries(fd.entries());

            fetch("http://localhost:3000/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            })
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    alert("❌ Erro: " + data.error);
                } else {
                    // Salva usuário e redireciona
                    localStorage.setItem('maanain_user', JSON.stringify(data.user));
                    usuarioLogado = data.user;
                    atualizarHeader();
                    
                    // 👇 REDIRECIONAMENTO IMEDIATO PARA INÍCIO
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 500);
                }
            })
            .catch(err => alert("❌ Erro de conexão: " + err.message));
        });
    }

    // ========== REGISTRO ==========
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const fd = new FormData(registerForm);
            const body = Object.fromEntries(fd.entries());

            fetch("http://localhost:3000/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            })
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    alert("❌ Erro: " + data.error);
                } else {
                    alert("✅ Cadastro realizado! Faça login agora.");
                    window.location.href = 'login.html';
                }
            })
            .catch(err => alert("❌ Erro de conexão: " + err.message));
        });
    }

    // Inicializa sistema
    carregarUsuario();
});
