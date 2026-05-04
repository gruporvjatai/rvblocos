// ====== RELATÓRIOS ======

// ====== FATURAMENTO DO DIA ======
function printDailyRevenue() {
    showLoading(true);
    const hojeLocalStr = getHojeLocalStr();
    const salesMap = {};

    STATE.logs.filter(l => l.type === 'venda' && l.status !== 'CANCELADO').forEach(l => {
        try {
            if ((l.date || '').split('T')[0] !== hojeLocalStr) return;
        } catch (e) { return; }
        if (!salesMap[l.id]) {
            salesMap[l.id] = {
                id: l.id,
                date: l.date,
                clientName: l.clientName || 'Consumidor Final',
                paymentMethod: l.paymentMethod || 'Não Informado',
                totalValue: 0
            };
        }
        salesMap[l.id].totalValue += Number(l.totalValue) || 0;
    });

    const vendasHoje = Object.values(salesMap).sort((a, b) => new Date(a.date) - new Date(b.date));

    if (vendasHoje.length === 0) {
        showLoading(false);
        return showToast("Nenhuma venda registrada no dia de hoje.", true);
    }

    let totalLiquido = 0;
    let pagamentosMap = {};

    const rowsHtml = vendasHoje.map(s => {
        totalLiquido += s.totalValue;
        const pgto = s.paymentMethod;
        if (!pagamentosMap[pgto]) pagamentosMap[pgto] = 0;
        pagamentosMap[pgto] += s.totalValue;
        return `<tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 5px; font-size:11px;">${formatDate(s.date)}</td>
            <td style="padding:8px 5px; font-size:11px; font-weight:bold;">#${s.id}</td>
            <td style="padding:8px 5px; font-size:11px;">${s.clientName}</td>
            <td style="padding:8px 5px; font-size:11px; text-transform:uppercase;">${s.paymentMethod}</td>
            <td style="padding:8px 5px; text-align:right; font-weight:bold; color:#059669;">${formatMoney(s.totalValue)}</td>
        </tr>`;
    }).join('');

    const pgtoRowsHtml = Object.entries(pagamentosMap).map(([metodo, valor]) => `
        <tr>
            <td style="padding:6px; border-bottom:1px dashed #ccc; font-size:12px;">${metodo}</td>
            <td style="padding:6px; border-bottom:1px dashed #ccc; text-align:right; font-weight:bold; font-size:12px;">${formatMoney(valor)}</td>
        </tr>
    `).join('');

    const company = {
        name: "RV BLOCOS E ESTRUTURAS",
        cnpj: "46.889.791/0001-53",
        logoUrl: "https://lh3.googleusercontent.com/d/1SIoZ2JlalfMnGDZTXBk7ZYuPgwxX3odF"
    };

    const filtroTexto = `Período: Vendas de Hoje (${formatDate(hojeLocalStr)})`;

    const el = document.getElementById('print-area');
    el.innerHTML = `
        <div class="invoice-box-orig" style="font-family:'Helvetica',sans-serif; max-width:800px; margin:auto; padding:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:15px; margin-bottom:20px;">
                <div style="display:flex; gap:15px; align-items:center;">
                    <img src="${company.logoUrl}" style="max-height:60px;" />
                    <div>
                        <h2 style="margin:0; font-size:18px; font-weight:bold; color:#ea580c;">${company.name}</h2>
                        <p style="margin:2px 0; font-size:11px; color:#64748b;">CNPJ: ${company.cnpj}</p>
                    </div>
                </div>
                <div style="text-align:right;">
                    <h3 style="margin:0; font-size:16px; font-weight:bold;">FATURAMENTO DO DIA</h3>
                    <p style="margin:2px 0; font-size:11px;">Impresso em: ${new Date().toLocaleString('pt-BR')}</p>
                </div>
            </div>

            <div style="background-color:#f8fafc; border:1px solid #cbd5e1; padding:10px; margin-bottom:20px; font-size:12px; border-radius:6px;">
                <strong>Filtros:</strong> ${filtroTexto}
            </div>

            <table style="width:100%; border-collapse:collapse; margin-bottom:30px;">
                <thead>
                    <tr style="background-color:#f1f5f9; border-bottom:2px solid #0f172a;">
                        <th style="padding:8px 5px; text-align:left; font-size:11px;">Data</th>
                        <th style="padding:8px 5px; text-align:left; font-size:11px;">Pedido</th>
                        <th style="padding:8px 5px; text-align:left; font-size:11px;">Cliente</th>
                        <th style="padding:8px 5px; text-align:left; font-size:11px;">Pgto</th>
                        <th style="padding:8px 5px; text-align:right; font-size:11px;">Valor Liq.</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>

            <div style="display:flex; justify-content:space-between; gap:20px;">
                <div style="width:45%; border:1px solid #000; padding:15px; border-radius:6px;">
                    <h4 style="margin:0 0 10px; font-size:13px; border-bottom:1px solid #000; padding-bottom:5px; text-transform:uppercase;">Receitas por Método</h4>
                    <table style="width:100%; border-collapse:collapse;">${pgtoRowsHtml}</table>
                </div>
                <div style="width:45%; border:1px solid #000; padding:15px; border-radius:6px; background-color:#f8fafc;">
                    <h4 style="margin:0 0 10px; font-size:13px; border-bottom:1px solid #000; padding-bottom:5px; text-transform:uppercase;">Resumo do Dia</h4>
                    <table style="width:100%; font-size:12px; border-collapse:collapse;">
                        <tr>
                            <td style="padding:5px 0;">Qtd. Pedidos:</td>
                            <td style="padding:5px 0; text-align:right; font-weight:bold;">${vendasHoje.length}</td>
                        </tr>
                        <tr>
                            <td style="padding:10px 0; font-size:14px; font-weight:900; border-top:1px solid #000;">LÍQUIDO TOTAL:</td>
                            <td style="padding:10px 0; font-size:16px; font-weight:900; text-align:right; border-top:1px solid #000; color:#0f172a;">${formatMoney(totalLiquido)}</td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>
    `;

    showLoading(false);
    setTimeout(() => {
        window.print();
        limparAreaImpressao();
    }, 500);
}

// ====== RELATÓRIO POR PERÍODO ======
function openPeriodReportModal() {
    const hoje = new Date();
    const primeiro = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    document.getElementById('rep-per-start').value = getLocalISODate(primeiro);
    document.getElementById('rep-per-end').value = getLocalISODate(ultimo);
    document.getElementById('modal-period-report').classList.remove('hidden');
}

function closePeriodReportModal() {
    document.getElementById('modal-period-report').classList.add('hidden');
}

function printPeriodReport() {
    showLoading(true);

    const start = document.getElementById('rep-per-start').value;
    const end = document.getElementById('rep-per-end').value;
    const payment = document.getElementById('rep-per-payment').value;
    const client = document.getElementById('rep-per-client').value.toLowerCase().trim();

    const salesMap = {};
    STATE.logs.filter(l => l.type === 'venda' && l.status !== 'CANCELADO').forEach(l => {
        if (!salesMap[l.id]) {
            salesMap[l.id] = {
                id: l.id,
                date: l.date,
                clientName: l.clientName || 'Consumidor Final',
                paymentMethod: l.paymentMethod || 'Não Informado',
                totalValue: 0
            };
        }
        salesMap[l.id].totalValue += Number(l.totalValue) || 0;
    });

    let filteredSales = Object.values(salesMap);

    if (start) filteredSales = filteredSales.filter(s => (s.date || '').split('T')[0] >= start);
    if (end) filteredSales = filteredSales.filter(s => (s.date || '').split('T')[0] <= end);
    if (payment !== 'Todos') filteredSales = filteredSales.filter(s => s.paymentMethod === payment);
    if (client) filteredSales = filteredSales.filter(s => s.clientName.toLowerCase().includes(client));

    filteredSales.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (filteredSales.length === 0) {
        showLoading(false);
        closePeriodReportModal();
        return showToast("Nenhuma venda encontrada para esses filtros.", true);
    }

    let totalLiquido = 0;
    let pagamentosMap = {};

    const rowsHtml = filteredSales.map(s => {
        totalLiquido += s.totalValue;
        const pgto = s.paymentMethod;
        if (!pagamentosMap[pgto]) pagamentosMap[pgto] = 0;
        pagamentosMap[pgto] += s.totalValue;
        return `<tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px 5px; font-size:11px;">${formatDate(s.date)}</td>
            <td style="padding:8px 5px; font-size:11px; font-weight:bold;">#${s.id}</td>
            <td style="padding:8px 5px; font-size:11px;">${s.clientName}</td>
            <td style="padding:8px 5px; font-size:11px; text-transform:uppercase;">${s.paymentMethod}</td>
            <td style="padding:8px 5px; text-align:right; font-weight:bold; color:#059669;">${formatMoney(s.totalValue)}</td>
        </tr>`;
    }).join('');

    const pgtoRowsHtml = Object.entries(pagamentosMap).map(([metodo, valor]) => `
        <tr>
            <td style="padding:6px; border-bottom:1px dashed #ccc; font-size:12px;">${metodo}</td>
            <td style="padding:6px; border-bottom:1px dashed #ccc; text-align:right; font-weight:bold; font-size:12px;">${formatMoney(valor)}</td>
        </tr>
    `).join('');

    const company = {
        name: "RV BLOCOS E ESTRUTURAS",
        cnpj: "46.889.791/0001-53",
        logoUrl: "https://lh3.googleusercontent.com/d/1SIoZ2JlalfMnGDZTXBk7ZYuPgwxX3odF"
    };

    const filtroTexto = `Período: ${start ? formatDate(start) : 'Início'} até ${end ? formatDate(end) : 'Hoje'} | Pgto: ${payment} ${client ? ' | Cliente: ' + client : ''}`;

    const el = document.getElementById('print-area');
    el.innerHTML = `
        <div class="invoice-box-orig" style="font-family:'Helvetica',sans-serif; max-width:800px; margin:auto; padding:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #000; padding-bottom:15px; margin-bottom:20px;">
                <div style="display:flex; gap:15px; align-items:center;">
                    <img src="${company.logoUrl}" style="max-height:60px;" />
                    <div>
                        <h2 style="margin:0; font-size:18px; font-weight:bold; color:#ea580c;">${company.name}</h2>
                        <p style="margin:2px 0; font-size:11px; color:#64748b;">CNPJ: ${company.cnpj}</p>
                    </div>
                </div>
                <div style="text-align:right;">
                    <h3 style="margin:0; font-size:16px; font-weight:bold;">RELATÓRIO DE VENDAS</h3>
                    <p style="margin:2px 0; font-size:11px;">Impresso em: ${new Date().toLocaleString('pt-BR')}</p>
                </div>
            </div>

            <div style="background-color:#f8fafc; border:1px solid #cbd5e1; padding:10px; margin-bottom:20px; font-size:12px; border-radius:6px;">
                <strong>Filtros:</strong> ${filtroTexto}
            </div>

            <table style="width:100%; border-collapse:collapse; margin-bottom:30px;">
                <thead>
                    <tr style="background-color:#f1f5f9; border-bottom:2px solid #0f172a;">
                        <th style="padding:8px 5px; text-align:left; font-size:11px;">Data</th>
                        <th style="padding:8px 5px; text-align:left; font-size:11px;">Pedido</th>
                        <th style="padding:8px 5px; text-align:left; font-size:11px;">Cliente</th>
                        <th style="padding:8px 5px; text-align:left; font-size:11px;">Pgto</th>
                        <th style="padding:8px 5px; text-align:right; font-size:11px;">Valor Liq.</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>

            <div style="display:flex; justify-content:space-between; gap:20px;">
                <div style="width:45%; border:1px solid #000; padding:15px; border-radius:6px;">
                    <h4 style="margin:0 0 10px; font-size:13px; border-bottom:1px solid #000; padding-bottom:5px; text-transform:uppercase;">Receitas por Método</h4>
                    <table style="width:100%; border-collapse:collapse;">${pgtoRowsHtml}</table>
                </div>
                <div style="width:45%; border:1px solid #000; padding:15px; border-radius:6px; background-color:#f8fafc;">
                    <h4 style="margin:0 0 10px; font-size:13px; border-bottom:1px solid #000; padding-bottom:5px; text-transform:uppercase;">Resumo do Período</h4>
                    <table style="width:100%; font-size:12px; border-collapse:collapse;">
                        <tr>
                            <td style="padding:5px 0;">Qtd. Pedidos:</td>
                            <td style="padding:5px 0; text-align:right; font-weight:bold;">${filteredSales.length}</td>
                        </tr>
                        <tr>
                            <td style="padding:10px 0; font-size:14px; font-weight:900; border-top:1px solid #000;">LÍQUIDO TOTAL:</td>
                            <td style="padding:10px 0; font-size:16px; font-weight:900; text-align:right; border-top:1px solid #000; color:#0f172a;">${formatMoney(totalLiquido)}</td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>
    `;

    showLoading(false);
    closePeriodReportModal();
    setTimeout(() => {
        window.print();
        limparAreaImpressao();
    }, 500);
}
