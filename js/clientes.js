// ====== CLIENTES ======

function renderClients() {
    const list = document.getElementById('clients-list');
    if (!list) return;

    const term = document.getElementById('cli-search')?.value.toLowerCase() || '';
    let filtered = STATE.clients || [];

    if (term) {
        filtered = filtered.filter(c =>
            c.name.toLowerCase().includes(term) ||
            (c.phone && c.phone.toLowerCase().includes(term)) ||
            (c.doc && c.doc.toLowerCase().includes(term))
        );
    }

    const sliced = filtered.slice(0, 150);

    if (sliced.length === 0) {
        list.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-400">Nenhum cliente encontrado.</td></tr>';
        return;
    }

    list.innerHTML = sliced.map(c => `
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
    if (error) {
        showLoading(false);
        return showToast("Erro: " + error.message, true);
    }

    document.getElementById('client-form-container').classList.add('hidden');
    showToast("Cliente Salvo!");
    await loadData();
}

async function deleteClient(id) {
    if (!confirm("Excluir cliente?")) return;
    showLoading(true);
    const { error } = await sb.from('clientes').delete().eq('id', id);
    if (error) {
        showLoading(false);
        return showToast("Erro: " + error.message, true);
    }
    showToast("Excluído!");
    await loadData();
}
