// ==================== ESTADO DO MÓDULO LAJES ====================
const LAJE = {
  comodosTemp: [],
  orcamentosList: [],
  editandoId: null,
  tabAtiva: 'orcamento',
  algoritmoCorte: 'FFD',
  planoCorteCache: null,
  editandoComodoIndex: null      // índice do cômodo sendo editado (pelo modal)
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
  LAJE.editandoComodoIndex = null; // novo cômodo
  limparFormLaje();
  document.getElementById('modal-comodo-laje').classList.remove('hidden');
  lucide.createIcons();
}

function abrirModalEditarComodo(index) {
  const c = LAJE.comodosTemp[index];
  if (!c) return;
  LAJE.editandoComodoIndex = index;
  document.getElementById('laje-comodo-nome').value = c.nome;
  document.getElementById('laje-vao-menor').value = c.vaoMenor;
  document.getElementById('laje-vao-maior').value = c.vaoMaior;
  document.getElementById('laje-tipo-enchimento').value = c.tipo;
  document.getElementById('laje-altura').value = c.altura;
  document.getElementById('laje-largura-viga').value = c.larguraViga;
  calcularLajePreview();
  document.getElementById('modal-comodo-laje').classList.remove('hidden');
  lucide.createIcons();
}

function fecharModalComodo() {
  document.getElementById('modal-comodo-laje').classList.add('hidden');
  LAJE.editandoComodoIndex = null;
}

function limparFormLaje() {
  document.getElementById('laje-comodo-nome').value = '';
  document.getElementById('laje-vao-menor').value = '';
  document.getElementById('laje-vao-maior').value = '';
  document.getElementById('laje-tipo-enchimento').value = 'EPS';
  document.getElementById('laje-altura').value = '8';
  document.getElementById('laje-largura-viga').value = '0';
  document.getElementById('laje-preview').classList.add('hidden');
}

// ==================== CÁLCULO DO CÔMODO ====================
function obterConfig(nome, padrao = 0) {
  const entry = STATE.configLaje?.[nome];
  if (entry !== undefined) return Number(entry);
  const global = STATE.configuracoes?.[nome];
  return global !== undefined ? Number(global) : padrao;
}

function calcularLaje(vaoMenor, vaoMaior, tipoEnchimento, altura, larguraViga = 0) {
  const vm = parseFloat(vaoMenor) || 0;
  const vM = parseFloat(vaoMaior) || 0;
  const lv = parseFloat(larguraViga) || 0; // cm
  if (vm <= 0 || vM <= 0) return null;

  const acrescimo = lv / 100;
  const tamVigota = vm + acrescimo;
  const interEixo = tipoEnchimento === 'EPS' ? obterConfig('inter_eixo_eps', 0.50) : obterConfig('inter_eixo_lajota_ceramica', 0.43);
  const qtdVigotas = Math.ceil(vM / interEixo);
  const epsLinear = tipoEnchimento === 'EPS' ? (qtdVigotas - 1) * vm : 0;
  const area = vm * vM;

  const configKey = `preco_m2_laje_${tipoEnchimento.toLowerCase()}_h${altura}`;
  const precoM2 = obterConfig(configKey, 0);
  const valorEstimado = area * precoM2;

  return {
    vaoMenor: vm, vaoMaior: vM, tipo: tipoEnchimento, altura: parseInt(altura),
    larguraViga: parseInt(lv),
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
  const larguraViga = document.getElementById('laje-largura-viga').value;
  const res = calcularLaje(vm, vM, tipo, altura, larguraViga);
  const previewDiv = document.getElementById('laje-preview');

  if (!res) { previewDiv.classList.add('hidden'); return; }
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
  const larguraViga = document.getElementById('laje-largura-viga').value;
  const res = calcularLaje(vm, vM, tipo, altura, larguraViga);

  if (!nome) return showToast('Informe o nome do cômodo.', true);
  if (!res) return showToast('Informe vão menor e vão maior válidos.', true);

  if (LAJE.editandoComodoIndex !== null) {
    // Editando cômodo existente
    LAJE.comodosTemp[LAJE.editandoComodoIndex] = { nome, ...res };
  } else {
    LAJE.comodosTemp.push({ nome, ...res });
  }

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
    tbody.innerHTML = '<tr><td colspan="11" class="p-6 text-center text-slate-400">Nenhum cômodo adicionado.</td></tr>';
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
      <td class="p-3">${c.larguraViga} cm</td>
      <td class="p-3">${c.tipo === 'EPS' ? c.epsLinear.toFixed(2) + ' m' : '-'}</td>
      <td class="p-3">${c.area.toFixed(2)} m²</td>
      <td class="p-3 text-center">
        <button onclick="abrirModalEditarComodo(${i})" class="text-blue-500 hover:text-blue-700 mr-2" title="Editar cômodo"><i data-lucide="edit-3" width="16"></i></button>
        <button onclick="removerComodoLaje(${i})" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" width="16"></i></button>
      </td>
    </tr>`;
  }).join('');

  tbody.insertAdjacentHTML('beforeend', `
    <tr class="bg-slate-50 font-bold">
      <td colspan="9" class="p-3 text-right">Área Total / Valor Estimado:</td>
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
      valor_estimado: c.valorEstimado,
      largura_viga: c.larguraViga
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
    valorEstimado: Number(i.valor_estimado || 0),
    larguraViga: Number(i.largura_viga) || 0
  }));
  renderComodosTemp();
  switchLajeTab('orcamento');
  showToast(`Editando orçamento #${id}. Clique no lápis ao lado do cômodo para alterar.`);
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

/*async function gerarPlanoCorte() {
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
  //const barras = LAJE.algoritmoCorte === 'BFD' ? binPackingBFD(tamanhos, barra12m) : binPackingFFD(tamanhos, barra12m);
  let barras;
if (LAJE.algoritmoCorte === 'BFD') {
  barras = binPackingBFD(tamanhos, barra12m);
} else if (LAJE.algoritmoCorte === 'RBF') {
  barras = binPackingRBF(tamanhos, barra12m, 100); // 100 tentativas
} else {
  barras = binPackingFFD(tamanhos, barra12m);
}
  
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
}*/

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
  let barras;
  if (LAJE.algoritmoCorte === 'BFD') {
    barras = binPackingBFD(tamanhos, barra12m);
  } else if (LAJE.algoritmoCorte === 'RBF') {
    barras = binPackingRBF(tamanhos, barra12m, 100);
  } else {
    barras = binPackingFFD(tamanhos, barra12m);
  }
  LAJE.planoCorteCache = { barras, idOrc };

  document.getElementById('laje-corte-resultado').classList.remove('hidden');
  const tbody = document.getElementById('laje-corte-tbody');
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

  tbody.insertAdjacentHTML('beforeend', `
    <tr class="bg-slate-50 font-bold">
      <td colspan="5" class="p-3 text-center">
        Total: ${barras.length} barra(s) de 12,00 m | Sobra acumulada: ${totalSobra.toFixed(2)} m (${((totalSobra/(barras.length*12))*100).toFixed(1)}% de perda)
      </td>
    </tr>
  `);

  showLoading(false);
  lucide.createIcons();
}

/* ======================================================================================================================== */

function imprimirPlanoCorte() {
  if (!LAJE.planoCorteCache) return showToast('Gere o plano de corte primeiro.', true);
  const printArea = document.getElementById('print-area');
  if (!printArea) return;
  const { barras, idOrc } = LAJE.planoCorteCache;
  const orc = LAJE.orcamentosList.find(o => o.id == idOrc);
  const cliente = orc ? orc.cliente_nome : 'Não informado';

  let totalSobra = 0;
  const maxCortes = Math.max(...barras.map(b => b.cortes.length));
  let linhas = barras.map((b, i) => {
    totalSobra += b.sobra;
    const cortesTd = b.cortes.map(c => 
      `<span style="display:inline-block; margin-right:8px; font-weight:bold; font-size:13px;">${c.toFixed(2)} m</span><span style="font-size:14px;">☐</span>`
    ).join('<span style="margin:0 4px; color:#999;">|</span>');
    return `<tr>
      <td style="padding:5px; border:1px solid #000; width:60px; text-align:center; font-weight:bold;">Barra ${i+1}</td>
      <td style="padding:5px; border:1px solid #000;">${cortesTd}</td>
    </tr>`;
  }).join('');

  const perdaPerc = ((totalSobra / (barras.length * 12)) * 100).toFixed(1);

  printArea.innerHTML = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; padding:10mm; max-width:190mm; margin:0 auto; background:#fff; font-size:12px;">
      <!-- Cabeçalho -->
      <table width="100%" style="border-bottom:1px solid #ea580c; padding-bottom:5px; margin-bottom:10px;">
        <tr>
          <td width="45"><img src="https://lh3.googleusercontent.com/d/1SIoZ2JlalfMnGDZTXBk7ZYuPgwxX3odF" style="height:28px;"></td>
          <td><strong style="color:#ea580c; font-size:15px;">RV BLOCOS</strong><br><span style="font-size:10px;">Plano de Corte de Treliças</span></td>
          <td align="right" style="font-size:10px;">
            <strong>Orçamento #${idOrc}</strong><br>
            Cliente: ${cliente}<br>
            Data: ${new Date().toLocaleDateString('pt-BR')}
          </td>
        </tr>
      </table>
      <!-- Resumo -->
      <div style="margin-bottom:10px; font-size:11px;">
        <strong>Total de barras:</strong> ${barras.length} | 
        <strong>Sobra total:</strong> ${totalSobra.toFixed(2)} m (${perdaPerc}%) |
        <strong>Cortes:</strong> ${barras.reduce((s,b) => s + b.cortes.length, 0)} unidades
      </div>
      <!-- Tabela principal -->
      <table width="100%" style="border-collapse:collapse; margin-bottom:15px;">
        <thead>
          <tr style="background:#e5e7eb;">
            <th style="padding:6px; border:1px solid #000; width:60px;">Barra</th>
            <th style="padding:6px; border:1px solid #000;">Cortes (☐ após cada = concluído)</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
      <!-- Assinatura -->
      <div style="border-top:1px solid #ea580c; padding-top:8px; display:flex; justify-content:space-between; font-size:10px;">
        <div>Conferido por: ________________________</div>
        <div>Data: _____ / _____ / __________</div>
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

  // Agrupar quantidades
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

  // Barras necessárias
  const barras = binPackingFFD(tamanhosVigota, obterConfig('comprimento_barra_trelica', 12.0));
  const numBarras = barras.length;

  // Altura predominante
  const alturaModa = [...alturas].sort((a,b)=>b-a)[0] || 8;
  const tipoPredominante = [...tiposEnchimento][0] || 'EPS';

  // Função de busca de custo
  const custo = (chave, padrao = 0) => obterConfig(chave, padrao);

  // ---- CÁLCULO DOS CUSTOS ----
  const linhasCusto = [];
  let custoTotal = 0;

  // 1. Treliças
  const trelicaChave = `custo_trelica_${tipoPredominante.toLowerCase()}_h${alturaModa}`;
  const custoTrelicaBarra = custo(trelicaChave, 68);
  const custoTrelicaTotal = numBarras * custoTrelicaBarra;
  linhasCusto.push({
    descricao: `Treliça (barras 12m)`,
    quantidade: `${numBarras} un`,
    unitario: formatMoney(custoTrelicaBarra),
    total: formatMoney(custoTrelicaTotal)
  });
  custoTotal += custoTrelicaTotal;

  // 2. Enchimento
  if (tiposEnchimento.has('EPS')) {
    const chaveEps = `custo_eps_h${alturaModa}_metro`;
    const custoEpsMetro = custo(chaveEps, 6.9);
    const custoEpsTotal = totalEpsLinear * custoEpsMetro;
    linhasCusto.push({
      descricao: `EPS (isopor)`,
      quantidade: `${totalEpsLinear.toFixed(2)} m`,
      unitario: formatMoney(custoEpsMetro),
      total: formatMoney(custoEpsTotal)
    });
    custoTotal += custoEpsTotal;
    // Frete do isopor
    const custoFreteIsopor = custo('custo_frete_isopor', 0);
    if (custoFreteIsopor > 0) {
      linhasCusto.push({
        descricao: 'Frete do isopor',
        quantidade: '1',
        unitario: formatMoney(custoFreteIsopor),
        total: formatMoney(custoFreteIsopor)
      });
      custoTotal += custoFreteIsopor;
    }
  }
  if (tiposEnchimento.has('LAJOTA_CERAMICA')) {
    const totalLajotas = Math.ceil(totalArea * 12);
    const custoLajotaPeca = custo('custo_lajota_peca', 1.7);
    const custoLajotaTotal = totalLajotas * custoLajotaPeca;
    linhasCusto.push({
      descricao: 'Lajotas cerâmicas',
      quantidade: `${totalLajotas} peças`,
      unitario: formatMoney(custoLajotaPeca),
      total: formatMoney(custoLajotaTotal)
    });
    custoTotal += custoLajotaTotal;
    // Frete da lajota
    const custoFreteLajota = custo('custo_frete_lajota', 50);
    linhasCusto.push({
      descricao: 'Frete da lajota',
      quantidade: '1',
      unitario: formatMoney(custoFreteLajota),
      total: formatMoney(custoFreteLajota)
    });
    custoTotal += custoFreteLajota;
  }

  // 3. Concreto
  const volumeConcreto = totalArea * custo('altura_capeamento_concreto', 0.04);
  const custoConcretoM3 = custo('custo_concreto_m3', 350);
  const custoConcretoTotal = volumeConcreto * custoConcretoM3;
  linhasCusto.push({
    descricao: 'Concreto (capeamento)',
    quantidade: `${volumeConcreto.toFixed(2)} m³`,
    unitario: formatMoney(custoConcretoM3),
    total: formatMoney(custoConcretoTotal)
  });
  custoTotal += custoConcretoTotal;

  // 4. Serviços comuns
  const servicos = [
    ['Disco de corte', '1', custo('custo_disco_corte', 10)],
    ['ART', '1', custo('custo_art', 28)],
    ['Plotagem de projeto', '1', custo('custo_plotagem', 10)],
    ['Viagens de entrega', '1', custo('custo_viagem', 50)],
    ['Diária de ajudante', `${totalArea.toFixed(2)} m²`, custo('custo_ajudante_m2', 4.5) * totalArea],
    ['Comissão', `${totalArea.toFixed(2)} m²`, custo('custo_comissao_m2', 1) * totalArea],
  ];
  servicos.forEach(([desc, qtd, valor]) => {
    linhasCusto.push({
      descricao: desc,
      quantidade: qtd,
      unitario: formatMoney(valor / (parseFloat(qtd) || 1)),
      total: formatMoney(valor)
    });
    custoTotal += valor;
  });

  // 5. Laudo (apenas para EPS na planilha, mas deixamos configurável)
  const custoLaudo = custo('custo_laudo', 300);
  if (custoLaudo > 0 && tiposEnchimento.has('EPS')) {
    linhasCusto.push({
      descricao: 'Laudo técnico',
      quantidade: '1',
      unitario: formatMoney(custoLaudo),
      total: formatMoney(custoLaudo)
    });
    custoTotal += custoLaudo;
  }

  // Margem de lucro e preço de venda
  const margem = custo('margem_lucro_laje', 20);
  const precoVenda = custoTotal * (1 + margem / 100);
  const precoM2 = totalArea > 0 ? precoVenda / totalArea : 0;

  // Montar HTML do resultado
  const html = `
    <div class="bg-white rounded-xl border shadow-sm p-6">
      <h3 class="font-bold text-slate-800 mb-4">Detalhamento de Custos</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm" id="laje-detalhamento-tabela">
          <thead class="bg-slate-50">
            <tr>
              <th class="p-3 text-left">Descrição</th>
              <th class="p-3 text-center">Quantidade</th>
              <th class="p-3 text-right">Valor Unitário</th>
              <th class="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${linhasCusto.map(l => `
              <tr class="border-b">
                <td class="p-3 font-medium">${l.descricao}</td>
                <td class="p-3 text-center">${l.quantidade}</td>
                <td class="p-3 text-right">${l.unitario}</td>
                <td class="p-3 text-right">${l.total}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-slate-50 p-4 rounded-lg text-center">
          <p class="text-slate-500 text-sm">Custo Total</p>
          <p class="text-2xl font-bold text-slate-800">${formatMoney(custoTotal)}</p>
        </div>
        <div class="bg-slate-50 p-4 rounded-lg text-center">
          <p class="text-slate-500 text-sm">Margem de Lucro</p>
          <p class="text-2xl font-bold text-green-600">${margem}%</p>
        </div>
        <div class="bg-orange-50 p-4 rounded-lg text-center">
          <p class="text-slate-500 text-sm">Preço de Venda</p>
          <p class="text-2xl font-bold text-orange-600">${formatMoney(precoVenda)}</p>
          <p class="text-xs text-slate-500">${formatMoney(precoM2)} / m²</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('laje-detalhamento-resultado').innerHTML = html;
  document.getElementById('laje-detalhamento-resultado').classList.remove('hidden');

  showLoading(false);
  lucide.createIcons();
}

function binPackingRBF(tamanhos, comprimentoBarra = 12.0, iteracoes = 100) {
  if (tamanhos.length === 0) return [];
  
  let melhorBarras = null;
  let melhorSobraTotal = Infinity;
  let melhorNumBarras = Infinity;

  for (let iter = 0; iter < iteracoes; iter++) {
    // Embaralha aleatoriamente (Fisher-Yates)
    const copia = [...tamanhos];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    
    // Aplica BFD na ordem embaralhada
    const barras = binPackingBFD(copia, comprimentoBarra);
    const sobraTotal = barras.reduce((s, b) => s + b.sobra, 0);
    const numBarras = barras.length;

    // Critério de seleção: prioriza menor número de barras, depois menor sobra total
    if (numBarras < melhorNumBarras || (numBarras === melhorNumBarras && sobraTotal < melhorSobraTotal)) {
      melhorBarras = barras;
      melhorSobraTotal = sobraTotal;
      melhorNumBarras = numBarras;
    }
  }

  // Ordena as barras do melhor resultado por sobra crescente para exibição
  melhorBarras.sort((a, b) => a.sobra - b.sobra);
  return melhorBarras;
}


// ==================== CONFIGURAÇÃO DE CUSTOS ====================
const CUSTOS_EDITAVEIS = [
  { chave: 'custo_trelica_eps_h8', label: 'Treliça EPS H8 (barra 12m)' },
  { chave: 'custo_trelica_eps_h12', label: 'Treliça EPS H12 (barra 12m)' },
  { chave: 'custo_trelica_eps_h16', label: 'Treliça EPS H16 (barra 12m)' },
  { chave: 'custo_trelica_eps_h20', label: 'Treliça EPS H20 (barra 12m)' },
  { chave: 'custo_trelica_lajota_h8', label: 'Treliça Lajota H8 (barra 12m)' },
  { chave: 'custo_trelica_lajota_h12', label: 'Treliça Lajota H12 (barra 12m)' },
  { chave: 'custo_eps_h8_metro', label: 'EPS H8 (metro linear)' },
  { chave: 'custo_eps_h12_metro', label: 'EPS H12 (metro linear)' },
  { chave: 'custo_eps_h16_metro', label: 'EPS H16 (metro linear)' },
  { chave: 'custo_eps_h20_metro', label: 'EPS H20 (metro linear)' },
  { chave: 'custo_lajota_peca', label: 'Lajota Cerâmica (peça)' },
  { chave: 'custo_concreto_m3', label: 'Concreto (m³)' },
  { chave: 'custo_ajudante_m2', label: 'Diária Ajudante (por m²)' },
  { chave: 'custo_viagem', label: 'Viagem de Entrega' },
  { chave: 'custo_art', label: 'ART' },
  { chave: 'custo_plotagem', label: 'Plotagem de Projeto' },
  { chave: 'custo_comissao_m2', label: 'Comissão (por m²)' },
  { chave: 'custo_disco_corte', label: 'Disco de Corte' },
  { chave: 'custo_frete_lajota', label: 'Frete Lajota' },
  { chave: 'custo_frete_isopor', label: 'Frete Isopor' },
  { chave: 'custo_laudo', label: 'Laudo Técnico' },
  { chave: 'margem_lucro_laje', label: 'Margem de Lucro (%)' }
];

function abrirModalCustosMateriais() {
  const container = document.getElementById('custos-form-container');
  container.innerHTML = CUSTOS_EDITAVEIS.map(item => {
    const valorAtual = obterConfig(item.chave, 0);
    return `<div>
      <label class="block text-xs font-bold text-slate-500 mb-1">${item.label}</label>
      <input type="number" id="cfg-${item.chave}" value="${valorAtual}" step="0.01" class="w-full p-3 border rounded-lg text-sm">
    </div>`;
  }).join('');

  document.getElementById('modal-custos-materiais').classList.remove('hidden');
  lucide.createIcons();
}

function fecharModalCustosMateriais() {
  document.getElementById('modal-custos-materiais').classList.add('hidden');
}

async function salvarCustosMateriais() {
  showLoading(true);
  try {
    const updates = CUSTOS_EDITAVEIS.map(item => {
      const input = document.getElementById(`cfg-${item.chave}`);
      return { chave: item.chave, valor: input.value };
    });

    // Atualizar cada configuração no Supabase
    for (const { chave, valor } of updates) {
      await sb.from('configuracoes').upsert({ chave, valor });
    }

    // Recarregar configurações no STATE
    STATE.configLaje = {};
    const { data: configs } = await sb.from('configuracoes').select('*');
    if (configs) {
      configs.forEach(c => { STATE.configLaje[c.chave] = c.valor; });
    }

    fecharModalCustosMateriais();
    showToast('Custos atualizados com sucesso!');
    // Recarregar o detalhamento atual se houver um orçamento selecionado
    const idOrc = document.getElementById('laje-detalhamento-select')?.value;
    if (idOrc) gerarDetalhamento();
  } catch (e) {
    showToast('Erro ao salvar: ' + e.message, true);
  }
  showLoading(false);
}
