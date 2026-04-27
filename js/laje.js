// ========== ESTADO LOCAL DO MÓDULO LAJES ==========
const LAJE = {
  comodosTemp: [],        // cômodos sendo editados no orçamento atual
  orcamentosList: [],     // cache dos orçamentos carregados
  tabAtiva: 'orcamento'   // 'orcamento' | 'corte'
};

// ========== NAVEGAÇÃO DE ABAS ==========
function switchLajeTab(tab) {
  LAJE.tabAtiva = tab;
  document.getElementById('laje-tab-orcamento').classList.toggle('hidden', tab !== 'orcamento');
  document.getElementById('laje-tab-corte').classList.toggle('hidden', tab !== 'corte');

  const btnO = document.getElementById('tab-orcamento-btn');
  const btnC = document.getElementById('tab-corte-btn');
  btnO.className = tab === 'orcamento'
    ? 'px-4 py-2 rounded-t-lg font-bold text-sm bg-orange-600 text-white shadow'
    : 'px-4 py-2 rounded-t-lg font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200';
  btnC.className = tab === 'corte'
    ? 'px-4 py-2 rounded-t-lg font-bold text-sm bg-orange-600 text-white shadow'
    : 'px-4 py-2 rounded-t-lg font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200';

  if (tab === 'corte') carregarSelectOrcamentosAprovados();
  lucide.createIcons();
}

// ========== CÁLCULO DO CÔMODO (REGRAS DE NEGÓCIO) ==========
function calcularLaje(vaoMenor, vaoMaior, tipoEnchimento) {
  const vm = parseFloat(vaoMenor) || 0;
  const vM = parseFloat(vaoMaior) || 0;
  if (vm <= 0 || vM <= 0) return null;

  const tamVigota = vm + 0.20;  // apoio 0.10m em cada extremidade

  // Inter-eixo de acordo com o tipo selecionado
  const interEixo = tipoEnchimento === 'EPS' ? 0.50 : 0.43;  // EPS = 0.50, Lajota = 0.43
  const qtdVigotas = Math.ceil(vM / interEixo);

  // EPS linear só é relevante se for EPS (para lajota cerâmica pode ser 0)
  const epsLinear = tipoEnchimento === 'EPS' ? (qtdVigotas - 1) * vm : 0;

  return { vaoMenor: vm, vaoMaior: vM, qtdVigotas, tamVigota, epsLinear, tipo: tipoEnchimento };
}

// Preview em tempo real conforme digita
function calcularLajePreview() {
  const vm = document.getElementById('laje-vao-menor').value;
  const vM = document.getElementById('laje-vao-maior').value;
  const tipo = document.getElementById('laje-tipo-enchimento').value;
  const res = calcularLaje(vm, vM, tipo);
  const previewDiv = document.getElementById('laje-preview');

  if (!res) {
    previewDiv.classList.add('hidden');
    return;
  }
  previewDiv.classList.remove('hidden');
  document.getElementById('laje-prev-vigotas').innerText = res.qtdVigotas + ' unidades';
  document.getElementById('laje-prev-tamanho').innerText = res.tamVigota.toFixed(2) + ' m';
  
  // Se for EPS, exibe metragem linear; senão, informa que EPS não se aplica
  if (tipo === 'EPS') {
    document.getElementById('laje-prev-eps').innerText = res.epsLinear.toFixed(2) + ' m';
  } else {
    document.getElementById('laje-prev-eps').innerText = 'Não se aplica (Lajota Cerâmica)';
  }
}

// ========== MANIPULAÇÃO DA LISTA DE CÔMODOS (TEMP) ==========
function adicionarComodoLaje() {
  const nome = document.getElementById('laje-comodo-nome').value.trim();
  const vm = document.getElementById('laje-vao-menor').value;
  const vM = document.getElementById('laje-vao-maior').value;
  const tipo = document.getElementById('laje-tipo-enchimento').value;
  const res = calcularLaje(vm, vM, tipo);

  if (!nome) return showToast('Informe o nome do cômodo.', true);
  if (!res) return showToast('Informe vão menor e vão maior válidos.', true);

  LAJE.comodosTemp.push({ nome, ...res });
  renderComodosTemp();
  limparFormLaje();
  document.getElementById('laje-comodo-nome').focus();
}

function limparFormLaje() {
  document.getElementById('laje-comodo-nome').value = '';
  document.getElementById('laje-vao-menor').value = '';
  document.getElementById('laje-vao-maior').value = '';
  document.getElementById('laje-tipo-enchimento').value = 'EPS';  // valor padrão
  document.getElementById('laje-preview').classList.add('hidden');
}

function limparComodosLaje() {
  LAJE.comodosTemp = [];
  renderComodosTemp();
}

function removerComodoLaje(index) {
  LAJE.comodosTemp.splice(index, 1);
  renderComodosTemp();
}

function renderComodosTemp() {
  const tbody = document.getElementById('laje-comodos-tbody');
  document.getElementById('laje-comodos-count').innerText = LAJE.comodosTemp.length;

  if (LAJE.comodosTemp.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="p-6 text-center text-slate-400">Nenhum cômodo adicionado.</td></tr>';
    return;
  }

  tbody.innerHTML = LAJE.comodosTemp.map((c, i) => `
    <tr class="border-b hover:bg-slate-50">
      <td class="p-3 font-medium">${c.nome}</td>
      <td class="p-3">${c.vaoMenor.toFixed(2)} m</td>
      <td class="p-3">${c.vaoMaior.toFixed(2)} m</td>
      <td class="p-3 font-bold">${c.qtdVigotas}</td>
      <td class="p-3">${c.tamVigota.toFixed(2)} m</td>
      <td class="p-3 text-xs capitalize">${c.tipo === 'EPS' ? 'Isopor (EPS)' : 'Lajota Cerâmica'}</td>
      <td class="p-3">${c.tipo === 'EPS' ? c.epsLinear.toFixed(2) + ' m' : '-'}</td>
      <td class="p-3 text-center">
        <button onclick="removerComodoLaje(${i})" class="text-red-500 hover:text-red-700">
          <i data-lucide="trash-2" width="16"></i>
        </button>
      </td>
    </tr>
  `).join('');
  lucide.createIcons();
}
// ========== SALVAR ORÇAMENTO NO SUPABASE ==========
async function salvarOrcamentoLaje() {
  const cliente = document.getElementById('laje-cliente-nome').value.trim();
  if (!cliente) return showToast('Informe o nome do cliente.', true);
  if (LAJE.comodosTemp.length === 0) return showToast('Adicione pelo menos 1 cômodo.', true);

  showLoading(true);
  const obs = document.getElementById('laje-observacao').value.trim();

  // 1. Inserir cabeçalho do orçamento
  const { data: cab, error: errCab } = await sb.from('laje_orcamentos')
    .insert({ cliente_nome: cliente, observacao: obs, status: 'ABERTO' })
    .select('id')
    .single();

  if (errCab) {
    showLoading(false);
    return showToast('Erro ao salvar orçamento: ' + errCab.message, true);
  }

  // 2. Inserir itens
 // Dentro de salvarOrcamentoLaje, ao criar 'itens':
const itens = LAJE.comodosTemp.map(c => ({
  id_orcamento: cab.id,
  comodo: c.nome,
  vao_menor: c.vaoMenor,
  vao_maior: c.vaoMaior,
  qtd_vigotas: c.qtdVigotas,
  tamanho_vigota: c.tamVigota,
  metragem_eps: c.epsLinear,
  tipo_enchimento: c.tipo   // <-- ADICIONE ESSA LINHA
}));

  const { error: errItens } = await sb.from('laje_itens_orcamento').insert(itens);
  if (errItens) {
    showLoading(false);
    return showToast('Erro ao salvar itens: ' + errItens.message, true);
  }

  // 3. Limpar e recarregar
  LAJE.comodosTemp = [];
  renderComodosTemp();
  document.getElementById('laje-cliente-nome').value = '';
  document.getElementById('laje-observacao').value = '';
  showToast('Orçamento #' + cab.id + ' salvo com sucesso!');
  carregarOrcamentosLaje();
  showLoading(false);
}

// ========== CARREGAR HISTÓRICO DE ORÇAMENTOS ==========
async function carregarOrcamentosLaje() {
  const tbody = document.getElementById('laje-orcamentos-tbody');
  if (!tbody) return;

  const { data: orcs, error } = await sb.from('laje_orcamentos')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-red-400">Erro ao carregar.</td></tr>';
    return;
  }

  LAJE.orcamentosList = orcs || [];

  if (LAJE.orcamentosList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-400">Nenhum orçamento encontrado.</td></tr>';
    return;
  }

  // Para cada orçamento, buscar itens e calcular totais
  const rows = await Promise.all(LAJE.orcamentosList.map(async (orc) => {
    const { data: itens } = await sb.from('laje_itens_orcamento')
      .select('qtd_vigotas,comodo')
      .eq('id_orcamento', orc.id);

    const totalVigotas = (itens || []).reduce((s, i) => s + Number(i.qtd_vigotas), 0);
    const comodosNomes = (itens || []).map(i => i.comodo).join(', ');

    let statusBadge = '';
    if (orc.status === 'ABERTO') statusBadge = '<span class="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold">ABERTO</span>';
    else if (orc.status === 'APROVADO') statusBadge = '<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">APROVADO</span>';
    else statusBadge = '<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">CANCELADO</span>';

    return `
      <tr class="border-b hover:bg-slate-50">
        <td class="p-3 font-mono">#${orc.id}</td>
        <td class="p-3 font-medium">${orc.cliente_nome}</td>
        <td class="p-3 text-xs">${formatDate(orc.data)}</td>
        <td class="p-3 text-xs max-w-[150px] truncate" title="${comodosNomes}">${comodosNomes || '-'}</td>
        <td class="p-3 font-bold">${totalVigotas}</td>
        <td class="p-3">${statusBadge}</td>
        <td class="p-3 flex gap-2 justify-center">
          <button onclick="alterarStatusLaje(${orc.id}, 'APROVADO')" class="text-green-600 hover:text-green-800 text-xs font-bold" title="Aprovar">✓</button>
          <button onclick="alterarStatusLaje(${orc.id}, 'CANCELADO')" class="text-red-500 hover:text-red-700 text-xs font-bold" title="Cancelar">✕</button>
          <button onclick="excluirOrcamentoLaje(${orc.id})" class="text-slate-400 hover:text-red-600" title="Excluir">
            <i data-lucide="trash-2" width="14"></i>
          </button>
        </td>
      </tr>`;
  }));

  tbody.innerHTML = rows.join('');
  lucide.createIcons();
}

// ========== ALTERAR STATUS / EXCLUIR ==========
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

// ========== PLANO DE CORTE ==========

// Carrega os orçamentos APROVADOS para o <select>
async function carregarSelectOrcamentosAprovados() {
  const sel = document.getElementById('laje-corte-select');
  const { data } = await sb.from('laje_orcamentos')
    .select('id,cliente_nome')
    .eq('status', 'APROVADO')
    .order('id', { ascending: false });

  sel.innerHTML = '<option value="">-- Selecione --</option>' +
    (data || []).map(o => `<option value="${o.id}">#${o.id} – ${o.cliente_nome}</option>`).join('');
}

/**
 * ALGORITMO FFD (First Fit Decreasing) – Bin Packing 1D
 *
 * Objetivo: empacotar as vigotas (tamanhos variados) em barras de 12,00 m
 * com o mínimo de desperdício.
 *
 * Passos:
 *  1. Ordenar as vigotas da maior para a menor (Decreasing).
 *  2. Para cada vigota, tentar encaixá-la na primeira barra que tiver espaço suficiente (First Fit).
 *  3. Se nenhuma barra atual comportar, abrir uma nova barra de 12 m.
 *  4. Retornar array de barras, cada uma com: cortes (array de tamanhos) e sobra.
 */
function binPackingFFD(tamanhosVigotas, comprimentoBarra = 12.0) {
  // 1. Ordena decrescente
  const sorted = [...tamanhosVigotas].sort((a, b) => b - a);
  const barras = [];

  for (const tam of sorted) {
    let alocado = false;

    // 2. Tenta encaixar na primeira barra com espaço
    for (const barra of barras) {
      const usado = barra.cortes.reduce((s, c) => s + c, 0);
      if (usado + tam <= comprimentoBarra + 0.001) { // margem de erro float
        barra.cortes.push(tam);
        alocado = true;
        break;
      }
    }

    // 3. Se não coube em nenhuma, cria nova barra
    if (!alocado) {
      barras.push({ cortes: [tam] });
    }
  }

  // 4. Calcula sobras
  for (const barra of barras) {
    const usado = barra.cortes.reduce((s, c) => s + c, 0);
    barra.sobra = comprimentoBarra - usado;
  }

  return barras; // cada elemento: { cortes: [n1, n2, ...], sobra: número }
}

// Gera e exibe o plano de corte com base no orçamento selecionado
async function gerarPlanoCorte() {
  const idOrc = document.getElementById('laje-corte-select').value;
  if (!idOrc) return showToast('Selecione um orçamento aprovado.', true);

  showLoading(true);

  // Busca todas as vigotas do orçamento
  const { data: itens, error } = await sb.from('laje_itens_orcamento')
    .select('tamanho_vigota, qtd_vigotas, comodo')
    .eq('id_orcamento', idOrc);

  if (error) {
    showLoading(false);
    return showToast('Erro ao buscar itens: ' + error.message, true);
  }

  // Constrói array plano: cada vigota é um elemento com seu tamanho
  const tamanhos = [];
  for (const item of itens) {
    for (let i = 0; i < Number(item.qtd_vigotas); i++) {
      tamanhos.push(Number(item.tamanho_vigota));
    }
  }

  if (tamanhos.length === 0) {
    showLoading(false);
    return showToast('Nenhuma vigota encontrada neste orçamento.', true);
  }

  // Aplica FFD
  const barras = binPackingFFD(tamanhos, 12.0);

  // Renderiza resultado
  document.getElementById('laje-corte-resultado').classList.remove('hidden');
  const container = document.getElementById('laje-corte-barras');
  container.innerHTML = barras.map((barra, i) => {
    const cortesStr = barra.cortes.map(c => c.toFixed(2) + ' m').join(' + ');
    const sobra = barra.sobra;
    const sobraClass = sobra < 0.10 ? 'text-red-600' : (sobra < 0.50 ? 'text-amber-600' : 'text-green-600');
    return `
      <div class="bg-white border rounded-xl p-5 shadow-sm">
        <h4 class="font-bold text-slate-800 mb-2">Barra ${i + 1}</h4>
        <p class="text-sm text-slate-600">Cortes: <span class="font-mono font-bold">${cortesStr}</span></p>
        <p class="text-sm mt-1">Sobra: <span class="font-bold ${sobraClass}">${sobra.toFixed(2)} m</span></p>
      </div>
    `;
  }).join('');

  // Resumo
  const totalBarras = barras.length;
  const sobraTotal = barras.reduce((s, b) => s + b.sobra, 0);
  container.insertAdjacentHTML('beforeend', `
    <div class="col-span-full bg-slate-50 border border-dashed border-slate-300 rounded-xl p-5 text-center">
      <p class="text-lg font-bold text-slate-700">Total: ${totalBarras} barra(s) de 12 m</p>
      <p class="text-sm text-slate-500">Sobra total: ${sobraTotal.toFixed(2)} m (${((sobraTotal/(totalBarras*12))*100).toFixed(1)}% de perda)</p>
    </div>
  `);

  showLoading(false);
  lucide.createIcons();
}
