document.addEventListener("DOMContentLoaded", () => {
    // ========== SISTEMA DE ROLES ==========
    const ROLES = {
        VISITANTE: 'visitante',
        FREQUENTADOR: 'frequentador',
        MEMBRO: 'membro',
        CONSELHO: 'conselho',
        ADMIN: 'admin'
    };

    const ABAS_POR_ROLE = {
        [ROLES.VISITANTE]: ['inicio', 'programacao'],
        [ROLES.FREQUENTADOR]: ['inicio', 'programacao', 'biblia'],
        [ROLES.MEMBRO]: ['inicio', 'programacao', 'biblia', 'membros'],
        [ROLES.CONSELHO]: ['inicio', 'programacao', 'biblia', 'membros', 'relatorios'],
        [ROLES.ADMIN]: ['inicio', 'programacao', 'biblia', 'membros', 'relatorios', 'admin']
    };

    let usuarioLogado = null;

    // Função para carregar usuário do localStorage
    function carregarUsuario() {
        const userData = localStorage.getItem('maanain_user');
        if (userData) {
            usuarioLogado = JSON.parse(userData);
            atualizarHeader();
        }
    }

    // Função para atualizar header baseado na role
    function atualizarHeader() {
        const navLinks = document.querySelectorAll('.nav a');
        navLinks.forEach(link => {
            const aba = link.getAttribute('data-aba') || link.textContent.toLowerCase();
            
            if (!usuarioLogado || !ABAS_POR_ROLE[usuarioLogado.role]?.includes(aba)) {
                link.style.display = 'none';
            }
        });

        // Botão de logout se logado
        const nav = document.querySelector('.nav');
        if (usuarioLogado && !document.querySelector('#logout-link')) {
            const logoutBtn = document.createElement('a');
            logoutBtn.href = '#';
            logoutBtn.id = 'logout-link';
            logoutBtn.textContent = 'Sair';
            logoutBtn.style.color = '#ff6b6b';
            logoutBtn.onclick = fazerLogout;
            nav.appendChild(logoutBtn);
        }
    }

    // Função logout
    function fazerLogout() {
        localStorage.removeItem('maanain_user');
        usuarioLogado = null;
        atualizarHeader();
        alert('Logout realizado com sucesso!');
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
                .then((data) => {
                    if (data.error) {
                        alert("Erro: " + data.error);
                    } else {
                        // Salva no localStorage com role
                        localStorage.setItem('maanain_user', JSON.stringify(data.user));
                        usuarioLogado = data.user;
                        atualizarHeader();
                        alert(`Bem-vindo, ${data.user.username}! (${data.user.role})`);
                    }
                })
                .catch(err => alert("Erro na conexão: " + err.message));
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
                .then((data) => {
                    if (data.error) {
                        alert("Erro: " + data.error);
                    } else {
                        alert("Cadastro concluído! Faça login agora.");
                        window.location.href = 'login.html';
                    }
                })
                .catch(err => alert("Erro na conexão: " + err.message));
        });
    }

    // Carrega estado inicial
    carregarUsuario();
});
