// Gerenciamento de autenticação JWT para o Admin Panel
// Armazena o token no localStorage

const ADMIN_TOKEN_KEY = 'maanaim_admin_token';
const ADMIN_EXPIRY_KEY = 'maanaim_admin_expiry';

// Salvar token JWT
function saveAdminToken(token, expiresIn) {
    const expiry = Date.now() + (expiresIn * 1000);
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
    localStorage.setItem(ADMIN_EXPIRY_KEY, expiry.toString());
}

// Obter token JWT atual
function getAdminToken() {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    const expiry = localStorage.getItem(ADMIN_EXPIRY_KEY);
    
    if (!token || !expiry) {
        return null;
    }
    
    // Verificar se expirou
    if (Date.now() > parseInt(expiry)) {
        clearAdminToken();
        return null;
    }
    
    return token;
}

// Verificar se está logado como admin
function isAdminLoggedIn() {
    return getAdminToken() !== null;
}

// Limpar token (logout)
function clearAdminToken() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_EXPIRY_KEY);
}

// Fazer login admin
async function adminLogin(token) {
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: token })
        });
        
        const data = await response.json();
        
        if (data.success) {
            saveAdminToken(data.token, data.expiresIn);
            return { success: true };
        }
        
        return { success: false, error: data.error };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// Verificar se o token ainda é válido (chamada ao servidor)
async function verifyAdminToken() {
    const token = getAdminToken();
    if (!token) {
        return false;
    }
    
    try {
        const response = await fetch('/api/admin/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        return data.valid === true;
    } catch (err) {
        return false;
    }
}

// Obter headers com token JWT para requisições
function getAdminHeaders() {
    const token = getAdminToken();
    if (token) {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }
    // Fallback para token antigo (manter compatibilidade)
    return {
        'x-admin-token': 'maanaim2026',
        'Content-Type': 'application/json'
    };
}

// Fazer logout
function adminLogout() {
    clearAdminToken();
    window.location.href = 'login.html';
}

// Verificar autenticação ao carregar página admin
async function requireAdminAuth() {
    if (!isAdminLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    
    // Verificar token com servidor
    const isValid = await verifyAdminToken();
    if (!isValid) {
        adminLogout();
        return false;
    }
    
    return true;
}

// Inicializar - verificar token expirado ao carregar
(function initAdminAuth() {
    // Verificar expiração local
    const expiry = localStorage.getItem(ADMIN_EXPIRY_KEY);
    if (expiry && Date.now() > parseInt(expiry)) {
        clearAdminToken();
    }
})();
