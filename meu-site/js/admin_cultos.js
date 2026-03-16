// CULTOS SEMANAIS
// Arrays para armazenar as imagens do carrossel
let cultoImagens = [];
let eventoImagens = [];
let tipoGaleriaAtual = ''; // 'culto' ou 'evento'

// Usar event delegation para garantir que os botões funcionem mesmo após DOMContentLoaded
document.addEventListener('click', function(e) {
    // Botões de Culto
    if (e.target && e.target.id === 'btnNovoCulto') {
        mostrarFormCulto();
    }
    if (e.target && e.target.id === 'btnSalvarCulto') {
        salvarCulto();
    }
    if (e.target && e.target.id === 'btnCancelarCulto') {
        ocultarFormCulto();
    }
    if (e.target && e.target.id === 'btnAddCultoImagem') {
        const input = document.getElementById('cultoNovaImagem');
        const url = input.value.trim();
        if (url) {
            cultoImagens.push(url);
            renderCultoImagens();
            input.value = '';
        }
    }
    if (e.target && e.target.id === 'cultoUploadImagem') {
        // O listener de change já está no elemento
    }
    
    // Botões de Evento
    if (e.target && e.target.id === 'btnNovoEvento') {
        mostrarFormEvento();
    }
    if (e.target && e.target.id === 'btnSalvarEvento') {
        salvarEvento();
    }
    if (e.target && e.target.id === 'btnCancelarEvento') {
        ocultarFormEvento();
    }
    if (e.target && e.target.id === 'btnAddEventoImagem') {
        const input = document.getElementById('eventoNovaImagem');
        const url = input.value.trim();
        if (url) {
            eventoImagens.push(url);
            renderEventoImagens();
            input.value = '';
        }
    }
});

// Event listener para upload de imagem (precisa ser adicionado diretamente ao elemento)
document.addEventListener('DOMContentLoaded', function() {
    // Event listeners para botões de culto
    document.getElementById('btnNovoCulto')?.addEventListener('click', () => mostrarFormCulto());
    document.getElementById('btnSalvarCulto')?.addEventListener('click', salvarCulto);
    document.getElementById('btnCancelarCulto')?.addEventListener('click', () => ocultarFormCulto());

    // Event listeners para adicionar imagens com URL
    document.getElementById('btnAddCultoImagem')?.addEventListener('click', () => {
        const input = document.getElementById('cultoNovaImagem');
        const url = input.value.trim();
        if (url) {
            cultoImagens.push(url);
            renderCultoImagens();
            input.value = '';
        }
    });

    // Event listener para upload de imagem
    document.getElementById('cultoUploadImagem')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            await uploadImagem(file, 'culto');
        }
    });

    // Event listeners para eventos
    document.getElementById('btnNovoEvento')?.addEventListener('click', () => mostrarFormEvento());
    document.getElementById('btnSalvarEvento')?.addEventListener('click', salvarEvento);
    document.getElementById('btnCancelarEvento')?.addEventListener('click', () => ocultarFormEvento());

    document.getElementById('btnAddEventoImagem')?.addEventListener('click', () => {
        const input = document.getElementById('eventoNovaImagem');
        const url = input.value.trim();
        if (url) {
            eventoImagens.push(url);
            renderEventoImagens();
            input.value = '';
        }
    });

    // Event listener para upload de imagem de evento
    document.getElementById('eventoUploadImagem')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            await uploadImagem(file, 'evento');
        }
    });
});

// Função para fazer upload de imagem
async function uploadImagem(file, tipo) {
    try {
        const reader = new FileReader();
        reader.onload = async function() {
            const base64 = reader.result;
            const token = localStorage.getItem('maanaim_admin_token');
            
            const response = await fetch('/api/admin/gallery', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    image: base64,
                    filename: file.name
                })
            });
            
            if (!response.ok) {
                throw new Error('Erro ao fazer upload');
            }
            
            const data = await response.json();
            
            if (tipo === 'culto') {
                cultoImagens.push(data.url);
                renderCultoImagens();
            } else if (tipo === 'evento') {
                eventoImagens.push(data.url);
                renderEventoImagens();
            }
            
            mostrarToast('✅ Imagem enviada com sucesso!', 'success');
        };
        reader.readAsDataURL(file);
    } catch (error) {
        console.error('Erro ao fazer upload:', error);
        mostrarToast('❌ Erro ao fazer upload', 'error');
    }
}

// Função para abrir a galeria
async function abrirGaleria(tipo) {
    tipoGaleriaAtual = tipo;
    try {
        const token = localStorage.getItem('maanaim_admin_token');
        const response = await fetch('/api/admin/gallery', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Erro ao carregar galeria');
        
        const imagens = await response.json();
        
        if (imagens.length === 0) {
            mostrarToast('ℹ️ Nenhuma imagem na galeria. Faça upload primeiro!', 'info');
            return;
        }
        
        // Criar modal de galeria
        let galeriaHtml = `
            <div id="modalGaleria" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000;">
                <div style="background: white; max-width: 800px; max-height: 80vh; margin: 50px auto; padding: 20px; border-radius: 10px; overflow-y: auto;">
                    <h3 style="margin-bottom: 15px;">📁 Selecionar Imagem da Galeria</h3>
                    <p style="margin-bottom: 15px; color: #666;">Clique em uma imagem para selecionar</p>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px;">
        `;
        
        imagens.forEach(img => {
            galeriaHtml += `
                <div style="position: relative; cursor: pointer; border: 3px solid transparent; border-radius: 5px; overflow: hidden; transition: all 0.2s;" onclick="selecionarImagemGaleria('${img.url}')">
                    <img src="${img.url}" style="width: 100%; height: 120px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/150?text=Erro'">
                    <button onclick="event.stopPropagation(); excluirImagemGaleria(${img.id}, '${img.url}')" style="position: absolute; top: 5px; right: 5px; background: red; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;" title="Excluir imagem">×</button>
                </div>
            `;
        });
        
        galeriaHtml += `
                    </div>
                    <button onclick="fecharGaleria()" style="margin-top: 20px; background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Fechar</button>
                </div>
            </div>
        `;
        
        // Remover modal existente se houver
        const existingModal = document.getElementById('modalGaleria');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', galeriaHtml);
        
    } catch (error) {
        console.error('Erro ao carregar galeria:', error);
        mostrarToast('❌ Erro ao carregar galeria', 'error');
    }
}

// Função para selecionar imagem da galeria
function selecionarImagemGaleria(url) {
    if (tipoGaleriaAtual === 'culto') {
        cultoImagens.push(url);
        renderCultoImagens();
    } else if (tipoGaleriaAtual === 'evento') {
        eventoImagens.push(url);
        renderEventoImagens();
    }
    fecharGaleria();
    mostrarToast('✅ Imagem adicionada!', 'success');
}

// Função para fechar a galeria
function fecharGaleria() {
    const modal = document.getElementById('modalGaleria');
    if (modal) {
        modal.remove();
    }
}

// Função para excluir imagem da galeria
async function excluirImagemGaleria(id, url) {
    if (!confirm('⚠️ Tem certeza que deseja excluir esta imagem da galeria?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('maanaim_admin_token');
        const response = await fetch(`/api/admin/gallery/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao excluir');
        }
        
        mostrarToast('✅ Imagem excluída da galeria!', 'success');
        
        // Recarregar a galeria
        abrirGaleria(tipoGaleriaAtual);
        
    } catch (error) {
        console.error('Erro ao excluir imagem:', error);
        mostrarToast('❌ ' + error.message, 'error');
    }
}

// Tornar funções disponíveis globalmente
window.abrirGaleria = abrirGaleria;
window.selecionarImagemGaleria = selecionarImagemGaleria;
window.fecharGaleria = fecharGaleria;
window.excluirImagemGaleria = excluirImagemGaleria;

function renderCultoImagens() {
    const container = document.getElementById('cultoImagensContainer');
    if (!container) return;
    
    container.innerHTML = cultoImagens.map((url, index) => `
        <div style="position: relative; width: 100px; height: 100px; border-radius: 5px; overflow: hidden; border: 2px solid #ddd;">
            <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://via.placeholder.com/100?text=Erro'">
            <button onclick="removerCultoImagem(${index})" style="position: absolute; top: 2px; right: 2px; background: red; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 12px;">×</button>
        </div>
    `).join('');
}

function renderEventoImagens() {
    const container = document.getElementById('eventoImagensContainer');
    if (!container) return;
    
    container.innerHTML = eventoImagens.map((url, index) => `
        <div style="position: relative; width: 100px; height: 100px; border-radius: 5px; overflow: hidden; border: 2px solid #ddd;">
            <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://via.placeholder.com/100?text=Erro'">
            <button onclick="removerEventoImagem(${index})" style="position: absolute; top: 2px; right: 2px; background: red; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 12px;">×</button>
        </div>
    `).join('');
}

function removerCultoImagem(index) {
    cultoImagens.splice(index, 1);
    renderCultoImagens();
}

function removerEventoImagem(index) {
    eventoImagens.splice(index, 1);
    renderEventoImagens();
}

function mostrarFormCulto(culto = null) {
    const form = document.getElementById('formCulto');
    const title = document.getElementById('formCultoTitle');
    const id = document.getElementById('cultoId');
    const titulo = document.getElementById('cultoTitulo');
    const horario = document.getElementById('cultoHorario');
    const local = document.getElementById('cultoLocal');

    // Reset array de imagens
    cultoImagens = [];

    if (culto) {
        title.textContent = 'Editar Culto';
        id.value = culto.id;
        titulo.value = culto.titulo;
        horario.value = culto.horario || '';
        local.value = culto.local || '';
        
        // Carregar imagens do carrossel
        if (culto.imagens && Array.isArray(culto.imagens)) {
            cultoImagens = [...culto.imagens];
        } else if (culto.imagens) {
            try {
                cultoImagens = typeof culto.imagens === 'string' ? JSON.parse(culto.imagens) : [];
            } catch (e) {
                cultoImagens = [];
            }
        }
    } else {
        title.textContent = 'Novo Culto';
        id.value = '';
        titulo.value = '';
        horario.value = '';
        local.value = '';
    }

    renderCultoImagens();
    form.style.display = 'block';
}

function ocultarFormCulto() {
    document.getElementById('formCulto').style.display = 'none';
    cultoImagens = [];
}

async function carregarCultos() {
    try {
        const response = await fetch('/api/admin/cultos', {
            headers: getAdminHeaders()
        });
        if (!response.ok) throw new Error('Erro ao carregar cultos');
        const cultos = await response.json();
        
        const container = document.getElementById('cultosAdminContainer');
        if (!container) return;
        
        if (cultos.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Nenhum culto cadastrado. Clique em "Novo Culto" para adicionar.</p>';
        } else {
            container.innerHTML = cultos.map(culto => {
                let imagemHtml = '';
                if (culto.imagem) {
                    imagemHtml = `<img src="${culto.imagem}" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 5px; margin-bottom: 1rem;" onerror="this.style.display='none'">`;
                } else if (culto.imagens && culto.imagens.length > 0) {
                    imagemHtml = `<img src="${culto.imagens[0]}" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 5px; margin-bottom: 1rem;" onerror="this.style.display='none'">`;
                }
                
                return `
                <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem;">
                    ${imagemHtml}
                    <h4 style="margin-bottom: 1rem;">🟣 ${culto.titulo}</h4>
                    <p style="margin-bottom: 0.5rem;"><strong>Horário:</strong> ${culto.horario || 'A definir'}</p>
                    <p style="margin-bottom: 1rem;"><strong>Local:</strong> ${culto.local || 'A definir'}</p>
                    <button onclick='editarCulto(${JSON.stringify(culto).replace(/'/g, "'")})' class="btn-editar-cargo" style="margin-right: 0.5rem;">✏️ Editar</button>
                    <button onclick="excluirCulto(${culto.id})" class="btn-delete">🗑️ Excluir</button>
                </div>
            `}).join('');
        }
        
        container.style.display = 'block';
        document.getElementById('loadingCultos').style.display = 'none';
    } catch (error) {
        console.error('Erro ao carregar cultos:', error);
        mostrarToast('❌ Erro ao carregar cultos', 'error');
    }
}

async function salvarCulto() {
    const id = document.getElementById('cultoId').value;
    const titulo = document.getElementById('cultoTitulo').value;
    const horario = document.getElementById('cultoHorario').value;
    const local = document.getElementById('cultoLocal').value;

    // Validar: pelo menos título ou imagens deve ser fornecido
    if (!titulo && cultoImagens.length === 0) {
        mostrarToast('❌ Título ou imagem é obrigatório', 'error');
        return;
    }

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/admin/cultos/${id}` : '/api/admin/cultos';

        const response = await fetch(url, {
            method,
            headers: getAdminHeaders(),
            body: JSON.stringify({ 
                titulo, 
                horario, 
                local,
                imagens: cultoImagens
            })
        });
        
        if (!response.ok) throw new Error('Erro ao salvar culto');
        
        mostrarToast(`✅ Culto ${id ? 'atualizado' : 'criado'} com sucesso!`, 'success');
        ocultarFormCulto();
        carregarCultos();
    } catch (error) {
        console.error('Erro ao salvar culto:', error);
        mostrarToast('❌ Erro ao salvar culto', 'error');
    }
}

function editarCulto(culto) {
    mostrarFormCulto(culto);
}

async function excluirCulto(id) {
    if (!confirm('Tem certeza que deseja excluir este culto?')) return;

    try {
        const response = await fetch(`/api/admin/cultos/${id}`, {
            method: 'DELETE',
            headers: getAdminHeaders()
        });

        if (!response.ok) throw new Error('Erro ao excluir culto');

        mostrarToast('🗑️ Culto excluído!', 'success');
        carregarCultos();
    } catch (error) {
        console.error('Erro ao excluir culto:', error);
        mostrarToast('❌ Erro ao excluir culto', 'error');
    }
}

// ========== EVENTOS ==========
function mostrarFormEvento(evento = null) {
    const form = document.getElementById('formEvento');
    const title = document.getElementById('formEventoTitle');
    const id = document.getElementById('eventoId');
    const titulo = document.getElementById('eventoTitulo');
    const data = document.getElementById('eventoData');
    const local = document.getElementById('eventoLocal');

    // Reset array de imagens
    eventoImagens = [];

    if (evento) {
        title.textContent = 'Editar Evento';
        id.value = evento.id;
        titulo.value = evento.titulo;
        
        // Format data for datetime-local input
        if (evento.data) {
            const dateObj = new Date(evento.data);
            data.value = dateObj.toISOString().slice(0, 16);
        } else {
            data.value = '';
        }
        
        local.value = evento.local || '';
        
        // Carregar imagens do carrossel
        if (evento.imagens && Array.isArray(evento.imagens)) {
            eventoImagens = [...evento.imagens];
        } else if (evento.imagens) {
            try {
                eventoImagens = typeof evento.imagens === 'string' ? JSON.parse(evento.imagens) : [];
            } catch (e) {
                eventoImagens = [];
            }
        }
    } else {
        title.textContent = 'Novo Evento';
        id.value = '';
        titulo.value = '';
        data.value = '';
        local.value = '';
    }

    renderEventoImagens();
    form.style.display = 'block';
}

function ocultarFormEvento() {
    document.getElementById('formEvento').style.display = 'none';
    eventoImagens = [];
}

async function carregarEventos() {
    try {
        const response = await fetch('/api/admin/eventos', {
            headers: getAdminHeaders()
        });
        if (!response.ok) throw new Error('Erro ao carregar eventos');
        const eventos = await response.json();
        
        const container = document.getElementById('listaEventos');
        if (!container) return;
        
        if (eventos.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Nenhum evento cadastrado. Clique em "Novo Evento" para adicionar.</p>';
        } else {
            container.innerHTML = eventos.map(evento => {
                let imagemHtml = '';
                if (evento.imagem) {
                    imagemHtml = `<img src="${evento.imagem}" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 5px; margin-bottom: 1rem;" onerror="this.style.display='none'">`;
                } else if (evento.imagens && evento.imagens.length > 0) {
                    imagemHtml = `<img src="${evento.imagens[0]}" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 5px; margin-bottom: 1rem;" onerror="this.style.display='none'">`;
                }
                
                const dataFormatada = evento.data ? new Date(evento.data).toLocaleDateString('pt-BR') : 'A definir';
                
                return `
                <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem;">
                    ${imagemHtml}
                    <h4 style="margin-bottom: 1rem;">📅 ${evento.titulo}</h4>
                    <p style="margin-bottom: 0.5rem;"><strong>Data:</strong> ${dataFormatada}</p>
                    <p style="margin-bottom: 0.5rem;"><strong>Horário:</strong> ${evento.horario || 'A definir'}</p>
                    <p style="margin-bottom: 1rem;"><strong>Local:</strong> ${evento.local || 'A definir'}</p>
                    <button onclick='editarEvento(${JSON.stringify(evento).replace(/'/g, "'")})' class="btn-editar-cargo" style="margin-right: 0.5rem;">✏️ Editar</button>
                    <button onclick="excluirEvento(${evento.id})" class="btn-delete">🗑️ Excluir</button>
                </div>
            `}).join('');
        }
        
        container.style.display = 'block';
        document.getElementById('loadingEventos').style.display = 'none';
    } catch (error) {
        console.error('Erro ao carregar eventos:', error);
        mostrarToast('❌ Erro ao carregar eventos', 'error');
    }
}

async function salvarEvento() {
    const id = document.getElementById('eventoId').value;
    const titulo = document.getElementById('eventoTitulo').value;
    const data = document.getElementById('eventoData').value;
    const local = document.getElementById('eventoLocal').value;

    // Validar: pelo menos título, data ou imagens deve ser fornecido
    if (!titulo && !data && eventoImagens.length === 0) {
        mostrarToast('❌ Título, data ou imagem é obrigatório', 'error');
        return;
    }

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/admin/eventos/${id}` : '/api/admin/eventos';

        const response = await fetch(url, {
            method,
            headers: getAdminHeaders(),
            body: JSON.stringify({ 
                titulo, 
                data,
                horario: '',
                local,
                imagens: eventoImagens
            })
        });
        
        if (!response.ok) throw new Error('Erro ao salvar evento');
        
        mostrarToast(`✅ Evento ${id ? 'atualizado' : 'criado'} com sucesso!`, 'success');
        ocultarFormEvento();
        carregarEventos();
    } catch (error) {
        console.error('Erro ao salvar evento:', error);
        mostrarToast('❌ Erro ao salvar evento', 'error');
    }
}

function editarEvento(evento) {
    mostrarFormEvento(evento);
}

async function excluirEvento(id) {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;

    try {
        const response = await fetch(`/api/admin/eventos/${id}`, {
            method: 'DELETE',
            headers: getAdminHeaders()
        });

        if (!response.ok) throw new Error('Erro ao excluir evento');

        mostrarToast('🗑️ Evento excluído!', 'success');
        carregarEventos();
    } catch (error) {
        console.error('Erro ao excluir evento:', error);
        mostrarToast('❌ Erro ao excluir evento', 'error');
    }
}

// Carregar conteúdo quando navegar para as seções
document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', function(e) {
        const section = this.dataset.section;
        if (section === 'noticias') {
            setTimeout(carregarNoticias, 100);
        } else if (section === 'programacao') {
            setTimeout(carregarCultos, 100);
            setTimeout(carregarEventos, 200);
        } else if (section === 'pagina-inicial') {
            setTimeout(carregarConteudos, 100);
        } else if (section === 'ministerios') {
            setTimeout(carregarMinisterios, 100);
        }
    });
});
