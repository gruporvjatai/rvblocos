// ==================== ESTADO DO MÓDULO LAJES ====================
const LAJE = {
  comodosTemp: [],
  orcamentosList: [],
  editandoId: null,
  tabAtiva: 'orcamento',
  algoritmoCorte: 'FFD',
  planoCorteCache: null
};

// ==================== NAVEGAÇÃO DE ABAS ====================
function switchLajeTab(tab) {
  LAJE.tabAtiva = tab;
  document.getElementById('laje-tab-orcamento').classList.toggle('hidden', tab !== 'orcamento');
  document.getElementById('laje-tab-corte').classList.toggle('hidden', tab !== 'corte');
  document.getElementById('laje-tab-detalhamento').classList.toggle('hidden', tab !== 'detalhamento');

  ['orcamento','corte','detalhamento'].forEach(t => {
    const btn = document.getElementById(`tab-${t}-btn`);
    btn.className = tab === t
      ? 'px-4 py-2 rounded-t-lg font-bold text-sm bg-orange-600 text-white shadow'
      : 'px-4 py-2 rounded-t-lg font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200';
  });

  if (tab === 'corte') carregarSelectOrcamentosAprovados();
  if (tab === 'detalhamento') carregarSelectTodosOrcamentos();
  lucide.createIcons();
}

// ==================== MODAL CÔMODO ====================
function abrirModalComodo() {
  document.getElementById('modal-comodo-laje').classList.remove('hidden');
  limparFormLaje();
  lucide.createIcons();
}

function fecharModalComodo() {
  document.getElementById('modal-comodo-laje').classList.add('hidden');
}

function limparFormLaje() {
  document.getElementById('laje-comodo-nome').value = '';
  document.getElementById('laje-vao-menor').value = '';
  document.getElementById('laje-vao-maior').value = '';
  document.getElementById('laje-tipo-enchimento').value = 'EPS';
  document.getElementById('laje-altura').value = '8';
  document.getElementById('laje-preview').classList.add('hidden');
}

// ==================== CÁLCULO DO CÔMODO ====================
function obterConfig(nome, padrao = 0) {
  const entry = STATE.configLaje?.[nome];
  if (entry !== undefined) return Number(entry);
  const global = STATE.configuracoes?.[nome];
  return global !== undefined ? Number(global) : padrao;
}

function calcularLaje(vaoMenor, vaoMaior, tipoEnchimento, altura) {
  const vm = parseFloat(vaoMenor) || 0;
  const vM = parseFloat(vaoMaior) || 0;
  if (vm <= 0 || vM <= 0) return null;

  const tamVigota = vm + 0.20;
  const interEixo = tipoEnchimento === 'EPS' ? obterConfig('inter_eixo_eps', 0.50) : obterConfig('inter_eixo_lajota_ceramica', 0.43);
  const qtdVigotas = Math.ceil(vM / interEixo);
  const epsLinear = tipoEnchimento === 'EPS' ? (qtdVigotas - 1) * vm : 0;
  const area = vm * vM;

  const configKey = `preco_m2_laje_${tipoEnchimento.toLowerCase()}_h${altura}`;
  const precoM2 = obterConfig(configKey, 0);
  const valorEstimado = area * precoM2;

  return {
    vaoMenor: vm, vaoMaior: vM, tipo: tipoEnchimento, altura: parseInt(altura),
    qtdVigotas, tamVigota: parseFloat(tamVigota.toFixed(3)),
    epsLinear: parseFloat(epsLinear.toFixed(3)),
    area: parseFloat(area.toFixed(3)),
    precoM2: parseFloat(precoM2.toFixed(2)),
    valorEstimado: parseFloat(valorEstimado.toFixed(2))
  };
}

function calcularLajePreview() {
  const vm = document.getElementById('laje-vao-menor').value;
  const vM = document.getElementById('laje-vao-maior').value;
  const tipo = document.getElementById('laje-tipo-enchimento').value;
  const altura = document.getElementById('laje-altura').value;
  const res = calcularLaje(vm, vM, tipo, altura);
  const previewDiv = document.getElementById('laje-preview');

  if (!res) {
    previewDiv.classList.add('hidden');
    return;
  }
  previewDiv.classList.remove('hidden');
  document.getElementById('laje-prev-vigotas').innerText = res.qtdVigotas + ' unidades';
  document.getElementById('laje-prev-tamanho').innerText = res.tamVigota.toFixed(2) + ' m';
  document.getElementById('laje-prev-eps').innerText = res.tipo === 'EPS' ? res.epsLinear.toFixed(2) + ' m' : 'Não se aplica (Lajota)';
  document.getElementById('laje-prev-area').innerText = res.area.toFixed(2) + ' m²';
  document.getElementById('laje-prev-valor').innerText = formatMoney(res.valorEstimado);
}

// ==================== MANIPULAÇÃO DOS CÔMODOS TEMPORÁRIOS ====================
function adicionarComodoLaje() {
  const nome = document.getElementById('laje-comodo-nome').value.trim();
  const vm = document.getElementById('laje-vao-menor').value;
  const vM = document.getElementById('laje-vao-maior').value;
  const tipo = document.getElementById('laje-tipo-enchimento').value;
  const altura = document.getElementById('laje-altura').value;
  const res = calcularLaje(vm, vM, tipo, altura);

  if (!nome) return showToast('Informe o nome do cômodo.', true);
  if (!res) return showToast('Informe vão menor e vão maior válidos.', true);

  LAJE.comodosTemp.push({ nome, ...res });
  renderComodosTemp();
  fecharModalComodo();
}

function removerComodoLaje(index) {
  LAJE.comodosTemp.splice(index, 1);
  renderComodosTemp();
}

function limparComodosLaje() {
  if (!confirm('Limpar todos os cômodos do orçamento atual?')) return;
  LAJE.comodosTemp = [];
  LAJE.editandoId = null;
  document.getElementById('laje-cliente-nome').value = '';
  renderComodosTemp();
}

function renderComodosTemp() {
  const tbody = document.getElementById('laje-comodos-tbody');
  const count = LAJE.comodosTemp.length;
  document.getElementById('laje-comodos-count').innerText = count;

  if (count === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="p-6 text-center text-slate-400">Nenhum cômodo adicionado.</td></tr>';
    return;
  }

  let areaTotal = 0, valorTotal = 0;
  tbody.innerHTML = LAJE.comodosTemp.map((c, i) => {
    areaTotal += c.area;
    valorTotal += c.valorEstimado;
    return `<tr class="border-b hover:bg-slate-50">
      <td class="p-3 font-medium">${c.nome}</td>
      <td class="p-3">${c.vaoMenor.toFixed(2)} m</td>
      <td class="p-3">${c.vaoMaior.toFixed(2)} m</td>
      <td class="p-3 text-xs">${c.tipo === 'EPS' ? 'Isopor (EPS)' : 'Lajota Cerâmica'}</td>
      <td class="p-3">${c.altura} cm</td>
      <td class="p-3 font-bold">${c.qtdVigotas}</td>
      <td class="p-3">${c.tamVigota.toFixed(2)} m</td>
      <td class="p-3">${c.tipo === 'EPS' ? c.epsLinear.toFixed(2) + ' m' : '-'}</td>
      <td class="p-3">${c.area.toFixed(2)} m²</td>
      <td class="p-3 text-center">
        <button onclick="removerComodoLaje(${i})" class="text-red-500 hover:text-red-700">
          <i data-lucide="trash-2" width="16"></i>
        </button>
      </td>
    </tr>`;
  }).join('');

  tbody.insertAdjacentHTML('beforeend', `
    <tr class="bg-slate-50 font-bold">
      <td colspan="8" class="p-3 text-right">Área Total / Valor Estimado:</td>
      <td class="p-3">${areaTotal.toFixed(2)} m²</td>
      <td class="p-3 text-green-700">${formatMoney(valorTotal)}</td>
    </tr>
  `);
  lucide.createIcons();
}

// ==================== SALVAR / EDITAR / EXCLUIR ORÇAMENTO ====================
async function salvarOrcamentoLaje() {
  const cliente = document.getElementById('laje-cliente-nome').value.trim();
  if (!cliente) return showToast('Informe o nome do cliente.', true);
  if (LAJE.comodosTemp.length === 0) return showToast('Adicione pelo menos 1 cômodo.', true);

  showLoading(true);
  const areaTotal = LAJE.comodosTemp.reduce((s, c) => s + c.area, 0);
  const valorTotal = LAJE.comodosTemp.reduce((s, c) => s + c.valorEstimado, 0);

  try {
    let idOrc;
    if (LAJE.editandoId) {
      await sb.from('laje_orcamentos').update({
        cliente_nome: cliente,
        valor_total_estimado: valorTotal,
        area_total: areaTotal
      }).eq('id', LAJE.editandoId);
      await sb.from('laje_itens_orcamento').delete().eq('id_orcamento', LAJE.editandoId);
      idOrc = LAJE.editandoId;
    } else {
      const { data: cab, error: errCab } = await sb.from('laje_orcamentos').insert({
        cliente_nome: cliente,
        status: 'ABERTO',
        valor_total_estimado: valorTotal,
        area_total: areaTotal
      }).select('id').single();
      if (errCab) throw new Error(errCab.message);
      idOrc = cab.id;
    }

    const itens = LAJE.comodosTemp.map(c => ({
      id_orcamento: idOrc,
      comodo: c.nome,
      vao_menor: c.vaoMenor,
      vao_maior: c.vaoMaior,
      tipo_enchimento: c.tipo,
      altura: c.altura,
      qtd_vigotas: c.qtdVigotas,
      tamanho_vigota: c.tamVigota,
      metragem_eps: c.epsLinear,
      area: c.area,
      valor_estimado: c.valorEstimado
    }));

    const { error: errItens } = await sb.from('laje_itens_orcamento').insert(itens);
    if (errItens) throw new Error(errItens.message);

    LAJE.comodosTemp = [];
    LAJE.editandoId = null;
    document.getElementById('laje-cliente-nome').value = '';
    renderComodosTemp();
    showToast(`Orçamento #${idOrc} salvo com sucesso!`);
    carregarOrcamentosLaje();
  } catch (e) {
    showToast('Erro: ' + e.message, true);
  }
  showLoading(false);
}

async function carregarOrcamentosLaje() {
  const tbody = document.getElementById('laje-orcamentos-tbody');
  if (!tbody) return;

  const { data: orcs, error } = await sb.from('laje_orcamentos')
    .select('*').order('id', { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-red-400">Erro ao carregar.</td></tr>`;
    return;
  }

  LAJE.orcamentosList = orcs || [];
  if (LAJE.orcamentosList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-400">Nenhum orçamento encontrado.</td></tr>`;
    return;
  }

  const rows = await Promise.all(LAJE.orcamentosList.map(async (orc) => {
    const { data: itens } = await sb.from('laje_itens_orcamento')
      .select('comodo, area, valor_estimado').eq('id_orcamento', orc.id);
    const comodosNomes = (itens || []).map(i => i.comodo).join(', ');
    const areaTotal = (itens || []).reduce((s, i) => s + Number(i.area||0), 0);
    const badge = orc.status === 'ABERTO' ? 'bg-yellow-100 text-yellow-700' : (orc.status === 'APROVADO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700');
    return `<tr class="border-b hover:bg-slate-50">
      <td class="p-3 font-mono">#${orc.id}</td>
      <td class="p-3 font-medium">${orc.cliente_nome}</td>
      <td class="p-3 text-xs">${formatDate(orc.data)}</td>
      <td class="p-3 text-xs max-w-[120px] truncate" title="${comodosNomes}">${comodosNomes || '-'}</td>
      <td class="p-3">${areaTotal.toFixed(2)} m²</td>
      <td class="p-3 font-bold text-green-700">${formatMoney(orc.valor_total_estimado)}</td>
      <td class="p-3"><span class="px-2 py-0.5 rounded text-xs font-bold ${badge}">${orc.status}</span></td>
      <td class="p-3 flex gap-2 justify-center">
        <button onclick="editarOrcamentoLaje(${orc.id})" class="text-blue-600 hover:text-blue-800" title="Editar"><i data-lucide="edit-3" width="16"></i></button>
        <button onclick="alterarStatusLaje(${orc.id},'APROVADO')" class="text-green-600 hover:text-green-800" title="Aprovar"><i data-lucide="check" width="16"></i></button>
        <button onclick="alterarStatusLaje(${orc.id},'CANCELADO')" class="text-red-500 hover:text-red-700" title="Cancelar"><i data-lucide="x" width="16"></i></button>
        <button onclick="excluirOrcamentoLaje(${orc.id})" class="text-slate-400 hover:text-red-600" title="Excluir"><i data-lucide="trash-2" width="16"></i></button>
      </td>
    </tr>`;
  }));

  tbody.innerHTML = rows.join('');
  lucide.createIcons();
}

async function editarOrcamentoLaje(id) {
  const orc = LAJE.orcamentosList.find(o => o.id == id);
  if (!orc) return;
  document.getElementById('laje-cliente-nome').value = orc.cliente_nome;
  LAJE.editandoId = id;

  const { data: itens } = await sb.from('laje_itens_orcamento').select('*').eq('id_orcamento', id);
  LAJE.comodosTemp = (itens || []).map(i => ({
    nome: i.comodo,
    vaoMenor: Number(i.vao_menor),
    vaoMaior: Number(i.vao_maior),
    tipo: i.tipo_enchimento,
    altura: i.altura,
    qtdVigotas: Number(i.qtd_vigotas),
    tamVigota: Number(i.tamanho_vigota),
    epsLinear: Number(i.metragem_eps),
    area: Number(i.area || (i.vao_menor * i.vao_maior)),
    valorEstimado: Number(i.valor_estimado || 0)
  }));
  renderComodosTemp();
  switchLajeTab('orcamento');
  showToast(`Editando orçamento #${id}`);
}

async function alterarStatusLaje(id, novoStatus) {
  const { error } = await sb.from('laje_orcamentos').update({ status: novoStatus }).eq('id', id);
  if (error) return showToast('Erro: ' + error.message, true);
  showToast(`Orçamento #${id} ${novoStatus === 'APROVADO' ? 'aprovado' : 'cancelado'}!`);
  carregarOrcamentosLaje();
}

async function excluirOrcamentoLaje(id) {
  if (!confirm('Excluir permanentemente o orçamento #' + id + '?')) return;
  showLoading(true);
  await sb.from('laje_itens_orcamento').delete().eq('id_orcamento', id);
  await sb.from('laje_orcamentos').delete().eq('id', id);
  showToast('Orçamento excluído.');
  carregarOrcamentosLaje();
  showLoading(false);
}

// ==================== PLANO DE CORTE ====================
async function carregarSelectOrcamentosAprovados() {
  const sel = document.getElementById('laje-corte-select');
  const { data } = await sb.from('laje_orcamentos')
    .select('id,cliente_nome').eq('status', 'APROVADO').order('id', { ascending: false });
  sel.innerHTML = '<option value="">-- Selecione --</option>' +
    (data || []).map(o => `<option value="${o.id}">#${o.id} – ${o.cliente_nome}</option>`).join('');
}

function binPackingFFD(tamanhos, comprimentoBarra = 12.0) {
  const sorted = [...tamanhos].sort((a, b) => b - a);
  const barras = [];
  for (const tam of sorted) {
    let alocado = false;
    for (const barra of barras) {
      const usado = barra.cortes.reduce((s, c) => s + c, 0);
      if (usado + tam <= comprimentoBarra + 0.001) {
        barra.cortes.push(tam);
        alocado = true;
        break;
      }
    }
    if (!alocado) barras.push({ cortes: [tam] });
  }
  for (const barra of barras) {
    const usado = barra.cortes.reduce((s, c) => s + c, 0);
    barra.sobra = parseFloat((comprimentoBarra - usado).toFixed(3));
    barra.usado = usado;
  }
  barras.sort((a, b) => a.sobra - b.sobra);
  return barras;
}

function binPackingBFD(tamanhos, comprimentoBarra = 12.0) {
  const sorted = [...tamanhos].sort((a, b) => b - a);
  const barras = [];
  for (const tam of sorted) {
    let bestIdx = -1, bestSobra = Infinity;
    for (let i = 0; i < barras.length; i++) {
      const usado = barras[i].cortes.reduce((s, c) => s + c, 0);
      const sobraAtual = comprimentoBarra - usado;
      if (sobraAtual >= tam) {
        const novaSobra = sobraAtual - tam;
        if (novaSobra < bestSobra) {
          bestSobra = novaSobra;
          bestIdx = i;
        }
      }
    }
    if (bestIdx !== -1) {
      barras[bestIdx].cortes.push(tam);
    } else {
      barras.push({ cortes: [tam] });
    }
  }
  for (const barra of barras) {
    const usado = barra.cortes.reduce((s, c) => s + c, 0);
    barra.sobra = parseFloat((comprimentoBarra - usado).toFixed(3));
    barra.usado = usado;
  }
  barras.sort((a, b) => a.sobra - b.sobra);
  return barras;
}

async function gerarPlanoCorte() {
  const idOrc = document.getElementById('laje-corte-select').value;
  if (!idOrc) return showToast('Selecione um orçamento aprovado.', true);
  showLoading(true);

  const { data: itens, error } = await sb.from('laje_itens_orcamento')
    .select('tamanho_vigota, qtd_vigotas').eq('id_orcamento', idOrc);
  if (error || !itens?.length) {
    showLoading(false);
    return showToast('Nenhuma vigota encontrada.', true);
  }

  const tamanhos = [];
  for (const item of itens) {
    for (let i = 0; i < Number(item.qtd_vigotas); i++) {
      tamanhos.push(Number(item.tamanho_vigota));
    }
  }

  const barra12m = obterConfig('comprimento_barra_trelica', 12.0);
  const barras = LAJE.algoritmoCorte === 'BFD' ? binPackingBFD(tamanhos, barra12m) : binPackingFFD(tamanhos, barra12m);
  LAJE.planoCorteCache = { barras, idOrc };

  document.getElementById('laje-corte-resultado').classList.remove('hidden');
  const tbody = document.getElementById('laje-corte-tbody');
  const cards = document.getElementById('laje-corte-cards');
  let totalSobra = 0;

  tbody.innerHTML = barras.map((b, i) => {
    totalSobra += b.sobra;
    const aproveitamento = ((b.usado / barra12m) * 100).toFixed(1);
    let statusHtml = '';
    if (b.sobra < 0.30) statusHtml = '<span class="text-green-600 font-bold">🟢 Ótimo</span>';
    else if (b.sobra < 0.80) statusHtml = '<span class="text-amber-600 font-bold">🟡 Atenção</span>';
    else statusHtml = '<span class="text-red-600 font-bold">🔴 Desperdício</span>';
    return `<tr class="border-b">
      <td class="p-3 font-bold">Barra ${i+1}</td>
      <td class="p-3 font-mono">${b.cortes.map(c => c.toFixed(2)+'m').join(' + ')}</td>
      <td class="p-3">${b.sobra.toFixed(2)} m</td>
      <td class="p-3">${aproveitamento}%</td>
      <td class="p-3">${statusHtml}</td>
    </tr>`;
  }).join('');

  cards.innerHTML = barras.map((b, i) => {
    const sobraCor = b.sobra < 0.30 ? 'text-green-600' : (b.sobra < 0.80 ? 'text-amber-600' : 'text-red-600');
    const statusTexto = b.sobra < 0.30 ? 'Ótimo aproveitamento' : (b.sobra < 0.80 ? 'Atenção' : 'Desperdício');
    const statusEmoji = b.sobra < 0.30 ? '🟢' : (b.sobra < 0.80 ? '🟡' : '🔴');
    return `<div class="bg-white border rounded-xl p-5 shadow-sm">
      <h4 class="font-bold text-slate-800 mb-2">Barra ${i+1}</h4>
      <p class="text-sm"><span class="text-slate-500">Cortes:</span> <span class="font-mono font-bold">${b.cortes.map(c => c.toFixed(2)+'m').join(' + ')}</span></p>
      <p class="text-sm mt-1">Sobra: <span class="font-bold ${sobraCor}">${b.sobra.toFixed(2)} m</span></p>
      <p class="text-xs text-slate-400 mt-1">Usado: ${b.usado.toFixed(2)} m / 12,00 m (${((b.usado/barra12m)*100).toFixed(1)}%)</p>
      <p class="text-xs font-bold mt-2 ${sobraCor}">${statusEmoji} ${statusTexto}</p>
    </div>`;
  }).join('');

  cards.insertAdjacentHTML('beforeend', `
    <div class="col-span-full bg-slate-50 border border-dashed border-slate-300 rounded-xl p-5 text-center">
      <p class="text-lg font-bold text-slate-700">Total: ${barras.length} barra(s) de 12,00 m</p>
      <p class="text-sm text-slate-500">Sobra acumulada: ${totalSobra.toFixed(2)} m (${((totalSobra/(barras.length*12))*100).toFixed(1)}% de perda)</p>
    </div>
  `);

  showLoading(false);
  lucide.createIcons();
}

function imprimirPlanoCorte() {
  if (!LAJE.planoCorteCache) return showToast('Gere o plano de corte primeiro.', true);
  const printArea = document.getElementById('print-area');
  if (!printArea) return;
  const { barras, idOrc } = LAJE.planoCorteCache;
  const orc = LAJE.orcamentosList.find(o => o.id == idOrc);
  const cliente = orc ? orc.cliente_nome : 'Não informado';

  let totalSobra = 0;
  let linhas = barras.map((b, i) => {
    totalSobra += b.sobra;
    const cortesLista = b.cortes.map((c, j) => 
      `<tr>
        <td style="padding:4px 8px; text-align:center;">${j+1}</td>
        <td style="padding:4px 8px; font-weight:bold; font-size:14px;">${c.toFixed(2)} m</td>
        <td style="padding:4px 8px; text-align:center; font-size:14px;">☐</td>
      </tr>`
    ).join('');
    const status = b.sobra < 0.30 ? 'ÓTIMO' : (b.sobra < 0.80 ? 'ATENÇÃO' : 'DESPERDÍCIO');
    const corStatus = b.sobra < 0.30 ? 'green' : (b.sobra < 0.80 ? 'orange' : 'red');
    const aproveitamento = ((b.usado / 12) * 100).toFixed(1);
    return `
    <div style="page-break-inside: avoid; margin-bottom: 30px; border: 2px solid #000; padding: 12px; border-radius: 8px;">
      <h3 style="margin:0 0 10px 0; font-size:18px; display: flex; justify-content: space-between;">
        <span>🔹 Barra ${i+1}</span>
        <span style="font-size:14px; background:#f0f0f0; padding:2px 10px; border-radius:4px;">Sobra: ${b.sobra.toFixed(2)} m</span>
        <span style="color:${corStatus}; font-weight:bold;">${status} (${aproveitamento}%)</span>
      </h3>
      <table style="width:100%; border-collapse:collapse; margin-top:8px;">
        <thead>
          <tr style="background:#e5e7eb;">
            <th style="padding:6px; border:1px solid #000;">Ordem</th>
            <th style="padding:6px; border:1px solid #000;">Comprimento do corte</th>
            <th style="padding:6px; border:1px solid #000; width:40px;">✔️</th>
          </tr>
        </thead>
        <tbody>
          ${cortesLista}
        </tbody>
      </table>
      <p style="margin-top:8px; font-size:12px;">📏 Comprimento total usado: ${b.usado.toFixed(2)} m | Barra original: 12,00 m</p>
    </div>`;
  }).join('');

  printArea.innerHTML = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; padding:20px; max-width:900px; margin:0 auto; background:#fff;">
      <div style="display:flex; align-items:center; border-bottom:2px solid #ea580c; padding-bottom:15px; margin-bottom:20px;">
        <img src="https://lh3.googleusercontent.com/d/1SIoZ2JlalfMnGDZTXBk7ZYuPgwxX3odF" style="height:60px; margin-right:20px;" />
        <div>
          <h1 style="margin:0; font-size:20px; color:#ea580c;">RV BLOCOS E ESTRUTURAS</h1>
          <p style="margin:2px 0; font-size:12px;">Plano de Corte de Treliças</p>
        </div>
        <div style="margin-left:auto; text-align:right;">
          <p style="margin:0; font-weight:bold;">Orçamento #${idOrc}</p>
          <p style="margin:0;">Cliente: ${cliente}</p>
          <p style="margin:0;">Data: ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>
      <p style="font-size:14px; margin-bottom:20px;">Instruções: Corte as barras na ordem indicada. Marque ☑ ao concluir cada corte.</p>
      ${linhas}
      <div style="margin-top:30px; border-top:2px solid #ea580c; padding-top:15px; display:flex; justify-content:space-between;">
        <div style="font-size:16px;">
          <strong>Total de barras: ${barras.length}</strong><br>
          <span style="color:#555;">Sobra total acumulada: ${totalSobra.toFixed(2)} m (${((totalSobra/(barras.length*12))*100).toFixed(1)}%)</span>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;">Conferido por: ________________________</p>
          <p style="margin:10px 0 0 0;">Data: _____ / _____ / __________</p>
        </div>
      </div>
    </div>
  `;
  setTimeout(() => { window.print(); limparAreaImpressao(); }, 300);
}

// ==================== DETALHAMENTO ====================
async function carregarSelectTodosOrcamentos() {
  const sel = document.getElementById('laje-detalhamento-select');
  const { data } = await sb.from('laje_orcamentos').select('id,cliente_nome').order('id', { ascending: false });
  sel.innerHTML = '<option value="">-- Selecione --</option>' +
    (data || []).map(o => `<option value="${o.id}">#${o.id} – ${o.cliente_nome}</option>`).join('');
}

async function gerarDetalhamento() {
  const idOrc = document.getElementById('laje-detalhamento-select').value;
  if (!idOrc) return showToast('Selecione um orçamento.', true);
  showLoading(true);

  const { data: itens, error } = await sb.from('laje_itens_orcamento')
    .select('*').eq('id_orcamento', idOrc);
  if (error || !itens?.length) { showLoading(false); return showToast('Nenhum item.', true); }

  let totalVigotas = 0, totalArea = 0, totalEpsLinear = 0;
  const tamanhosVigota = [];
  const tiposEnchimento = new Set();
  const alturas = new Set();
  itens.forEach(i => {
    totalVigotas += Number(i.qtd_vigotas);
    totalArea += Number(i.area || (i.vao_menor * i.vao_maior));
    if (i.tipo_enchimento === 'EPS') totalEpsLinear += Number(i.metragem_eps);
    for (let j = 0; j < Number(i.qtd_vigotas); j++) tamanhosVigota.push(Number(i.tamanho_vigota));
    tiposEnchimento.add(i.tipo_enchimento);
    alturas.add(i.altura);
  });

  const barras = binPackingFFD(tamanhosVigota, obterConfig('comprimento_barra_trelica', 12.0));
  const numBarras = barras.length;

  const alturaModa = [...alturas].sort((a,b)=>b-a)[0] || 8;
  const trelicaTipo = obterConfig(`trelica_tipo_h${alturaModa}`, 'TG8');

  let enchimentoQtd = '';
  if ([...tiposEnchimento].includes('EPS')) {
    enchimentoQtd += `${totalEpsLinear.toFixed(2)} m lineares de EPS`;
  }
  if ([...tiposEnchimento].includes('LAJOTA_CERAMICA')) {
    const totalLajotas = Math.ceil(totalArea * 12);
    enchimentoQtd += (enchimentoQtd ? ' / ' : '') + `${totalLajotas} peças de lajota cerâmica`;
  }

  const volumeConcreto = totalArea * obterConfig('altura_capeamento_concreto', 0.04);

  const detalhamento = [
    { material: `Treliça ${trelicaTipo} (barras 12m)`, quantidade: `${numBarras} barras` },
    { material: 'Comprimento total de treliça', quantidade: `${tamanhosVigota.reduce((a,b)=>a+b,0).toFixed(2)} m` },
    { material: 'Enchimento', quantidade: enchimentoQtd || 'Nenhum' },
    { material: 'Área total da laje', quantidade: `${totalArea.toFixed(2)} m²` },
    { material: 'Volume de concreto (capeamento 4cm)', quantidade: `${volumeConcreto.toFixed(3)} m³` },
    { material: 'Total de vigotas', quantidade: `${totalVigotas} unidades` }
  ];

  document.getElementById('laje-detalhamento-resultado').classList.remove('hidden');
  document.getElementById('laje-detalhamento-tbody').innerHTML = detalhamento.map(d =>
    `<tr class="border-b"><td class="p-3 font-medium">${d.material}</td><td class="p-3 font-bold">${d.quantidade}</td></tr>`
  ).join('');

  showLoading(false);
  lucide.createIcons();
}
