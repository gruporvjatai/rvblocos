// =================================================================
// MÓDULO EXPEDIÇÃO / ENTREGAS - RV BLOCOS
// =================================================================

// =================================================================
// RENDER PRINCIPAL - chamado por navigate('expedition')
// =================================================================
function renderExpedition() {
    const container = document.getElementById('view-expedition');
    if (!container) return;

    container.innerHTML = `
    <h2 class="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <i data-lucide="truck"></i> Expedição / Entregas Pendentes
    </h2>

    <!-- Tabela de Pendentes -->
    <div class="bg-white rounded-xl border shadow-sm overflow-hidden mb-8">
        <div class="overflow-x-auto max-h-[40vh]">
            <table class="w-full text-sm text-left">
                <thead class="bg-slate-50 text-slate-700 sticky top-0 z-10">
                    <tr>
                        <th class="p-4 w-28 text-center">Ações</th>
                        <th class="p-4">Pedido/Data</th>
                        <th class="p-4">Cliente</th>
                        <th class="p-4">Produto</th>
                        <th class="p-4 w-1/3">Progresso Entrega</th>
                        <th class="p-4 text-center">Status</th>
                    </tr>
                </thead>
                <tbody id="expedition-list" class="divide-y"></tbody>
            </table>
        </div>
    </div>

    <!-- Filtros do Histórico -->
    <div class="flex flex-col xl:flex-row justify-between items-center mb-4 gap-4 mt-8 border-t pt-6">
        <h2 class="text-xl font-bold text-slate-800 flex items-center gap-2">
            <i data-lucide="history"></i> Histórico de Entregas Realizadas
        </h2>
        <div class="flex flex-wrap gap-2 items-center">
            <div class="relative">
                <i data-lucide="search" class="absolute left-2 top-2 text-slate-400 w-4 h-4"></i>
                <input type="text" id="exp-hist-name" placeholder="Buscar cliente ou produto..." 
                       class="pl-8 p-2 border rounded text-xs focus:ring-2 focus:ring-orange-500 outline-none bg-white shadow-sm w-48 xl:w-64" 
                       onkeyup="renderExpedition()">
            </div>
            <input type="date" id="exp-hist-start" 
                   class="p-2 border rounded text-xs focus:ring-2 focus:ring-orange-500 outline-none bg-white shadow-sm" 
                   onchange="renderExpedition()">
            <span class="text-slate-400 self-center text-sm font-medium">Até</span>
            <input type="date" id="exp-hist-end" 
                   class="p-2 border rounded text-xs focus:ring-2 focus:ring-orange-500 outline-none bg-white shadow-sm" 
                   onchange="renderExpedition()">
            <button onclick="document.getElementById('exp-hist-start').value=''; document.getElementById('exp-hist-end').value=''; document.getElementById('exp-hist-name').value=''; renderExpedition()" 
                    class="p-2 bg-slate-200 hover:bg-slate-300 rounded text-xs shadow-sm" title="Limpar Filtros">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
            <button onclick="printExpeditionHistory()" 
                    class="p-2 bg-slate-800 text-white hover:bg-slate-700 rounded text-xs shadow-sm flex items-center gap-2 font-bold ml-2">
                <i data-lucide="printer" class="w-4 h-4"></i> Imprimir
            </button>
        </div>
    </div>

    <!-- Tabela de Histórico -->
    <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div class="overflow-x-auto max-h-[40vh]">
            <table class="w-full text-sm text-left">
                <thead class="bg-slate-50 text-slate-700 sticky top-0 z-10">
                    <tr>
                        <th class="p-4">Data da Entrega</th>
                        <th class="p-4">Ref. Pedido</th>
                        <th class="p-4">Cliente</th>
                        <th class="p-4">Produto</th>
                        <th class="p-4 text-center">Qtd Entregue</th>
                    </tr>
                </thead>
                <tbody id="expedition-history-list" class="divide-y"></tbody>
            </table>
        </div>
    </div>
    `;

    // Preenche as tabelas
    carregarPendentes();
    carregarHistorico();

    lucide.createIcons();
}

// =================================================================
// CARREGAR ENTREGAS PENDENTES
// =================================================================
function carregarPendentes() {
    const tbody = document.getElementById('expedition-list');
    if (!tbody) return;

    const items = (STATE.logs || []).filter(l =>
        l.type === 'venda' &&
        l.status !== 'CANCELADO' &&
        l.deliveryStatus !== 'ENTREGUE'
    );

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">Nenhuma entrega pendente.</td></tr>';
        return;
    }

    tbody.innerHTML = items.map(i => {
        const delivered = i.deliveredQty || 0;
        const total = i.quantity;
        const remain = total - delivered;
        const percent = Math.min(100, (delivered / total) * 100);
        const safeName = encodeURIComponent(i.productName);

        return `<tr class="hover:bg-slate-50 border-b">
            <td class="p-4 text-center flex gap-2 justify-center">
                <button onclick="openDeliveryModal('${i.id}', '${safeName}')" 
                        class="bg-slate-800 text-white p-2 rounded hover:bg-slate-700 shadow-md" title="Registrar Entrega">
                    <i data-lucide="truck" width="18"></i>
                </button>
                <button onclick="printOrder('${i.id}', '${safeName}')" 
                        class="bg-white text-slate-600 border border-slate-200 p-2 rounded hover:text-orange-600 shadow-sm" title="Imprimir Romaneio">
                    <i data-lucide="printer" width="18"></i>
                </button>
            </td>
            <td class="p-4">
                <div class="font-bold text-slate-700 text-sm">#${i.id}</div>
                <div class="text-xs text-slate-400">${formatDate(i.date)}</div>
            </td>
            <td class="p-4 font-bold text-slate-700 truncate max-w-[150px]">${i.clientName}</td>
            <td class="p-4 text-sm">${i.productName}</td>
            <td class="p-4">
                <div class="flex justify-between text-xs mb-1 font-bold">
                    <span>${delivered}/${total}</span>
                    <span class="text-orange-600">Falta: ${remain}</span>
                </div>
                <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div class="bg-green-500 h-2 rounded-full" style="width: ${percent}%"></div>
                </div>
            </td>
            <td class="p-4 text-center">
                <span class="px-2 py-1 rounded text-[10px] font-bold ${
                    i.deliveryStatus === 'PARCIAL' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                }">${i.deliveryStatus}</span>
            </td>
        </tr>`;
    }).join('');

    lucide.createIcons();
}

// =================================================================
// CARREGAR HISTÓRICO DE ENTREGAS (JÁ REALIZADAS)
// =================================================================
function carregarHistorico() {
    const histBody = document.getElementById('expedition-history-list');
    if (!histBody) return;

    let histLogs = (STATE.logs || []).filter(l => l.type === 'entrega' && l.status !== 'CANCELADO');
    const nameFilter = (document.getElementById('exp-hist-name')?.value || '').toLowerCase();
    const startDate = document.getElementById('exp-hist-start')?.value;
    const endDate = document.getElementById('exp-hist-end')?.value;

    if (nameFilter) {
        histLogs = histLogs.filter(l =>
            (l.clientName && l.clientName.toLowerCase().includes(nameFilter)) ||
            (l.productName && l.productName.toLowerCase().includes(nameFilter))
        );
    }
    if (startDate) histLogs = histLogs.filter(l => new Date(l.date) >= new Date(startDate));
    if (endDate) {
        let endD = new Date(endDate);
        endD.setHours(23, 59, 59);
        histLogs = histLogs.filter(l => new Date(l.date) <= endD);
    }

    histLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (histLogs.length === 0) {
        histBody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-400">Nenhum registro encontrado.</td></tr>';
        return;
    }

    histBody.innerHTML = histLogs.map(l => `
        <tr class="hover:bg-slate-50 border-b">
            <td class="p-4 text-xs text-slate-500">${formatDate(l.date)}</td>
            <td class="p-4 text-xs font-bold text-slate-700">${l.note || '-'}</td>
            <td class="p-4 font-medium text-slate-700 truncate max-w-[200px]">${l.clientName || '-'}</td>
            <td class="p-4 text-sm">${l.productName}</td>
            <td class="p-4 text-center font-bold text-green-600 flex items-center justify-between">
                <span>+${l.quantity}</span>
                <button onclick="estornarEntregaLog('${l.uid}')" class="text-red-400 hover:text-red-600 p-1" title="Estornar Entrega">
                    <i data-lucide="rotate-ccw" width="14"></i>
                </button>
            </td>
        </tr>
    `).join('');

    lucide.createIcons();
}

// =================================================================
// MODAL DE REGISTRO DE ENTREGA
// =================================================================
function openDeliveryModal(orderId, encodedProdName) {
    const productName = decodeURIComponent(encodedProdName);
    const item = STATE.logs.find(l =>
        String(l.id) === String(orderId) &&
        l.type === 'venda' &&
        l.productName === productName
    );
    if (!item) return;

    document.getElementById('del-log-id').value = orderId;
    document.getElementById('del-log-prod').value = productName;
    document.getElementById('del-prod-name').innerText = item.productName;
    document.getElementById('del-client-name').innerText = item.clientName;

    const delivered = item.deliveredQty || 0;
    const remain = item.quantity - delivered;

    document.getElementById('del-qty-total').innerText = item.quantity;
    document.getElementById('del-qty-done').innerText = delivered;
    document.getElementById('del-qty-remain').innerText = remain;

    const input = document.getElementById('del-qty-input');
    input.value = remain;
    input.max = remain;

    document.getElementById('modal-delivery').classList.remove('hidden');
}

function closeDeliveryModal() {
    document.getElementById('modal-delivery').classList.add('hidden');
}

// =================================================================
// CONFIRMAR ENTREGA
// =================================================================
async function confirmDelivery() {
    const orderId = document.getElementById('del-log-id').value;
    const productName = document.getElementById('del-log-prod').value;
    const qty = parseFloat(document.getElementById('del-qty-input').value);

    if (isNaN(qty) || qty <= 0) return showToast("Quantidade inválida.", true);

    showLoading(true);

    try {
        // Localiza o log de venda original
        const origLog = STATE.logs.find(l =>
            String(l.id) === String(orderId) &&
            l.type === 'venda' &&
            l.productName === productName
        );
        if (!origLog) throw new Error("Pedido não encontrado.");

        const newDelivered = (Number(origLog.deliveredQty) || 0) + qty;
        const newStatus = newDelivered >= Number(origLog.quantity) ? 'ENTREGUE' : 'PARCIAL';

        await sb.from('logs').update({
            qtd_entregue: newDelivered,
            status_entrega: newStatus
        }).eq('uid', origLog.uid);

        // Atualiza estoque
        const prod = STATE.products.find(p => p.name.trim() === productName.trim());
        if (prod) {
            const { data: fresh } = await sb.from('produtos').select('estoque_fisico, estoque_comprometido').eq('id', prod.id).single();
            const physical = Number(fresh.estoque_fisico) || 0;
            const committed = Number(fresh.estoque_comprometido) || 0;

            await sb.from('produtos').update({
                estoque_fisico: Math.max(0, physical - qty),
                estoque_comprometido: Math.max(0, committed - qty)
            }).eq('id', prod.id);
        }

        // Cria log de entrega
        const newId = getNextId(STATE.logs);
        const timestamp = new Date().toISOString();
        await sb.from('logs').insert([{
            id: newId,
            tipo: 'entrega',
            produto_nome: productName,
            quantidade: qty,
            data: timestamp,
            observacao: 'Ref Venda #' + orderId,
            valor_total: 0,
            cliente_nome: origLog.clientName,
            forma_pagamento: '',
            status: 'ATIVO',
            status_entrega: 'ENTREGUE',
            qtd_entregue: qty,
            desconto: 0,
            status_financeiro: '',
            vencimento: timestamp,
            valor_pago: 0,
            endereco_entrega: ''
        }]);

        closeDeliveryModal();
        showToast("Entrega registrada!");
        await loadData();
    } catch (e) {
        showLoading(false);
        showToast("Erro: " + e.message, true);
    }
}

// =================================================================
// ESTORNAR ENTREGA
// =================================================================
async function estornarEntregaLog(uid) {
    if (!confirm("Estornar esta entrega?")) return;
    showLoading(true);

    try {
        const entregaLog = STATE.logs.find(l => String(l.uid) === String(uid) && l.type === 'entrega');
        if (!entregaLog) throw new Error("Log de entrega não encontrado.");

        const orderIdMatch = entregaLog.note.match(/#(\d+)/);
        if (!orderIdMatch) throw new Error("ID do pedido não identificado.");
        const orderId = orderIdMatch[1];

        const vendaItem = STATE.logs.find(l =>
            String(l.id) === String(orderId) &&
            l.type === 'venda' &&
            l.productName === entregaLog.productName
        );
        if (vendaItem) {
            const newDelivered = Math.max(0, (Number(vendaItem.deliveredQty) || 0) - entregaLog.quantity);
            const totalQty = Number(vendaItem.quantity) || 0;
            const newStatus = newDelivered === 0 ? 'PENDENTE' : (newDelivered < totalQty ? 'PARCIAL' : 'ENTREGUE');
            await sb.from('logs').update({
                qtd_entregue: newDelivered,
                status_entrega: newStatus
            }).eq('uid', vendaItem.uid);

            const prod = STATE.products.find(p => p.name === entregaLog.productName);
            if (prod) {
                const { data: fresh } = await sb.from('produtos').select('estoque_fisico, estoque_comprometido').eq('id', prod.id).single();
                const physical = Number(fresh.estoque_fisico) || 0;
                const committed = Number(fresh.estoque_comprometido) || 0;
                await sb.from('produtos').update({
                    estoque_fisico: physical + entregaLog.quantity,
                    estoque_comprometido: committed + entregaLog.quantity
                }).eq('id', prod.id);
            }
        }

        await sb.from('logs').delete().eq('uid', uid);
        showToast("Entrega estornada!");
        await loadData();
    } catch (e) {
        showLoading(false);
        showToast("Erro: " + e.message, true);
    }
}

// =================================================================
// IMPRIMIR ROMANEIO
// =================================================================
function printOrder(id, encodedProdName) {
    const productName = decodeURIComponent(encodedProdName);
    const item = STATE.logs.find(l =>
        String(l.id) === String(id) &&
        l.type === 'venda' &&
        l.productName === productName
    );
    if (!item) return showToast("Pedido não encontrado", true);

    const cli = STATE.clients.find(c => c.name === item.clientName) || {
        name: item.clientName, doc: '-', phone: '-', address: '-'
    };
    const delivered = item.deliveredQty || 0;
    const remain = item.quantity - delivered;

    const CAPACIDADE_POR_VIAGEM = 160;
    const viagens = Math.ceil(item.quantity / CAPACIDADE_POR_VIAGEM);

    let viagensHtml = '';
    for (let i = 0; i < viagens; i++) {
        viagensHtml += `
            <tr>
                <td style="border:1px solid #000; padding:8px; text-align:center; font-weight:bold;">${i + 1}</td>
                <td style="border:1px solid #000; padding:8px; text-align:center;">
                    <div style="display:inline-block; min-width:60px; border-bottom:2px dashed #000;">&nbsp;</div>
                </td>
                <td style="border:1px solid #000; padding:8px; text-align:center;">
                    <div style="display:inline-block; min-width:150px; border-bottom:1px solid #000;">&nbsp;</div>
                </td>
            </tr>
        `;
    }

    const company = {
        name: "RV BLOCOS E ESTRUTURAS",
        cnpj: "46.889.791/0001-53",
        phone: "(64) 3636-4861",
        address: "Jataí - GO",
        logoUrl: "https://lh3.googleusercontent.com/d/1SIoZ2JlalfMnGDZTXBk7ZYuPgwxX3odF"
    };

    const addressToShow = item.deliveryAddress
        ? `<span style="background:#fffbeb; padding:2px 5px; font-weight:bold; color:#b45309; border:1px dashed #f59e0b;">ENTREGA: ${item.deliveryAddress}</span>`
        : (cli.address || '-');

    const printArea = document.getElementById('print-area');
    printArea.innerHTML = `
    <style>
        .invoice-box-orig::before { content: none !important; background-image: none !important; opacity:0 !important; display:none !important; }
    </style>
    <div class="invoice-box-orig" style="font-family:'Helvetica',sans-serif; max-width:800px; margin:auto; padding:15px;">
        <div class="header-orig" style="display:flex; border:1px solid #000;">
            <div class="logo-box-orig" style="width:100px; padding:5px; border-right:1px solid #000; display:flex; align-items:center; justify-content:center;">
                <img src="${company.logoUrl}" style="max-height:80px;" />
            </div>
            <div class="company-box-orig" style="flex:1; padding:10px; border-right:1px solid #000;">
                <h2 style="margin:0; font-size:18px; font-weight:bold; color:#ea580c;">${company.name}</h2>
                <p style="margin:2px 0; font-size:12px;">CNPJ: ${company.cnpj}</p>
                <p style="margin:2px 0; font-size:12px;">${company.address} | ${company.phone}</p>
            </div>
            <div class="info-box-orig" style="width:180px; padding:10px; background:#f9f9f9; text-align:right;">
                <h3 style="margin:0; font-size:14px; font-weight:bold;">ROMANEIO</h3>
                <p>Pedido Nº ${item.id}</p>
            </div>
        </div>
        <div style="background:#f8fafc; border:1px solid #000; border-top:none; padding:10px; margin-bottom:15px;">
            <table style="width:100%; font-size:12px;">
                <tr><td style="font-weight:bold;">CLIENTE:</td><td>${cli.name}</td><td>DOC:</td><td>${cli.doc}</td></tr>
                <tr><td style="font-weight:bold;">END:</td><td colspan="3">${addressToShow}</td></tr>
                <tr><td style="font-weight:bold;">TEL:</td><td colspan="3">${cli.phone}</td></tr>
            </table>
        </div>
        <div class="section-title-orig">ITENS DO PEDIDO</div>
        <table class="items-table-orig" style="width:100%; border-collapse:collapse; font-size:12px; border:1px solid #000;">
            <thead><tr><th>Produto</th><th>Qtd. Total</th><th>Já Entregue</th><th>Saldo Pendente</th></tr></thead>
            <tbody>
                <tr>
                    <td style="font-weight:bold;">${item.productName}</td>
                    <td style="text-align:center;">${item.quantity}</td>
                    <td style="text-align:center;">${delivered}</td>
                    <td style="text-align:center; font-weight:bold; background:#fff7ed;">${remain}</td>
                </tr>
            </tbody>
        </table>
        <div style="margin-top:20px;">
            <div class="section-title-orig">CONTROLE DE VIAGENS (Capacidade: ${CAPACIDADE_POR_VIAGEM} peças)</div>
            <table class="items-table-orig" style="width:100%; border-collapse:collapse; font-size:12px; border:1px solid #000;">
                <thead><tr><th>Viagem Nº</th><th>Quantidade</th><th>Assinatura do Cliente</th></tr></thead>
                <tbody>${viagensHtml}</tbody>
            </table>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:40px;">
            <div style="width:45%; text-align:center;"><div style="border-top:1px solid #000; margin-bottom:5px;"></div><span>CONFERENTE</span></div>
            <div style="width:45%; text-align:center;"><div style="border-top:1px solid #000; margin-bottom:5px;"></div><span>RECEBIMENTO</span></div>
        </div>
    </div>`;

    setTimeout(() => { window.print(); limparAreaImpressao(); }, 500);
}

// =================================================================
// IMPRIMIR HISTÓRICO DE ENTREGAS
// =================================================================
function printExpeditionHistory() {
    let histLogs = (STATE.logs || []).filter(l => l.type === 'entrega' && l.status !== 'CANCELADO');

    const nameFilter = (document.getElementById('exp-hist-name')?.value || '').toLowerCase();
    const startDate = document.getElementById('exp-hist-start')?.value;
    const endDate = document.getElementById('exp-hist-end')?.value;

    if (nameFilter) {
        histLogs = histLogs.filter(l =>
            (l.clientName && l.clientName.toLowerCase().includes(nameFilter)) ||
            (l.productName && l.productName.toLowerCase().includes(nameFilter))
        );
    }
    if (startDate) histLogs = histLogs.filter(l => new Date(l.date) >= new Date(startDate));
    if (endDate) {
        let endD = new Date(endDate);
        endD.setHours(23, 59, 59);
        histLogs = histLogs.filter(l => new Date(l.date) <= endD);
    }
    histLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (histLogs.length === 0) return showToast("Nenhum dado para imprimir", true);

    let totalItems = 0;
    const rowsHtml = histLogs.map(l => {
        totalItems += Number(l.quantity) || 0;
        return `<tr>
            <td style="border-bottom:1px solid #ccc; border-right:1px solid #000; padding:5px;">${formatDate(l.date)}</td>
            <td style="border-bottom:1px solid #ccc; border-right:1px solid #000; padding:5px; font-weight:bold;">${l.note || '-'}</td>
            <td style="border-bottom:1px solid #ccc; border-right:1px solid #000; padding:5px; font-weight:bold;">${l.clientName || '-'}</td>
            <td style="border-bottom:1px solid #ccc; border-right:1px solid #000; padding:5px;">${l.productName}</td>
            <td style="border-bottom:1px solid #ccc; padding:5px; text-align:center; font-weight:bold;">${l.quantity}</td>
        </tr>`;
    }).join('');

    const company = {
        name: "RV BLOCOS E ESTRUTURAS",
        cnpj: "46.889.791/0001-53",
        logoUrl: "https://lh3.googleusercontent.com/d/1SIoZ2JlalfMnGDZTXBk7ZYuPgwxX3odF"
    };

    const printArea = document.getElementById('print-area');
    printArea.innerHTML = `
    <div class="invoice-box-orig" style="font-family:'Helvetica',sans-serif; max-width:800px; margin:auto; padding:15px;">
        <div class="header-orig" style="display:flex; border:1px solid #000;">
            <div class="logo-box-orig" style="width:100px; padding:5px; border-right:1px solid #000; display:flex; align-items:center; justify-content:center;">
                <img src="${company.logoUrl}" style="max-height:80px;" />
            </div>
            <div class="company-box-orig" style="flex:1; padding:10px;">
                <h2 style="margin:0; color:#ea580c;">${company.name}</h2>
                <p>CNPJ: ${company.cnpj}</p>
            </div>
            <div class="info-box-orig" style="width:200px; padding:10px; background:#f9f9f9; text-align:right;">
                <h3>RELATÓRIO DE EXPEDIÇÃO</h3>
                <p>${new Date().toLocaleDateString()}</p>
            </div>
        </div>
        <div class="section-title-orig">REGISTROS DE ENTREGA</div>
        <table class="items-table-orig" style="width:100%; border-collapse:collapse; font-size:11px; border:1px solid #000;">
            <thead><tr><th>Data</th><th>Ref.</th><th>Cliente</th><th>Produto</th><th>Qtd</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot><tr style="background:#fff7ed;"><td colspan="4" style="text-align:right; font-weight:bold;">TOTAL</td><td style="font-weight:bold; text-align:center;">${totalItems}</td></tr></tfoot>
        </table>
    </div>`;

    setTimeout(() => { window.print(); limparAreaImpressao(); }, 500);
}

// =================================================================
// LIMPEZA DA ÁREA DE IMPRESSÃO (definida em utils.js)
// =================================================================
// A função limparAreaImpressao() deve estar em utils.js
