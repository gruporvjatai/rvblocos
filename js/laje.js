// =================================================================
// MÓDULO LAJES - RV BLOCOS
// =================================================================

let LAJE = {
    tabAtiva: 'orcamento',
    comodos: [],
    orcamentos: [],
    produtos: [],
    algoritmoCorte: 'FFD'
};

// =================================================================
// RENDER PRINCIPAL
// =================================================================
function renderLajes() {
    const container = document.getElementById('view-lajes');
    if (!container) return;

    container.innerHTML = `
    <h2 class="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <i data-lucide="layers"></i> Módulo Lajes
    </h2>

    <!-- Abas -->
    <div class="flex gap-2 mb-6 border-b border-slate-200">
        <button onclick="switchLajeTab('orcamento')" id="tab-orcamento-btn" class="px-4 py-2 rounded-t-lg font-bold text-sm bg-orange-600 text-white shadow">Vendas / Orçamento</button>
        <button onclick="switchLajeTab('corte')" id="tab-corte-btn" class="px-4 py-2 rounded-t-lg font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200">Fábrica / Plano de Corte</button>
        <button onclick="switchLajeTab('detalhamento')" id="tab-detalhamento-btn" class="px-4 py-2 rounded-t-lg font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200">Detalhamento</button>
        <button onclick="switchLajeTab('itens')" id="tab-itens-btn" class="px-4 py-2 rounded-t-lg font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200">Itens Fabricação</button>
    </div>

    <!-- Conteúdo das Abas -->
    <div id="laje-tab-orcamento"></div>
    <div id="laje-tab-corte" class="hidden"></div>
    <div id="laje-tab-detalhamento" class="hidden"></div>
    <div id="laje-tab-itens" class="hidden"></div>
    `;

    switchLajeTab(LAJE.tabAtiva);
    carregarOrcamentosLaje();
    lucide.createIcons();
}

// =================================================================
// TROCA DE ABAS
// =================================================================
function switchLajeTab(tab) {
    LAJE.tabAtiva = tab;
    ['orcamento', 'corte', 'detalhamento', 'itens'].forEach(t => {
        const el = document.getElementById(`laje-tab-${t}`);
        const btn = document.getElementById(`tab-${t}-btn`);
        if (el && btn) {
            el.classList.toggle('hidden', t !== tab);
            btn.classList.toggle('bg-orange-600', t === tab);
            btn.classList.toggle('text-white', t === tab);
            btn.classList.toggle('bg-slate-100', t !== tab);
            btn.classList.toggle('text-slate-600', t !== tab);
        }
    });

    if (tab === 'orcamento') renderLajeOrcamento();
    else if (tab === 'corte') renderLajeCorte();
    else if (tab === 'detalhamento') renderLajeDetalhamento();
    else if (tab === 'itens') renderLajeItens();
}

// =================================================================
// ABA ORÇAMENTO
// =================================================================
function renderLajeOrcamento() {
    const el = document.getElementById('laje-tab-orcamento');
    if (!el) return;

    el.innerHTML = `
    <div class="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h3 class="font-bold text-slate-700 flex items-center gap-2 text-lg"><i data-lucide="file-text"></i> Novo Orçamento</h3>
        <div class="flex gap-2">
            <input type="text" id="laje-cliente-nome" placeholder="Nome do cliente *" class="p-2 border rounded-lg text-sm w-48 md:w-64">
            <button onclick="abrirModalComodo()" class="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-700 flex items-center gap-2"><i data-lucide="plus"></i> Adicionar Cômodo</button>
        </div>
    </div>
    <div class="bg-white rounded-xl border shadow-sm p-6 mb-6">
        <div class="flex justify-between items-center mb-4">
            <h4 class="font-bold text-slate-700 flex gap-2 items-center"><i data-lucide="list"></i> Cômodos (<span id="laje-comodos-count">${LAJE.comodos.length}</span>)</h4>
            <button onclick="limparComodosLaje()" class="text-red-500 text-sm font-bold hover:underline">Limpar tudo</button>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="bg-slate-50 text-slate-600">
                    <tr><th class="p-3">Cômodo</th><th class="p-3">Vão Menor</th><th class="p-3">Vão Maior</th><th class="p-3">Enchimento</th><th class="p-3">Altura</th><th class="p-3">Vigotas</th><th class="p-3">Tam. Vigota</th><th class="p-3">EPS (m)</th><th class="p-3">Área (m²)</th><th class="p-3"></th></tr>
                </thead>
                <tbody id="laje-comodos-tbody"></tbody>
            </table>
        </div>
        <div class="mt-4 flex justify-end gap-2">
            <button onclick="salvarOrcamentoLaje()" class="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700"><i data-lucide="save"></i> Salvar Orçamento</button>
        </div>
    </div>
    <div class="bg-white rounded-xl border shadow-sm p-6">
        <h3 class="font-bold text-slate-700 mb-4 flex gap-2 items-center"><i data-lucide="history"></i> Orçamentos Salvos</h3>
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="bg-slate-50 text-slate-600">
                    <tr><th class="p-3">ID</th><th class="p-3">Cliente</th><th class="p-3">Data</th><th class="p-3">Cômodos</th><th class="p-3">Área Total</th><th class="p-3">Valor Est.</th><th class="p-3">Status</th><th class="p-3">Ações</th></tr>
                </thead>
                <tbody id="laje-orcamentos-tbody"></tbody>
            </table>
        </div>
    </div>
    `;

    renderComodosLaje();
    carregarOrcamentosLaje();
    lucide.createIcons();
}

function renderComodosLaje() {
    const tbody = document.getElementById('laje-comodos-tbody');
    const count = document.getElementById('laje-comodos-count');
    if (!tbody) return;
    if (count) count.innerText = LAJE.comodos.length;

    if (LAJE.comodos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="p-6 text-center text-slate-400">Nenhum cômodo adicionado.</td></tr>';
        return;
    }

    tbody.innerHTML = LAJE.comodos.map((c, i) => `
        <tr>
            <td class="p-3 font-medium">${c.nome}</td>
            <td class="p-3">${c.vaoMenor}</td>
            <td class="p-3">${c.vaoMaior}</td>
            <td class="p-3">${c.enchimento === 'EPS' ? 'Isopor' : 'Lajota'}</td>
            <td class="p-3">${c.altura} cm</td>
            <td class="p-3">${c.vigotas}</td>
            <td class="p-3">${c.tamanhoVigota}</td>
            <td class="p-3">${c.epsLinear}</td>
            <td class="p-3">${c.area}</td>
            <td class="p-3"><button onclick="removerComodoLaje(${i})" class="text-red-500"><i data-lucide="trash-2" width="16"></i></button></td>
        </tr>
    `).join('');

    lucide.createIcons();
}

// =================================================================
// ABA CORTE (placeholder funcional)
// =================================================================
function renderLajeCorte() {
    const el = document.getElementById('laje-tab-corte');
    if (!el) return;
    el.innerHTML = `<p class="text-slate-500 p-6">Selecione um orçamento na aba Vendas/Orçamento primeiro.</p>`;
}

// =================================================================
// ABA DETALHAMENTO
// =================================================================
function renderLajeDetalhamento() {
    const el = document.getElementById('laje-tab-detalhamento');
    if (!el) return;
    el.innerHTML = `<p class="text-slate-500 p-6">Funcionalidade em desenvolvimento.</p>`;
}

// =================================================================
// ABA ITENS DE FABRICAÇÃO
// =================================================================
function renderLajeItens() {
    const el = document.getElementById('laje-tab-itens');
    if (!el) return;
    el.innerHTML = `
    <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-slate-700 flex items-center gap-2 text-lg"><i data-lucide="package"></i> Insumos e Materiais</h3>
        <button onclick="abrirModalProduto()" class="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2"><i data-lucide="plus"></i> Novo Produto</button>
    </div>
    <div class="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table class="w-full text-sm text-left">
            <thead class="bg-slate-50 text-slate-600"><tr><th class="p-3">Descrição</th><th class="p-3">Unidade</th><th class="p-3">Custo Unitário</th><th class="p-3">Tipo</th><th class="p-3 text-center">Ações</th></tr></thead>
            <tbody id="laje-produtos-tbody"><tr><td colspan="5" class="p-6 text-center text-slate-400">Nenhum produto cadastrado.</td></tr></tbody>
        </table>
    </div>`;
}

// =================================================================
// FUNÇÕES AUXILIARES (placeholders para manter compatibilidade)
// =================================================================
function abrirModalComodo() { /* ... manter lógica original do laje.js ... */ }
function fecharModalComodo() { document.getElementById('modal-comodo-laje').classList.add('hidden'); }
function calcularLajePreview() { /* ... */ }
function adicionarComodoLaje() { /* ... */ }
function removerComodoLaje(i) { LAJE.comodos.splice(i, 1); renderComodosLaje(); }
function limparComodosLaje() { LAJE.comodos = []; renderComodosLaje(); }
async function salvarOrcamentoLaje() { showToast("Orçamento salvo (placeholder)"); }
async function carregarOrcamentosLaje() { /* ... */ }
function gerarPlanoCorte() { /* ... */ }
function imprimirPlanoCorte() { /* ... */ }
function gerarDetalhamento() { /* ... */ }
function abrirModalProduto() { document.getElementById('modal-produto-laje').classList.remove('hidden'); }
function fecharModalProduto() { document.getElementById('modal-produto-laje').classList.add('hidden'); }
function salvarProdutoLaje() { /* ... */ }
