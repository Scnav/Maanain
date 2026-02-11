// Só admin acessa
if (!window.MAANAIN_AUTH?.usuario?.role === 'admin') {
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
    // Carrega estatísticas
    fetch('/api/admin/users').then(r => r.json()).then(users => {
        document.getElementById('total-users').textContent = users.length;
        document.getElementById('frequentadores').textContent = users.filter(u => u.role === 'frequentador').length;
    });

    // Sidebar navigation
    document.querySelectorAll('.admin-sidebar a').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            document.getElementById(link.dataset.section).classList.add('active');
            document.querySelectorAll('.admin-sidebar a').forEach(a => a.classList.remove('active'));
            link.classList.add('active');
        };
    });

    // Logout admin
    document.getElementById('admin-logout').onclick = () => {
        localStorage.removeItem('maanain_user');
        window.location.href = 'index.html';
    };
});
