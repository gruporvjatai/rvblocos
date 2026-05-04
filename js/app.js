// ====== CONFIGURAÇÃO DO SUPABASE (RV BLOCOS) ======
const supabaseUrl = 'https://irbgmmoxiedhcbfkanmu.supabase.co';
const supabaseKey = 'sb_publishable_bhGr9DvGGg-gYWXsd_rf3w_CAZdF7n9';
const sb = supabase.createClient(supabaseUrl, supabaseKey);

// ====== ESTADO GLOBAL ======
let STATE = {
    products: [],
    clients: [],
    logs: [],
    quotes: [],
    expenses: [],
    users: [],
    custoMaterialB10: 0,
    configLaje: {}
};

// ====== INICIALIZAÇÃO ======
window.onload = function() {
    showLoading(true);
    loadData();
};

// ====== CARREGAMENTO DE DADOS ======
async function fetchAllRecords(table) {
    let allRecords = [];
    let from = 0;
    const step = 1000;
    while (true) {
        const { data, error } = await sb.from(table).select('*').range(from, from + step - 1);
        if (error) throw error;
        if (data && data.length > 0) {
            allRecords.push(...data);
            if (data.length < step) break;
            else from += step;
        } else break;
    }
    return { data: allRecords };
}

async function loadData() {
    try {
        const [resProd, resCli, resLog, resDesp, resConf, resUsr] = await Promise.all([
            fetchAllRecords('produtos'),
            fetchAllRecords('clientes'),
            fetchAllRecords('logs'),
            fetchAllRecords('despesas'),
            sb.from('configuracoes').select('*').eq('chave', 'custo_material_b10').maybeSingle(),
            sb.from('usuarios').select('*')
        ]);

        // Produtos
        STATE.products = (resProd.data || []).map(p => ({
            id: p.id, name: p.nome, category: p.categoria, price: Number(p.preco),
            stock: Number(p.estoque_fisico), committed: Number(p.estoque_comprometido),
            available: Number(p.estoque_fisico) - Number(p.estoque_comprometido)
        }));

        // Clientes
        STATE.clients = (resCli.data || []).map(c => ({
            id: c.id, name: c.nome, phone: c.telefone, doc: c.documento, address: c.endereco
        }));

        // Usuários
        STATE.users = (resUsr.data || []).map(u => ({
            id: u.id, name: u.nome, login: u.email, type: u.nivel_acesso, status: u.status
        }));

        // Logs e Orçamentos
        STATE.logs = [];
        const quotesMap = {};
        (resLog.data || []).forEach(l => {
            if (l.tipo === 'orcamento') {
                const qId = String(l.id);
                if (!quotesMap[qId]) {
                    quotesMap[qId] = {
                        id: qId, date: l.data, clientName: l.cliente_nome, items: [], total: 0,
                        status: l.status || 'ABERTO', discount: Number(l.desconto), discountType: l.status_financeiro || '$',
                        paymentMethod: l.forma_pagamento, deliveryAddress: l.endereco_entrega, observacao: l.observacao
                    };
                }
                const unitPrice = Number(l.quantidade) > 0 ? Number(l.valor_total) / Number(l.quantidade) : 0;
                quotesMap[qId].items.push({ name: l.produto_nome, qty: Number(l.quantidade), price: unitPrice, total: Number(l.valor_total), uid: l.uid });
                quotesMap[qId].total += Number(l.valor_total);
            } else {
                STATE.logs.push({
                    uid: l.uid, id: l.id, type: l.tipo, productName: l.produto_nome, quantity: Number(l.quantidade),
                    date: l.data, note: l.observacao, totalValue: Number(l.valor_total),
                    clientName: l.cliente_nome, paymentMethod: l.forma_pagamento, status: l.status,
                    deliveryStatus: l.status_entrega, deliveredQty: Number(l.qtd_entregue),
                    discount: Number(l.desconto), finStatus: l.status_financeiro, dueDate: l.vencimento,
                    paidValue: Number(l.valor_pago), deliveryAddress: l.endereco_entrega
                });
            }
        });
        STATE.quotes = Object.values(quotesMap).map(q => {
            q.itemsText = q.items.map(i => `${i.name} (x${i.qty})`).join(', ');
            return q;
        });

        // Despesas (já com campo status – se não existir, assume PENDENTE)
        STATE.expenses = (resDesp.data || []).map(e => ({
            id: e.id, item: e.item, quantity: Number(e.quantidade), unit: e.unidade,
            cost: Number(e.custo), date: e.data, note: e.observacao,
            status: e.status || 'PENDENTE'   // fallback para base antiga
        }));

        // Configurações
        STATE.custoMaterialB10 = resConf.data ? Number(resConf.data.valor) : 0;
        const configs = (await sb.from('configuracoes').select('*')).data || [];
        STATE.configLaje = {};
        configs.forEach(c => { STATE.configLaje[c.chave] = c.valor; });

        // Ação final
        onDataLoaded();
    } catch (err) {
        showLoading(false);
        showToast("Erro ao conectar no banco: " + err.message, true);
        console.error(err);
    }
}

function onDataLoaded() {
    applyRBAC();
    if (!document.querySelector('.active-section')) {
        navigate('pos');
    } else {
        const current = document.querySelector('.active-section').id.replace('view-', '');
        navigate(current);
    }
    showLoading(false);
    updateClientSelects();
}

function applyRBAC() {
    try {
        const userJson = localStorage.getItem('rv_user');
        if (userJson) {
            const user = JSON.parse(userJson);
            if (user.tipo === 'producao') {
                const navFin = document.getElementById('nav-fin');
                const navUsers = document.getElementById('nav-users');
                if (navFin) navFin.style.display = 'none';
                if (navUsers) navUsers.style.display = 'none';
            }
        }
    } catch (e) { console.error("RBAC error", e); }
}

function fazerLogoff() {
    localStorage.removeItem('rv_user');
    window.location.replace('index.html');
}

// ====== NAVEGAÇÃO ======
function navigate(viewId) {
    try {
        const u = JSON.parse(localStorage.getItem('rv_user'));
        if (u && u.tipo === 'producao' && (viewId === 'fin' || viewId === 'users')) {
            return showToast("Acesso restrito.", true);
        }
    } catch (e) {}

    // Esconde todas as views
    document.querySelectorAll('div[id^="view-"]').forEach(el => {
        el.classList.add('hidden-section');
        el.classList.remove('active-section');
    });
    const target = document.getElementById('view-' + viewId);
    if (target) {
        target.classList.remove('hidden-section');
        target.classList.add('active-section');
    }

    // Atualiza menu
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('bg-orange-600', 'text-white', 'shadow-lg'));
    const activeBtn = document.getElementById('nav-' + viewId);
    if (activeBtn) activeBtn.classList.add('bg-orange-600', 'text-white', 'shadow-lg');

    // Chama renderização específica
    if (viewId === 'dash') renderDashboard();
    if (viewId === 'pos') { renderPOSProducts(); renderCart(); }
    if (viewId === 'quotes') renderQuotesList();
    if (viewId === 'expedition') renderExpedition();
    if (viewId === 'fin') {
        const range = getCurrentMonthRange();
        if (!document.getElementById('rec-start').value) document.getElementById('rec-start').value = range.start;
        if (!document.getElementById('rec-end').value) document.getElementById('rec-end').value = range.end;
        if (!document.getElementById('exp-start').value) document.getElementById('exp-start').value = range.start;
        if (!document.getElementById('exp-end').value) document.getElementById('exp-end').value = range.end;
        renderFinance();
    }
    if (viewId === 'reports') {}
    if (viewId === 'equipe') { if (typeof renderEquipe === 'function') renderEquipe(); }
    if (viewId === 'clients') renderClients();
    if (viewId === 'users') renderUsers();
    if (viewId === 'prod') renderProducts();
    if (viewId === 'production') renderProductionSelect();
    if (viewId === 'gerencial') { if (typeof renderGerencial === 'function') renderGerencial(); }
    if (viewId === 'lajes') { switchLajeTab(LAJE.tabAtiva || 'orcamento'); carregarOrcamentosLaje(); }

    lucide.createIcons();
}
