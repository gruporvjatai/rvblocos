// ====== EXPEDIÇÃO / ENTREGAS ======

// ====== RENDERIZAÇÃO PRINCIPAL ======
function renderExpedition() {
    const tbody = document.getElementById('expedition-list');
    if (!tbody) return;

    // Filtra apenas vendas ativas que ainda não foram 100% entregues
    const items = (STATE.logs || []).filter(l =>
        l.type === 'venda' &&
        l.status !== 'CANCELADO' &&
        l.deliveryStatus !== 'ENTREGUE'
    );

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">Nenhuma entrega pendente.</td></tr>';
    } else {
        tbody.innerHTML = items.map(i => {
            const delivered = i.deliveredQty || 0;
            const total = i.quantity;
            const remain = total - delivered;
            const percent = Math.min(100, (delivered / total) * 100);
            const safeName = encodeURIComponent(i.productName);

            return `<tr class="hover:bg-slate-50 border-b">
                <td class="p-4 text-center flex gap-2 justify-center">
                    <button onclick="openDeliveryModal('${i.id}', '${safeName}')" class="bg-slate-800 text-white p-2 rounded hover:bg-slate-700 shadow-md" title="Registrar Entrega">
                        <i data-lucide="truck" width="18"></i>
                    </button>
                    <button onclick="printOrder('${i.id}', '${safeName}')" class="bg-white text-slate-600 border border-slate-200 p-2 rounded hover:text-orange-600 shadow-sm" title="Imprimir Romaneio">
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
                        i.deliveryStatus === 'PARCIAL'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-slate-100 text-slate-500'
                    }">${i.deliveryStatus}</span>
                </td>
            </tr>`;
        }).join('');
    }

    // ----- HISTÓRICO DE ENTREGAS (já realizadas) -----
    const histBody = document.getElementById('expedition-history-list');
    if (!histBody) return;

    let histLogs = (STATE.logs || []).filter(l => l.type === 'entrega' && l.status !== 'CANCELADO');
    const nameFilter = document.getElementById('exp-hist-name')?.value.toLowerCase() || '';
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
    } else {
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
    }

    lucide.createIcons();
}

// ====== MODAL DE REGISTRO DE ENTREGA ======
function openDeliveryModal(id, encodedProdName) {
    const productName = decodeURIComponent(encodedProdName);
    const item = STATE.logs.find(l =>
        String(l.id) === String(id) &&
        l.type === 'venda' &&
        l.productName === productName
    );
    if (!item) return;

    document.getElementById('del-log-id').value = id;
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

// ====== CONFIRMAR ENTREGA (atualização de estoque e log) ======
async function confirmDelivery() {
    const id = document.getElementById('del-log-id').value;
    const productName = document.getElementById('del-log-prod').value;
    const qty = parseFloat(document.getElementById('del-qty-input').value);

    if (isNaN(qty) || qty <= 0) {
        showToast("Quantidade inválida.", true);
        return;
    }

    showLoading(true);

    // Localiza o log de venda original
    let origLog = null;
    for (let i = 0; i < STATE.logs.length; i++) {
        if (
            String(STATE.logs[i].id) === String(id) &&
            STATE.logs[i].type === 'venda' &&
            STATE.logs[i].productName === productName
        ) {
            origLog = STATE.logs[i];
            break;
        }
    }

    if (!origLog) {
        showLoading(false);
        return showToast("Pedido ou produto não encontrado.", true);
    }

    const totalQty = Number(origLog.quantity) || 0;
    const currentDelivered = Number(origLog.deliveredQty) || 0;
    const newDelivered = currentDelivered + qty;
    const newStatus = newDelivered >= totalQty ? 'ENTREGUE' : 'PARCIAL';

    // Atualiza status na venda
    const { error: errUpdate } = await sb.from('logs')
        .update({ qtd_entregue: newDelivered, status_entrega: newStatus })
        .eq('uid', origLog.uid);

    if (errUpdate) {
        showLoading(false);
        return showToast("Erro ao atualizar venda: " + errUpdate.message, true);
    }

    // Busca produto no estoque
    const prodFound = STATE.products.find(p => p.name.trim() === productName.trim());
    if (!prodFound) {
        showLoading(false);
        return showToast("Produto não encontrado no cadastro.", true);
    }

    // Obtém saldo real do banco
    const { data: freshProd, error: fetchErr } = await sb.from('produtos')
        .select('estoque_fisico, estoque_comprometido')
        .eq('id', prodFound.id)
        .single();

    if (fetchErr) {
        showLoading(false);
        return showToast("Erro ao ler estoque: " + fetchErr.message, true);
    }

    const physical = Number(freshProd.estoque_fisico) || 0;
    const committed = Number(freshProd.estoque_comprometido) || 0;

    // Baixa do físico e libera o comprometido
    const { error: errStock } = await sb.from('produtos').update({
        estoque_fisico: Math.max(0, physical - qty),
        estoque_comprometido: Math.max(0, committed - qty)
    }).eq('id', prodFound.id);

    if (errStock) {
        showLoading(false);
        return showToast("Erro ao atualizar estoque: " + errStock.message, true);
    }

    // Cria log de entrega
    const newId = getNextId(STATE.logs);
    const timestamp = new Date().toISOString();

    const { error: errInsert } = await sb.from('logs').insert([{
        id: newId,
        tipo: 'entrega',
        produto_nome: productName,
        quantidade: qty,
        data: timestamp,
        observacao: 'Ref Venda #' + id,
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

    if (errInsert) {
        showLoading(false);
        return showToast("Erro ao registrar entrega: " + errInsert.message, true);
    }

    closeDeliveryModal();
    showToast("Entrega registrada!");
    await loadData();
}

// ====== ESTORNAR ENTREGA ======
async function estornarEntregaLog(uid) {
    if (!confirm("Estornar esta entrega? O estoque será devolvido e o pedido voltará ao status pendente.")) return;
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
            const currentDelivered = Number(vendaItem.deliveredQty) || 0;
            const newDelivered = Math.max(0, currentDelivered - entregaLog.quantity);
            const totalQty = Number(vendaItem.quantity) || 0;
            const newStatus = newDelivered === 0 ? 'PENDENTE' : (newDelivered < totalQty ? 'PARCIAL' : 'ENTREGUE');

            await sb.from('logs').update({
                qtd_entregue: newDelivered,
                status_entrega: newStatus
            }).eq('uid', vendaItem.uid);

            const prod = STATE.products.find(p => p.name === entregaLog.productName);
            if (prod) {
                const { data: fresh } = await sb.from('produtos')
                    .select('estoque_fisico, estoque_comprometido')
                    .eq('id', prod.id)
                    .single();
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
        showToast("Erro ao estornar: " + e.message, true);
    }
}

// ====== IMPRESSÃO DE PEDIDO (ROMANEIO) ======
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
        const numeroViagem = i + 1;
        viagensHtml += `
            <tr>
                <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${numeroViagem}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">
                    <div style="display: inline-block; min-width: 60px; border-bottom: 2px dashed #000;">&nbsp;</div>
                </td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">
                    <div style="display: inline-block; min-width: 150px; border-bottom: 1px solid #000;">&nbsp;</div>
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
        ? `<span style="background-color:#fffbeb; padding:2px 5px; font-weight:bold; color:#b45309; border:1px dashed #f59e0b;">ENTREGA: ${item.deliveryAddress}</span>`
        : (cli.address || '-');

    const el = document.getElementById('print-area');
    el.innerHTML = `
    <style>
        .invoice-box-orig::before { content: none !important; background-image: none !important; opacity: 0 !important; display: none !important; }
    </style>
    <div class="invoice-box-orig" style="font-family:'Helvetica',sans-serif; max-width:800px; margin:auto; padding:15px;">
        <div class="header-orig" style="display:flex; border:1px solid #000; margin-bottom:0;">
            <div class="logo-box-orig" style="width:100px; padding:5px; border-right:1px solid #000; display:flex; align-items:center; justify-content:center;">
                <img src="${company.logoUrl}" style="max-height:80px; max-width:100%;" />
            </div>
            <div class="company-box-orig" style="flex:1; padding:10px; border-right:1px solid #000;">
                <h2 style="margin:0; font-size:18px; font-weight:bold; color:#ea580c;">${company.name}</h2>
                <p style="margin:2px 0; font-size:12px;">CNPJ: ${company.cnpj}</p>
                <p style="margin:2px 0; font-size:12px;">Endereço: ${company.address}</p>
                <p style="margin:2px 0; font-size:12px;">Telefone: ${company.phone}</p>
            </div>
            <div class="info-box-orig" style="width:180px; padding:10px; background-color:#f9f9f9; text-align:right;">
                <h3 style="margin:0; font-size:14px; font-weight:bold;">ROMANEIO DE ENTREGA</h3>
                <p style="margin:5px 0; font-size:12px;">Emissão: ${new Date().toLocaleDateString()}</p>
                <p style="margin:5px 0; font-weight:bold; font-size:16px;">PEDIDO Nº ${item.id}</p>
            </div>
        </div>

        <div style="background-color:#f8fafc; border:1px solid #000; border-top:none; padding:10px; margin-bottom:15px;">
            <table style="width:100%; font-size:12px; border-collapse:collapse;">
                <tr>
                    <td style="font-weight:bold; width:60px;">CLIENTE:</td>
                    <td>${cli.name}</td>
                    <td style="font-weight:bold; width:40px;">DOC:</td>
                    <td>${cli.doc || '-'}</td>
                </tr>
                <tr>
                    <td style="font-weight:bold;">END:</td>
                    <td colspan="3">${addressToShow}</td>
                </tr>
                <tr>
                    <td style="font-weight:bold;">TEL:</td>
                    <td colspan="3">${cli.phone || '-'}</td>
                </tr>
            </table>
        </div>

        <div class="section-title-orig" style="background-color:#eee; border:1px solid #000; font-weight:bold; padding:5px; font-size:11px; text-transform:uppercase;">ITENS DO PEDIDO</div>
        <table class="items-table-orig" style="width:100%; border-collapse:collapse; font-size:12px; border:1px solid #000;">
            <thead>
                <tr style="background-color:#f1f5f9;">
                    <th style="border:1px solid #000; padding:8px; text-align:left;">Produto</th>
                    <th style="border:1px solid #000; padding:8px; text-align:center;">Qtd. Total</th>
                    <th style="border:1px solid #000; padding:8px; text-align:center;">Já Entregue</th>
                    <th style="border:1px solid #000; padding:8px; text-align:center; background-color:#ffedd5;">Saldo Pendente</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="border:1px solid #000; padding:10px; font-weight:bold;">${item.productName}</td>
                    <td style="border:1px solid #000; padding:10px; text-align:center;">${item.quantity}</td>
                    <td style="border:1px solid #000; padding:10px; text-align:center;">${delivered}</td>
                    <td style="border:1px solid #000; padding:10px; text-align:center; font-weight:bold; font-size:14px; background-color:#fff7ed;">${remain}</td>
                </tr>
            </tbody>
        </table>

        <div style="margin-top:20px;">
            <div class="section-title-orig" style="background-color:#eee; border:1px solid #000; font-weight:bold; padding:5px; font-size:11px; text-transform:uppercase;">
                CONTROLE DE VIAGENS (Capacidade: ${CAPACIDADE_POR_VIAGEM} peças/viagem)
            </div>
            <table class="items-table-orig" style="width:100%; border-collapse:collapse; font-size:12px; border:1px solid #000;">
                <thead>
                    <tr style="background-color:#f1f5f9;">
                        <th style="border:1px solid #000; padding:8px; text-align:center;">Viagem Nº</th>
                        <th style="border:1px solid #000; padding:8px; text-align:center;">Quantidade</th>
                        <th style="border:1px solid #000; padding:8px; text-align:center;">Assinatura do Cliente</th>
                    </tr>
                </thead>
                <tbody>
                    ${viagensHtml}
                </tbody>
            </table>
            <p style="font-size:10px; color:#64748b; margin-top:5px;">
                * Preencha a quantidade real entregue em cada viagem e colete a assinatura.
            </p>
        </div>

        <div style="display:flex; justify-content:space-between; margin-top:40px;">
            <div style="width:45%; text-align:center;">
                <div style="border-top:1px solid #000; margin-bottom:5px;"></div>
                <span style="font-size:10px; font-weight:bold;">CONFERENTE / DATA</span>
            </div>
            <div style="width:45%; text-align:center;">
                <div style="border-top:1px solid #000; margin-bottom:5px;"></div>
                <span style="font-size:10px; font-weight:bold;">RECEBIMENTO FINAL</span>
            </div>
        </div>
    </div>`;

    setTimeout(() => {
        window.print();
        limparAreaImpressao();
    }, 500);
}

// ====== IMPRIMIR HISTÓRICO DE ENTREGAS ======
function printExpeditionHistory() {
    let histLogs = (STATE.logs || []).filter(l => l.type === 'entrega' && l.status !== 'CANCELADO');

    const nameFilter = document.getElementById('exp-hist-name')?.value.toLowerCase() || '';
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

    const company = {
        name: "RV BLOCOS E ESTRUTURAS",
        cnpj: "46.889.791/0001-53",
        phone: "(64) 3636-4861",
        address: "Jataí - GO",
        logoUrl: "https://lh3.googleusercontent.com/d/1SIoZ2JlalfMnGDZTXBk7ZYuPgwxX3odF"
    };

    let totalItems = 0;
    const rowsHtml = histLogs.map(l => {
        totalItems += Number(l.quantity) || 0;
        return `
            <tr>
                <td style="border-bottom:1px solid #ccc; border-right:1px solid #000; padding:5px;">${formatDate(l.date)}</td>
                <td style="border-bottom:1px solid #ccc; border-right:1px solid #000; padding:5px; font-weight:bold;">${l.note || '-'}</td>
                <td style="border-bottom:1px solid #ccc; border-right:1px solid #000; padding:5px; font-weight:bold;">${l.clientName || '-'}</td>
                <td style="border-bottom:1px solid #ccc; border-right:1px solid #000; padding:5px;">${l.productName}</td>
                <td style="border-bottom:1px solid #ccc; padding:5px; text-align:center; font-weight:bold;">${l.quantity}</td>
            </tr>
        `;
    }).join('');

    let filterText = [];
    if (startDate) filterText.push(`De: ${formatDate(startDate)}`);
    if (endDate) filterText.push(`Até: ${formatDate(endDate)}`);
    if (nameFilter) filterText.push(`Busca: "${document.getElementById('exp-hist-name').value}"`);
    const subheader = filterText.length > 0 ? filterText.join(' | ') : 'Todos os registros';

    const el = document.getElementById('print-area');
    el.innerHTML = `
        <div class="invoice-box-orig" style="font-family:'Helvetica',sans-serif; max-width:800px; margin:auto; padding:15px;">
            <div class="header-orig" style="display:flex; border:1px solid #000; margin-bottom:0;">
                <div class="logo-box-orig" style="width:100px; padding:5px; border-right:1px solid #000; display:flex; align-items:center; justify-content:center;">
                    <img src="${company.logoUrl}" style="max-height:80px; max-width:100%;" />
                </div>
                <div class="company-box-orig" style="flex:1; padding:10px; border-right:1px solid #000;">
                    <h2 style="margin:0; font-size:18px; font-weight:bold; color:#ea580c;">${company.name}</h2>
                    <p style="margin:2px 0; font-size:12px;">CNPJ: ${company.cnpj}</p>
                    <p style="margin:2px 0; font-size:12px;">Endereço: ${company.address}</p>
                    <p style="margin:2px 0; font-size:12px;">Telefone: ${company.phone}</p>
                </div>
                <div class="info-box-orig" style="width:200px; padding:10px; background-color:#f9f9f9; text-align:right;">
                    <h3 style="margin:0; font-size:14px; font-weight:bold;">RELATÓRIO DE EXPEDIÇÃO</h3>
                    <p style="margin:5px 0; font-size:12px;">Emissão: ${new Date().toLocaleDateString()}</p>
                </div>
            </div>

            <div style="background-color:#f8fafc; border:1px solid #000; border-top:none; padding:8px; margin-bottom:15px; font-size:12px;">
                <strong>Filtros:</strong> ${subheader}
            </div>

            <div class="section-title-orig" style="background-color:#eee; border:1px solid #000; font-weight:bold; padding:5px; font-size:11px; text-transform:uppercase;">REGISTROS DE ENTREGA</div>
            <table class="items-table-orig" style="width:100%; border-collapse:collapse; font-size:11px; border:1px solid #000;">
                <thead>
                    <tr style="background-color:#f1f5f9;">
                        <th>Data</th><th>Ref.</th><th>Cliente</th><th>Produto</th><th>Qtd</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
                <tfoot>
                    <tr style="background-color:#fff7ed;">
                        <td colspan="4" style="text-align:right; font-weight:bold;">TOTAL</td>
                        <td style="font-weight:bold; text-align:center;">${totalItems}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;

    setTimeout(() => {
        window.print();
        limparAreaImpressao();
    }, 500);
}

function limparAreaImpressao() {
    document.getElementById('print-area').innerHTML = '';
    // Garante que o modal de histórico volte ao normal se estiver aberto
    const modal = document.getElementById('pos-history-modal');
    if (modal) modal.style.display = '';
}
