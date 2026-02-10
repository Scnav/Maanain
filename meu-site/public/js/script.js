document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    // FORMULÁRIO DE LOGIN
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
                .then((r) => r.json())
                .then((data) => {
                    if (data.error) {
                        alert("Erro: " + data.error);
                    } else {
                        alert("Logado como " + data.user.username);
                    }
                })
                .catch((err) => {
                    alert("Erro na requisição: " + err.message);
                });
        });
    }

    // FORMULÁRIO DE REGISTRO
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
                .then((r) => r.json())
                .then((data) => {
                    if (data.error) {
                        alert("Erro: " + data.error);
                    } else {
                        alert("Cadastro concluído com sucesso!");
                    }
                })
                .catch((err) => {
                    alert("Erro na requisição: " + err.message);
                });
        });
    }
});
