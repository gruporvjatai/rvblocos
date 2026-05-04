// ====== PDV / VENDAS (RV Blocos) ======

// Variáveis do carrinho
let CART = [];
let CURRENT_QUOTE_ID = null;

// ====== BUSCA E EXIBIÇÃO DE PRODUTOS ======
function renderPOSProducts() {
    const term = (document.getElementById('pos-search')?.value || '').toLowerCase();
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;

    const sorted = (STATE.products || []).slice().sort((a, b) => Number(a.id) - Number(b.id));

    grid.innerHTML = sorted
        .filter(p => p.name.toLowerCase().includes(term))
        .map(p => `
            <button onclick="addToCart('${p.id}')"
                class="p-3 border rounded-lg text-left hover:shadow-md transition flex flex-col justify-between h-24 bg-white hover:border-orange-400 group relative overflow-hidden">
                <h4 class="font-bold text-sm leading-tight text-slate-700 line-clamp-2">${p.name}</h4>
                <div class="flex justify-between items-end w-full">
                    <span class="text-green-700 font-bold">${formatMoney(p.price)}</span>
                    <span class="text-[10px] px-2 py-0.5 rounded ${p.available <= 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'} font-bold">Disp: ${p.available}</span>
                </div>
            </button>
        `).join('');
}

// ====== CARRINHO ======
function addToCart(id) {
    const p = STATE.products.find(x => String(x.id) === String(id));
    if (!p || !p.id) {
        showToast("Produto não encontrado.", true);
        return;
    }
    const existing = CART.find(x => String(x.prodId) === String(p.id));
    if (existing) {
        existing.qty++;
        existing.total = existing.qty * existing.price;
    } else {
        CART.push({
            prodId: p.id,
            name: p.name,
            price: p.price,
            qty: 1,
            total: p.price
        });
    }
    renderCart();
}

function updateCartItem(idx, field, value) {
    const item = CART[idx];
    if (field === 'qty') item.qty = parseFloat(value);
    else if (field === 'price') item.price = parseFloat(value);
    item.total = item.qty * item.price;
    renderCart();
}

function renderCart() {
    const box = document.getElementById('pos-cart-items');
    const indicator = document.getElementById('edit-mode-indicator');
    if (indicator) indicator.style.display = CURRENT_QUOTE_ID ? 'inline-block' : 'none';

    if (!CART.length) {
        box.innerHTML = '<p class="text-center text-slate-400 mt-10 text-sm">Vazio</p>';
        document.getElementById('pos-total-display').innerText = formatMoney(0);
        document.getElementById('cart-count').innerText = '0';
        return;
    }

    const totals = calculateTotal();

    box.innerHTML = CART.map((i, idx) => `
        <div class="bg-slate-50 p-3 rounded border border-slate-200 mb-2">
            <div class="flex justify-between items-start mb-2">
                <span class="text-sm font-bold text-slate-700">${i.name}</span>
                <button onclick="CART.splice(${idx},1);renderCart()" class="text-red-400 hover:text-red-600">
                    <i data-lucide="trash-2" width="16"></i>
                </button>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
                <div>
                    <label class="text-slate-500">Qtd</label>
                    <input type="number" value="${i.qty}" onchange="updateCartItem(${idx}, 'qty', this.value)" class="w-full p-1 border rounded text-center">
                </div>
                <div>
                    <label class="text-slate-500">Valor</label>
                    <input type="number" step="0.01" value="${i.price}" onchange="updateCartItem(${idx}, 'price', this.value)" class="w-full p-1 border rounded text-center">
                </div>
            </div>
            <div class="text-right font-bold text-slate-700 mt-1 border-t pt-1 border-slate-200">Total: ${formatMoney(i.total)}</div>
        </div>
    `).join('');

    document.getElementById('pos-total-display').innerText = formatMoney(totals.total);
    document.getElementById('cart-count').innerText = CART.length;
    lucide.createIcons();
}

function calculateTotal() {
    const sub = CART.reduce((a, b) => a + (b.qty * b.price), 0);
    const type = document.getElementById('pos-discount-type').value;
    const val = parseFloat(document.getElementById('pos-discount').value) || 0;
    let disc = (type === '%') ? (sub * (val / 100)) : val;
    return { sub, disc, total: Math.max(0, sub - disc) };
}

function clearCart() {
    CART = [];
    CURRENT_QUOTE_ID = null;
    document.getElementById('pos-discount').value = 0;
    document.getElementById('pos-custom-address-check').checked = false;
    document.getElementById('pos-custom-address-container').classList.add('hidden');
    document.getElementById('pos-custom-address').value = '';
    renderCart();
}

// ====== FINALIZAR VENDA ======
async function finalizeSale(isProntaEntrega = false) {
    if (!CART.length) return showToast("Vazio!", true);

    // Remove itens inválidos
    const invalid = CART.filter(i => !i.prodId);
    if (invalid.length) {
        showToast("Itens inválidos removidos. Verifique os produtos.", true);
        CART = CART.filter(i => i.prodId);
        renderCart();
        if (!CART.length) return;
    }

    showLoading(true);

    const totals = calculateTotal();
    const cliId = document.getElementById('pos-client').value;
    const client = STATE.clients.find(c => String(c.id) === String(cliId));
    const clientName = client ? client.name : 'Consumidor Final';
    const payment = document.getElementById('pos-payment').value;
    const customAddr = document.getElementById('pos-custom-address-check').checked;
    const deliveryAddr = customAddr ? document.getElementById('pos-custom-address').value : '';

    let dueDate = new Date();
    if (payment.includes("5")) dueDate.setDate(dueDate.getDate() + 5);
    else if (payment.includes("10")) dueDate.setDate(dueDate.getDate() + 10);
    else if (payment.includes("15")) dueDate.setDate(dueDate.getDate() + 15);
    else if (payment.includes("boleto") || payment.includes("prazo")) dueDate.setDate(dueDate.getDate() + 30);

    const timestamp = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString();
    const newSaleId = CURRENT_QUOTE_ID || getNextId(STATE.logs, STATE.quotes);
    const subtotalBruto = CART.reduce((a, i) => a + i.total, 0);
    const fator = subtotalBruto > 0 ? (totals.total / subtotalBruto) : 1;

    let logsToInsert = [];

    for (let item of CART) {
        if (!item.prodId) continue;

        const { data: fresh, error: fe } = await sb.from('produtos')
            .select('estoque_fisico, estoque_comprometido')
            .eq('id', item.prodId)
            .single();
        if (fe) { showLoading(false); return showToast("Erro ao ler estoque.", true); }

        let physical = Number(fresh.estoque_fisico) || 0;
        let committed = Number(fresh.estoque_comprometido) || 0;
        let update = {};

        if (isProntaEntrega) {
            update = { estoque_fisico: Math.max(0, physical - Number(item.qty)) };
        } else {
            update = { estoque_comprometido: committed + Number(item.qty) };
        }

        const { error: errProd } = await sb.from('produtos').update(update).eq('id', item.prodId);
        if (errProd) { showLoading(false); return showToast("Erro ao baixar estoque.", true); }

        const statusEntrega = isProntaEntrega ? 'ENTREGUE' : 'PENDENTE';
        const qtdEntregue = isProntaEntrega ? item.qty : 0;

        logsToInsert.push({
            id: newSaleId, tipo: 'venda', produto_nome: item.name, quantidade: item.qty,
            data: timestamp, observacao: isProntaEntrega ? 'Pronta Entrega PDV' : 'Venda PDV',
            valor_total: (item.total * fator),
            cliente_nome: clientName, forma_pagamento: payment, status: 'ATIVO',
            status_entrega: statusEntrega, qtd_entregue: qtdEntregue, desconto: totals.disc,
            status_financeiro: 'A RECEBER', vencimento: dueDate.toISOString(),
            valor_pago: 0, endereco_entrega: deliveryAddr
        });

        if (isProntaEntrega) {
            logsToInsert.push({
                id: getNextId(STATE.logs) + Math.floor(Math.random() * 1000),
                tipo: 'entrega', produto_nome: item.name, quantidade: item.qty,
                data: timestamp, observacao: 'Retirado na hora. Ref Venda #' + newSaleId,
                valor_total: 0, cliente_nome: clientName, forma_pagamento: '', status: 'ATIVO',
                status_entrega: 'ENTREGUE', qtd_entregue: item.qty, desconto: 0,
                status_financeiro: '', vencimento: timestamp, valor_pago: 0, endereco_entrega: ''
            });
        }
    }

    if (CURRENT_QUOTE_ID) {
        await sb.from('logs').delete().eq('id', CURRENT_QUOTE_ID).eq('tipo', 'orcamento');
    }

    const { error: errLog } = await sb.from('logs').insert(logsToInsert);
    if (errLog) { showLoading(false); return showToast("Erro ao registrar venda.", true); }

    clearCart();
    showToast(isProntaEntrega ? "Pronta Entrega!" : "Venda registrada!");
    await loadData();
    if (isProntaEntrega) navigate('pos');
    else navigate('expedition');
}

// ====== SALVAR ORÇAMENTO ======
async function saveQuote() {
    if (!CART.length) return showToast("Vazio!", true);
    showLoading(true);

    const totals = calculateTotal();
    const cliId = document.getElementById('pos-client').value;
    const clientName = STATE.clients.find(c => c.id == cliId)?.name || "Consumidor Final";
    const customAddr = document.getElementById('pos-custom-address-check').checked;
    const deliveryAddr = customAddr ? document.getElementById('pos-custom-address').value : '';
    const date = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString();
    const budgetId = CURRENT_QUOTE_ID || getNextId(STATE.logs, STATE.quotes);

    if (CURRENT_QUOTE_ID) await sb.from('logs').delete().eq('id', CURRENT_QUOTE_ID).eq('tipo', 'orcamento');

    const quotesToInsert = CART.map(item => ({
        id: budgetId, tipo: 'orcamento', produto_nome: item.name, quantidade: item.qty,
        data: date, observacao: '', valor_total: item.total, cliente_nome: clientName,
        forma_pagamento: document.getElementById('pos-payment').value, status: 'ABERTO',
        desconto: totals.disc, status_financeiro: document.getElementById('pos-discount-type').value,
        endereco_entrega: deliveryAddr, status_entrega: '', qtd_entregue: 0, vencimento: date, valor_pago: 0
    }));

    const { error } = await sb.from('logs').insert(quotesToInsert);
    if (error) { showLoading(false); return showToast("Erro: " + error.message, true); }

    clearCart();
    showToast("Orçamento salvo!");
    await loadData();
    navigate('quotes');
}

// ====== CARREGAR ORÇAMENTO NO CARRINHO ======
function loadQuoteToCart(id) {
    const q = STATE.quotes.find(x => x.id == id);
    if (!q) return;

    CART = q.items.map(item => {
        const prod = STATE.products.find(p => String(p.name).trim().toLowerCase() === String(item.name).trim().toLowerCase());
        return {
            prodId: prod ? prod.id : null,
            name: item.name,
            price: item.price,
            qty: item.qty,
            total: item.total
        };
    });

    const invalid = CART.filter(i => !i.prodId);
    if (invalid.length) {
        showToast(`${invalid.length} produto(s) não encontrados no cadastro. Foram removidos.`, true);
        CART = CART.filter(i => i.prodId);
    }

    CURRENT_QUOTE_ID = q.id;

    const clientSelect = document.getElementById('pos-client');
    const clientObj = STATE.clients.find(c => String(c.name).trim() === String(q.clientName).trim());
    if (clientObj) clientSelect.value = clientObj.id;

    document.getElementById('pos-payment').value = q.paymentMethod || 'Dinheiro';
    document.getElementById('pos-discount-type').value = q.discountType || '$';
    document.getElementById('pos-discount').value = q.discount || 0;

    if (q.deliveryAddress) {
        document.getElementById('pos-custom-address-check').checked = true;
        document.getElementById('pos-custom-address-container').classList.remove('hidden');
        document.getElementById('pos-custom-address').value = q.deliveryAddress;
    } else {
        document.getElementById('pos-custom-address-check').checked = false;
        document.getElementById('pos-custom-address-container').classList.add('hidden');
        document.getElementById('pos-custom-address').value = '';
    }

    navigate('pos');
    renderCart();
    showToast(`Editando Orçamento #${q.id}`);
}

// ====== ENDEREÇO CUSTOM ======
function toggleCustomAddress() {
    const check = document.getElementById('pos-custom-address-check').checked;
    const container = document.getElementById('pos-custom-address-container');
    const input = document.getElementById('pos-custom-address');
    if (check) {
        container.classList.remove('hidden');
        input.focus();
    } else {
        container.classList.add('hidden');
        input.value = '';
    }
}

// ====== SELECT DE CLIENTE ======
function updateClientSelects() {
    const opts = '<option value="">Consumidor Final</option>' +
        (STATE.clients || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const el = document.getElementById('pos-client');
    if (el) el.innerHTML = opts;
}

// ====== MODAL DE HISTÓRICO DE VENDAS ======
function openPosHistoryModal() {
    document.getElementById('pos-history-modal').classList.remove('hidden');
    renderRecentHistoryModal();
}

function closePosHistoryModal() {
    document.getElementById('pos-history-modal').classList.add('hidden');
}

function renderRecentHistoryModal() {
    const salesMap = {};
    (STATE.logs || []).filter(l => l.type === 'venda' && l.status !== 'CANCELADO').forEach(l => {
        if (!salesMap[l.id]) salesMap[l.id] = { id: l.id, date: l.date, client: l.clientName, valorFinal: 0 };
        salesMap[l.id].valorFinal += l.totalValue;
    });
    let sales = Object.values(salesMap).sort((a, b) => b.id - a.id);

    const term = document.getElementById('pos-hist-search')?.value.toLowerCase() || '';
    const dt1 = document.getElementById('pos-hist-start')?.value;
    const dt2 = document.getElementById('pos-hist-end')?.value;
    if (term) sales = sales.filter(s => (s.client && s.client.toLowerCase().includes(term)) || String(s.id).includes(term));
    if (dt1) sales = sales.filter(s => (s.date || '').split('T')[0] >= dt1);
    if (dt2) sales = sales.filter(s => (s.date || '').split('T')[0] <= dt2);

    const tbody = document.getElementById('pos-recent-history-modal');
    if (!tbody) return;

    if (!sales.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-400">Nenhuma venda encontrada.</td></tr>';
        return;
    }

    tbody.innerHTML = sales.map(s => `
        <tr class="border-b hover:bg-slate-50">
            <td class="p-3 text-xs font-bold text-slate-500">#${s.id}<br><span class="text-[10px] font-normal">${formatDate(s.date)}</span></td>
            <td class="p-3 text-xs font-bold text-slate-700 max-w-[120px] truncate">${s.client}</td>
            <td class="p-3 text-sm font-bold text-green-700 text-right">${formatMoney(s.valorFinal)}</td>
            <td class="p-3 flex gap-1 justify-center">
                <button onclick="downloadSalePDF('${s.id}')" class="text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 p-2 rounded shadow-sm"><i data-lucide="file-down" width="14"></i></button>
                <button onclick="reprintSale('${s.id}')" class="text-slate-600 hover:text-orange-600 bg-white border border-slate-200 p-2 rounded shadow-sm"><i data-lucide="printer" width="14"></i></button>
                <button onclick="duplicateSaleToQuote('${s.id}')" class="text-amber-500 hover:text-amber-700 bg-white border border-amber-200 p-2 rounded shadow-sm"><i data-lucide="copy" width="14"></i></button>
                <button onclick="estornarVenda('${s.id}')" class="text-red-500 hover:text-red-700 bg-white border border-red-200 p-2 rounded shadow-sm"><i data-lucide="rotate-ccw" width="14"></i></button>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

// ====== AÇÕES DO HISTÓRICO ======
function reprintSale(id) {
    const items = STATE.logs.filter(l => String(l.id) === String(id) && l.type === 'venda' && l.status !== 'CANCELADO');
    if (!items.length) return showToast("Venda não encontrada", true);
    // Usa a função de impressão (definida em outro módulo ou inline)
    if (typeof printSaleOrder === 'function') printSaleOrder(id);
    else showToast("Função de impressão indisponível", true);
}

async function duplicateSaleToQuote(saleId) {
    if (!confirm("Duplicar esta venda como orçamento?")) return;
    showLoading(true);
    const items = STATE.logs.filter(l => String(l.id) === String(saleId) && l.type === 'venda');
    if (!items.length) { showLoading(false); return showToast("Venda não encontrada", true); }
    const newId = getNextId(STATE.logs, STATE.quotes);
    const date = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString();
    const insert = items.map(i => ({
        id: newId, tipo: 'orcamento', produto_nome: i.productName, quantidade: i.quantity,
        data: date, observacao: i.note === 'Venda PDV' || i.note === 'Pronta Entrega PDV' ? '' : i.note,
        valor_total: i.totalValue, cliente_nome: i.clientName,
        forma_pagamento: i.paymentMethod || 'Dinheiro', status: 'ABERTO',
        desconto: 0, status_financeiro: '$', endereco_entrega: i.deliveryAddress || '',
        status_entrega: '', qtd_entregue: 0, vencimento: date, valor_pago: 0
    }));
    const { error } = await sb.from('logs').insert(insert);
    if (error) { showLoading(false); return showToast("Erro ao duplicar.", true); }
    showToast("Venda duplicada para orçamento!");
    await loadData();
    navigate('quotes');
}

async function estornarVenda(saleId) {
    if (!confirm("Estornar venda e retornar ao orçamento?")) return;
    showLoading(true);
    const items = STATE.logs.filter(l => String(l.id) === String(saleId) && l.type === 'venda');
    if (!items.length) { showLoading(false); return showToast("Venda não encontrada", true); }
    try {
        for (let item of items) {
            const prod = STATE.products.find(p => p.name === item.productName);
            if (prod) {
                const { data: fresh } = await sb.from('produtos').select('estoque_fisico, estoque_comprometido').eq('id', prod.id).single();
                let physical = Number(fresh.estoque_fisico) || 0;
                let committed = Number(fresh.estoque_comprometido) || 0;
                let delivered = Number(item.deliveredQty) || 0;
                let pending = Number(item.quantity) - delivered;
                if (pending < 0) pending = 0;
                await sb.from('produtos').update({
                    estoque_fisico: physical + delivered,
                    estoque_comprometido: Math.max(0, committed - pending)
                }).eq('id', prod.id);
            }
        }
        await sb.from('logs').delete().like('observacao', `%Ref Venda #${saleId}%`).eq('tipo', 'entrega');
        await sb.from('logs').delete().like('observacao', `%Ref Venda #${saleId}%`).eq('tipo', 'recebimento');
        for (let item of items) {
            await sb.from('logs').update({
                tipo: 'orcamento', status: 'ABERTO', status_entrega: '', qtd_entregue: 0,
                valor_pago: 0, status_financeiro: '$'
            }).eq('uid', item.uid);
        }
        showToast("Venda estornada!");
        await loadData();
    } catch (e) {
        showLoading(false);
        showToast("Erro ao estornar: " + e.message, true);
    }
}

// O download PDF fica como função dummy ou delegada para um módulo de impressão
function downloadSalePDF(id) {
    // será implementada no módulo de impressão
    showToast("Download PDF em desenvolvimento.", true);
}
