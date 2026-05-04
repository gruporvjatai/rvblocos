// ====== ABERTURA DA MODAL DE RECEITA ======
function openRevenueModal() {
    document.getElementById('modal-revenue').classList.remove('hidden');
}

// ====== LANÇAR RECEITA ======
async function saveRevenue() {
    const desc = document.getElementById('rev-desc').value.trim();
    const client = document.getElementById('rev-client').value.trim() || 'Consumidor Final';
    const val = parseFloat(document.getElementById('rev-val').value) || 0;
    const method = document.getElementById('rev-method').value;
    const due = document.getElementById('rev-due').value || getHojeLocalStr();

    if (!desc || !val) return showToast("Preencha descrição e valor!", true);
    showLoading(true);

    const newId = getNextId(STATE.logs);
    const payload = {
        id: newId, tipo: 'receita', produto_nome: 'Receita Avulsa: ' + desc, quantidade: 1,
        data: getHojeLocalStr(), observacao: 'Lançamento Financeiro Manual', valor_total: val,
        cliente_nome: client, forma_pagamento: method, status: 'ATIVO',
        status_entrega: 'ENTREGUE', qtd_entregue: 1, desconto: 0,
        status_financeiro: 'PENDENTE', vencimento: due, valor_pago: 0, endereco_entrega: ''
    };

    const { error } = await sb.from('logs').insert([payload]);
    if (error) {
        showLoading(false);
        return showToast("Erro: " + error.message, true);
    }

    document.getElementById('modal-revenue').classList.add('hidden');
    document.getElementById('rev-desc').value = '';
    document.getElementById('rev-val').value = '';
    showToast("Receita lançada (pendente)!");
    loadData();
}

// ====== EDITAR / BAIXAR CONTA A RECEBER ======
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
    if (!rowsToUpdate.length) {
        showLoading(false);
        return showToast("Registro não encontrado", true);
    }

    const orderTotal = rowsToUpdate.reduce((a, r) => a + r.totalValue, 0);
    const orderPaid = rowsToUpdate.reduce((a, r) => Math.max(a, r.paidValue), 0);
    const newPaid = orderPaid + payVal;
    const finStatus = newPaid >= orderTotal ? 'PAGO' : (newPaid > 0 ? 'PARCIAL' : 'PENDENTE');

    for (const row of rowsToUpdate) {
        const updateData = { valor_pago: newPaid, status_financeiro: finStatus };
        if (method) updateData.forma_pagamento = method;
        if (due) updateData.vencimento = due;
        await sb.from('logs').update(updateData).eq('uid', row.uid);
    }

    if (payVal > 0) {
        await sb.from('logs').insert([{
            id: getNextId(STATE.logs), tipo: 'recebimento', produto_nome: 'Baixa de Conta',
            quantidade: 0, data: getHojeLocalStr(), observacao: 'Ref Lanc #' + id,
            valor_total: payVal, cliente_nome: rowsToUpdate[0].clientName,
            forma_pagamento: method || rowsToUpdate[0].paymentMethod,
            status: 'ATIVO', status_financeiro: 'PAGO', valor_pago: payVal
        }]);
    }

    document.getElementById('modal-receivable-edit').classList.add('hidden');
    showToast("Conta atualizada!");
    loadData();
}

async function estornarRecebimento(id) {
    if (!confirm("Estornar a baixa desta conta? Ela voltará a ficar PENDENTE.")) return;
    showLoading(true);
    try {
        const items = STATE.logs.filter(l => String(l.id) === String(id) && (l.type === 'venda' || l.type === 'receita'));
        for (const item of items) {
            await sb.from('logs').update({ valor_pago: 0, status_financeiro: 'PENDENTE' }).eq('uid', item.uid);
        }
        await sb.from('logs').delete().like('observacao', `%Ref Lanc #${id}%`).eq('tipo', 'recebimento');
        showToast("Recebimento estornado!");
        await loadData();
    } catch (e) {
        showLoading(false);
        showToast("Erro: " + e.message, true);
    }
}

async function excluirReceitaPendente(id) {
    const items = STATE.logs.filter(l => String(l.id) === String(id) && (l.type === 'venda' || l.type === 'receita'));
    if (!items.length) return;
    if (items.some(i => i.type === 'venda')) {
        if (confirm("Essa conta pertence a um pedido. Deseja estornar a venda inteira para orçamento?")) {
            estornarVenda(id); // função existente no sistema
        }
    } else {
        if (!confirm("Excluir esta receita permanentemente?")) return;
        showLoading(true);
        const { error } = await sb.from('logs').delete().eq('id', id).eq('tipo', 'receita');
        if (error) {
            showLoading(false);
            return showToast("Erro: " + error.message, true);
        }
        showToast("Receita excluída!");
        loadData();
    }
}

// ====== DESPESAS ======
function openEditExpense(id) {
    const exp = STATE.expenses.find(e => String(e.id) === String(id));
    if (!exp) return;
    document.getElementById('exp-id').value = exp.id;
    document.getElementById('exp-item').value = exp.item;
    let provider = '', note = exp.note || '';
    if (note.startsWith('Fornecedor:')) {
        const parts = note.split('|');
        provider = parts[0].replace('Fornecedor:', '').trim();
        note = parts.slice(1).join('|').trim();
    }
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
    const payload = {
        item, quantidade: 1, unidade: 'Un',
        custo: Number(cost), data: date, observacao: finalNote, status: 'PENDENTE'
    };

    if (isNew) {
        payload.id = getNextId(STATE.expenses);
        const { error } = await sb.from('despesas').insert([payload]);
        if (error) { showLoading(false); return showToast("Erro: " + error.message, true); }
    } else {
        const { error } = await sb.from('despesas').update(payload).eq('id', idVal);
        if (error) { showLoading(false); return showToast("Erro: " + error.message, true); }
    }

    document.getElementById('exp-id').value = '';
    document.getElementById('exp-provider').value = '';
    document.getElementById('exp-cost').value = '';
    document.getElementById('exp-note').value = '';
    document.getElementById('modal-expense').classList.add('hidden');
    showToast(isNew ? "Despesa lançada!" : "Despesa atualizada!");
    loadData();
}

async function payExpense(id) {
    if (!confirm("Confirmar baixa da despesa?")) return;
    showLoading(true);
    const exp = STATE.expenses.find(e => String(e.id) === String(id));
    if (!exp || exp.status === 'PAGO') {
        showLoading(false);
        return showToast(exp ? "Já está paga!" : "Despesa não encontrada", true);
    }
    await sb.from('despesas').update({ status: 'PAGO' }).eq('id', id);
    const newId = getNextId(STATE.logs);
    await sb.from('logs').insert([{
        id: newId, tipo: 'despesa', produto_nome: exp.item, quantidade: exp.quantity,
        data: getHojeLocalStr(), observacao: (exp.note ? exp.note + ' | ' : '') + 'Ref Despesa #' + exp.id,
        valor_total: exp.cost, status: 'ATIVO', status_financeiro: 'PAGO', valor_pago: exp.cost
    }]);
    showToast("Despesa paga!");
    loadData();
}

async function excluirDespesa(id) {
    if (!confirm("Excluir despesa permanentemente?")) return;
    showLoading(true);
    const { error } = await sb.from('despesas').delete().eq('id', id);
    if (error) { showLoading(false); return showToast("Erro: " + error.message, true); }
    showToast("Despesa excluída!");
    loadData();
}

async function estornarDespesaLog(id) {
    if (!confirm("Estornar pagamento? A despesa voltará a PENDENTE.")) return;
    showLoading(true);
    await sb.from('despesas').update({ status: 'PENDENTE' }).eq('id', id);
    await sb.from('logs').delete().like('observacao', `%Ref Despesa #${id}%`).eq('tipo', 'despesa');
    showToast("Pagamento estornado!");
    loadData();
}

// ====== RENDER PRINCIPAL DA ABA FINANCEIRA ======
function renderFinance() {
    // --- Cards superiores ---
    const salesMap = {};
    STATE.logs.filter(l => (l.type === 'venda' || l.type === 'receita') && l.status !== 'CANCELADO').forEach(l => {
        if (!salesMap[l.id]) {
            salesMap[l.id] = {
                id: l.id, val: 0, paid: 0, status: l.finStatus, date: l.date,
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

    const hojeStr = getHojeLocalStr();

    // --- Contas a Receber ---
    const tr = document.getElementById('rec-search')?.value.toLowerCase() || '';
    const sr = document.getElementById('rec-status')?.value || '';
    const dr1 = document.getElementById('rec-start')?.value;
    const dr2 = document.getElementById('rec-end')?.value;
    let recList = salesArr;
    if (tr) recList = recList.filter(r => (r.clientName && r.clientName.toLowerCase().includes(tr)) || (r.desc && r.desc.toLowerCase().includes(tr)) || String(r.id).includes(tr));
    if (sr === 'PAGOS') recList = recList.filter(r => r.status === 'PAGO');
    if (sr === 'ABERTOS') recList = recList.filter(r => r.status !== 'PAGO' && (r.dueDate || '').split('T')[0] >= hojeStr);
    if (sr === 'VENCIDOS') recList = recList.filter(r => r.status !== 'PAGO' && (r.dueDate || '').split('T')[0] < hojeStr);
    if (dr1) recList = recList.filter(r => (r.dueDate || '').split('T')[0] >= dr1);
    if (dr2) recList = recList.filter(r => (r.dueDate || '').split('T')[0] <= dr2);
    recList.sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''));

    const recBody = document.getElementById('fin-receivables-list');
    if (recList.length === 0) {
        recBody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-slate-400">Nenhum registro.</td></tr>';
    } else {
        const totalVal = recList.reduce((a, r) => a + r.val, 0);
        const rows = recList.map(r => {
            const dataVencStr = (r.dueDate || '').split('T')[0];
            const isVencido = dataVencStr < hojeStr && r.status !== 'PAGO';
            const bg = isVencido ? 'bg-red-50/50' : (r.status === 'PAGO' ? 'bg-green-50/50 opacity-80' : '');
            const aviso = isVencido ? '<span class="text-[9px] bg-red-500 text-white px-1 rounded ml-1">VENCIDO</span>' : '';
            const rest = r.val - r.paid;
            return `<tr class="hover:bg-slate-100 ${bg}">
                <td class="p-3 text-xs border-r"><div class="font-bold ${isVencido ? 'text-red-600' : 'text-slate-700'}">${formatDate(r.dueDate)} ${aviso}</div><div class="text-[10px] text-slate-400 uppercase mt-0.5">${r.payment || '-'}</div></td>
                <td class="p-3 border-r"><div class="font-bold text-slate-800 text-xs">${r.clientName}</div><div class="text-[10px] text-slate-500 truncate w-32" title="${r.desc}">${r.desc}</div></td>
                <td class="p-3 border-r"><div class="font-bold text-slate-800 text-sm">${formatMoney(r.val)}</div>${r.status !== 'PAGO' && r.paid > 0 ? `<div class="text-[10px] text-orange-500 font-bold">Resta: ${formatMoney(rest)}</div>` : ''}</td>
                <td class="p-3 text-right flex justify-end gap-1">
                    ${r.status !== 'PAGO' ? `<button onclick="openEditReceivable('${r.id}', ${r.val}, ${r.paid}, '${r.dueDate}', '${r.payment}')" class="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-1.5 px-3 rounded shadow"><i data-lucide="edit-3" class="w-3 h-3"></i> BAIXAR</button>
                    <button onclick="excluirReceitaPendente('${r.id}')" class="bg-white border border-red-200 text-red-500 hover:bg-red-50 text-[10px] font-bold py-1.5 px-2 rounded shadow"><i data-lucide="trash-2" class="w-3 h-3"></i></button>`
                    : `<span class="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1.5 rounded flex items-center gap-1"><i data-lucide="check-circle" class="w-3 h-3"></i> PAGO</span>
                    <button onclick="estornarRecebimento('${r.id}')" class="bg-white border border-slate-200 text-slate-500 hover:text-red-500 text-[10px] font-bold py-1.5 px-2 rounded shadow"><i data-lucide="rotate-ccw" class="w-3 h-3"></i></button>`}
                </td>
            </tr>`;
        }).join('');
        recBody.innerHTML = rows + `<tr class="bg-blue-50 border-t-2 border-blue-200 sticky bottom-0 z-10"><td colspan="2" class="p-3 text-right font-bold text-blue-900 text-xs uppercase">Totais da Pesquisa:</td><td class="p-3 font-black text-blue-700 text-sm">${formatMoney(totalVal)}</td><td class="p-3"></td></tr>`;
    }

    // --- Contas a Pagar ---
    const te = document.getElementById('exp-search')?.value.toLowerCase() || '';
    const se = document.getElementById('exp-status')?.value || '';
    const de1 = document.getElementById('exp-start')?.value;
    const de2 = document.getElementById('exp-end')?.value;
    let expList = STATE.expenses.slice();
    if (te) expList = expList.filter(e => e.item?.toLowerCase().includes(te) || e.note?.toLowerCase().includes(te));
    if (se) expList = expList.filter(e => e.status === se);
    if (de1) expList = expList.filter(e => (e.date || '').split('T')[0] >= de1);
    if (de2) expList = expList.filter(e => (e.date || '').split('T')[0] <= de2);
    expList.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const expBody = document.getElementById('fin-expense-history-list');
    if (expList.length === 0) {
        expBody.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-slate-400">Nenhum registro.</td></tr>';
    } else {
        const totalExp = expList.reduce((a, e) => a + e.cost, 0);
        const rowsExp = expList.map(e => {
            const dataVencStr = (e.date || '').split('T')[0];
            const isVencido = dataVencStr < hojeStr && e.status !== 'PAGO';
            const bg = isVencido ? 'bg-red-50/50' : (e.status === 'PAGO' ? 'bg-green-50/50 opacity-80' : 'bg-orange-50/30');
            const aviso = isVencido ? '<span class="text-[9px] bg-red-500 text-white px-1 rounded ml-1">VENCIDO</span>' : '';
            let providerVal = e.note || '-';
            if (providerVal.startsWith('Fornecedor:')) providerVal = providerVal.replace('Fornecedor:', '').trim();
            return `<tr class="hover:bg-slate-100 ${bg}">
                <td class="p-3 text-xs border-r"><div class="font-bold ${isVencido ? 'text-red-600' : 'text-slate-700'}">${formatDate(e.date)} ${aviso}</div></td>
                <td class="p-3 border-r"><div class="font-bold text-slate-800 text-xs">${e.item}</div><div class="text-[10px] text-slate-500 truncate w-32" title="${providerVal}">${providerVal}</div></td>
                <td class="p-3 border-r"><div class="font-bold text-slate-800 text-sm">${formatMoney(e.cost)}</div></td>
                <td class="p-3 text-right flex justify-end gap-1">
                    ${e.status !== 'PAGO' ? `
                        <button onclick="openEditExpense('${e.id}')" class="bg-slate-200 text-slate-700 hover:bg-slate-300 p-1.5 rounded shadow" title="Editar"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i></button>
                        <button onclick="payExpense('${e.id}')" class="bg-red-500 text-white hover:bg-red-600 p-1.5 rounded shadow flex items-center gap-1 text-[10px] font-bold"><i data-lucide="check-circle" class="w-3.5 h-3.5"></i> BAIXAR</button>
                        <button onclick="excluirDespesa('${e.id}')" class="bg-white border border-red-200 text-red-500 hover:bg-red-50 p-1.5 rounded shadow" title="Excluir"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                    ` : `
                        <span class="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1.5 rounded flex items-center gap-1"><i data-lucide="check" class="w-3 h-3"></i> PAGO</span>
                        <button onclick="estornarDespesaLog('${e.id}')" class="bg-white border border-slate-200 text-slate-500 hover:text-red-500 p-1.5 rounded shadow" title="Estornar"><i data-lucide="rotate-ccw" class="w-3 h-3"></i></button>
                    `}
                </td>
            </tr>`;
        }).join('');
        expBody.innerHTML = rowsExp + `<tr class="bg-red-50 border-t-2 border-red-200 sticky bottom-0 z-10"><td colspan="2" class="p-3 text-right font-bold text-red-900 text-xs uppercase">Totais da Pesquisa:</td><td class="p-3 font-black text-red-700 text-sm">${formatMoney(totalExp)}</td><td class="p-3"></td></tr>`;
    }
    lucide.createIcons();
}
