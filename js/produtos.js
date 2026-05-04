// =================================================================
// MÓDULO PRODUTOS - RV BLOCOS
// =================================================================

function renderProducts() {
    const container = document.getElementById('view-prod');
    if (!container) return;

    container.innerHTML = `
    <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-slate-800">Produtos</h2>
        <button onclick="openProductForm()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold shadow flex items-center gap-2">
            <i data-lucide="plus"></i> Novo Produto
        </button>
    </div>
    <div class="flex gap-2 mb-4 bg-white p-4 rounded-xl shadow-sm border">
        <input type="text" id="prod-search" placeholder="Buscar produto por nome..." 
               class="w-full p-2 border rounded outline-none focus:border-indigo-600 font-medium"
               onkeyup="filtrarProdutos()">
        <select id="prod-category" class="w-1/3 p-2 border rounded outline-none focus:border-indigo-600 font-medium text-slate-600" onchange="filtrarProdutos()">
            <option value="">Todas as Categorias</option>
        </select>
    </div>
    <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table class="w-full text-sm text-left">
            <thead class="bg-slate-50 text-slate-700">
                <tr><th class="p-4">Produto</th><th class="p-4">Preço (R$)</th><th class="p-4">Estoque</th><th class="p-4 text-center">Editar</th></tr>
            </thead>
            <tbody id="prod-list" class="divide-y"></tbody>
        </table>
    </div>
    `;

    // Preenche categorias
    const catSelect = document.getElementById('prod-category');
    if (catSelect) {
        const categorias = [...new Set(STATE.products.map(p => p.category).filter(Boolean))];
        catSelect.innerHTML = '<option value="">Todas as Categorias</option>' +
            categorias.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    }

    filtrarProdutos();
    lucide.createIcons();
}

function filtrarProdutos() {
    const term = (document.getElementById('prod-search')?.value || '').toLowerCase();
    const cat = document.getElementById('prod-category')?.value || '';
    const list = document.getElementById('prod-list');
    if (!list) return;

    let filtered = STATE.products.slice();
    if (term) filtered = filtered.filter(p => p.name.toLowerCase().includes(term));
    if (cat) filtered = filtered.filter(p => p.category === cat);

    if (filtered.length === 0) {
        list.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-400">Nenhum produto encontrado.</td></tr>';
        return;
    }

    list.innerHTML = filtered.map(p => `
        <tr class="hover:bg-slate-50">
            <td class="p-4 font-bold text-slate-700">${p.name}<br><span class="text-[10px] text-slate-400 uppercase font-bold bg-slate-100 px-1 py-0.5 rounded">${p.category || 'Geral'}</span></td>
            <td class="p-4 font-medium">${formatMoney(p.price)}</td>
            <td class="p-4 font-bold"><div class="flex flex-col"><span class="text-xs text-slate-500">Disp: ${p.available}</span><span class="text-[10px] text-slate-400">Físico: ${p.stock}</span></div></td>
            <td class="p-4 text-center"><button onclick="openProductForm('${p.id}')" class="text-indigo-600 hover:text-indigo-800"><i data-lucide="edit-3" width="16"></i></button></td>
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
    if (error) { showLoading(false); return showToast("Erro: " + error.message, true); }

    document.getElementById('prod-form-container').classList.add('hidden');
    showToast("Produto Salvo!");
    await loadData();
    renderProducts();
}
