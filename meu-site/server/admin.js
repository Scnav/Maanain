const MAANAIN_ADMIN_TOKEN = 'maanain2026';

// Função para verificar se é admin
function isAdmin(user) {
    return user && user.role === 'admin';
}
