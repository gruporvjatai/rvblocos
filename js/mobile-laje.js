// mobile-laje.js - Interface para o módulo Lajes no mobile
// Depende de laje-core.js, lucide, sb, showToast, showLoading, formatMoney, formatDate, getNextId

let LAJE_MOBILE = {
  comodosTemp: [],
  editandoId: null,
  tabAtiva: 'orcamentos', // 'orcamentos', 'corte', 'detalhamento', 'entregas'
  orcamentosList: [],
  produtosList: [],
  detalhamentoCache: null,
  algoritmoCorte: 'DP'
};

let LAJE_PRODUTOS_CACHE = [];

// Inicialização
async function initLajeMobile() {
  await carregarConfiguracoesLaje();
  await carregarOrcamentosMobile();
  await carregarProdutosMobile();
  renderLajeOrcamentos();
}

async function carregarOrcamentosMobile() {
  try {
    LAJE_MOBILE.orcamentosList = await listarOrcamentosLaje();
  } catch(e) { console.error(e); showToast('Erro ao carregar orçamentos', true); }
}

async function carregarProdutosMobile() {
  try {
    LAJE_PRODUTOS_CACHE = await listarProdutosLaje();
  } catch(e) { console.error(e); }
}

// Renderização da aba principal (lista de orçamentos)
function renderLajeOrcamentos() {
  const container = document.getElementById('laje-orcamentos-list');
  if (!container) return;
  const orcs = LAJE_MOBILE.orcamentosList;
  if (orcs.length === 0) {
    container.innerHTML = '<div class="text-center text-slate-400 p-8">Nenhum orçamento encontrado.</div>';
    return;
  }
  container.innerHTML = orcs.map(o => `
    <div class="card p-4 mb-3">
      <div class="flex justify-between items-start">
        <div>
          <h3 class="font-black text-slate-800">#${o.id} - ${o.cliente_nome}</h3>
          <p class="text-xs text-slate-400">${formatDate(o.data)} | ${o.status}</p>
          <p class="text-sm mt-1">Área: ${o.area_total?.toFixed(2) || 0} m² | Valor: ${formatMoney(o.valor_total_estimado || 0)}</p>
        </div>
        <div class="flex gap-2">
          <button onclick="editarOrcamentoMobile(${o.id})" class="p-2 bg-blue-100 rounded-full"><i data-lucide="edit-3" class="w-4 h-4 text-blue-600"></i></button>
          <button onclick="excluirOrcamentoMobile(${o.id})" class="p-2 bg-red-100 rounded-full"><i data-lucide="trash-2" class="w-4 h-4 text-red-600"></i></button>
        </div>
      </div>
      <div class="flex gap-2 mt-3">
        <button onclick="aprovarOrcamentoMobile(${o.id})" class="flex-1 bg-green-100 text-green-700 py-2 rounded-full text-sm font-bold">Aprovar</button>
        <button onclick="abrirPlanoCorteMobile(${o.id})" class="flex-1 bg-rv-dark text-white py-2 rounded-full text-sm font-bold">Plano Corte</button>
        <button onclick="abrirDetalhamentoMobile(${o.id})" class="flex-1 bg-indigo-100 text-indigo-700 py-2 rounded-full text-sm font-bold">Materiais</button>
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

// Abrir modal para novo orçamento / editar
function abrirNovoOrcamentoMobile() {
  LAJE_MOBILE.comodosTemp = [];
  LAJE_MOBILE.editandoId = null;
  document.getElementById('laje-cliente-nome').value = '';
  renderComodosTempMobile();
  document.getElementById('modal-laje-orcamento').classList.add('show');
}

async function editarOrcamentoMobile(id) {
  const orc = LAJE_MOBILE.orcamentosList.find(o => o.id == id);
  if (!orc) return;
  LAJE_MOBILE.editandoId = id;
  document.getElementById('laje-cliente-nome').value = orc.cliente_nome;
  const itens = await listarItensOrcamento(id);
  LAJE_MOBILE.comodosTemp = itens.map(i => ({
    nome: i.comodo,
    vaoMenor: Number(i.vao_menor),
    vaoMaior: Number(i.vao_maior),
    tipo: i.tipo_enchimento,
    altura: i.altura,
    larguraViga: Number(i.largura_viga) || 0,
    qtdVigotas: Number(i.qtd_vigotas),
    tamVigota: Number(i.tamanho_vigota),
    epsLinear: Number(i.metragem_eps),
    area: Number(i.area),
    valorEstimado: Number(i.valor_estimado)
  }));
  renderComodosTempMobile();
  document.getElementById('modal-laje-orcamento').classList.add('show');
}

function renderComodosTempMobile() {
  const container = document.getElementById('laje-comodos-mobile-list');
  if (!container) return;
  if (LAJE_MOBILE.comodosTemp.length === 0) {
    container.innerHTML = '<div class="text-center text-slate-400 p-4">Nenhum cômodo adicionado.</div>';
    return;
  }
  container.innerHTML = LAJE_MOBILE.comodosTemp.map((c, idx) => `
    <div class="bg-slate-50 rounded-xl p-3 mb-2">
      <div class="flex justify-between">
        <span class="font-bold">${c.nome}</span>
        <span class="text-green-700 font-bold">${formatMoney(c.valorEstimado)}</span>
      </div>
      <div class="text-xs text-slate-500 grid grid-cols-2 gap-1 mt-1">
        <span>Vãos: ${c.vaoMenor.toFixed(2)} x ${c.vaoMaior.toFixed(2)} m</span>
        <span>Vigotas: ${c.qtdVigotas} x ${c.tamVigota.toFixed(2)}m</span>
        <span>Área: ${c.area.toFixed(2)} m²</span>
        <span>Ench: ${c.tipo === 'EPS' ? 'Isopor' : 'Lajota'}</span>
      </div>
      <div class="flex gap-2 mt-2">
        <button onclick="editarComodoMobile(${idx})" class="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">Editar</button>
        <button onclick="removerComodoMobile(${idx})" class="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full">Remover</button>
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

function abrirModalComodoMobile(editandoIndex = null) {
  LAJE_MOBILE.editandoComodoIndex = editandoIndex;
  if (editandoIndex !== null) {
    const c = LAJE_MOBILE.comodosTemp[editandoIndex];
    document.getElementById('laje-comodo-nome').value = c.nome;
    document.getElementById('laje-vao-menor').value = c.vaoMenor;
    document.getElementById('laje-vao-maior').value = c.vaoMaior;
    document.getElementById('laje-tipo-enchimento').value = c.tipo;
    document.getElementById('laje-altura').value = c.altura;
    document.getElementById('laje-largura-viga').value = c.larguraViga;
  } else {
    document.getElementById('laje-comodo-nome').value = '';
    document.getElementById('laje-vao-menor').value = '';
    document.getElementById('laje-vao-maior').value = '';
    document.getElementById('laje-tipo-enchimento').value = 'EPS';
    document.getElementById('laje-altura').value = '8';
    document.getElementById('laje-largura-viga').value = '0';
  }
  document.getElementById('modal-laje-comodo').classList.add('show');
}

function salvarComodoMobile() {
  const nome = document.getElementById('laje-comodo-nome').value.trim();
  const vm = document.getElementById('laje-vao-menor').value;
  const vM = document.getElementById('laje-vao-maior').value;
  const tipo = document.getElementById('laje-tipo-enchimento').value;
  const altura = document.getElementById('laje-altura').value;
  const larguraViga = document.getElementById('laje-largura-viga').value;
  const res = calcularLaje(vm, vM, tipo, altura, larguraViga);
  if (!nome || !res) return showToast('Preencha nome e vãos válidos', true);
  const novoComodo = { nome, ...res };
  if (LAJE_MOBILE.editandoComodoIndex !== null) {
    LAJE_MOBILE.comodosTemp[LAJE_MOBILE.editandoComodoIndex] = novoComodo;
  } else {
    LAJE_MOBILE.comodosTemp.push(novoComodo);
  }
  fecharModalComodoMobile();
  renderComodosTempMobile();
}

function fecharModalComodoMobile() {
  document.getElementById('modal-laje-comodo').classList.remove('show');
  LAJE_MOBILE.editandoComodoIndex = null;
}

function removerComodoMobile(idx) {
  LAJE_MOBILE.comodosTemp.splice(idx, 1);
  renderComodosTempMobile();
}

async function salvarOrcamentoMobile() {
  const cliente = document.getElementById('laje-cliente-nome').value.trim();
  if (!cliente) return showToast('Informe o cliente', true);
  if (LAJE_MOBILE.comodosTemp.length === 0) return showToast('Adicione pelo menos um cômodo', true);
  showLoading(true);
  try {
    await salvarOrcamentoLaje(cliente, LAJE_MOBILE.comodosTemp, LAJE_MOBILE.editandoId);
    showToast('Orçamento salvo!');
    document.getElementById('modal-laje-orcamento').classList.remove('show');
    await carregarOrcamentosMobile();
    renderLajeOrcamentos();
  } catch(e) { showToast(e.message, true); }
  showLoading(false);
}

async function aprovarOrcamentoMobile(id) {
  if (!confirm('Aprovar este orçamento?')) return;
  showLoading(true);
  try {
    await alterarStatusOrcamento(id, 'APROVADO');
    showToast('Orçamento aprovado!');
    await carregarOrcamentosMobile();
    renderLajeOrcamentos();
  } catch(e) { showToast(e.message, true); }
  showLoading(false);
}

async function excluirOrcamentoMobile(id) {
  if (!confirm('Excluir permanentemente?')) return;
  showLoading(true);
  try {
    await excluirOrcamentoCompleto(id);
    showToast('Excluído!');
    await carregarOrcamentosMobile();
    renderLajeOrcamentos();
  } catch(e) { showToast(e.message, true); }
  showLoading(false);
}

// Plano de Corte
async function abrirPlanoCorteMobile(idOrc) {
  const itens = await listarItensOrcamento(idOrc);
  if (!itens.length) return showToast('Nenhum item', true);
  const tamanhos = [];
  itens.forEach(i => {
    for (let j = 0; j < Number(i.qtd_vigotas); j++) tamanhos.push(Number(i.tamanho_vigota));
  });
  const barra12m = obterConfig('comprimento_barra_trelica', 12.0);
  let barras;
  switch (LAJE_MOBILE.algoritmoCorte) {
    case 'BFD': barras = binPackingBFD(tamanhos, barra12m); break;
    case 'RBF': barras = binPackingRBF(tamanhos, barra12m, 100); break;
    case 'DP': barras = binPackingDP(tamanhos, barra12m); break;
    default: barras = binPackingFFD(tamanhos, barra12m);
  }
  const totalSobra = barras.reduce((s, b) => s + b.sobra, 0);
  const perda = (totalSobra / (barras.length * barra12m)) * 100;
  const container = document.getElementById('laje-corte-resultado-mobile');
  container.innerHTML = `
    <div class="bg-white rounded-2xl p-4">
      <h3 class="font-bold text-lg">Plano de Corte</h3>
      <p class="text-sm">Total de barras: ${barras.length} | Perda: ${perda.toFixed(1)}%</p>
      <div class="mt-3 space-y-2">
        ${barras.map((b, idx) => `
          <div class="border-b pb-2">
            <div class="flex justify-between"><span class="font-mono">Barra ${idx+1}</span><span class="text-red-600">Sobra: ${b.sobra.toFixed(2)}m</span></div>
            <div class="text-xs">Cortes: ${b.cortes.map(c => c.toFixed(2)+'m').join(' + ')}</div>
          </div>
        `).join('')}
      </div>
      <button onclick="fecharModalPlanoCorte()" class="mt-4 w-full bg-slate-800 text-white py-3 rounded-full">Fechar</button>
    </div>
  `;
  document.getElementById('modal-plano-corte').classList.add('show');
}

function fecharModalPlanoCorte() {
  document.getElementById('modal-plano-corte').classList.remove('show');
}

// Detalhamento de materiais
async function abrirDetalhamentoMobile(idOrc) {
  showLoading(true);
  try {
    await carregarProdutosMobile();
    const configCustos = await carregarConfiguracoesCusto();
    Object.assign(CONFIG_LAJE, configCustos);
    const { linhas, custoTotal, areaTotal } = await calcularDetalhamentoMateriais(idOrc, LAJE_PRODUTOS_CACHE, CONFIG_LAJE);
    const html = `
      <div class="bg-white rounded-2xl p-4 max-h-[80vh] overflow-y-auto">
        <h3 class="font-bold text-lg">Detalhamento de Materiais</h3>
        <div class="mt-2 space-y-2">
          ${linhas.map(l => `
            <div class="flex justify-between text-sm border-b pb-1">
              <span class="font-medium">${l.desc}</span>
              <span class="text-right">${formatMoney(l.total)}</span>
            </div>
          `).join('')}
        </div>
        <div class="mt-4 pt-2 border-t">
          <div class="flex justify-between font-bold">
            <span>Custo Total</span>
            <span>${formatMoney(custoTotal)}</span>
          </div>
          <div class="flex justify-between mt-2">
            <span>Área (m²)</span>
            <span>${areaTotal.toFixed(2)}</span>
          </div>
          <div class="mt-3">
            <label class="text-sm font-bold">Margem de Lucro (%)</label>
            <input type="number" id="detalhe-margem-mobile" value="40" class="w-full border rounded-xl p-3 mt-1">
          </div>
          <div class="mt-2">
            <label class="flex items-center gap-2">
              <input type="checkbox" id="detalhe-frete-mobile" checked> <span class="text-sm">Acrescentar frete (6%)</span>
            </label>
          </div>
          <div class="mt-3 bg-orange-50 p-3 rounded-xl">
            <div class="flex justify-between font-bold text-lg">
              <span>Preço de Venda</span>
              <span id="preco-venda-mobile">${formatMoney(custoTotal * 1.4 * 1.06)}</span>
            </div>
            <div class="text-sm text-slate-500" id="preco-m2-mobile">${formatMoney((custoTotal * 1.4 * 1.06) / areaTotal)} / m²</div>
          </div>
          <button onclick="enviarParaOrcamentoMobile(${idOrc}, ${custoTotal}, ${areaTotal})" class="mt-4 w-full bg-green-600 text-white py-3 rounded-full font-bold">Gerar Orçamento de Venda</button>
        </div>
        <button onclick="fecharModalDetalhamento()" class="mt-4 w-full bg-slate-200 py-3 rounded-full">Fechar</button>
      </div>
    `;
    document.getElementById('modal-detalhamento').innerHTML = html;
    document.getElementById('modal-detalhamento').classList.add('show');
    const margemInput = document.getElementById('detalhe-margem-mobile');
    const freteCheck = document.getElementById('detalhe-frete-mobile');
    const updatePreco = () => {
      const margem = parseFloat(margemInput.value) || 0;
      let preco = custoTotal * (1 + margem / 100);
      if (freteCheck.checked) preco *= 1.06;
      document.getElementById('preco-venda-mobile').innerText = formatMoney(preco);
      document.getElementById('preco-m2-mobile').innerText = `${formatMoney(preco / areaTotal)} / m²`;
      window.precoVendaAtual = preco;
    };
    margemInput.addEventListener('input', updatePreco);
    freteCheck.addEventListener('change', updatePreco);
    updatePreco();
  } catch(e) { showToast(e.message, true); }
  showLoading(false);
}

function fecharModalDetalhamento() {
  document.getElementById('modal-detalhamento').classList.remove('show');
}

async function enviarParaOrcamentoMobile(idOrc, custoTotal, areaTotal) {
  const precoVenda = window.precoVendaAtual || (custoTotal * 1.4 * 1.06);
  const orc = LAJE_MOBILE.orcamentosList.find(o => o.id == idOrc);
  if (!orc) return showToast('Orçamento não encontrado', true);
  const produtoId = 1138; // ID do produto genérico
  const { data: prod } = await sb.from('produtos').select('*').eq('id', produtoId).single();
  if (!prod) return showToast('Produto base não encontrado', true);
  const novoId = getNextId(STATE.logs);
  const logEntry = {
    id: novoId,
    tipo: 'orcamento',
    produto_nome: prod.nome,
    quantidade: areaTotal,
    data: new Date().toISOString(),
    observacao: `Orçamento gerado da laje #${idOrc}`,
    valor_total: precoVenda,
    cliente_nome: orc.cliente_nome,
    forma_pagamento: 'A Combinar',
    status: 'ABERTO',
    desconto: 0,
    status_financeiro: '$',
    endereco_entrega: ''
  };
  const { error } = await sb.from('logs').insert(logEntry);
  if (error) return showToast('Erro: ' + error.message, true);
  showToast('Orçamento de venda criado!');
  fecharModalDetalhamento();
  // Recarregar lista de orçamentos do sistema principal (se necessário)
  if (typeof loadData === 'function') loadData();
}

// Controle de entregas
async function abrirEntregasMobile(idOrc) {
  showLoading(true);
  const entregas = await listarEntregasLaje(idOrc);
  const itens = await listarItensOrcamento(idOrc);
  const totalPorTamanho = {};
  itens.forEach(i => {
    const t = Number(i.tamanho_vigota).toFixed(2);
    totalPorTamanho[t] = (totalPorTamanho[t] || 0) + Number(i.qtd_vigotas);
  });
  let entreguePorTamanho = {};
  let totalPecasEntregues = 0;
  entregas.forEach(e => {
    (e.vigotas_entregues || []).forEach(v => {
      const t = Number(v.tamanho).toFixed(2);
      entreguePorTamanho[t] = (entreguePorTamanho[t] || 0) + Number(v.qtd);
      totalPecasEntregues += Number(v.qtd);
    });
  });
  const tbody = document.getElementById('laje-entrega-table-mobile');
  const tamanhos = Object.keys(totalPorTamanho).sort((a,b) => b - a);
  let html = tamanhos.map(t => {
    const total = totalPorTamanho[t];
    const entregue = entreguePorTamanho[t] || 0;
    const pendente = total - entregue;
    return `<div class="flex justify-between text-sm py-1 border-b"><span>${t} m</span><span>Total: ${total}</span><span class="text-green-600">Ent: ${entregue}</span><span class="text-orange-600">Pend: ${pendente}</span></div>`;
  }).join('');
  html += `<div class="flex justify-between font-bold pt-2"><span>Totais</span><span>${tamanhos.reduce((s,t)=>s+totalPorTamanho[t],0)}</span><span class="text-green-600">${totalPecasEntregues}</span><span class="text-orange-600">${tamanhos.reduce((s,t)=>s+totalPorTamanho[t]-(entreguePorTamanho[t]||0),0)}</span></div>`;
  document.getElementById('laje-entrega-content').innerHTML = html;
  // Modal para registrar nova entrega
  document.getElementById('modal-laje-entregas').classList.add('show');
  // Prepara os inputs
  const container = document.getElementById('entrega-vigotas-container-mobile');
  container.innerHTML = tamanhos.map(t => `
    <div class="flex items-center gap-2 mb-2">
      <span class="text-sm w-16">${t} m</span>
      <input type="number" id="ent-qtd-${t.replace('.','_')}" value="0" min="0" max="${totalPorTamanho[t] - (entreguePorTamanho[t]||0)}" class="flex-1 p-2 border rounded-xl text-center">
    </div>
  `).join('');
  document.getElementById('entrega-data').value = getHojeLocal();
  document.getElementById('entrega-obs').value = '';
  window.entregaIdOrc = idOrc;
}

function fecharModalEntregas() {
  document.getElementById('modal-laje-entregas').classList.remove('show');
}

async function registrarEntregaMobile() {
  const idOrc = window.entregaIdOrc;
  const data = document.getElementById('entrega-data').value;
  const obs = document.getElementById('entrega-obs').value;
  const vigotas = [];
  const inputs = document.querySelectorAll('#entrega-vigotas-container-mobile input');
  inputs.forEach(input => {
    const qtd = parseInt(input.value) || 0;
    if (qtd > 0) {
      const tamanho = parseFloat(input.id.replace('ent-qtd-', '').replace('_', '.'));
      vigotas.push({ tamanho, qtd });
    }
  });
  if (vigotas.length === 0) return showToast('Informe pelo menos uma vigota', true);
  showLoading(true);
  try {
    await registrarEntregaLaje(idOrc, data, vigotas, obs);
    showToast('Entrega registrada!');
    fecharModalEntregas();
    // Recarregar a lista de orçamentos (opcional)
    await carregarOrcamentosMobile();
    renderLajeOrcamentos();
  } catch(e) { showToast(e.message, true); }
  showLoading(false);
}

// Navegação entre abas do módulo Lajes
function switchLajeTabMobile(tab) {
  LAJE_MOBILE.tabAtiva = tab;
  document.querySelectorAll('.laje-tab-mobile').forEach(el => el.classList.add('hidden'));
  document.getElementById(`laje-tab-${tab}`).classList.remove('hidden');
  if (tab === 'orcamentos') renderLajeOrcamentos();
  else if (tab === 'corte') renderLajeCorteSelect();
  else if (tab === 'detalhamento') renderLajeDetalhamentoSelect();
  else if (tab === 'entregas') renderLajeEntregasSelect();
}

function renderLajeCorteSelect() {
  const sel = document.getElementById('laje-corte-select-mobile');
  sel.innerHTML = '<option value="">Selecione</option>' + LAJE_MOBILE.orcamentosList.filter(o => o.status === 'APROVADO').map(o => `<option value="${o.id}">#${o.id} - ${o.cliente_nome}</option>`).join('');
}
function renderLajeDetalhamentoSelect() {
  const sel = document.getElementById('laje-detalhamento-select-mobile');
  sel.innerHTML = '<option value="">Selecione</option>' + LAJE_MOBILE.orcamentosList.map(o => `<option value="${o.id}">#${o.id} - ${o.cliente_nome}</option>`).join('');
}
function renderLajeEntregasSelect() {
  const sel = document.getElementById('laje-entregas-select-mobile');
  sel.innerHTML = '<option value="">Selecione</option>' + LAJE_MOBILE.orcamentosList.filter(o => o.status === 'APROVADO').map(o => `<option value="${o.id}">#${o.id} - ${o.cliente_nome}</option>`).join('');
}

// Eventos de botão
window.abrirNovoOrcamentoMobile = abrirNovoOrcamentoMobile;
window.editarOrcamentoMobile = editarOrcamentoMobile;
window.excluirOrcamentoMobile = excluirOrcamentoMobile;
window.aprovarOrcamentoMobile = aprovarOrcamentoMobile;
window.abrirPlanoCorteMobile = abrirPlanoCorteMobile;
window.abrirDetalhamentoMobile = abrirDetalhamentoMobile;
window.abrirEntregasMobile = abrirEntregasMobile;
window.fecharModalPlanoCorte = fecharModalPlanoCorte;
window.fecharModalDetalhamento = fecharModalDetalhamento;
window.fecharModalEntregas = fecharModalEntregas;
window.registrarEntregaMobile = registrarEntregaMobile;
window.switchLajeTabMobile = switchLajeTabMobile;
window.salvarOrcamentoMobile = salvarOrcamentoMobile;
window.abrirModalComodoMobile = abrirModalComodoMobile;
window.salvarComodoMobile = salvarComodoMobile;
window.fecharModalComodoMobile = fecharModalComodoMobile;
window.removerComodoMobile = removerComodoMobile;
window.editarComodoMobile = (idx) => abrirModalComodoMobile(idx);
