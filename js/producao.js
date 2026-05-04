// ====== PRODUÇÃO E HISTÓRICO ======

function renderProductionSelect() {
    // Preenche o select de produtos
    const sel = document.getElementById('prod-select-production');
    if (sel) {
        sel.innerHTML = '<option value="">Selecione o Produto...</option>' +
            (STATE.products || []).map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }

    // Histórico de produções
    const histBody = document.getElementById('production-history-list');
    if (histBody) {
        const prodLogs = (STATE.logs || [])
            .filter(l => l.type === 'fabricacao' && l.status !== 'CANCELADO')
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        if (prodLogs.length === 0) {
            histBody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-400">Nenhuma produção registrada.</td></tr>';
        } else {
            histBody.innerHTML = prodLogs.map(l => `
                <tr class="hover:bg-slate-50">
                    <td class="p-3 text-xs text-slate-500">${formatDate(l.date)}</td>
                    <td class="p-3 font-medium text-slate-700">${l.productName}</td>
                    <td class="p-3 text-center font-bold text-orange-600">+${l.quantity}</td>
                    <td class="p-3 text-xs text-slate-400 italic">${l.note || '-'}</td>
                </tr>
            `).join('');
        }
    }

    // Atualiza dashboard mensal
    renderProductionDash();
    lucide.createIcons();
}

async function saveProduction(e) {
    e.preventDefault();
    const pId = document.getElementById('prod-select-production').value;
    const qty = parseFloat(document.getElementById('prod-qty-production').value);
    const note = document.getElementById('prod-note-production').value;

    if (!pId || isNaN(qty) || qty <= 0) return showToast("Selecione produto e quantidade!", true);

    showLoading(true);

    try {
        // Obtém saldo real do banco
        const { data: freshProd, error: fetchErr } = await sb.from('produtos')
            .select('estoque_fisico')
            .eq('id', pId)
            .single();

        if (fetchErr) throw fetchErr;

        const physicalAtual = Number(freshProd.estoque_fisico) || 0;

        // Atualiza estoque
        const { error: updateErr } = await sb.from('produtos')
            .update({ estoque_fisico: physicalAtual + qty })
            .eq('id', pId);

        if (updateErr) throw updateErr;

        // Registra log de produção
        const prod = STATE.products.find(x => String(x.id) === String(pId));
        const logId = getNextId(STATE.logs);
        const { error: logErr } = await sb.from('logs').insert([{
            id: logId,
            tipo: 'fabricacao',
            produto_nome: prod.name,
            quantidade: qty,
            data: new Date().toISOString(),
            observacao: note,
            status: 'ATIVO'
        }]);

        if (logErr) throw logErr;

        // Limpa formulário
        e.target.reset();
        showToast("Produção Registrada!");
        await loadData();
    } catch (err) {
        showLoading(false);
        showToast("Erro: " + err.message, true);
    }
}

function renderProductionDash() {
    const monthInput = document.getElementById('prod-dash-month');
    const contentDiv = document.getElementById('prod-dash-content');

    if (!monthInput || !contentDiv) return;

    // Garante que o mês atual esteja selecionado (caso não haja valor)
    if (!monthInput.value) {
        const now = new Date();
        monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const mesSelecionado = monthInput.value;

    let totalGeral = 0;
    for (const log of STATE.logs) {
        if (log.type === 'fabricacao' && log.status !== 'CANCELADO' && log.date) {
            try {
                if (String(log.date).substring(0, 7) === mesSelecionado) {
                    const qtd = Number(log.quantity);
                    if (!isNaN(qtd)) totalGeral += qtd;
                }
            } catch (e) { continue; }
        }
    }

    let despesasTotais = 0;
    for (const exp of STATE.expenses) {
        if (exp.date) {
            try {
                if (String(exp.date).substring(0, 7) === mesSelecionado) {
                    const val = Number(exp.cost);
                    if (!isNaN(val)) despesasTotais += val;
                }
            } catch (e) { continue; }
        }
    }

    const custoMaterialB10 = STATE.custoMaterialB10 || 0;
    let custoMedioLiquido = totalGeral > 0 ? despesasTotais / totalGeral : 0;

    if (totalGeral === 0) {
        contentDiv.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-slate-400 opacity-70 p-10">
                <i data-lucide="inbox" class="w-10 h-10 mb-2 text-slate-300"></i>
                <span class="text-sm font-bold">Nenhuma produção neste mês.</span>
            </div>
        `;
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
            </div>
        `;
    }

    lucide.createIcons();
}

// ====== IMPRESSÃO DO HISTÓRICO DE PRODUÇÃO ======
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
                <div class="info-box-orig" style="width:200px; padding:10px;">
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
        </div>
    `;

    setTimeout(() => {
        window.print();
        limparAreaImpressao();
    }, 500);
}
