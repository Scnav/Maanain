// Área do Membro - Admin

// Carregar tópicos da Área do Membro
async function carregarAreaMembro() {
    try {
        const response = await fetch('/api/admin/area-membro', {
            headers: getAdminHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Erro na resposta: ' + response.status);
        }
        
        const topicos = await response.json();
        
        const container = document.getElementById('areaMembroContainer');
        
        if (!container) {
            return;
        }
        
        if (topicos.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">Nenhum tópico cadastrado.</p>';
            return;
        }
        
        container.innerHTML = topicos.map(topico => `
            <div class="admin-card">
                <div class="admin-card-header">
                    <h4>${topico.titulo}</h4>
                    <span class="badge badge-${topico.categoria}">${topico.categoria}</span>
                </div>
                <p>${topico.descricao || ''}</p>
                <div class="admin-card-actions">
                    <button class="btn-editar-cargo" onclick="editarAreaMembro(${topico.id})" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button onclick="excluirAreaMembro(${topico.id})" style="background: #dc3545; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem;">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Erro ao carregar área membro:', error);
    }
}

// Mostrar formulário para novo tópico
function mostrarFormAreaMembro(topico = null) {
    const modal = document.getElementById('areaMembroModal');
    const form = document.getElementById('areaMembroForm');
    const titulo = document.getElementById('areaMembroModalTitle');
    
    if (!modal) {
        console.error('Modal não encontrado!');
        return;
    }
    
    // Limpar o formulário
    form?.reset();
    document.getElementById('areaMembroId').value = '';
    document.getElementById('areaMembroTitulo').value = topico ? topico.titulo : '';
    document.getElementById('areaMembroDescricao').value = topico ? topico.descricao : '';
    document.getElementById('areaMembroConteudo').value = topico ? topico.conteudo : '';
    document.getElementById('areaMembroCategoria').value = topico ? topico.categoria : 'pacto';
    document.getElementById('areaMembroIcone').value = topico ? topico.icone : 'fas fa-book';
    document.getElementById('areaMembroOrdem').value = topico ? topico.ordem : 0;
    
    // Armazenar o PDF path original se for edição
    pdfPathOriginal = topico ? (topico.pdf_path || '') : '';
    
    titulo.textContent = topico ? 'Editar Tópico' : 'Novo Tópico';
    
    if (topico) {
        document.getElementById('areaMembroId').value = topico.id;
    }
    
    modal.style.display = 'block';
}

// Ocultar formulário
function ocultarFormAreaMembro() {
    const modal = document.getElementById('areaMembroModal');
    if (modal) modal.style.display = 'none';
    // Limpar o input de arquivo ao fechar
    const arquivoInput = document.getElementById('areaMembroArquivo');
    if (arquivoInput) arquivoInput.value = '';
}

// Variável para armazenar o PDF path original durante edição
let pdfPathOriginal = '';

// Salvar tópico
async function salvarAreaMembro() {
    const id = document.getElementById('areaMembroId').value;
    const titulo = document.getElementById('areaMembroTitulo').value;
    const descricao = document.getElementById('areaMembroDescricao').value;
    const conteudo = document.getElementById('areaMembroConteudo').value;
    const categoria = document.getElementById('areaMembroCategoria').value;
    const icone = document.getElementById('areaMembroIcone').value;
    const ordem = parseInt(document.getElementById('areaMembroOrdem').value) || 0;
    const arquivo = document.getElementById('areaMembroArquivo').files[0];
    
    if (!titulo || !categoria) {
        mostrarToast('Título e categoria são obrigatórios', 'error');
        return;
    }
    
    try {
        // Se tem arquivo, faz upload primeiro convertendo para Base64
        let pdfPath = id ? pdfPathOriginal : null;
        if (arquivo) {
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(arquivo);
            });
            
            // Extrair apenas os dados Base64 (remover prefixo data:application/pdf;base64,)
            const base64Data = base64.split(',')[1];
            
            const uploadResponse = await fetch('/api/admin/upload-pdf-base64', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-token': 'maanain2026'
                },
                body: JSON.stringify({
                    filename: arquivo.name,
                    data: base64Data
                })
            });
            
            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error('Erro ao fazer upload do arquivo: ' + errorText);
            }
            
            const uploadResult = await uploadResponse.json();
            pdfPath = uploadResult.path;
        }
        
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/admin/area-membro/${id}` : '/api/admin/area-membro';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...getAdminHeaders()
            },
            body: JSON.stringify({ 
                titulo, 
                descricao, 
                conteudo, 
                categoria, 
                icone, 
                ordem,
                pdfPath // Enviar caminho do PDF
            })
        });
        
        if (!response.ok) throw new Error('Erro ao salvar tópico');
        
        mostrarToast(`✅ Tópico ${id ? 'atualizado' : 'criado'} com sucesso!`, 'success');
        ocultarFormAreaMembro();
        carregarAreaMembro();
    } catch (error) {
        console.error('Erro ao salvar tópico:', error);
        mostrarToast('❌ Erro ao salvar tópico', 'error');
    }
}

// Editar tópico
async function editarAreaMembro(id) {
    try {
        const response = await fetch('/api/admin/area-membro', {
            headers: getAdminHeaders()
        });
        const topicos = await response.json();
        const topico = topicos.find(t => t.id == id);
        
        if (topico) {
            mostrarFormAreaMembro(topico);
        }
    } catch (error) {
        console.error('Erro ao carregar tópico:', error);
        mostrarToast('❌ Erro ao carregar tópico', 'error');
    }
}

// Excluir tópico
async function excluirAreaMembro(id) {
    if (!confirm('Excluir este tópico? Esta ação não pode ser desfeita.')) return;
    
    try {
        const response = await fetch(`/api/admin/area-membro/${id}`, {
            method: 'DELETE',
            headers: getAdminHeaders()
        });
        
        if (!response.ok) throw new Error('Erro ao excluir tópico');
        
        mostrarToast('✅ Tópico excluído!', 'success');
        carregarAreaMembro();
    } catch (error) {
        console.error('Erro ao excluir tópico:', error);
        mostrarToast('❌ Erro ao excluir tópico', 'error');
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    const btnNovo = document.getElementById('btnNovoAreaMembro');
    const btnSalvar = document.getElementById('btnSalvarAreaMembro');
    const btnCancelar = document.getElementById('btnCancelarAreaMembro');
    
    if (btnNovo) {
        btnNovo.addEventListener('click', () => {
            mostrarFormAreaMembro();
        });
    }
    
    if (btnSalvar) btnSalvar.addEventListener('click', salvarAreaMembro);
    if (btnCancelar) btnCancelar.addEventListener('click', ocultarFormAreaMembro);
    
    // Carregar dados
    carregarAreaMembro();
});
