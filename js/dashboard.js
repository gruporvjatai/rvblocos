// =================================================================
// MÓDULO DASHBOARD - RV BLOCOS
// =================================================================

function renderDashboard() {
    const container = document.getElementById('view-dash');
    if (!container) return;

    container.innerHTML = `
    <h2 class="text-2xl font-bold text-slate-800 mb-6">Visão Geral do Estoque</h2>
    <div id="dash-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"></div>
    `;

    const grid = document.getElementById('dash-grid');
    if (!grid) return;

    const sorted = (STATE.products || []).slice().sort((a, b) => Number(a.id) - Number(b.id));

    grid.innerHTML = sorted.map(p => {
        const percent = Math.min(100, (p.stock / 2000) * 100);
        return `
        <div class="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition">
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-bold text-slate-700 truncate">${p.name}</h4>
                <span class="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">${p.category || 'Geral'}</span>
            </div>
            <div class="flex items-end gap-2 mt-2">
                <div class="flex flex-col">
                    <span class="text-xs text-slate-400">Físico</span>
                    <span class="text-xl font-bold text-slate-700">${p.stock}</span>
                </div>
                <div class="flex flex-col items-end flex-1">
                    <span class="text-xs text-slate-400">Disponível</span>
                    <span class="text-xl font-bold ${p.available < 100 ? 'text-red-600' : 'text-blue-600'}">${p.available}</span>
                </div>
            </div>
            <div class="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
                <div class="h-full rounded-full ${p.available < 100 ? 'bg-red-500' : 'bg-blue-500'}" style="width:${percent}%"></div>
            </div>
        </div>`;
    }).join('');

    lucide.createIcons();
}
