// ====== UTILITÁRIOS GLOBAIS ======

function formatMoney(val) {
    return parseFloat(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(d) {
    try {
        if (!d) return '-';
        const parts = d.split('T')[0].split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch (e) { return '-'; }
}

function getHojeLocalStr() {
    return new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
}

function getLocalISODate(dateObj) {
    return new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
}

function getCurrentMonthRange() {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return {
        start: getLocalISODate(primeiroDia),
        end: getLocalISODate(ultimoDia)
    };
}

function showLoading(show) {
    const el = document.getElementById('loading');
    if (el) el.style.display = show ? 'flex' : 'none';
}

function showToast(msg, isError) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = `fixed top-5 right-5 px-6 py-3 rounded-lg shadow-xl text-white font-medium z-50 ${isError ? 'bg-red-600' : 'bg-slate-800'}`;
    t.style.display = 'block';
    setTimeout(() => { t.style.display = 'none'; }, 3000);
}

function getNextId(...arrays) {
    let max = 0;
    for (const arr of arrays) {
        if (!arr) continue;
        for (const item of arr) {
            const val = parseInt(item.id);
            if (!isNaN(val) && val > max) max = val;
        }
    }
    return max + 1;
}
