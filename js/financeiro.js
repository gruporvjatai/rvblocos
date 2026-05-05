// ====== MÓDULO FINANCEIRO (RV Blocos) ======

// Função principal chamada pelo navigate('fin')
function renderFinance() {
    const container = document.getElementById('view-fin');
    if (!container) return;

    container.innerHTML = `
    <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-slate-800">Financeiro &amp; Caixa</h2>
    </div>

    <!-- Cards de Totais -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-green-50 p-4 rounded-xl border border-green-100 shadow-sm">
            <p class="text-green-800 text-xs font-bold uppercase">Receitas (Recebidas)</p>
            <h3 id="fin-income" class="text-2xl font-bold text-green-600 mt-1">R$ 0,00</h3>
        </div>
        <div class="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm">
            <p class="text-red-800 text-xs font-bold uppercase">Saídas (Despesas Pagas)</p>
            <h3 id="fin-expenses" class="text-2xl font-bold text-red-600 mt-1">R$ 0,00</h3>
        </div>
        <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
            <p class="text-blue-800 text-xs font-bold uppercase">Saldo em Caixa</p>
            <h3 id="fin-balance" class="text-2xl font-bold text-blue-600 mt-1">R$ 0,00</h3>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- CONTAS A RECEBER -->
        <div class="bg-white rounded-xl border shadow-sm flex flex-col h-[650px]">
            <div class="p-4 border-b bg-slate-50 rounded-t-xl flex justify-between items-center">
                <h3 class="font-bold text-slate-700 flex items-center gap-2">
                    <i data-lucide="arrow-down-to-line" class="w-5 h-5 text-blue-600"></i> Contas a Receber
                </h3>
                <div class="flex gap-2">
                    <button onclick="printReceivables()" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1">
                        <i data-lucide="printer" class="w-4 h-4"></i> Imprimir
                    </button>
                    <button onclick="openRevenueModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1">
                        <i data-lucide="plus" class="w-4 h-4"></i> Nova
                    </button>
                </div>
            </div>

            <div class="p-3 border-b bg-white flex flex-col gap-2">
                <div class="flex gap-2">
                    <div class="relative flex-1">
                        <i data-lucide="search" class="absolute left-2 top-2 text-slate-400 w-4 h-4"></i>
                        <input type="text" id="rec-search" placeholder="Buscar cliente..." class="w-full pl-8 p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-600 outline-none" onkeyup="loadReceivables()">
                    </div>
                    <select id="rec-status" class="w-32 p-1.5 border rounded text-xs focus:ring-1 focus:ring-blue-600 outline-none" onchange="loadReceivables()">
                        <option value="">Todos</option>
                        <option value="ABERTOS">Em Aberto</option>
                        <option value="VENCIDOS">Vencidos</option>
                        <option value="PAGOS">Pagos</option>
                    </select>
                </div>
                <div class="flex gap-2 items-center">
                    <input type="date" id="rec-start" class="p-1.5 border rounded text-xs flex-1 focus:ring-1 focus:ring-blue-600 outline-none" onchange="loadReceivables()">
                    <span class="text-slate-400 text-xs">até</span>
                    <input type="date" id="rec-end" class="p-1.5 border rounded text-xs flex-1 focus:ring-1 focus:ring-blue-600 outline-none" onchange="loadReceivables()">
                    <button onclick="document.getElementById('rec-search').value=''; document.getElementById('rec-status').value=''; document.getElementById('rec-start').value=''; document.getElementById('rec-end').value=''; loadReceivables()" class="p-1.5 bg-slate-200 hover:bg-slate-300 rounded text-slate-600" title="Limpar Filtros">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>

            <div class="overflow-y-auto flex-1 p-0">
                <table class="w-full text-sm text-left">
                    <thead class="text-slate-500 bg-slate-50 sticky top-0 border-b z-10">
                        <tr>
                            <th class="p-3 font-semibold">Venc/Pagto</th>
                            <th class="p-3 font-semibold">Cliente/Ref</th>
                            <th class="p-3 font-semibold">Valor</th>
                            <th class="p-3 font-semibold text-right w-24">Ação</th>
                        </tr>
                    </thead>
                    <tbody id="fin-receivables-list" class="divide-y"></tbody>
                </table>
            </div>
        </div>

        <!-- CONTAS A PAGAR -->
        <div class="bg-white rounded-xl border shadow-sm flex flex-col h-[650px]">
            <div class="p-4 border-b bg-slate-50 rounded-t-xl flex justify-between items-center">
                <h3 class="font-bold text-slate-700 flex items-center gap-2">
                    <i data-lucide="arrow-up-from-line" class="w-5 h-5 text-red-500"></i> Contas a Pagar
                </h3>
                <div class="flex gap-2">
                    <button onclick="printExpenses()" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1">
                        <i data-lucide="printer" class="w-4 h-4"></i> Imprimir
                    </button>
                    <button onclick="openExpenseModal()" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1">
                        <i data-lucide="minus-circle" class="w-4 h-4"></i> Lançar Saída
                    </button>
                </div>
            </div>

            <div class="p-3 border-b bg-white flex flex-col gap-2">
                <div class="flex gap-2">
                    <div class="relative flex-1">
                        <i data-lucide="search" class="absolute left-2 top-2 text-slate-400 w-4 h-4"></i>
                        <input type="text" id="exp-search" placeholder="Buscar fornecedor/item..." class="w-full pl-8 p-1.5 border rounded text-xs focus:ring-1 focus:ring-red-500 outline-none" onkeyup="loadPayables()">
                    </div>
                    <select id="exp-status" class="w-32 p-1.5 border rounded text-xs focus:ring-1 focus:ring-red-500 outline-none" onchange="loadPayables()">
                        <option value="">Todos</option>
                        <option value="PENDENTE">Pendentes</option>
                        <option value="PAGO">Pagos</option>
                    </select>
                </div>
                <div class="flex gap-2 items-center">
                    <input type="date" id="exp-start" class="p-1.5 border rounded text-xs flex-1 focus:ring-1 focus:ring-red-500 outline-none" onchange="loadPayables()">
                    <span class="text-slate-400 text-xs">até</span>
                    <input type="date" id="exp-end" class="p-1.5 border rounded text-xs flex-1 focus:ring-1 focus:ring-red-500 outline-none" onchange="loadPayables()">
                    <button onclick="document.getElementById('exp-search').value=''; document.getElementById('exp-status').value=''; document.getElementById('exp-start').value=''; document.getElementById('exp-end').value=''; loadPayables()" class="p-1.5 bg-slate-200 hover:bg-slate-300 rounded text-slate-600" title="Limpar Filtros">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>

            <div class="overflow-y-auto flex-1 p-0">
                <table class="w-full text-sm text-left">
                    <thead class="text-slate-500 bg-slate-50 sticky top-0 border-b z-10">
                        <tr>
                            <th class="p-3 font-semibold">Data</th>
                            <th class="p-3 font-semibold">Fornecedor</th>
                            <th class="p-3 font-semibold">Valor</th>
                            <th class="p-3 font-semibold text-right w-[110px]">Ação</th>
                        </tr>
                    </thead>
                    <tbody id="fin-expense-history-list" class="divide-y"></tbody>
                </table>
            </div>
        </div>
    </div>
    `;

    // Inicializa datas padrão (mês atual)
    const range = getCurrentMonthRange();
    document.getElementById('rec-start').value = range.start;
    document.getElementById('rec-end').value = range.end;
    document.getElementById('exp-start').value = range.start;
    document.getElementById('exp-end').value = range.end;

    // Carrega os dados
    updateFinanceCards();
    loadReceivables();
    loadPayables();

    lucide.createIcons();
}

// ============ CARDS ============
function updateFinanceCards() {
    const salesMap = {};
    STATE.logs.filter(l => (l.type === 'venda' || l.type === 'receita') && l.status !== 'CANCELADO').forEach(l => {
        if (!salesMap[l.id]) {
            salesMap[l.id] = {
                id: l.id, val: 0, paid: 0, status: l.finStatus,
                clientName: l.clientName, payment: l.paymentMethod, dueDate: l.dueDate,
                desc: l.type === 'receita' ? l.productName : `Venda #${l.id}`
            };
        }
        salesMap[l.id].val += Number(l.totalValue) || 0;
        salesMap[l.id].paid = Math.max(salesMap[l.id].paid, Number(l.paidValue) || 0);
    });
    const salesArr = Object.values(salesMap);
    const income = salesArr.filter(s => s.status === 'PAGO').reduce((a, b) => a + b.val, 0) +
                   salesArr.filter(s => s.status !== 'PAGO').reduce((a, b) => a + b.paid, 0);
    const expenses = STATE.expenses.filter(e => e.status === 'PAGO').reduce((a, b) => a + Number(b.cost), 0);

    document.getElementById('fin-income').innerText = formatMoney(income);
    document.getElementById('fin-expenses').innerText = formatMoney(expenses);
    document.getElementById('fin-balance').innerText = formatMoney(income - expenses);
}

// ============ CONTAS A RECEBER ============
function loadReceivables() {
    const tbody = document.getElementById('fin-receivables-list');
    if (!tbody) return;

    const salesMap = {};
    STATE.logs.filter(l => (l.type === 'venda' || l.type === 'receita') && l.status !== 'CANCELADO').forEach(l => {
        if (!salesMap[l.id]) {
            salesMap[l.id] = {
                id: l.id, val: 0, paid: 0, status: l.finStatus,
                clientName: l.clientName, payment: l.paymentMethod, dueDate: l.dueDate,
                desc: l.type === 'receita' ? l.productName : `Venda #${l.id}`
            };
        }
        salesMap[l.id].val += Number(l.totalValue) || 0;
        salesMap[l.id].paid = Math.max(salesMap[l.id].paid, Number(l.paidValue) || 0);
    });
    let list = Object.values(salesMap);

    const term = (document.getElementById('rec-search')?.value || '').toLowerCase();
    const status = document.getElementById('rec-status')?.value || '';
    const start = document.getElementById('rec-start')?.value;
    const end = document.getElementById('rec-end')?.value;
    const hojeStr = getHojeLocalStr();

    if (term) list = list.filter(r => (r.clientName?.toLowerCase().includes(term)) || String(r.id).includes(term));
    if (status === 'PAGOS') list = list.filter(r => r.status === 'PAGO');
    else if (status === 'ABERTOS') list = list.filter(r => r.status !== 'PAGO' && (r.dueDate || '').split('T')[0] >= hojeStr);
    else if (status === 'VENCIDOS') list = list.filter(r => r.status !== 'PAGO' && (r.dueDate || '').split('T')[0] < hojeStr);
    if (start) list = list.filter(r => (r.dueDate || '').split('T')[0] >= start);
    if (end) list = list.filter(r => (r.dueDate || '').split('T')[0] <= end);
    list.sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''));

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-slate-400">Nenhum registro.</td></tr>';
        return;
    }

    const totalVal = list.reduce((a, r) => a + r.val, 0);
    tbody.innerHTML = list.map(r => {
        const dataStr = (r.dueDate || '').split('T')[0];
        const isVencido = dataStr < hojeStr && r.status !== 'PAGO';
        const bg = isVencido ? 'bg-red-50/50' : (r.status === 'PAGO' ? 'bg-green-50/50 opacity-80' : '');
        const aviso = isVencido ? '<span class="text-[9px] bg-red-500 text-white px-1 rounded ml-1">VENCIDO</span>' : '';
        const rest = r.val - r.paid;
        return `<tr class="hover:bg-slate-100 ${bg} transition">
            <td class="p-3 text-xs border-r border-slate-100">
                <div class="font-bold ${isVencido ? 'text-red-600' : 'text-slate-700'}">${formatDate(r.dueDate)} ${aviso}</div>
                <div class="text-[10px] text-slate-400 font-bold uppercase mt-0.5">${r.payment || '-'}</div>
            </td>
            <td class="p-3 border-r border-slate-100">
                <div class="font-bold text-slate-800 text-xs">${r.clientName}</div>
                <div class="text-[10px] text-slate-500 truncate w-32" title="${r.desc}">${r.desc}</div>
            </td>
            <td class="p-3 border-r border-slate-100">
                <div class="font-bold text-slate-800 text-sm">${formatMoney(r.val)}</div>
                ${r.status !== 'PAGO' && r.paid > 0 ? `<div class="text-[10px] text-orange-500 font-bold">Resta: ${formatMoney(rest)}</div>` : ''}
            </td>
            <td class="p-3 text-right flex items-center justify-end gap-1 h-full">
                ${r.status !== 'PAGO' ?
                    `<button onclick="openEditReceivable('${r.id}', ${r.val}, ${r.paid}, '${r.dueDate}', '${r.payment}')" class="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1.5 px-3 rounded shadow"><i data-lucide="edit-3" class="w-3 h-3"></i> BAIXAR</button>
                     <button onclick="deleteRevenue('${r.id}')" class="bg-white border border-red-200 text-red-500 hover:bg-red-50 text-[10px] font-bold py-1.5 px-2 rounded shadow" title="Excluir"><i data-lucide="trash-2" class="w-3 h-3"></i></button>`
                    :
                    `<span class="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1.5 rounded flex items-center gap-1"><i data-lucide="check-circle" class="w-3 h-3"></i> PAGO</span>
                     <button onclick="estornarRecebimento('${r.id}')" class="bg-white border border-slate-200 text-slate-500 hover:text-red-500 text-[10px] font-bold py-1.5 px-2 rounded shadow" title="Estornar"><i data-lucide="rotate-ccw" class="w-3 h-3"></i></button>`
                }
            </td>
        </tr>`;
    }).join('') + `<tr class="bg-blue-50 border-t-2 border-blue-200 sticky bottom-0 z-10">
        <td colspan="2" class="p-3 text-right font-bold text-blue-900 text-xs uppercase">Totais da Pesquisa:</td>
        <td class="p-3 font-black text-blue-700 text-sm border-r border-blue-200">${formatMoney(totalVal)}</td>
        <td class="p-3 bg-blue-50"></td>
    </tr>`;

    lucide.createIcons();
}

// ============ CONTAS A PAGAR ============
function loadPayables() {
    const tbody = document.getElementById('fin-expense-history-list');
    if (!tbody) return;

    let list = STATE.expenses.slice();
    const term = (document.getElementById('exp-search')?.value || '').toLowerCase();
    const status = document.getElementById('exp-status')?.value || '';
    const start = document.getElementById('exp-start')?.value;
    const end = document.getElementById('exp-end')?.value;
    const hojeStr = getHojeLocalStr();

    if (term) list = list.filter(e => (e.item?.toLowerCase().includes(term)) || (e.note?.toLowerCase().includes(term)));
    if (status) list = list.filter(e => e.status === status);
    if (start) list = list.filter(e => (e.date || '').split('T')[0] >= start);
    if (end) list = list.filter(e => (e.date || '').split('T')[0] <= end);
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-slate-400">Nenhum registro.</td></tr>';
        return;
    }

    const totalExp = list.reduce((a, e) => a + e.cost, 0);
    tbody.innerHTML = list.map(e => {
        const dataStr = (e.date || '').split('T')[0];
        const isVencido = dataStr < hojeStr && e.status !== 'PAGO';
        const bg = isVencido ? 'bg-red-50/50' : (e.status === 'PAGO' ? 'bg-green-50/50 opacity-80' : 'bg-orange-50/30');
        const aviso = isVencido ? '<span class="text-[9px] bg-red-500 text-white px-1 rounded ml-1">VENCIDO</span>' : '';
        let providerVal = e.note || '-';
        if (providerVal.startsWith('Fornecedor:')) providerVal = providerVal.replace('Fornecedor:', '').trim();
        return `<tr class="hover:bg-slate-100 ${bg} transition">
            <td class="p-3 text-xs border-r border-slate-100">
                <div class="font-bold ${isVencido ? 'text-red-600' : 'text-slate-700'}">${formatDate(e.date)} ${aviso}</div>
            </td>
            <td class="p-3 border-r border-slate-100">
                <div class="font-bold text-slate-800 text-xs">${e.item}</div>
                <div class="text-[10px] text-slate-500 truncate w-32" title="${providerVal}">${providerVal}</div>
            </td>
            <td class="p-3 border-r border-slate-100">
                <div class="font-bold text-slate-800 text-sm">${formatMoney(e.cost)}</div>
            </td>
            <td class="p-3 text-right flex items-center justify-end gap-1 h-full">
                ${e.status !== 'PAGO' ? `
                    <button onclick="openEditExpense('${e.id}')" class="bg-slate-200 text-slate-700 hover:bg-slate-300 p-1.5 rounded shadow" title="Editar"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i></button>
                    <button onclick="payExpense('${e.id}')" class="bg-red-500 text-white hover:bg-red-600 p-1.5 rounded shadow flex items-center gap-1 text-[10px] font-bold"><i data-lucide="check-circle" class="w-3.5 h-3.5"></i> BAIXAR</button>
                    <button onclick="deleteExpense('${e.id}')" class="bg-white border border-red-200 text-red-500 hover:bg-red-50 p-1.5 rounded shadow" title="Excluir"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                ` : `
                    <span class="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1.5 rounded flex items-center gap-1"><i data-lucide="check" class="w-3 h-3"></i> PAGO</span>
                    <button onclick="estornarPagamentoDespesa('${e.id}')" class="bg-white border border-slate-200 text-slate-500 hover:text-red-500 p-1.5 rounded shadow" title="Estornar"><i data-lucide="rotate-ccw" class="w-3 h-3"></i></button>
                `}
            </td>
        </tr>`;
    }).join('') + `<tr class="bg-red-50 border-t-2 border-red-200 sticky bottom-0 z-10">
        <td colspan="2" class="p-3 text-right font-bold text-red-900 text-xs uppercase">Totais da Pesquisa:</td>
        <td class="p-3 font-black text-red-700 text-sm border-r border-red-200">${formatMoney(totalExp)}</td>
        <td class="p-3 bg-red-50"></td>
    </tr>`;

    lucide.createIcons();
}

// ============ MODAIS E AÇÕES ============
function openRevenueModal() { document.getElementById('modal-revenue').classList.remove('hidden'); }
function openExpenseModal() {
    document.getElementById('exp-id').value = '';
    document.getElementById('exp-provider').value = '';
    document.getElementById('exp-cost').value = '';
    document.getElementById('exp-date').value = getHojeLocalStr();
    document.getElementById('exp-note').value = '';
    document.getElementById('modal-expense').classList.remove('hidden');
}

// ============ RECEITAS ============
async function saveRevenue() {
    const desc = document.getElementById('rev-desc').value.trim();
    const client = document.getElementById('rev-client').value.trim() || 'Consumidor Final';
    const val = parseFloat(document.getElementById('rev-val').value) || 0;
    const method = document.getElementById('rev-method').value;
    const due = document.getElementById('rev-due').value || getHojeLocalStr();
    if (!desc || !val) return showToast("Preencha descrição e valor!", true);
    showLoading(true);
    const newId = getNextId(STATE.logs);
    const { error } = await sb.from('logs').insert([{
        id: newId, tipo: 'receita', produto_nome: 'Receita Avulsa: ' + desc, quantidade: 1,
        data: getHojeLocalStr(), observacao: 'Lançamento Financeiro Manual', valor_total: val,
        cliente_nome: client, forma_pagamento: method, status: 'ATIVO',
        status_entrega: 'ENTREGUE', qtd_entregue: 1, desconto: 0,
        status_financeiro: 'PENDENTE', vencimento: due, valor_pago: 0, endereco_entrega: ''
    }]);
    if (error) { showLoading(false); return showToast("Erro: " + error.message, true); }
    document.getElementById('modal-revenue').classList.add('hidden');
    document.getElementById('rev-desc').value = '';
    document.getElementById('rev-val').value = '';
    showToast("Receita lançada!");
    await loadData();
    renderFinance();
}

function openEditReceivable(id, total, paid, due, method) {
    document.getElementById('rec-id').value = id;
    document.getElementById('rec-total-lbl').innerText = formatMoney(total);
    document.getElementById('rec-pending-lbl').innerText = formatMoney(total - paid);
    document.getElementById('rec-due').value = (due || '').split('T')[0];
    document.getElementById('rec-method').value = method;
    document.getElementById('rec-pay-val').value = '';
    document.getElementById('modal-receivable-edit').classList.remove('hidden');
}

async function saveReceivableEdit() {
    const id = document.getElementById('rec-id').value;
    const method = document.getElementById('rec-method').value;
    const due = document.getElementById('rec-due').value;
    const payVal = Number(document.getElementById('rec-pay-val').value) || 0;
    showLoading(true);
    const rowsToUpdate = STATE.logs.filter(l => String(l.id) === String(id) && (l.type === 'venda' || l.type === 'receita'));
    if (!rowsToUpdate.length) { showLoading(false); return showToast("Registro não encontrado", true); }
    const orderTotal = rowsToUpdate.reduce((a, r) => a + r.totalValue, 0);
    const orderPaid = rowsToUpdate.reduce((a, r) => Math.max(a, r.paidValue), 0);
    const newPaid = orderPaid + payVal;
    const finStatus = newPaid >= orderTotal ? 'PAGO' : (newPaid > 0 ? 'PARCIAL' : 'PENDENTE');
    for (const row of rowsToUpdate) {
        await sb.from('logs').update({ valor_pago: newPaid, status_financeiro: finStatus, forma_pagamento: method, vencimento: due }).eq('uid', row.uid);
    }
    if (payVal > 0) {
        await sb.from('logs').insert([{ id: getNextId(STATE.logs), tipo: 'recebimento', produto_nome: 'Baixa de Conta', quantidade: 0, data: getHojeLocalStr(), observacao: 'Ref Lanc #' + id, valor_total: payVal, cliente_nome: rowsToUpdate[0].clientName, forma_pagamento: method, status: 'ATIVO', status_financeiro: 'PAGO', valor_pago: payVal }]);
    }
    document.getElementById('modal-receivable-edit').classList.add('hidden');
    showToast("Conta atualizada!");
    await loadData();
    renderFinance();
}

async function estornarRecebimento(id) {
    if (!confirm("Estornar a baixa desta conta? Ela voltará a ficar PENDENTE.")) return;
    showLoading(true);
    const items = STATE.logs.filter(l => String(l.id) === String(id) && (l.type === 'venda' || l.type === 'receita'));
    for (const item of items) {
        await sb.from('logs').update({ valor_pago: 0, status_financeiro: 'PENDENTE' }).eq('uid', item.uid);
    }
    await sb.from('logs').delete().like('observacao', `%Ref Lanc #${id}%`).eq('tipo', 'recebimento');
    showToast("Recebimento estornado!");
    await loadData();
    renderFinance();
}

async function deleteRevenue(id) {
    const items = STATE.logs.filter(l => String(l.id) === String(id) && (l.type === 'venda' || l.type === 'receita'));
    if (items.some(i => i.type === 'venda')) {
        if (confirm("Essa conta pertence a um pedido. Deseja estornar a venda inteira para orçamento?")) {
            if (typeof estornarVenda === 'function') estornarVenda(id);
        }
    } else {
        if (!confirm("Excluir esta receita permanentemente?")) return;
        showLoading(true);
        await sb.from('logs').delete().eq('id', id).eq('tipo', 'receita');
        showToast("Receita excluída!");
        await loadData();
        renderFinance();
    }
}

// ============ DESPESAS ============
function openEditExpense(id) {
    const exp = STATE.expenses.find(e => String(e.id) === String(id));
    if (!exp) return;
    document.getElementById('exp-id').value = exp.id;
    document.getElementById('exp-item').value = exp.item;
    let provider = '', note = exp.note || '';
    if (note.startsWith('Fornecedor:')) { provider = note.split('|')[0].replace('Fornecedor:', '').trim(); note = note.split('|').slice(1).join('|').trim(); }
    document.getElementById('exp-provider').value = provider;
    document.getElementById('exp-cost').value = exp.cost;
    document.getElementById('exp-date').value = (exp.date || '').split('T')[0];
    document.getElementById('exp-note').value = note;
    document.getElementById('modal-expense').classList.remove('hidden');
}

async function saveExpense() {
    const idVal = document.getElementById('exp-id').value;
    const isNew = !idVal;
    const item = document.getElementById('exp-item').value;
    const provider = document.getElementById('exp-provider').value.trim();
    const cost = document.getElementById('exp-cost').value;
    const date = document.getElementById('exp-date').value || getHojeLocalStr();
    const note = document.getElementById('exp-note').value.trim();
    if (!item || !cost) return showToast("Preencha categoria e valor", true);
    showLoading(true);
    const finalNote = provider ? `Fornecedor: ${provider}${note ? ' | ' + note : ''}` : note;
    const payload = { item, quantidade: 1, unidade: 'Un', custo: Number(cost), data: date, observacao: finalNote, status: 'PENDENTE' };
    if (isNew) {
        payload.id = getNextId(STATE.expenses);
        await sb.from('despesas').insert([payload]);
    } else {
        await sb.from('despesas').update(payload).eq('id', idVal);
    }
    document.getElementById('modal-expense').classList.add('hidden');
    showToast(isNew ? "Despesa lançada!" : "Despesa atualizada!");
    await loadData();
    renderFinance();
}

async function payExpense(id) {
    if (!confirm("Confirmar baixa da despesa?")) return;
    showLoading(true);
    const exp = STATE.expenses.find(e => String(e.id) === String(id));
    if (!exp || exp.status === 'PAGO') { showLoading(false); return showToast(exp ? "Já está paga!" : "Despesa não encontrada", true); }
    await sb.from('despesas').update({ status: 'PAGO' }).eq('id', id);
    await sb.from('logs').insert([{ id: getNextId(STATE.logs), tipo: 'despesa', produto_nome: exp.item, quantidade: exp.quantity, data: getHojeLocalStr(), observacao: (exp.note ? exp.note + ' | ' : '') + 'Ref Despesa #' + exp.id, valor_total: exp.cost, status: 'ATIVO', status_financeiro: 'PAGO', valor_pago: exp.cost }]);
    showToast("Despesa paga!");
    await loadData();
    renderFinance();
}

async function deleteExpense(id) {
    if (!confirm("Excluir despesa permanentemente?")) return;
    showLoading(true);
    await sb.from('despesas').delete().eq('id', id);
    showToast("Despesa excluída!");
    await loadData();
    renderFinance();
}

async function estornarPagamentoDespesa(id) {
    if (!confirm("Estornar pagamento? A despesa voltará a PENDENTE.")) return;
    showLoading(true);
    await sb.from('despesas').update({ status: 'PENDENTE' }).eq('id', id);
    await sb.from('logs').delete().like('observacao', `%Ref Despesa #${id}%`).eq('tipo', 'despesa');
    showToast("Pagamento estornado!");
    await loadData();
    renderFinance();
}

// ============ IMPRESSÕES ============
function printReceivables() {
    const termRec = document.getElementById('rec-search')?.value.toLowerCase() || '';
    const statusRec = document.getElementById('rec-status')?.value || '';
    const startRec = document.getElementById('rec-start')?.value;
    const endRec = document.getElementById('rec-end')?.value;
    const hojeLocalStr = getHojeLocalStr();

    const salesMap = {};
    STATE.logs.filter(l => (l.type === 'venda' || l.type === 'receita') && l.status !== 'CANCELADO').forEach(l => {
        if(!salesMap[l.id]) {
            salesMap[l.id] = { 
                id: l.id, val: 0, paid: 0, status: l.finStatus, date: l.date, 
                clientName: l.clientName, payment: l.paymentMethod, dueDate: l.dueDate,
                desc: l.type === 'receita' ? l.productName : `Venda #${l.id}`
            };
        }
        salesMap[l.id].val += Number(l.totalValue) || 0;
        salesMap[l.id].paid = Math.max(salesMap[l.id].paid, Number(l.paidValue) || 0);
    });
    
    let filtered = Object.values(salesMap);
    if(termRec) filtered = filtered.filter(r => (r.clientName && r.clientName.toLowerCase().includes(termRec)) || (r.desc && r.desc.toLowerCase().includes(termRec)) || String(r.id).includes(termRec));
    if(statusRec === 'PAGOS') filtered = filtered.filter(r => r.status === 'PAGO');
    if(statusRec === 'ABERTOS') filtered = filtered.filter(r => r.status !== 'PAGO' && (r.dueDate||'').split('T')[0] >= hojeLocalStr);
    if(statusRec === 'VENCIDOS') filtered = filtered.filter(r => r.status !== 'PAGO' && (r.dueDate||'').split('T')[0] < hojeLocalStr);
    if(startRec) filtered = filtered.filter(r => (r.dueDate||'').split('T')[0] >= startRec);
    if(endRec) filtered = filtered.filter(r => (r.dueDate||'').split('T')[0] <= endRec);
    
    filtered.sort((a,b) => (a.dueDate||'').localeCompare(b.dueDate||''));
    if (filtered.length === 0) return showToast("Nenhum dado para imprimir", true);

    let totalGeral = 0;
    let totalPago = 0;
    const company = {
        name: "RV BLOCOS E ESTRUTURAS",
        cnpj: "46.889.791/0001-53",
        logoUrl: "https://lh3.googleusercontent.com/d/1SIoZ2JlalfMnGDZTXBk7ZYuPgwxX3odF"
    };

    const el = document.getElementById('print-area');
            el.innerHTML = `
                <div class="invoice-box-orig" style="font-family: 'Helvetica', sans-serif; max-width: 800px; margin: auto; padding: 15px;">
                    <div class="header-orig" style="display: flex; border: 1px solid #000; margin-bottom: 0;">
                        <div class="logo-box-orig" style="width: 100px; padding: 5px; border-right: 1px solid #000; display: flex; align-items: center; justify-content: center;">
                            <img src="${company.logoUrl}" style="max-height: 80px; max-width: 100%;" />
                        </div>
                        <div class="company-box-orig" style="flex: 1; padding: 10px; border-right: 1px solid #000;">
                            <h2 style="margin: 0; font-size: 18px; font-weight: bold; color: #059669;">${company.name}</h2>
                            <p style="margin: 2px 0; font-size: 12px;">CNPJ: ${company.cnpj}</p>
                        </div>
                        <div class="info-box-orig" style="width: 250px; padding: 10px; background-color: #f9f9f9; text-align: right;">
                            <h3 style="margin: 0; font-size: 14px; font-weight: bold;">RELATÓRIO: CONTAS A RECEBER</h3>
                            <p style="margin: 5px 0; font-size: 12px;">Emissão: ${new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div style="background-color: #f8fafc; border: 1px solid #000; border-top: none; padding: 8px; margin-bottom: 15px; font-size: 12px;">
                        <strong>Filtros aplicados:</strong> ${subheader}
                    </div>

                    <table class="items-table-orig" style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #000;">
                        <thead>
                            <tr style="background-color: #f1f5f9;">
                                <th style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 6px; text-align: left;">Vencimento</th>
                                <th style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 6px; text-align: left;">Cliente</th>
                                <th style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 6px; text-align: left;">Referência</th>
                                <th style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 6px; text-align: left;">Pagto</th>
                                <th style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 6px; text-align: center;">Status</th>
                                <th style="border-bottom: 1px solid #000; padding: 6px; text-align: right;">Valor</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                        <tfoot>
                            <tr style="background-color: #f0fdf4;">
                                <td colspan="5" style="border-top: 2px solid #000; border-right: 1px solid #000; padding: 8px; text-align: right; font-weight: bold; font-size: 12px;">TOTAL BRUTO NA LISTA:</td>
                                <td style="border-top: 2px solid #000; padding: 8px; text-align: right; font-weight: bold; font-size: 14px; color: #0f172a;">${formatMoney(totalGeral)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
            setTimeout(() => window.print(), 500);
        }

function printExpenses() {
            const termExp = document.getElementById('exp-search')?.value.toLowerCase() || '';
            const statusExp = document.getElementById('exp-status')?.value || '';
            const startExp = document.getElementById('exp-start')?.value;
            const endExp = document.getElementById('exp-end')?.value;
            const hojeLocalStr = getHojeLocalStr();

            let filteredExp = STATE.expenses.slice();
            if(termExp) filteredExp = filteredExp.filter(e => e.item?.toLowerCase().includes(termExp) || e.note?.toLowerCase().includes(termExp));
            if(statusExp) filteredExp = filteredExp.filter(e => e.status === statusExp);
            if(startExp) filteredExp = filteredExp.filter(e => (e.date||'').split('T')[0] >= startExp);
            if(endExp) filteredExp = filteredExp.filter(e => (e.date||'').split('T')[0] <= endExp);
            
            filteredExp.sort((a,b) => (a.date||'').localeCompare(b.date||''));

            if (filteredExp.length === 0) return showToast("Nenhum dado para imprimir", true);

            let totalGeral = 0;
            const rowsHtml = filteredExp.map(e => {
                totalGeral += e.cost;
                const dataVencStr = (e.date||'').split('T')[0];
                const situacao = e.status === 'PAGO' ? 'PAGO' : (dataVencStr < hojeLocalStr ? 'VENCIDO' : 'PENDENTE');
                
                let providerVal = e.note || '-';
                if (providerVal.startsWith('Fornecedor:')) providerVal = providerVal.replace('Fornecedor:', '').trim();

                return `
                    <tr>
                        <td style="border-bottom: 1px solid #ccc; border-right: 1px solid #000; padding: 5px;">${formatDate(e.date)}</td>
                        <td style="border-bottom: 1px solid #ccc; border-right: 1px solid #000; padding: 5px; font-weight: bold;">${e.item}</td>
                        <td style="border-bottom: 1px solid #ccc; border-right: 1px solid #000; padding: 5px;">${providerVal}</td>
                        <td style="border-bottom: 1px solid #ccc; border-right: 1px solid #000; padding: 5px; text-align: center;">${situacao}</td>
                        <td style="border-bottom: 1px solid #ccc; padding: 5px; text-align: right; font-weight: bold;">${formatMoney(e.cost)}</td>
                    </tr>
                `;
            }).join('');

            let filterText = [];
            if(statusExp) filterText.push(`Status: ${statusExp}`);
            if(startExp) filterText.push(`De: ${formatDate(startExp)}`);
            if(endExp) filterText.push(`Até: ${formatDate(endExp)}`);
            if(termExp) filterText.push(`Busca: "${termExp}"`);
            let subheader = filterText.length > 0 ? filterText.join(' | ') : 'Todos os registros';

            const company = {
                name: "RV BLOCOS E ESTRUTURAS",
                cnpj: "46.889.791/0001-53",
                logoUrl: "https://lh3.googleusercontent.com/d/1SIoZ2JlalfMnGDZTXBk7ZYuPgwxX3odF"
            };

            const el = document.getElementById('print-area');
            el.innerHTML = `
                <div class="invoice-box-orig" style="font-family: 'Helvetica', sans-serif; max-width: 800px; margin: auto; padding: 15px;">
                    <div class="header-orig" style="display: flex; border: 1px solid #000; margin-bottom: 0;">
                        <div class="logo-box-orig" style="width: 100px; padding: 5px; border-right: 1px solid #000; display: flex; align-items: center; justify-content: center;">
                            <img src="${company.logoUrl}" style="max-height: 80px; max-width: 100%;" />
                        </div>
                        <div class="company-box-orig" style="flex: 1; padding: 10px; border-right: 1px solid #000;">
                            <h2 style="margin: 0; font-size: 18px; font-weight: bold; color: #059669;">${company.name}</h2>
                            <p style="margin: 2px 0; font-size: 12px;">CNPJ: ${company.cnpj}</p>
                        </div>
                        <div class="info-box-orig" style="width: 250px; padding: 10px; background-color: #f9f9f9; text-align: right;">
                            <h3 style="margin: 0; font-size: 14px; font-weight: bold;">RELATÓRIO: CONTAS A PAGAR</h3>
                            <p style="margin: 5px 0; font-size: 12px;">Emissão: ${new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div style="background-color: #f8fafc; border: 1px solid #000; border-top: none; padding: 8px; margin-bottom: 15px; font-size: 12px;">
                        <strong>Filtros aplicados:</strong> ${subheader}
                    </div>

                    <table class="items-table-orig" style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #000;">
                        <thead>
                            <tr style="background-color: #f1f5f9;">
                                <th style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 6px; text-align: left;">Data</th>
                                <th style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 6px; text-align: left;">Categoria</th>
                                <th style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 6px; text-align: left;">Fornecedor / Obs</th>
                                <th style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 6px; text-align: center;">Status</th>
                                <th style="border-bottom: 1px solid #000; padding: 6px; text-align: right;">Valor</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                        <tfoot>
                            <tr style="background-color: #fef2f2;">
                                <td colspan="4" style="border-top: 2px solid #000; border-right: 1px solid #000; padding: 8px; text-align: right; font-weight: bold; font-size: 12px;">TOTAL DAS DESPESAS NA LISTA:</td>
                                <td style="border-top: 2px solid #000; padding: 8px; text-align: right; font-weight: bold; font-size: 14px; color: #dc2626;">${formatMoney(totalGeral)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
            setTimeout(() => window.print(), 500);
        }


// Funções dummy para compatibilidade (se já existirem no escopo global)
function saveReceivableEdit() { saveReceivableEdit(); }
function openEditReceivable(id, total, paid, due, method) { openEditReceivable(id, total, paid, due, method); }
