// =================================================================
// MÓDULO ORÇAMENTOS - RV BLOCOS
// =================================================================

// =================================================================
// RENDER PRINCIPAL - chamado por navigate('quotes')
// =================================================================
function renderQuotes() {
    const container = document.getElementById('view-quotes');
    if (!container) return;

    container.innerHTML = `
    <div class="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <i data-lucide="folder-open"></i> Orçamentos
        </h2>
        <div class="flex gap-2">
            <input type="text" id="quotes-search" placeholder="Buscar cliente ou ID..." 
                   class="p-2 border rounded-lg text-sm w-64 focus:ring-2 focus:ring-orange-500 outline-none"
                   onkeyup="carregarListaOrcamentos()">
            <button onclick="limparFiltroOrcamentos()" class="p-2 bg-slate-200 rounded-lg hover:bg-slate-300">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </div>
    </div>

    <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="bg-slate-50 text-slate-700 border-b">
                    <tr>
                        <th class="p-4">ID</th>
                        <th class="p-4">Cliente</th>
                        <th class="p-4">Data</th>
                        <th class="p-4">Itens</th>
                        <th class="p-4 text-right">Valor (R$)</th>
                        <th class="p-4 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody id="quotes-list" class="divide-y"></tbody>
            </table>
        </div>
    </div>
    `;

    carregarListaOrcamentos();
    lucide.createIcons();
}

// =================================================================
// CARREGAR LISTA DE ORÇAMENTOS
// =================================================================
function carregarListaOrcamentos() {
    const tbody = document.getElementById('quotes-list');
    if (!tbody) return;

    let quotes = [...(STATE.quotes || [])];

    const searchTerm = (document.getElementById('quotes-search')?.value || '').toLowerCase();
    if (searchTerm) {
        quotes = quotes.filter(q =>
            String(q.id).includes(searchTerm) ||
            (q.clientName && q.clientName.toLowerCase().includes(searchTerm))
        );
    }

    // Ordena do mais recente para o mais antigo
    quotes.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (quotes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">Nenhum orçamento encontrado.</td></tr>';
        lucide.createIcons();
        return;
    }

    tbody.innerHTML = quotes.map(q => {
        const valorLiquido = q.total - (q.discount || 0);
        const clientPhone = obterTelefoneCliente(q.clientName);
        const whatsappLink = clientPhone
            ? `https://wa.me/55${clientPhone.replace(/\D/g, '')}?text=Olá! Segue o orçamento #${q.id} no valor de ${formatMoney(valorLiquido)}`
            : '#';

        return `
        <tr class="hover:bg-slate-50 transition">
            <td class="p-4 font-mono text-xs font-bold text-slate-500">#${q.id}</td>
            <td class="p-4 font-medium text-slate-700">${escapeHtml(q.clientName)}</td>
            <td class="p-4 text-slate-500">${formatDate(q.date)}</td>
            <td class="p-4 text-slate-600 max-w-xs truncate" title="${escapeHtml(q.itemsText || '')}">${escapeHtml(q.itemsText || '-')}</td>
            <td class="p-4 text-right font-bold text-green-600">${formatMoney(valorLiquido)}</td>
            <td class="p-4 text-center">
                <div class="flex justify-center gap-2 flex-wrap">
                    <button onclick="enviarWhatsAppOrcamento('${q.id}')" class="text-green-600 hover:text-green-800 p-1" title="WhatsApp">
                        <i data-lucide="message-circle" width="18"></i>
                    </button>
                    <button onclick="carregarOrcamentoNoCarrinho('${q.id}')" class="text-blue-600 hover:text-blue-800 p-1" title="Editar / Faturar">
                        <i data-lucide="edit-3" width="18"></i>
                    </button>
                    <button onclick="duplicarOrcamento('${q.id}')" class="text-amber-600 hover:text-amber-800 p-1" title="Duplicar">
                        <i data-lucide="copy" width="18"></i>
                    </button>
                    <button onclick="baixarPDFOrcamento('${q.id}')" class="text-indigo-600 hover:text-indigo-800 p-1" title="Download PDF">
                        <i data-lucide="file-down" width="18"></i>
                    </button>
                    <button onclick="imprimirOrcamento('${q.id}')" class="text-slate-600 hover:text-slate-800 p-1" title="Imprimir">
                        <i data-lucide="printer" width="18"></i>
                    </button>
                    <button onclick="excluirOrcamento('${q.id}')" class="text-red-600 hover:text-red-800 p-1" title="Excluir">
                        <i data-lucide="trash-2" width="18"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');

    lucide.createIcons();
}

// =================================================================
// UTILITÁRIOS
// =================================================================
function limparFiltroOrcamentos() {
    const campo = document.getElementById('quotes-search');
    if (campo) campo.value = '';
    carregarListaOrcamentos();
}

function obterTelefoneCliente(clientName) {
    if (!clientName || clientName === 'Consumidor Final') return null;
    const client = STATE.clients.find(c => c.name === clientName);
    return client?.phone || null;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

// =================================================================
// WHATSAPP
// =================================================================
async function enviarWhatsAppOrcamento(id) {
    const quote = STATE.quotes.find(q => String(q.id) === String(id));
    if (!quote) return showToast("Orçamento não encontrado", true);

    const phone = obterTelefoneCliente(quote.clientName);
    if (!phone) return showToast("Cliente sem telefone cadastrado", true);

    const itemsText = quote.items.map(i => `${i.name} (x${i.qty})`).join(', ');
    const total = formatMoney(quote.total - (quote.discount || 0));
    const msg = `*ORÇAMENTO RV BLOCOS #${quote.id}*\n\nCliente: ${quote.clientName}\nData: ${formatDate(quote.date)}\nItens: ${itemsText}\nTotal: ${total}\n\n*Para confirmar ou alterar, entre em contato conosco.*`;
    window.open(`https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
}

// =================================================================
// DUPLICAR
// =================================================================
async function duplicarOrcamento(id) {
    const original = STATE.quotes.find(q => String(q.id) === String(id));
    if (!original) return showToast("Orçamento original não encontrado", true);

    showLoading(true);
    const newId = getNextId(STATE.logs, STATE.quotes);
    const date = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString();

    const newItems = original.items.map(item => ({
        id: newId,
        tipo: 'orcamento',
        produto_nome: item.name,
        quantidade: item.qty,
        data: date,
        observacao: '',
        valor_total: item.total,
        cliente_nome: original.clientName,
        forma_pagamento: original.paymentMethod || 'Dinheiro',
        status: 'ABERTO',
        desconto: original.discount || 0,
        status_financeiro: original.discountType || '$',
        endereco_entrega: original.deliveryAddress || '',
        status_entrega: '',
        qtd_entregue: 0,
        vencimento: date,
        valor_pago: 0
    }));

    const { error } = await sb.from('logs').insert(newItems);
    if (error) {
        showLoading(false);
        console.error("Erro ao duplicar:", error);
        return showToast("Erro ao duplicar orçamento: " + error.message, true);
    }
    showToast("Orçamento duplicado com sucesso!");
    await loadData();
    navigate('quotes');
    showLoading(false);
}

// =================================================================
// EXCLUIR
// =================================================================
async function excluirOrcamento(id) {
    if (!confirm("Excluir orçamento?")) return;
    showLoading(true);
    const { error } = await sb.from('logs').delete().eq('id', id).eq('tipo', 'orcamento');
    if (error) {
        showLoading(false);
        return showToast("Erro: " + error.message, true);
    }
    showToast("Excluído!");
    await loadData();
    navigate('quotes');
}

// =================================================================
// PDF E IMPRESSÃO (usando html2pdf)
// =================================================================
function gerarHTMLOrcamento(quote) {
    const clientName = quote.clientName || 'Consumidor Final';
    const cli = STATE.clients.find(c => c.name === clientName) || {
        name: clientName, doc: '', phone: '', address: ''
    };

    let subtotal = 0;
    const itemsHtml = quote.items.map(i => {
        const itemTotal = i.qty * i.price;
        subtotal += itemTotal;
        return `<tr>
            <td style="border-bottom:1px solid #000; padding:8px;">${i.name}</td>
            <td align="center" style="border-bottom:1px solid #000; padding:8px;">${i.qty}</td>
            <td align="right" style="border-bottom:1px solid #000; padding:8px;">${formatMoney(i.price)}</td>
            <td align="right" style="border-bottom:1px solid #000; padding:8px;">${formatMoney(itemTotal)}</td>
        </tr>`;
    }).join('');

    const discount = Number(quote.discount) || 0;
    const finalTotal = Math.max(0, subtotal - discount);

    const addressToShow = quote.deliveryAddress
        ? `<div style="padding:4px; background:#fef3c7; border-left:3px solid #f59e0b; margin-top:5px;"><strong>ENTREGA:</strong><br>${quote.deliveryAddress}</div>`
        : (cli.address || 'Endereço não informado');

    return `
    <div class="invoice-full" style="width:100%; max-width:800px; margin:0 auto; font-family:'Helvetica',Arial,sans-serif; background:white; padding:20px; border:1px solid #000;">
        <div class="header-section" style="display:flex; border-bottom:2px solid #000; padding-bottom:15px; margin-bottom:20px;">
            <div class="logo-area" style="width:120px; display:flex; align-items:center; justify-content:center; border-right:1px solid #e2e8f0; padding-right:15px; margin-right:15px;">
                <img src="https://lh3.googleusercontent.com/d/1SIoZ2JlalfMnGDZTXBk7ZYuPgwxX3odF" style="max-height:80px;" />
            </div>
            <div class="company-details" style="flex:1;">
                <h2 class="company-title" style="font-size:20px; font-weight:800; color:#ea580c; text-transform:uppercase; margin:0;">RV BLOCOS E ESTRUTURAS</h2>
                <div class="company-info" style="font-size:11px; color:#475569; line-height:1.4; margin-top:5px;">CNPJ: 46.889.791/0001-53</div>
                <div class="company-info" style="font-size:11px; color:#475569;">Rua Mineiros, 532 | Jataí - GO | (64) 3636-4861</div>
            </div>
            <div class="doc-meta" style="width:180px; text-align:right; margin-right:20px;">
                <div class="doc-title" style="font-size:16px; font-weight:900; color:#0f172a; text-transform:uppercase; margin-bottom:5px;">ORÇAMENTO</div>
                <div class="meta-row" style="font-size:11px; margin-bottom:2px;"><strong>Nº:</strong> ${quote.id}</div>
                <div class="meta-row" style="font-size:11px;"><strong>Data:</strong> ${formatDate(quote.date)}</div>
            </div>
        </div>
        <div class="info-grid" style="display:flex; gap:20px; margin-bottom:20px;">
            <div class="info-col" style="flex:1; border:1px solid #000; border-radius:6px; overflow:hidden;">
                <div class="col-header" style="background:#f1f5f9; padding:5px 10px; font-size:10px; font-weight:bold; text-transform:uppercase; color:#64748b; border-bottom:1px solid #000;">Dados do Cliente</div>
                <div class="col-content" style="padding:10px; font-size:11px; line-height:1.5;">
                    <strong>${cli.name}</strong><br>
                    ${cli.doc || 'CPF/CNPJ não informado'}<br>
                    ${cli.phone || 'Telefone não informado'}<br>
                    ${addressToShow}
                </div>
            </div>
            <div class="info-col" style="flex:1; border:1px solid #000; border-radius:6px; overflow:hidden;">
                <div class="col-header" style="background:#f1f5f9; padding:5px 10px; font-size:10px; font-weight:bold; text-transform:uppercase; color:#64748b; border-bottom:1px solid #000;">Pagamento</div>
                <div class="col-content" style="padding:10px; font-size:11px; line-height:1.5;">
                    <strong>Forma:</strong> ${quote.paymentMethod || 'A Combinar'}<br>
                    <strong>Vendedor:</strong> RV Blocos
                </div>
            </div>
        </div>
        <table class="full-table" style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:20px;">
            <thead>
                <tr>
                    <th style="background:#0f172a; color:white; padding:8px; text-align:left; font-weight:bold; text-transform:uppercase; font-size:10px;">Descrição</th>
                    <th align="center" style="background:#0f172a; color:white; padding:8px; text-align:center; font-weight:bold; text-transform:uppercase; font-size:10px;">Qtd</th>
                    <th align="right" style="background:#0f172a; color:white; padding:8px; text-align:right; font-weight:bold; text-transform:uppercase; font-size:10px;">Unit.</th>
                    <th align="right" style="background:#0f172a; color:white; padding:8px; text-align:right; font-weight:bold; text-transform:uppercase; font-size:10px;">Total</th>
                </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
        </table>
        <div class="footer-section" style="display:flex; gap:30px; margin-top:10px;">
            <div class="notes-area" style="flex:1; border:1px dashed #cbd5e1; padding:10px; border-radius:6px;">
                <div class="notes-title" style="font-size:10px; font-weight:bold; color:#64748b;">Observações:</div>
                <div class="notes-text" style="font-size:10px; color:#334155;">Válido por 7 dias. Verifique os produtos no ato da entrega.</div>
            </div>
            <div class="totals-area" style="width:250px;">
                <div class="total-row" style="display:flex; justify-content:space-between; padding:5px 0; font-size:11px; border-bottom:1px solid #e2e8f0;">
                    <span>Subtotal:</span><span>${formatMoney(subtotal)}</span>
                </div>
                ${discount > 0 ? `<div class="total-row" style="display:flex; justify-content:space-between; padding:5px 0; font-size:11px; color:red; border-bottom:1px solid #e2e8f0;"><span>Desconto:</span><span>- ${formatMoney(discount)}</span></div>` : ''}
                <div class="total-row final" style="display:flex; justify-content:space-between; border-bottom:none; border-top:2px solid #0f172a; font-size:14px; font-weight:900; margin-top:5px; padding-top:10px; background:#f1f5f9; padding:10px;">
                    <span>TOTAL A PAGAR:</span><span>${formatMoney(finalTotal)}</span>
                </div>
            </div>
        </div>
    </div>`;
}

async function baixarPDFOrcamento(id) {
    const q = STATE.quotes.find(x => x.id == id);
    if (!q) return showToast("Orçamento não encontrado", true);

    showLoading(true);
    const htmlString = gerarHTMLOrcamento(q);

    const opt = {
        margin: 10,
        filename: `RV Blocos - ${q.clientName} - #${q.id}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    setTimeout(() => {
        html2pdf().set(opt).from(htmlString).save()
            .then(() => {
                showLoading(false);
                showToast(`PDF do orçamento #${q.id} baixado!`);
            })
            .catch(err => {
                console.error("Erro PDF:", err);
                showLoading(false);
                showToast("Erro ao gerar PDF", true);
            });
    }, 500);
}

function imprimirOrcamento(id) {
    const q = STATE.quotes.find(x => x.id == id);
    if (!q) return showToast("Orçamento não encontrado", true);

    const printArea = document.getElementById('print-area');
    printArea.innerHTML = gerarHTMLOrcamento(q);
    setTimeout(() => {
        window.print();
        limparAreaImpressao();
    }, 500);
}
