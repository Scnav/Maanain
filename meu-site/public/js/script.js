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

    // Inicializa
    carregarUsuario();
});
