// js/usuarios.js

function renderUsers() {
    const list = document.getElementById('users-list');
    if (!list) return;
    list.innerHTML = (STATE.users || []).map(u => `
        <tr class="hover:bg-slate-50">
            <td class="p-4 font-medium">${u.name}</td>
            <td class="p-4">${u.login}</td>
            <td class="p-4 uppercase text-xs font-bold text-slate-500">${u.type}</td>
            <td class="p-4 text-center">
                <span class="px-2 py-1 rounded text-xs font-bold ${u.status === 'BLOQUEADO' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">${u.status}</span>
            </td>
            <td class="p-4 text-center flex justify-center gap-3">
                <button onclick="openUserForm('${u.id}')" class="text-blue-600 hover:text-blue-800"><i data-lucide="edit-3" width="16"></i></button>
                <button onclick="toggleUserStatus('${u.id}', '${u.status}')" class="${u.status === 'BLOQUEADO' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'}" title="${u.status === 'BLOQUEADO' ? 'Desbloquear' : 'Bloquear'}"><i data-lucide="${u.status === 'BLOQUEADO' ? 'unlock' : 'lock'}" width="16"></i></button>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

function openUserForm(id) {
    document.getElementById('user-form-container').classList.remove('hidden');
    if (id) {
        const u = STATE.users.find(x => String(x.id) === String(id));
        if (u) {
            document.getElementById('usr-id').value = u.id;
            document.getElementById('usr-name').value = u.name;
            document.getElementById('usr-login').value = u.login;
            document.getElementById('usr-type').value = u.type;
            document.getElementById('usr-pass').value = '';
            document.getElementById('usr-pass').required = false;
        }
    } else {
        document.getElementById('usr-id').value = '';
        document.getElementById('usr-name').value = '';
        document.getElementById('usr-login').value = '';
        document.getElementById('usr-type').value = 'vendedor';
        document.getElementById('usr-pass').value = '';
        document.getElementById('usr-pass').required = true;
    }
}

async function saveUser(e) {
    e.preventDefault();
    showLoading(true);
    const isNew = !document.getElementById('usr-id').value;
    const newId = isNew ? getNextId(STATE.users) : document.getElementById('usr-id').value;
    const pass = document.getElementById('usr-pass').value;

    const payload = {
        id: newId,
        nome: document.getElementById('usr-name').value,
        email: document.getElementById('usr-login').value,
        nivel_acesso: document.getElementById('usr-type').value
    };

    if (pass || isNew) {
        payload.senha = pass;
    }
    if (isNew) {
        payload.status = 'ATIVO';
    }

    const { error } = await sb.from('usuarios').upsert(payload);
    if (error) { showLoading(false); return showToast("Erro: " + error.message, true); }

    document.getElementById('user-form-container').classList.add('hidden');
    showToast("Usuário Salvo!");
    loadData();
}

async function toggleUserStatus(id, currentStatus) {
    const newStatus = currentStatus === 'ATIVO' ? 'BLOQUEADO' : 'ATIVO';
    const actionText = newStatus === 'BLOQUEADO' ? 'bloquear' : 'desbloquear';
    if (!confirm(`Deseja realmente ${actionText} este usuário?`)) return;

    showLoading(true);
    const { error } = await sb.from('usuarios').update({ status: newStatus }).eq('id', id);
    if (error) { showLoading(false); return showToast("Erro: " + error.message, true); }

    showToast(`Usuário ${newStatus.toLowerCase()} com sucesso!`);
    loadData();
}
