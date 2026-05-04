// =================================================================
// MÓDULO PRODUÇÃO - RV BLOCOS
// =================================================================

function renderProduction() {
    const container = document.getElementById('view-production');
    if (!container) return;

    container.innerHTML = `
    <h2 class="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <i data-lucide="hammer"></i> Produção e Histórico
    </h2>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full flex-1 items-stretch">
        <!-- Coluna Esquerda: Registrar + Dash Mensal -->
        <div class="lg:col-span-1 flex flex-col gap-6 h-[calc(100vh-210px)]">
            <form onsubmit="saveProduction(event)" class="bg-white rounded-xl shadow-sm border shrink-0">
                <div class="p-4 border-b bg-slate-50">
                    <h3 class="font-bold text-slate-700 flex items-center gap-2">
                        <i data-lucide="plus-circle" class="w-4 h-4 text-orange-500"></i> Registrar Produção
                    </h3>
                </div>
                <div class="p-4 space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Produto</label>
                        <select id="prod-select-production" required class="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 bg-white text-sm font-medium text-slate-700">
                            <option value="">Selecione o Produto...</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Quantidade</label>
                        <input type="number" id="prod-qty-production" required min="1" class="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm font-bold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Observações</label>
                        <input type="text" id="prod-note-production" class="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm">
                    </div>
                    <button type="submit" class="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 mt-2">
                        <i data-lucide="check"></i> Confirmar
                    </button>
                </div>
            </form>

            <div class="bg-white rounded-xl shadow-sm border flex flex-col flex-1 overflow-hidden">
                <div class="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <h3 class="font-bold text-slate-700 flex items-center gap-2">
                        <i data-lucide="bar-chart-2" class="w-5 h-5 text-orange-500"></i> Produção Mensal
                    </h3>
                </div>
                <div class="p-3 bg-white border-b">
                    <input type="month" id="prod-dash-month" class="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none text-center font-bold text-slate-700" onchange="renderProductionDash()">
                </div>
                <div class="p-4 overflow-y-auto flex-1 bg-slate-50/50" id="prod-dash-content">
                </div>
            </div>
        </div>

        <!-- Coluna Direita: Histórico -->
        <div class="lg:col-span-2 flex flex-col h-full">
            <div class="bg-white rounded-xl border shadow-sm flex flex-col overflow-hidden h-[calc(100vh-210px)]">
                <div class="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <h3 class="font-bold text-slate-700 flex items-center gap-2">
                        <i data-lucide="history" class="w-5 h-5 text-slate-400"></i> Últimas Produções
                    </h3>
                    <button onclick="printProductionHistory()" class="p-2 bg-slate-800 text-white hover:bg-slate-700 rounded text-xs shadow-sm flex items-center gap-2 font-bold">
                        <i data-lucide="printer" class="w-4 h-4"></i> Imprimir
                    </button>
                </div>
                <div class="overflow-y-auto flex-1">
                    <table class="w-full text-sm text-left border-collapse">
                        <thead class="bg-white text-slate-500 border-b sticky top-0 z-10">
                            <tr>
                                <th class="p-4 text-xs font-bold uppercase">Data</th>
                                <th class="p-4 text-xs font-bold uppercase">Produto</th>
                                <th class="p-4 text-xs font-bold uppercase text-center">Qtd</th>
                                <th class="p-4 text-xs font-bold uppercase">Obs</th>
                            </tr>
                        </thead>
                        <tbody id="production-history-list" class="divide-y text-slate-700">
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    `;

    // Preenche select de produtos e dados iniciais
    preencherSelectProducao();
    renderProductionDash();
    carregarHistoricoProducao();
    lucide.createIcons();
}

function preencherSelectProducao() {
    const sel = document.getElementById('prod-select-production');
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecione o Produto...</option>' +
        (STATE.products || []).map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

async function saveProduction(e) {
    e.preventDefault();
    const pId = document.getElementById('prod-select-production').value;
    const qty = parseFloat(document.getElementById('prod-qty-production').value);
    const note = document.getElementById('prod-note-production').value;

    if (!pId || isNaN(qty) || qty <= 0) return showToast("Selecione produto e quantidade!", true);

    showLoading(true);
    try {
        // Atualiza estoque
        const { data: fresh } = await sb.from('produtos').select('estoque_fisico').eq('id', pId).single();
        const current = Number(fresh.estoque_fisico) || 0;
        await sb.from('produtos').update({ estoque_fisico: current + qty }).eq('id', pId);

        // Registra log
        const prod = STATE.products.find(x => String(x.id) === String(pId));
        await sb.from('logs').insert([{
            id: getNextId(STATE.logs),
            tipo: 'fabricacao',
            produto_nome: prod.name,
            quantidade: qty,
            data: new Date().toISOString(),
            observacao: note,
            status: 'ATIVO'
        }]);

        e.target.reset();
        showToast("Produção Registrada!");
        await loadData();
        renderProduction(); // Recria a view com dados atualizados
    } catch (e) {
        showLoading(false);
        showToast("Erro: " + e.message, true);
    }
}

function renderProductionDash() {
    const monthInput = document.getElementById('prod-dash-month');
    const contentDiv = document.getElementById('prod-dash-content');
    if (!monthInput || !contentDiv) return;

    if (!monthInput.value) {
        const now = new Date();
        monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const mesSelecionado = monthInput.value;
    let totalGeral = 0;

    for (const log of STATE.logs) {
        if (log.type === 'fabricacao' && log.status !== 'CANCELADO' && log.date) {
            if (String(log.date).substring(0, 7) === mesSelecionado) {
                totalGeral += Number(log.quantity) || 0;
            }
        }
    }

    let despesasTotais = 0;
    for (const exp of STATE.expenses) {
        if (exp.date && String(exp.date).substring(0, 7) === mesSelecionado) {
            despesasTotais += Number(exp.cost) || 0;
        }
    }

    const custoMaterialB10 = STATE.custoMaterialB10 || 0;
    const custoMedioLiquido = totalGeral > 0 ? despesasTotais / totalGeral : 0;

    if (totalGeral === 0) {
        contentDiv.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-slate-400 opacity-70 p-10">
            <i data-lucide="inbox" class="w-10 h-10 mb-2 text-slate-300"></i>
            <span class="text-sm font-bold">Nenhuma produção neste mês.</span>
        </div>`;
    } else {
        contentDiv.innerHTML = `
        <div class="text-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-2 flex flex-col gap-5">
            <div>
                <div class="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Total Fabricado</div>
                <div class="text-5xl font-black text-slate-800">${totalGeral}</div>
                <div class="text-[10px] text-orange-500 font-bold uppercase mt-2">Peças neste mês</div>
            </div>
            <div class="border-t border-slate-100 pt-5 grid grid-cols-2 gap-4">
                <div>
                    <div class="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2" title="Valor da configuração">Custo Material</div>
                    <div class="text-2xl font-black text-orange-500">${formatMoney(custoMaterialB10)}</div>
                    <div class="text-[10px] text-slate-400 mt-2 uppercase font-bold">Baseado em B10</div>
                </div>
                <div>
                    <div class="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2" title="Rateio das despesas do mês">Custo Rateado</div>
                    <div class="text-2xl font-black text-red-500">${formatMoney(custoMedioLiquido)}</div>
                    <div class="text-[10px] text-slate-400 mt-2 uppercase font-bold">por peça</div>
                </div>
            </div>
        </div>`;
    }

    lucide.createIcons();
}

function carregarHistoricoProducao() {
    const histBody = document.getElementById('production-history-list');
    if (!histBody) return;

    const prodLogs = (STATE.logs || [])
        .filter(l => l.type === 'fabricacao' && l.status !== 'CANCELADO')
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (prodLogs.length === 0) {
        histBody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-400">Nenhuma produção registrada.</td></tr>';
        return;
    }

    histBody.innerHTML = prodLogs.map(l => `
        <tr class="hover:bg-slate-50">
            <td class="p-3 text-xs text-slate-500">${formatDate(l.date)}</td>
            <td class="p-3 font-medium text-slate-700">${l.productName}</td>
            <td class="p-3 text-center font-bold text-orange-600">+${l.quantity}</td>
            <td class="p-3 text-xs text-slate-400 italic">${l.note || '-'}</td>
        </tr>
    `).join('');

    lucide.createIcons();
}

function printProductionHistory() {
    const prodLogs = (STATE.logs || [])
        .filter(l => l.type === 'fabricacao' && l.status !== 'CANCELADO')
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (prodLogs.length === 0) return showToast("Nenhuma produção registrada para imprimir.", true);

    const company = {
        name: "RV BLOCOS E ESTRUTURAS",
        cnpj: "46.889.791/0001-53",
        logoUrl: "https://lh3.googleusercontent.com/d/1SIoZ2JlalfMnGDZTXBk7ZYuPgwxX3odF"
    };

    let totalQtd = 0;
    const rowsHtml = prodLogs.map(l => {
        totalQtd += Number(l.quantity) || 0;
        return `<tr>
            <td style="border-bottom:1px solid #ccc; border-right:1px solid #000; padding:5px;">${formatDate(l.date)}</td>
            <td style="border-bottom:1px solid #ccc; border-right:1px solid #000; padding:5px;">${l.productName}</td>
            <td style="border-bottom:1px solid #ccc; padding:5px; text-align:center;">${l.quantity}</td>
        </tr>`;
    }).join('');

    const el = document.getElementById('print-area');
    el.innerHTML = `
    <div class="invoice-box-orig" style="font-family:'Helvetica',sans-serif; max-width:800px; margin:auto; padding:15px;">
        <div class="header-orig" style="display:flex; border:1px solid #000;">
            <div class="logo-box-orig" style="width:100px; padding:5px; border-right:1px solid #000;">
                <img src="${company.logoUrl}" style="max-height:80px;" />
            </div>
            <div class="company-box-orig" style="flex:1; padding:10px;">
                <h2 style="margin:0; color:#ea580c;">${company.name}</h2>
                <p>CNPJ: ${company.cnpj}</p>
            </div>
            <div class="info-box-orig" style="width:200px; padding:10px; text-align:right;">
                <h3>RELATÓRIO DE PRODUÇÃO</h3>
                <p>${new Date().toLocaleDateString()}</p>
            </div>
        </div>
        <div class="section-title-orig">REGISTROS DE FABRICAÇÃO</div>
        <table class="items-table-orig" style="width:100%; border-collapse:collapse; border:1px solid #000;">
            <thead><tr><th>Data</th><th>Produto</th><th>Qtd</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot><tr><td colspan="2" style="text-align:right; font-weight:bold;">TOTAL</td><td style="text-align:center; font-weight:bold;">${totalQtd}</td></tr></tfoot>
        </table>
    </div>`;

    setTimeout(() => { window.print(); limparAreaImpressao(); }, 500);
}
