// gerencial.js – Resultado Simplificado (RV Blocos)
(function () {
  'use strict';

  // Aguarda carregamento do sistema
  window.addEventListener('load', function () {
    const originalNavigate = window.navigate;
    window.navigate = function (viewId) {
      originalNavigate(viewId);
      if (viewId === 'gerencial') renderGerencial();
    };
  });

  function renderGerencial() {
    const container = document.getElementById('view-gerencial');
    if (!container) return;

    container.innerHTML = `
      <div class="space-y-6 p-4">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-bold text-slate-800 flex items-center gap-2">
            <i data-lucide="trending-up" class="text-orange-500"></i> Resultado Simplificado
          </h2>
          <button onclick="imprimirGerencial()" class="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm shadow flex items-center gap-2 no-print">
            <i data-lucide="printer" class="w-4 h-4"></i> Imprimir
          </button>
        </div>

        <div class="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border no-print">
          <span class="text-sm font-bold text-slate-600">Período:</span>
          <input type="month" id="ger-res-mes" class="p-2 border rounded-lg text-sm" />
          <button onclick="carregarGerencial()" class="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2 rounded-lg font-bold text-sm shadow">
            <i data-lucide="play" class="w-4 h-4 inline mr-1"></i> Carregar
          </button>
        </div>

        <div id="ger-print-area">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-green-50 p-5 rounded-xl border border-green-100 shadow-sm flex flex-col justify-between">
              <div>
                <p class="text-xs font-bold text-green-800 uppercase">Total de Entradas (Vendas)</p>
                <h3 id="ger-res-entradas" class="text-2xl font-bold text-green-700 mt-1">R$ 0,00</h3>
              </div>
              <div class="mt-2 text-xs text-green-700/70">
                Representa 100% da base
              </div>
            </div>
            <div class="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm flex flex-col justify-between">
              <div>
                <p class="text-xs font-bold text-red-800 uppercase">Total de Saídas (Despesas)</p>
                <h3 id="ger-res-saidas" class="text-2xl font-bold text-red-600 mt-1">R$ 0,00</h3>
              </div>
              <div id="ger-res-saidas-pct" class="mt-2 text-xs text-red-600/70">
                Custo: 0% das entradas
              </div>
            </div>
            <div class="bg-indigo-50 p-5 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-between">
              <div>
                <p class="text-xs font-bold text-indigo-800 uppercase">Lucro (Entradas - Saídas)</p>
                <h3 id="ger-res-lucro" class="text-2xl font-bold text-indigo-600 mt-1">R$ 0,00</h3>
              </div>
              <div id="ger-res-lucro-pct" class="mt-2 text-xs text-indigo-600/70">
                Margem: 0%
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl border shadow-sm overflow-hidden mt-6">
            <div class="p-4 font-bold text-slate-700 border-b bg-slate-50 flex items-center gap-2">
              <i data-lucide="package" class="w-4 inline"></i> Produtos Vendidos no Período
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm text-left">
                <thead class="bg-slate-100 text-slate-700">
                  <tr>
                    <th class="p-3">Produto</th>
                    <th class="p-3 text-center">Quantidade</th>
                    <th class="p-3 text-right">Valor Total</th>
                  </tr>
                </thead>
                <tbody id="ger-res-produtos-lista" class="divide-y"></tbody>
                <tfoot id="ger-res-produtos-total" class="bg-slate-50 font-bold"></tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    // Inicializa filtro com mês atual e carrega dados
    const mesInput = document.getElementById('ger-res-mes');
    if (mesInput) {
      const hoje = new Date();
      mesInput.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    }
    carregarGerencial();
    lucide.createIcons();
  }

  // Função carregar/atualizar dados
  async function carregarGerencial() {
    const mesInput = document.getElementById('ger-res-mes');
    if (!mesInput || !mesInput.value) return;

    const [ano, mes] = mesInput.value.split('-');
    const dataInicio = `${ano}-${mes}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

    // Filtrar vendas do período (apenas tipo 'venda', ativas)
    const vendas = (STATE.logs || []).filter(l =>
      l.type === 'venda' &&
      l.status !== 'CANCELADO' &&
      l.date >= dataInicio &&
      l.date <= dataFim + 'T23:59:59'
    );

    // Total de entradas (soma dos valores totais)
    const receitaTotal = vendas.reduce((s, v) => s + (Number(v.totalValue) || 0), 0);

    // Despesas do período (todas as despesas, independente de status)
    const despesas = (STATE.expenses || []).filter(d =>
      d.date >= dataInicio && d.date <= dataFim
    );
    const despesaTotal = despesas.reduce((s, d) => s + (Number(d.cost) || 0), 0);

    const lucro = receitaTotal - despesaTotal;

    // Atualizar cards
    document.getElementById('ger-res-entradas').innerText = formatMoney(receitaTotal);
    document.getElementById('ger-res-saidas').innerText = formatMoney(despesaTotal);
    document.getElementById('ger-res-lucro').innerText = formatMoney(lucro);

    // Percentuais
    const custoPct = receitaTotal > 0 ? (despesaTotal / receitaTotal) * 100 : 0;
    const lucroPct = receitaTotal > 0 ? (lucro / receitaTotal) * 100 : 0;

    const saidasPctEl = document.getElementById('ger-res-saidas-pct');
    if (saidasPctEl) {
      saidasPctEl.innerHTML = `Custo: <strong>${custoPct.toFixed(2)}%</strong> das entradas`;
    }
    const lucroPctEl = document.getElementById('ger-res-lucro-pct');
    if (lucroPctEl) {
      lucroPctEl.innerHTML = `Margem: <strong>${lucroPct.toFixed(2)}%</strong>`;
    }

    // Agrupar produtos vendidos
    const mapaProd = {};
    vendas.forEach(v => {
      const nome = v.productName || 'Produto sem nome';
      if (!mapaProd[nome]) {
        mapaProd[nome] = { nome, qtd: 0, valor: 0 };
      }
      mapaProd[nome].qtd += Number(v.quantity) || 0;
      mapaProd[nome].valor += Number(v.totalValue) || 0;
    });
    const produtos = Object.values(mapaProd).sort((a, b) => a.nome.localeCompare(b.nome));

    const tbody = document.getElementById('ger-res-produtos-lista');
    const tfoot = document.getElementById('ger-res-produtos-total');
    if (tbody) {
      if (produtos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="p-6 text-center text-slate-400">Nenhum produto vendido no período.</td></tr>';
      } else {
        tbody.innerHTML = produtos.map(p => `
          <tr class="border-b">
            <td class="p-3 font-medium">${p.nome}</td>
            <td class="p-3 text-center">${p.qtd}</td>
            <td class="p-3 text-right font-bold text-green-700">${formatMoney(p.valor)}</td>
          </tr>
        `).join('');
      }
    }
    if (tfoot) {
      tfoot.innerHTML = produtos.length > 0 ? `
        <tr>
          <td class="p-3 font-bold" colspan="2">TOTAL</td>
          <td class="p-3 text-right font-bold text-green-700 text-base">${formatMoney(receitaTotal)}</td>
        </tr>
      ` : '';
    }

    lucide.createIcons();
  }

  // Impressão
  window.imprimirGerencial = function() {
    const printArea = document.getElementById('ger-print-area');
    if (!printArea) return;

    const originalContents = document.body.innerHTML;
    const printContents = printArea.innerHTML;

    const style = document.createElement('style');
    style.textContent = `
      body { background: white; font-family: 'Segoe UI', sans-serif; color: #1e293b; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .bg-white { background-color: #fff !important; }
      .bg-slate-50 { background-color: #f8fafc !important; }
      .bg-green-50 { background-color: #f0fdf4 !important; }
      .bg-red-50 { background-color: #fef2f2 !important; }
      .bg-indigo-50 { background-color: #eef2ff !important; }
      table { width: 100%; border-collapse: collapse; }
      th { background-color: #f1f5f9; padding: 8px; text-align: left; }
      td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .font-bold { font-weight: bold; }
    `;

    document.body.innerHTML = '';
    document.body.appendChild(style);
    document.body.innerHTML += printContents;

    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  // Expor função global para carregar
  window.carregarGerencial = carregarGerencial;
})();
