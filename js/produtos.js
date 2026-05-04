// ====== PRODUTOS ======

function renderProducts() {
    const list = document.getElementById('prod-list');
    if (!list) return;

    const term = (document.getElementById('prod-search')?.value || '').toLowerCase();
    const catFilter = document.getElementById('prod-category')?.value || '';

    // Preenche categorias dinamicamente (se ainda não estiverem)
    const catSelect = document.getElementById('prod-category');
    if (catSelect && catSelect.options.length <= 1) {
        const categoriasUnicas = [...new Set(STATE.products.map(p => p.category).filter(c => c && c.trim() !== ''))];
        categoriasUnicas.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            catSelect.appendChild(option);
        });
    }

    let filtered = STATE.products.slice();

    if (term) filtered = filtered.filter(p => p.name.toLowerCase().includes(term));
    if (catFilter) filtered = filtered.filter(p => p.category === catFilter);

    if (filtered.length === 0) {
        list.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-400">Nenhum produto encontrado.</td></tr>';
        return;
    }

    list.innerHTML = filtered.map(p => `
        <tr class="hover:bg-slate-50">
            <td class="p-4 font-bold text-slate-700">
                ${p.name}
                <br><span class="text-[10px] text-slate-400 uppercase font-bold bg-slate-100 px-1 py-0.5 rounded">${p.category || 'Geral'}</span>
            </td>
            <td class="p-4 font-medium">${formatMoney(p.price)}</td>
            <td class="p-4 font-bold">
                <div class="flex flex-col">
                    <span class="text-xs text-slate-500">Disp: ${p.available}</span>
                    <span class="text-[10px] text-slate-400">Físico: ${p.stock}</span>
                </div>
            </td>
            <td class="p-4 text-center">
                <button onclick="openProductForm('${p.id}')" class="text-indigo-600 hover:text-indigo-800">
                    <i data-lucide="edit-3" width="16"></i>
                </button>
            </td>
        </tr>
    `).join('');

    lucide.createIcons();
}

function openProductForm(id) {
    document.getElementById('prod-form-container').classList.remove('hidden');
    if (id) {
        const p = STATE.products.find(x => x.id == id);
        if (p) {
            document.getElementById('prd-id').value = p.id;
            document.getElementById('prd-name').value = p.name;
            document.getElementById('prd-cat').value = p.category || '';
            document.getElementById('prd-price').value = p.price;
            document.getElementById('prd-stock').value = p.stock;
        }
    } else {
        document.getElementById('prd-id').value = '';
        document.getElementById('prd-name').value = '';
        document.getElementById('prd-cat').value = '';
        document.getElementById('prd-price').value = '';
        document.getElementById('prd-stock').value = '';
    }
}

async function saveProduct(e) {
    e.preventDefault();
    showLoading(true);
    const isNew = !document.getElementById('prd-id').value;
    const newId = isNew ? getNextId(STATE.products) : document.getElementById('prd-id').value;

    const payload = {
        id: newId,
        nome: document.getElementById('prd-name').value,
        categoria: document.getElementById('prd-cat').value,
        preco: parseFloat(document.getElementById('prd-price').value),
        estoque_fisico: parseFloat(document.getElementById('prd-stock').value),
        estoque_comprometido: isNew ? 0 : STATE.products.find(p => p.id == newId).committed
    };

    const { error } = await sb.from('produtos').upsert(payload);
    if (error) {
        showLoading(false);
        return showToast("Erro: " + error.message, true);
    }

    document.getElementById('prod-form-container').classList.add('hidden');
    showToast("Produto Salvo!");
    await loadData();
}
