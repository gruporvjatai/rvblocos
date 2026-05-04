// =================================================================
// MÓDULO CLIENTES - RV BLOCOS
// =================================================================

function renderClients() {
    const container = document.getElementById('view-clients');
    if (!container) return;

    container.innerHTML = `
    <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-slate-800">Clientes</h2>
        <button onclick="openClientForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold shadow flex items-center gap-2">
            <i data-lucide="plus"></i> Novo Cliente
        </button>
    </div>
    <div class="mb-4 bg-white p-4 rounded-xl shadow-sm border">
        <div class="relative w-full">
            <i data-lucide="search" class="absolute left-3 top-2.5 text-slate-400 w-5 h-5"></i>
            <input type="text" id="cli-search" placeholder="Buscar cliente por nome, telefone ou documento..." 
                   class="w-full pl-10 p-2 border rounded outline-none focus:border-indigo-600 font-medium"
                   onkeyup="filtrarClientes()">
        </div>
    </div>
    <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table class="w-full text-sm text-left">
            <thead class="bg-slate-50 text-slate-700">
                <tr><th class="p-4">Nome</th><th class="p-4">Telefone</th><th class="p-4">Documento</th><th class="p-4 text-center">Ações</th></tr>
            </thead>
            <tbody id="clients-list" class="divide-y"></tbody>
        </table>
    </div>
    `;

    filtrarClientes();
    lucide.createIcons();
}

function filtrarClientes() {
    const term = (document.getElementById('cli-search')?.value || '').toLowerCase();
    const list = document.getElementById('clients-list');
    if (!list) return;

    let filtered = (STATE.clients || []).filter(c =>
        c.name.toLowerCase().includes(term) ||
        (c.phone && c.phone.toLowerCase().includes(term)) ||
        (c.doc && c.doc.toLowerCase().includes(term))
    );

    if (filtered.length === 0) {
        list.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-400">Nenhum cliente encontrado.</td></tr>';
        return;
    }

    list.innerHTML = filtered.map(c => `
        <tr class="hover:bg-slate-50">
            <td class="p-4 font-medium">${c.name}</td>
            <td class="p-4">${c.phone || '-'}</td>
            <td class="p-4">${c.doc || '-'}</td>
            <td class="p-4 text-center flex justify-center gap-3">
                <button onclick="openClientForm('${c.id}')" class="text-blue-600 hover:text-blue-800"><i data-lucide="edit-3" width="16"></i></button>
                <button onclick="deleteClient('${c.id}')" class="text-red-600 hover:text-red-800"><i data-lucide="trash-2" width="16"></i></button>
            </td>
        </tr>
    `).join('');

    lucide.createIcons();
}

function openClientForm(id) {
    document.getElementById('client-form-container').classList.remove('hidden');
    if (id) {
        const c = STATE.clients.find(x => String(x.id) === String(id));
        if (c) {
            document.getElementById('cli-id').value = c.id;
            document.getElementById('cli-name').value = c.name;
            document.getElementById('cli-phone').value = c.phone || '';
            document.getElementById('cli-doc').value = c.doc || '';
            document.getElementById('cli-addr').value = c.address || '';
        }
    } else {
        document.getElementById('cli-id').value = '';
        document.getElementById('cli-name').value = '';
        document.getElementById('cli-phone').value = '';
        document.getElementById('cli-doc').value = '';
        document.getElementById('cli-addr').value = '';
    }
}

async function saveClient(e) {
    e.preventDefault();
    showLoading(true);
    const isNew = !document.getElementById('cli-id').value;
    const newId = isNew ? getNextId(STATE.clients) : document.getElementById('cli-id').value;

    const payload = {
        id: newId,
        nome: document.getElementById('cli-name').value,
        telefone: document.getElementById('cli-phone').value,
        documento: document.getElementById('cli-doc').value,
        endereco: document.getElementById('cli-addr').value
    };

    const { error } = await sb.from('clientes').upsert(payload);
    if (error) { showLoading(false); return showToast("Erro: " + error.message, true); }

    document.getElementById('client-form-container').classList.add('hidden');
    showToast("Cliente Salvo!");
    await loadData();
    renderClients(); // re-renderiza a view
}

async function deleteClient(id) {
    if (!confirm("Excluir cliente?")) return;
    showLoading(true);
    const { error } = await sb.from('clientes').delete().eq('id', id);
    if (error) { showLoading(false); return showToast("Erro: " + error.message, true); }
    showToast("Excluído!");
    await loadData();
    renderClients();
}
