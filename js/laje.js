// ==================== ESTADO DO MÓDULO LAJES ====================
const LAJE = {
  comodosTemp: [],
  orcamentosList: [],
  produtosList: [],          // cache da tabela laje_produtos
  editandoId: null,
  tabAtiva: 'orcamento',
  algoritmoCorte: 'FFD',
  planoCorteCache: null,
  editandoComodoIndex: null
};

// ==================== NAVEGAÇÃO DE ABAS ====================
function switchLajeTab(tab) {
  LAJE.tabAtiva = tab;
  document.getElementById('laje-tab-orcamento').classList.toggle('hidden', tab !== 'orcamento');
  document.getElementById('laje-tab-corte').classList.toggle('hidden', tab !== 'corte');
  document.getElementById('laje-tab-detalhamento').classList.toggle('hidden', tab !== 'detalhamento');
  document.getElementById('laje-tab-itens').classList.toggle('hidden', tab !== 'itens');

  ['orcamento','corte','detalhamento','itens'].forEach(t => {
    const btn = document.getElementById(`tab-${t}-btn`);
    if (!btn) return;
    btn.className = tab === t
      ? 'px-4 py-2 rounded-t-lg font-bold text-sm bg-orange-600 text-white shadow'
      : 'px-4 py-2 rounded-t-lg font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200';
  });

  if (tab === 'corte') carregarSelectOrcamentosAprovados();
  if (tab === 'detalhamento') carregarSelectTodosOrcamentos();
  if (tab === 'itens') carregarProdutosLaje();
  lucide.createIcons();
}


// ==================== CRUD PRODUTOS (Itens Fabricação) ====================
async function carregarProdutosLaje() {
  const { data, error } = await sb.from('laje_produtos').select('*').order('descricao');
  if (error) return showToast('Erro ao carregar produtos.', true);
  LAJE.produtosList = data || [];
  renderProdutosLaje();
}

async function carregarProdutosLajeSilencioso() {
  const { data } = await sb.from('laje_produtos').select('*').order('descricao');
  if (data) LAJE.produtosList = data;
}

function renderProdutosLaje() {
  const tbody = document.getElementById('laje-produtos-tbody');
  if (!tbody) return;
  if (LAJE.produtosList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">Nenhum produto cadastrado.</td></tr>';
    return;
  }
  tbody.innerHTML = LAJE.produtosList.map(p => `
    <tr class="border-b hover:bg-slate-50">
      <td class="p-3 font-medium">${p.descricao}</td>
      <td class="p-3">${p.unidade}</td>
      <td class="p-3 text-right">${formatMoney(p.custo_unitario)}</td>
      <td class="p-3 text-xs capitalize">${p.tipo}</td>
      <td class="p-3 text-center flex gap-2 justify-center">
        <button onclick="editarProdutoLaje(${p.id})" class="text-blue-600 hover:text-blue-800"><i data-lucide="edit-3" width="16"></i></button>
        <button onclick="excluirProdutoLaje(${p.id})" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" width="16"></i></button>
      </td>
    </tr>
  `).join('');
  lucide.createIcons();
}

function abrirModalProduto(id) {
  document.getElementById('modal-produto-laje').classList.remove('hidden');
  document.getElementById('modal-produto-titulo').innerText = id ? 'Editar Produto' : 'Novo Produto';
  if (id) {
    const p = LAJE.produtosList.find(x => x.id == id);
    if (p) {
      document.getElementById('laje-produto-id').value = p.id;
      document.getElementById('laje-produto-descricao').value = p.descricao;
      document.getElementById('laje-produto-unidade').value = p.unidade;
      document.getElementById('laje-produto-custo').value = p.custo_unitario;
      document.getElementById('laje-produto-tipo').value = p.tipo;
    }
  } else {
    document.getElementById('laje-produto-id').value = '';
    document.getElementById('laje-produto-descricao').value = '';
    document.getElementById('laje-produto-unidade').value = '';
    document.getElementById('laje-produto-custo').value = '';
    document.getElementById('laje-produto-tipo').value = 'material';
  }
}

function fecharModalProduto() {
  document.getElementById('modal-produto-laje').classList.add('hidden');
}

async function salvarProdutoLaje() {
  const id = document.getElementById('laje-produto-id').value;
  const descricao = document.getElementById('laje-produto-descricao').value.trim();
  const unidade = document.getElementById('laje-produto-unidade').value.trim();
  const custo = parseFloat(document.getElementById('laje-produto-custo').value) || 0;
  const tipo = document.getElementById('laje-produto-tipo').value;

  if (!descricao || !unidade) return showToast('Preencha descrição e unidade.', true);

  const payload = { descricao, unidade, custo_unitario: custo, tipo };

  let error;
  if (id) {
    ({ error } = await sb.from('laje_produtos').update(payload).eq('id', id));
  } else {
    ({ error } = await sb.from('laje_produtos').insert(payload));
  }
  if (error) return showToast('Erro ao salvar: ' + error.message, true);

  fecharModalProduto();
  carregarProdutosLaje();
  showToast('Produto salvo!');
}

async function excluirProdutoLaje(id) {
  if (!confirm('Excluir este produto?')) return;
  const { error } = await sb.from('laje_produtos').delete().eq('id', id);
  if (error) return showToast('Erro ao excluir: ' + error.message, true);
  carregarProdutosLaje();
  showToast('Produto excluído.');
}

async function editarProdutoLaje(id) {
  abrirModalProduto(id);
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
  } else if (LAJE.algoritmoCorte === 'DP') {
    barras = binPackingDP(tamanhos, barra12m);
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

  // Agrupa barras com cortes idênticos
  const gruposMap = new Map();
  barras.forEach(b => {
    const chave = JSON.stringify(b.cortes);
    if (!gruposMap.has(chave)) {
      gruposMap.set(chave, { cortes: b.cortes, qtd: 0, sobra: b.sobra });
    }
    gruposMap.get(chave).qtd++;
  });

  // Converte para array e ordena por quantidade decrescente (maior → menor)
  const grupos = Array.from(gruposMap.values())
    .sort((a, b) => b.qtd - a.qtd);

  // Paleta de cores profissionais (sem rosa)
  const coresFundo = ['#e0f2fe', '#fef9c3', '#dcfce7', '#e2e8f0', '#f3e8ff', '#dbeafe'];
  let corIndex = 0;

  let totalSobra = 0;
  let linhas = grupos.map((g, idx) => {
    totalSobra += g.sobra * g.qtd;
    const cor = coresFundo[corIndex % coresFundo.length];
    corIndex++;

    const cortesTd = g.cortes.map(c => 
      `<span style="display:inline-block; margin-right:8px; font-weight:bold; font-size:13px;">${c.toFixed(2)} m</span><span style="font-size:14px;">☐</span>`
    ).join('<span style="margin:0 4px; color:#999;">|</span>');

    return `<tr style="background-color:${cor};">
      <td style="padding:5px; border:1px solid #000; text-align:center; font-weight:bold;">${g.qtd}x</td>
      <td style="padding:5px; border:1px solid #000;">${cortesTd}</td>
    </tr>`;
  }).join('');

  const perdaPerc = ((totalSobra / (barras.length * 12)) * 100).toFixed(1);

  printArea.innerHTML = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; padding:10mm; max-width:190mm; margin:0 auto; background:#fff; font-size:12px;">
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
      <div style="margin-bottom:10px; font-size:11px;">
        <strong>Total de barras:</strong> ${barras.length} | 
        <strong>Sobra total:</strong> ${totalSobra.toFixed(2)} m (${perdaPerc}%) |
        <strong>Cortes:</strong> ${barras.reduce((s,b) => s + b.cortes.length, 0)} unidades
      </div>
      <p style="font-size:11px; margin:0 0 8px 0;">🔹 Cada linha representa um <strong>grupo de barras idênticas</strong>. A quantidade está na primeira coluna.</p>
      <table width="100%" style="border-collapse:collapse; margin-bottom:15px;">
        <thead>
          <tr style="background:#e5e7eb;">
            <th style="padding:6px; border:1px solid #000; width:60px;">Qtd</th>
            <th style="padding:6px; border:1px solid #000;">Cortes (☐ após cada = concluído)</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
      </table>
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

  // 1. Buscar itens do orçamento
  const { data: itens, error } = await sb.from('laje_itens_orcamento').select('*').eq('id_orcamento', idOrc);
  if (error || !itens?.length) { showLoading(false); return showToast('Nenhum item.', true); }

  // 2. Garantir lista de produtos carregada
  await carregarProdutosLajeSilencioso();

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

  const metrosLinearesTrelica = tamanhosVigota.reduce((a, b) => a + b, 0);
  const barras = binPackingFFD(tamanhosVigota, 12.0);
  const numBarras = barras.length;
  const alturaModa = [...alturas].sort((a, b) => b - a)[0] || 8;
  const tipoPredominante = [...tiposEnchimento][0] || 'EPS';

  // Capeamento
  const espessuraCapeamento = (alturaModa <= 12) ? 0.02 : 0.04;
  const larguraCapeamento = 0.12; // 12 cm
  const secaoCapeamento = larguraCapeamento * espessuraCapeamento; // m²
  const volumeConcreto = totalArea * espessuraCapeamento; // m³

  // Traço: volume por betonada (0,231 m³)
  const volumePorTraco = 0.231;
  const numTracos = Math.ceil(volumeConcreto / volumePorTraco);
  const metrosLinearesPorTraco = volumePorTraco / secaoCapeamento; // ≈ 48 m para 4cm, 96 m para 2cm
  const sacosCimento = Math.ceil(numTracos * 1.5);
  const areiaM3 = numTracos * 0.117;
  const britaM3 = numTracos * 0.09;
  const latasAreia = Math.ceil(areiaM3 / 0.018);
  const latasBrita = Math.ceil(britaM3 / 0.018);

  // Função de custo
  function custoProduto(nomePadrao, padrao = 0) {
    const p = LAJE.produtosList.find(x => x.descricao === nomePadrao);
    return p ? Number(p.custo_unitario) : padrao;
  }

  const linhas = [];
  let custoTotal = 0;

  function addLinha(desc, qtd, composicao, vlrUnit, vlrTotal) {
    linhas.push({
      desc,
      qtd,
      composicao: composicao || '',
      unitario: formatMoney(vlrUnit),
      total: formatMoney(vlrTotal)
    });
    custoTotal += vlrTotal;
  }

  // Treliça
  const trelicaNome = `Treliça TG${alturaModa} 12m`;
  const custoTrelica = custoProduto(trelicaNome, alturaModa <= 8 ? 68 : (alturaModa <= 12 ? 92 : 105));
  addLinha('Treliça', `${numBarras} barras`, `${metrosLinearesTrelica.toFixed(2)} m lineares`, custoTrelica, numBarras * custoTrelica);

  // Enchimento – EPS (placa de 1,00 m × 0,50 m → cobre 1 m linear)
  if (tiposEnchimento.has('EPS')) {
    const placasEps = Math.ceil(totalEpsLinear); // cada placa = 1 m linear
    const epsNome = `EPS H${alturaModa} placa 50x50`; // manter nome do banco
    const custoEpsPlaca = custoProduto(epsNome, 11.90);
    addLinha(
      'EPS (isopor)',
      `${placasEps} placas`,
      `${totalEpsLinear.toFixed(2)} m lineares (equivale a ${placasEps} placas de 1,00×0,50 m)`,
      custoEpsPlaca,
      placasEps * custoEpsPlaca
    );
    const freteIsopor = custoProduto('Frete Isopor', 0);
    if (freteIsopor > 0) addLinha('Frete do isopor', '1 un', '', freteIsopor, freteIsopor);
  }
  if (tiposEnchimento.has('LAJOTA_CERAMICA')) {
    const totalLajotas = Math.ceil(totalArea * 12);
    const custoLajota = custoProduto('Lajota Cerâmica', 1.7);
    addLinha('Lajota', `${totalLajotas} peças`, '', custoLajota, totalLajotas * custoLajota);
    const freteLajota = custoProduto('Frete Lajota', 50);
    addLinha('Frete da lajota', '1 un', '', freteLajota, freteLajota);
  }

  // Concreto
  addLinha(
    'Cimento',
    `${sacosCimento} sacos`,
    `${numTracos} traços (${metrosLinearesPorTraco.toFixed(0)} m lineares de capeamento por traço)`,
    custoProduto('Cimento CP II 50kg', 37),
    sacosCimento * custoProduto('Cimento CP II 50kg', 37)
  );
  addLinha(
    'Areia Grossa',
    `${areiaM3.toFixed(3)} m³`,
    `${latasAreia} latas (18 L)`,
    custoProduto('Areia Grossa', 200),
    areiaM3 * custoProduto('Areia Grossa', 200)
  );
  addLinha(
    'Brita 0',
    `${britaM3.toFixed(3)} m³`,
    `${latasBrita} latas (18 L)`,
    custoProduto('Brita 0', 200),
    britaM3 * custoProduto('Brita 0', 200)
  );

  // Serviços gerais
  addLinha('Disco de Corte', '1 un', '', custoProduto('Disco de Corte', 10), custoProduto('Disco de Corte', 10));
  addLinha('ART', '1 un', '', custoProduto('ART', 28), custoProduto('ART', 28));
  addLinha('Plotagem', '1 un', '', custoProduto('Plotagem de Projeto', 10), custoProduto('Plotagem de Projeto', 10));
  addLinha('Viagem', '1 un', '', custoProduto('Viagem de Entrega', 50), custoProduto('Viagem de Entrega', 50));
  const ajudanteTotal = totalArea * custoProduto('Diária de Ajudante', 4.5);
  addLinha('Diária Ajudante', `${totalArea.toFixed(2)} m²`, '', custoProduto('Diária de Ajudante', 4.5), ajudanteTotal);
  const comissaoTotal = totalArea * custoProduto('Comissão', 1);
  addLinha('Comissão', `${totalArea.toFixed(2)} m²`, '', custoProduto('Comissão', 1), comissaoTotal);
  if (tiposEnchimento.has('EPS')) {
    const laudo = custoProduto('Laudo Técnico', 300);
    if (laudo > 0) addLinha('Laudo Técnico', '1 un', '', laudo, laudo);
  }

  // Armazena para recálculo da margem/frete
  LAJE.custoTotalDetalhamento = custoTotal;
  LAJE.areaTotalDetalhamento = totalArea;

  const margemInicial = 20;
  const precoVendaInicial = custoTotal * (1 + margemInicial / 100);
  const precoM2Inicial = totalArea > 0 ? precoVendaInicial / totalArea : 0;

  // HTML do resultado
  const html = `
    <div class="bg-white rounded-xl border shadow-sm p-6">
      <h3 class="font-bold text-slate-800 mb-4">Detalhamento de Custos e Materiais</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="p-3 text-left">Descrição</th>
              <th class="p-3 text-center">Quantidade</th>
              <th class="p-3 text-center">Composição</th>
              <th class="p-3 text-right">Valor Unit.</th>
              <th class="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${linhas.map(l => `
              <tr class="border-b">
                <td class="p-3 font-medium">${l.desc}</td>
                <td class="p-3 text-center">${l.qtd}</td>
                <td class="p-3 text-center text-xs text-slate-500">${l.composicao}</td>
                <td class="p-3 text-right">${l.unitario}</td>
                <td class="p-3 text-right">${l.total}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- Margem editável + frete + totais -->
      <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div class="bg-slate-50 p-4 rounded-lg text-center">
          <p class="text-slate-500 text-sm">Custo Total</p>
          <p class="text-2xl font-bold text-slate-800" id="detalhe-custo-total">${formatMoney(custoTotal)}</p>
        </div>
        <div class="bg-slate-50 p-4 rounded-lg text-center">
          <label class="text-slate-500 text-sm block">Margem de Lucro (%)</label>
          <input type="number" id="detalhe-margem-lucro" value="20" min="0" max="200" step="0.1"
            class="w-24 text-center border rounded p-1 mt-1 mx-auto" onchange="recalcularDetalhamento()">
        </div>
        <div class="bg-white border border-slate-200 p-4 rounded-lg text-center flex flex-col items-center justify-center">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="detalhe-frete-check" class="w-5 h-5 accent-orange-600" onchange="recalcularDetalhamento()">
            <span class="text-sm font-medium text-slate-700">Com frete (6%)</span>
          </label>
        </div>
        <div class="bg-orange-50 p-4 rounded-lg text-center">
          <p class="text-slate-500 text-sm">Preço de Venda</p>
          <p class="text-2xl font-bold text-orange-600" id="detalhe-preco-venda">${formatMoney(precoVendaInicial)}</p>
          <p class="text-xs text-slate-500"><span id="detalhe-preco-m2">${formatMoney(precoM2Inicial)}</span> / m²</p>       
          
        </div>
        
      </div>
      
      <p class="text-xs text-slate-400 mt-2">* Ajuste a margem de lucro ou marque o frete para recalcular o preço de venda automaticamente.</p>
    </div>
    <button onclick="enviarParaOrcamento()" class="mt-3 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm w-full">
          <i data-lucide="send"></i> Enviar para Orçamento
        </button>
  `;

  document.getElementById('laje-detalhamento-resultado').innerHTML = html;
  document.getElementById('laje-detalhamento-resultado').classList.remove('hidden');
  showLoading(false);
  lucide.createIcons();
}

function recalcularDetalhamento() {
  const margemInput = document.getElementById('detalhe-margem-lucro');
  const freteCheck = document.getElementById('detalhe-frete-check');
  if (!margemInput) return;

  const margem = parseFloat(margemInput.value) || 0;
  const custo = LAJE.custoTotalDetalhamento || 0;
  const area = LAJE.areaTotalDetalhamento || 1;

  let precoVenda = custo * (1 + margem / 100);
  if (freteCheck && freteCheck.checked) {
    precoVenda = precoVenda * 1.06;
  }

  const precoM2 = precoVenda / area;

  const pv = document.getElementById('detalhe-preco-venda');
  const pm = document.getElementById('detalhe-preco-m2');
  if (pv) pv.innerText = formatMoney(precoVenda);
  if (pm) pm.innerText = formatMoney(precoM2);
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

/* ======================================================== cloude ===========================*/

// ==================== ALGORITMO DP — CORTE ÓTIMO ====================
/**
 * binPackingDP — Programação Dinâmica para corte 1D
 * Garante o menor número de barras possível usando memoização.
 * Para cada barra, encontra a combinação de peças que maximiza
 * o uso sem ultrapassar 12m, priorizando o menor desperdício.
 * Ideal para lotes com poucos tamanhos distintos (caso típico de lajes).
 */
function binPackingDP(tamanhos, comprimentoBarra = 12.0, precisao = 100) {
  if (tamanhos.length === 0) return [];

  // Arredonda para inteiros escalados (evita problemas de float)
  const escala = precisao; // 1 unidade = 0.01m → precisão de 1cm
  const C = Math.round(comprimentoBarra * escala);
  const itens = tamanhos.map(t => Math.round(t * escala));

  // Conta quantas peças de cada tamanho temos
  const contagem = new Map();
  itens.forEach(t => contagem.set(t, (contagem.get(t) || 0) + 1));
  const tipos = [...contagem.keys()].sort((a, b) => b - a); // maiores primeiro

  // DP: para cada capacidade c (0..C), qual o máximo que conseguimos preencher
  // usando as peças disponíveis (sem repetir além do estoque)
  // Resultado: dp[c] = {usado, peçasUsadas[]}
  function melhorCombinacaoParaBarra(disponivel) {
    // disponivel: Map<tamanho, qtd restante>
    const dp = new Array(C + 1).fill(null);
    dp[0] = { usado: 0, pecas: [] };

    for (const [tam, qtd] of disponivel) {
      if (qtd <= 0) continue;
      // Itera de trás para frente para cada quantidade disponível deste tipo
      for (let q = 1; q <= qtd; q++) {
        // De C até tam (bounded knapsack, 1 item por vez)
        for (let c = C; c >= tam; c--) {
          if (dp[c - tam] !== null) {
            const novoUsado = dp[c - tam].usado + tam;
            if (novoUsado === c && (dp[c] === null || dp[c].usado < novoUsado)) {
              dp[c] = {
                usado: novoUsado,
                pecas: [...dp[c - tam].pecas, tam]
              };
            }
          }
        }
      }
    }

    // Encontra o melhor preenchimento (maior usado sem ultrapassar C)
    let melhor = dp[0];
    for (let c = C; c >= 0; c--) {
      if (dp[c] !== null && dp[c].usado > melhor.usado) {
        melhor = dp[c];
      }
    }
    return melhor;
  }

  // Knapsack bounded completo para maximizar uso de cada barra
  function knapsackBounded(disponivel) {
    // Cria array de todos os itens disponíveis
    const todosItens = [];
    for (const [tam, qtd] of disponivel) {
      for (let q = 0; q < qtd; q++) todosItens.push(tam);
    }

    // DP simples 0/1 com rastreamento
    const n = todosItens.length;
    // Para evitar explosão de memória, limitamos a 60 itens por barra
    const MAX_ITENS = 60;
    const itensUsados = todosItens.slice(0, MAX_ITENS);
    const m = itensUsados.length;

    // dp[j] = maior soma ≤ C usando subconjunto dos primeiros i itens
    const dp = new Int32Array(C + 1);
    const escolha = Array.from({ length: m }, () => new Uint8Array(C + 1));

    for (let i = 0; i < m; i++) {
      const tam = itensUsados[i];
      for (let c = C; c >= tam; c--) {
        if (dp[c - tam] + tam > dp[c]) {
          dp[c] = dp[c - tam] + tam;
          escolha[i][c] = 1;
        }
      }
    }

    // Reconstrói quais peças foram escolhidas
    const pecasEscolhidas = [];
    let c = C;
    for (let i = m - 1; i >= 0; i--) {
      if (escolha[i][c]) {
        pecasEscolhidas.push(itensUsados[i]);
        c -= itensUsados[i];
      }
    }

    return { usado: dp[C] > 0 ? dp[C] : dp.reduce((mx, v) => Math.max(mx, v), 0), pecas: pecasEscolhidas };
  }

  // Processo principal: preenche barras uma a uma
  const barras = [];
  const disponivel = new Map(contagem); // cópia mutável
  let totalRestante = itens.length;

  while (totalRestante > 0) {
    const resultado = knapsackBounded(disponivel);

    if (resultado.pecas.length === 0) {
      // Segurança: pega a menor peça restante
      for (const [tam, qtd] of disponivel) {
        if (qtd > 0) {
          resultado.pecas = [tam];
          resultado.usado = tam;
          break;
        }
      }
    }

    // Remove as peças usadas do estoque
    const contLocal = new Map();
    resultado.pecas.forEach(p => contLocal.set(p, (contLocal.get(p) || 0) + 1));
    for (const [tam, qtdUsada] of contLocal) {
      disponivel.set(tam, disponivel.get(tam) - qtdUsada);
      if (disponivel.get(tam) <= 0) disponivel.delete(tam);
      totalRestante -= qtdUsada;
    }

    const usadoReal = parseFloat((resultado.usado / escala).toFixed(3));
    const sobraReal = parseFloat((comprimentoBarra - usadoReal).toFixed(3));

    barras.push({
      cortes: resultado.pecas.map(p => parseFloat((p / escala).toFixed(3))).sort((a, b) => b - a),
      usado: usadoReal,
      sobra: sobraReal
    });
  }

  barras.sort((a, b) => a.sobra - b.sobra);
  return barras;
}


async function enviarParaOrcamento() {
  const idOrc = document.getElementById('laje-detalhamento-select').value;
  if (!idOrc) return showToast('Selecione um orçamento.', true);

  const orc = LAJE.orcamentosList.find(o => o.id == idOrc);
  if (!orc) return showToast('Orçamento não encontrado.', true);

  const pmElem = document.getElementById('detalhe-preco-m2');
  if (!pmElem) return showToast('Gere o detalhamento primeiro.', true);

  // Extrai número do texto formatado (ex: "R$ 1.234,56")
  const precoM2 = parseFloat(
    pmElem.innerText.replace(/[^0-9,]/g, '').replace(',', '.')
  ) || 0;
  if (precoM2 <= 0) return showToast('Preço por m² inválido.', true);

  const areaTotal = LAJE.areaTotalDetalhamento || 0;
  if (areaTotal <= 0) return showToast('Área total inválida.', true);

  // Busca o produto fixo de ID 1138
  const { data: prod, error: prodErr } = await sb
    .from('produtos')
    .select('*')
    .eq('id', 1138)
    .single();
  if (prodErr || !prod) return showToast('Produto base (ID 1138) não encontrado.', true);

  const valorTotal = parseFloat((areaTotal * precoM2).toFixed(2));
  const dataISO = new Date().toISOString();
  const novoId = getNextId();   // já existe no sistema

  const logEntry = {
    id: novoId,
    tipo: 'orcamento',
    produto_nome: prod.nome,
    quantidade: areaTotal,
    data: dataISO,
    observacao: `Orçamento gerado a partir da laje #${idOrc}`,
    valor_total: valorTotal,
    cliente_nome: orc.cliente_nome,
    forma_pagamento: 'A Combinar',
    status: 'ABERTO',
    desconto: 0,
    status_financeiro: '$',
    endereco_entrega: '',
    status_entrega: '',
    qtd_entregue: 0,
    vencimento: dataISO,
    valor_pago: 0
  };

  // 👇 LOG COMPLETO NO CONSOLE (abra F12 antes de clicar)
  console.log('Payload enviado para logs:', JSON.stringify(logEntry, null, 2));

  try {
    const { error, data: inserted } = await sb.from('logs').insert([logEntry]).select();

    if (error) {
      console.error('Erro Supabase:', error);
      showToast('Erro ao criar orçamento: ' + error.message, true);
      return;
    }

    console.log('Sucesso:', inserted);
    showToast('Orçamento criado com sucesso!');
    await loadData();
    navigate('quotes');
  } catch (err) {
    console.error('Exceção ao inserir:', err);
    showToast('Erro ao criar orçamento: ' + err.message, true);
  }
}
