// ==================== ESTADO DO MÓDULO LAJES ====================
const LAJE = {
  comodosTemp: [],          // { nome, vaoMenor, vaoMaior, tipo, altura, qtdVigotas, tamVigota, epsLinear, area, valorEst }
  orcamentosList: [],       // cache dos orçamentos
  editandoId: null,         // se estiver editando, ID do orçamento
  tabAtiva: 'orcamento',    // 'orcamento' | 'corte' | 'detalhamento'
  planoCorteCache: null     // cache do último plano de corte gerado { barras, resumo }
};

// ==================== NAVEGAÇÃO DE ABAS ====================
function switchLajeTab(tab) {
  LAJE.tabAtiva = tab;
  document.getElementById('laje-tab-orcamento').classList.toggle('hidden', tab !== 'orcamento');
  document.getElementById('laje-tab-corte').classList.toggle('hidden', tab !== 'corte');
  document.getElementById('laje-tab-detalhamento').classList.toggle('hidden', tab !== 'detalhamento');

  ['orcamento','corte','detalhamento'].forEach(t => {
    const btn = document.getElementById(`tab-${t}-btn`);
    if (t === tab) {
      btn.className = 'px-4 py-2 rounded-t-lg font-bold text-sm bg-orange-600 text-white shadow';
    } else {
      btn.className = 'px-4 py-2 rounded-t-lg font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200';
    }
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
  // fallback to STATE.configuracoes
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
  if (res.tipo === 'EPS') {
    document.getElementById('laje-prev-eps').innerText = res.epsLinear.toFixed(2) + ' m';
  } else {
    document.getElementById('laje-prev-eps').innerText = 'Não se aplica (Lajota)';
  }
  document.getElementById('laje-prev-area').innerText = res.area.toFixed(2) + ' m²';
  document.getElementById('laje-prev-valor').innerText = formatMoney(res.valorEstimado);
}

// ==================== MANIPULAÇÃO DOS CÔMODOS (TEMP) ====================
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

  // Rodapé com totais
  tbody.insertAdjacentHTML('beforeend', `
    <tr class="bg-slate-50 font-bold">
      <td colspan="8" class="p-3 text-right">Área Total / Valor Estimado:</td>
      <td class="p-3">${areaTotal.toFixed(2)} m²</td>
      <td class="p-3 text-green-700">${formatMoney(valorTotal)}</td>
    </tr>
  `);
  lucide.createIcons();
}

// ==================== SALVAR ORÇAMENTO ====================
async function salvarOrcamentoLaje() {
  const cliente = document.getElementById('laje-cliente-nome').value.trim();
  if (!cliente) return showToast('Informe o nome do cliente.', true);
  if (LAJE.comodosTemp.length === 0) return showToast('Adicione pelo menos 1 cômodo.', true);

  showLoading(true);
  const areaTotal = LAJE.comodosTemp.reduce((s, c) => s + c.area, 0);
  const valorTotal = LAJE.comodosTemp.reduce((s, c) => s + c.valorEstimado, 0);

  try {
    if (LAJE.editandoId) {
      // Atualiza cabeçalho
      await sb.from('laje_orcamentos').update({
        cliente_nome: cliente,
        valor_total_estimado: valorTotal,
        area_total: areaTotal
      }).eq('id', LAJE.editandoId);
      // Remove itens antigos
      await sb.from('laje_itens_orcamento').delete().eq('id_orcamento', LAJE.editandoId);
      var idOrc = LAJE.editandoId;
    } else {
      // Insere novo
      const { data: cab, error: errCab } = await sb.from('laje_orcamentos').insert({
        cliente_nome: cliente,
        status: 'ABERTO',
        valor_total_estimado: valorTotal,
        area_total: areaTotal
      }).select('id').single();
      if (errCab) throw new Error(errCab.message);
      var idOrc = cab.id;
    }

    // Insere itens
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

    // Limpa estado
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

// ==================== CARREGAR HISTÓRICO DE ORÇAMENTOS ====================
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
    let statusBadge = '';
    if (orc.status === 'ABERTO') statusBadge = '<span class="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold">ABERTO</span>';
    else if (orc.status === 'APROVADO') statusBadge = '<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">APROVADO</span>';
    else statusBadge = '<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">CANCELADO</span>';

    return `<tr class="border-b hover:bg-slate-50">
      <td class="p-3 font-mono">#${orc.id}</td>
      <td class="p-3 font-medium">${orc.cliente_nome}</td>
      <td class="p-3 text-xs">${formatDate(orc.data)}</td>
      <td class="p-3 text-xs max-w-[120px] truncate" title="${comodosNomes}">${comodosNomes || '-'}</td>
      <td class="p-3">${areaTotal.toFixed(2)} m²</td>
      <td class="p-3 font-bold text-green-700">${formatMoney(orc.valor_total_estimado)}</td>
      <td class="p-3">${statusBadge}</td>
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

// ==================== EDITAR ORÇAMENTO ====================
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
  document.getElementById('laje-comodos-count').innerText = LAJE.comodosTemp.length;
  switchLajeTab('orcamento');
  showToast(`Editando orçamento #${id}`);
}

// ==================== ALTERAR STATUS / EXCLUIR ====================
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
  barras.sort((a, b) => a.sobra - b.sobra); // ordena por sobra crescente
  return barras;
}

async function gerarPlanoCorte() {
  const idOrc = document.getElementById('laje-corte-select').value;
  if (!idOrc) return showToast('Selecione um orçamento aprovado.', true);
  showLoading(true);

  const { data: itens, error } = await sb.from('laje_itens_orcamento')
    .select('tamanho_vigota, qtd_vigotas, comodo').eq('id_orcamento', idOrc);

  if (error) { showLoading(false); return showToast('Erro ao buscar itens.', true); }
  if (!itens || itens.length === 0) { showLoading(false); return showToast('Nenhuma vigota encontrada.', true); }

  const tamanhos = [];
  for (const item of itens) {
    for (let i = 0; i < Number(item.qtd_vigotas); i++) {
      tamanhos.push(Number(item.tamanho_vigota));
    }
  }

  const barras = binPackingFFD(tamanhos, obterConfig('comprimento_barra_trelica', 12.0));
  LAJE.planoCorteCache = { barras, idOrc };

  document.getElementById('laje-corte-resultado').classList.remove('hidden');
  const tbody = document.getElementById('laje-corte-tbody');
  const cards = document.getElementById('laje-corte-cards');

  let totalSobra = 0;
  tbody.innerHTML = barras.map((b, i) => {
    totalSobra += b.sobra;
    const status = b.sobra < 0.10 ? '🔴 Perda crítica' : (b.sobra < 0.50 ? '🟡 Atenção' : '🟢 Ok');
    return `<tr class="border-b">
      <td class="p-3 font-bold">Barra ${i+1}</td>
      <td class="p-3 font-mono">${b.cortes.map(c => c.toFixed(2)+'m').join(' + ')}</td>
      <td class="p-3">${b.sobra.toFixed(2)} m</td>
      <td class="p-3">${status}</td>
    </tr>`;
  }).join('');

  cards.innerHTML = barras.map((b, i) => {
    const sobraCor = b.sobra < 0.10 ? 'text-red-600' : (b.sobra < 0.50 ? 'text-amber-600' : 'text-green-600');
    return `<div class="bg-white border rounded-xl p-5 shadow-sm">
      <h4 class="font-bold text-slate-800 mb-2">Barra ${i+1}</h4>
      <p class="text-sm"><span class="text-slate-500">Cortes:</span> <span class="font-mono font-bold">${b.cortes.map(c => c.toFixed(2)+'m').join(' + ')}</span></p>
      <p class="text-sm mt-1">Sobra: <span class="font-bold ${sobraCor}">${b.sobra.toFixed(2)} m</span></p>
      <p class="text-xs text-slate-400 mt-1">Usado: ${b.usado.toFixed(2)} m / 12.00 m</p>
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
  const barras = LAJE.planoCorteCache.barras;
  let totalSobra = 0;
  const rows = barras.map((b, i) => {
    totalSobra += b.sobra;
    return `<tr><td>Barra ${i+1}</td><td>${b.cortes.map(c => c.toFixed(2)+'m').join(' + ')}</td><td>${b.sobra.toFixed(2)} m</td></tr>`;
  }).join('');
  printArea.innerHTML = `
    <div style="font-family: Arial; padding:20px;">
      <h2>Plano de Corte - Orçamento #${LAJE.planoCorteCache.idOrc}</h2>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse; width:100%;">
        <tr><th>Barra</th><th>Cortes</th><th>Sobra</th></tr>${rows}</table>
      <p style="margin-top:10px;"><strong>Total de barras:</strong> ${barras.length} | <strong>Sobra total:</strong> ${totalSobra.toFixed(2)} m</p>
    </div>`;
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

  const { data: itens } = await sb.from('laje_itens_orcamento')
    .select('*').eq('id_orcamento', idOrc);
  if (!itens || itens.length === 0) { showLoading(false); return showToast('Nenhum item.', true); }

  // Agrupa dados
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

  // Plano de corte para saber número de barras
  const barras = binPackingFFD(tamanhosVigota, obterConfig('comprimento_barra_trelica', 12.0));
  const numBarras = barras.length;

  // Determina tipo de treliça predominante (usando a altura mais frequente)
  const alturaModa = [...alturas].sort((a,b)=>b-a)[0] || 8;
  const trelicaTipo = obterConfig(`trelica_tipo_h${alturaModa}`, 'TG8');

  // Enchimento: EPS linear ou lajotas (peças)
  let enchimentoDesc = '', enchimentoQtd = '';
  if ([...tiposEnchimento].includes('EPS')) {
    enchimentoDesc = 'EPS (Isopor)';
    enchimentoQtd = `${totalEpsLinear.toFixed(2)} m lineares`;
  }
  if ([...tiposEnchimento].includes('LAJOTA_CERAMICA')) {
    const lajotaPorM2 = 12; // 12 peças por m²
    const totalLajotas = Math.ceil(totalArea * lajotaPorM2);
    enchimentoDesc += (enchimentoDesc ? ' + ' : '') + 'Lajota Cerâmica';
    enchimentoQtd += (enchimentoQtd ? ' / ' : '') + `${totalLajotas} peças`;
  }

  // Concreto (capeamento 4cm)
  const alturaCapeamento = obterConfig('altura_capeamento_concreto', 0.04);
  const volumeConcreto = totalArea * alturaCapeamento;

  // Aço adicional (reforço) – aqui você pode deixar um placeholder ou calcular automático depois
  const detalhamento = [
    { material: `Treliça ${trelicaTipo} (barras 12m)`, quantidade: `${numBarras} barras` },
    { material: 'Comprimento total de treliça', quantidade: `${tamanhosVigota.reduce((a,b)=>a+b,0).toFixed(2)} m` },
    { material: 'Enchimento', quantidade: enchimentoQtd },
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

// ==================== INICIALIZAÇÃO ====================
// Esta função deve ser chamada dentro do navigate() quando viewId === 'lajes'
// e também ao carregar dados (onDataLoaded) opcionalmente.
// Adicione no seu script principal:
/*
if (viewId === 'lajes') {
  if (!document.getElementById('laje-orcamentos-tbody')) return; // segurança
  switchLajeTab(LAJE.tabAtiva || 'orcamento');
  carregarOrcamentosLaje();
}
*/
// E no carregamento inicial, se necessário:
// STATE.configLaje = {};
// const { data: configs } = await sb.from('configuracoes').select('*');
// configs.forEach(c => STATE.configLaje[c.chave] = c.valor);
