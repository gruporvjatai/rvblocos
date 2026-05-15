// laje-core.js - Funções puras e acesso ao Supabase para o módulo Lajes

// Supabase já deve estar disponível via `sb` (global)

// Configurações padrão
const CONFIG_PADRAO = {
  inter_eixo_eps: 0.50,
  inter_eixo_lajota_ceramica: 0.43,
  comprimento_barra_trelica: 12.0,
  preco_m2_laje_eps_h8: 0,
  preco_m2_laje_eps_h12: 0,
  preco_m2_laje_eps_h16: 0,
  preco_m2_laje_eps_h20: 0,
  preco_m2_laje_lajota_ceramica_h8: 0,
  preco_m2_laje_lajota_ceramica_h12: 0,
  preco_m2_laje_lajota_ceramica_h16: 0,
  preco_m2_laje_lajota_ceramica_h20: 0
};

// Cache de configurações (será preenchido pelo mobile)
let CONFIG_LAJE = {};

async function carregarConfiguracoesLaje() {
  const { data } = await sb.from('configuracoes').select('*');
  if (data) {
    CONFIG_LAJE = {};
    data.forEach(c => { CONFIG_LAJE[c.chave] = c.valor; });
  }
}

function obterConfig(chave, padrao = null) {
  const val = CONFIG_LAJE[chave];
  if (val !== undefined && val !== null && val !== '') return Number(val);
  if (padrao !== null) return Number(padrao);
  return CONFIG_PADRAO[chave] !== undefined ? Number(CONFIG_PADRAO[chave]) : 0;
}

function calcularLaje(vaoMenor, vaoMaior, tipoEnchimento, altura, larguraViga = 0) {
  const vm = parseFloat(vaoMenor) || 0;
  const vM = parseFloat(vaoMaior) || 0;
  const lv = parseFloat(larguraViga) || 0;
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
    vaoMenor: vm,
    vaoMaior: vM,
    tipo: tipoEnchimento,
    altura: parseInt(altura),
    larguraViga: lv,
    qtdVigotas,
    tamVigota: parseFloat(tamVigota.toFixed(3)),
    epsLinear: parseFloat(epsLinear.toFixed(3)),
    area: parseFloat(area.toFixed(3)),
    precoM2: parseFloat(precoM2.toFixed(2)),
    valorEstimado: parseFloat(valorEstimado.toFixed(2))
  };
}

// Algoritmos de corte (FFD, BFD, DP, RBF) – cópia idêntica do laje.js
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

function binPackingRBF(tamanhos, comprimentoBarra = 12.0, iteracoes = 100) {
  if (tamanhos.length === 0) return [];
  let melhorBarras = null;
  let melhorSobraTotal = Infinity;
  let melhorNumBarras = Infinity;
  for (let iter = 0; iter < iteracoes; iter++) {
    const copia = [...tamanhos];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    const barras = binPackingBFD(copia, comprimentoBarra);
    const sobraTotal = barras.reduce((s, b) => s + b.sobra, 0);
    const numBarras = barras.length;
    if (numBarras < melhorNumBarras || (numBarras === melhorNumBarras && sobraTotal < melhorSobraTotal)) {
      melhorBarras = barras;
      melhorSobraTotal = sobraTotal;
      melhorNumBarras = numBarras;
    }
  }
  melhorBarras.sort((a, b) => a.sobra - b.sobra);
  return melhorBarras;
}

function binPackingDP(tamanhos, comprimentoBarra = 12.0, precisao = 100) {
  if (tamanhos.length === 0) return [];
  const escala = precisao;
  const C = Math.round(comprimentoBarra * escala);
  const itens = tamanhos.map(t => Math.round(t * escala));
  const contagem = new Map();
  itens.forEach(t => contagem.set(t, (contagem.get(t) || 0) + 1));
  const tipos = [...contagem.keys()].sort((a, b) => b - a);

  function knapsackBounded(disponivel) {
    const todosItens = [];
    for (const [tam, qtd] of disponivel) {
      for (let q = 0; q < qtd; q++) todosItens.push(tam);
    }
    const MAX_ITENS = 60;
    const itensUsados = todosItens.slice(0, MAX_ITENS);
    const m = itensUsados.length;
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

  const barras = [];
  const disponivel = new Map(contagem);
  let totalRestante = itens.length;
  while (totalRestante > 0) {
    const resultado = knapsackBounded(disponivel);
    if (resultado.pecas.length === 0) {
      for (const [tam, qtd] of disponivel) {
        if (qtd > 0) {
          resultado.pecas = [tam];
          resultado.usado = tam;
          break;
        }
      }
    }
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

// Funções de banco de dados
async function listarOrcamentosLaje() {
  const { data, error } = await sb.from('laje_orcamentos').select('*').order('id', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function listarItensOrcamento(idOrc) {
  const { data, error } = await sb.from('laje_itens_orcamento').select('*').eq('id_orcamento', idOrc);
  if (error) throw error;
  return data || [];
}

async function salvarOrcamentoLaje(cliente, comodos, editandoId = null) {
  const areaTotal = comodos.reduce((s, c) => s + c.area, 0);
  const valorTotal = comodos.reduce((s, c) => s + c.valorEstimado, 0);
  let idOrc;
  if (editandoId) {
    await sb.from('laje_orcamentos').update({
      cliente_nome: cliente,
      valor_total_estimado: valorTotal,
      area_total: areaTotal
    }).eq('id', editandoId);
    await sb.from('laje_itens_orcamento').delete().eq('id_orcamento', editandoId);
    idOrc = editandoId;
  } else {
    const { data, error } = await sb.from('laje_orcamentos').insert({
      cliente_nome: cliente,
      status: 'ABERTO',
      valor_total_estimado: valorTotal,
      area_total: areaTotal
    }).select('id').single();
    if (error) throw error;
    idOrc = data.id;
  }
  const itens = comodos.map(c => ({
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
  const { error } = await sb.from('laje_itens_orcamento').insert(itens);
  if (error) throw error;
  return idOrc;
}

async function alterarStatusOrcamento(id, novoStatus) {
  const { error } = await sb.from('laje_orcamentos').update({ status: novoStatus }).eq('id', id);
  if (error) throw error;
}

async function excluirOrcamentoCompleto(id) {
  await sb.from('laje_itens_orcamento').delete().eq('id_orcamento', id);
  await sb.from('laje_orcamentos').delete().eq('id', id);
}

async function listarProdutosLaje() {
  const { data, error } = await sb.from('laje_produtos').select('*').order('descricao');
  if (error) throw error;
  return data || [];
}

async function salvarProdutoLaje(produto) {
  if (produto.id) {
    const { error } = await sb.from('laje_produtos').update(produto).eq('id', produto.id);
    if (error) throw error;
  } else {
    const { error } = await sb.from('laje_produtos').insert(produto);
    if (error) throw error;
  }
}

async function excluirProdutoLaje(id) {
  const { error } = await sb.from('laje_produtos').delete().eq('id', id);
  if (error) throw error;
}

async function listarEntregasLaje(idOrc) {
  const { data, error } = await sb.from('laje_entregas').select('*').eq('id_orcamento', idOrc).order('data', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function registrarEntregaLaje(idOrc, data, vigotas, observacao = '') {
  const { error } = await sb.from('laje_entregas').insert({
    id_orcamento: idOrc,
    data: new Date(data).toISOString(),
    vigotas_entregues: vigotas,
    observacao
  });
  if (error) throw error;
}

async function carregarConfiguracoesCusto() {
  const { data, error } = await sb.from('configuracoes').select('*');
  if (error) throw error;
  const config = {};
  if (data) data.forEach(c => { config[c.chave] = c.valor; });
  return config;
}

// Funções de cálculo de custo detalhado (reaproveitadas do laje.js)
async function calcularDetalhamentoMateriais(idOrc, produtosList, config) {
  const itens = await listarItensOrcamento(idOrc);
  if (!itens.length) throw new Error('Orçamento sem itens');
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
  const alturaModa = [...alturas].sort((a, b) => b - a)[0] || 8;
  const barra12m = obterConfig('comprimento_barra_trelica', 12.0);
  let barras;
  const alg = LAJE_MOBILE_ALGORITMO || 'DP';
  if (alg === 'BFD') barras = binPackingBFD(tamanhosVigota, barra12m);
  else if (alg === 'RBF') barras = binPackingRBF(tamanhosVigota, barra12m, 100);
  else if (alg === 'DP') barras = binPackingDP(tamanhosVigota, barra12m);
  else barras = binPackingFFD(tamanhosVigota, barra12m);
  const numBarras = barras.length;

  // Concreto
  const espessuraCapeamento = 0.02;
  const larguraCapeamento = 0.12;
  const secaoCapeamento = larguraCapeamento * espessuraCapeamento;
  const volumeConcreto = metrosLinearesTrelica * secaoCapeamento;
  const volumePorTraco = 0.1152;
  const numTracos = Math.ceil(volumeConcreto / volumePorTraco);
  const metrosLinearesPorTraco = 48;
  const sacosCimento = Math.ceil(numTracos * 1.5);
  const areiaM3 = numTracos * (6.5 * 0.018);
  const britaM3 = numTracos * (5 * 0.018);
  const latasAreia = Math.round(areiaM3 / 0.018);
  const latasBrita = Math.round(britaM3 / 0.018);

  // Vergalhão
  const comprimentosVergalhao = [];
  for (const item of itens) {
    const tamVigota = Number(item.tamanho_vigota);
    const qtd = Number(item.qtd_vigotas);
    if (tamVigota >= 3.40) {
      for (let i = 0; i < qtd; i++) comprimentosVergalhao.push(tamVigota);
    }
  }
  let barrasVergalhao = 0, custoTotalVergalhao = 0;
  if (comprimentosVergalhao.length > 0) {
    const corteVerg = binPackingDP(comprimentosVergalhao, 12.0);
    barrasVergalhao = corteVerg.length;
    const custoBarra = produtosList.find(p => p.id === 26)?.custo_unitario || 25;
    custoTotalVergalhao = barrasVergalhao * custoBarra;
  }

  function custoProduto(nome, padrao) {
    const p = produtosList.find(x => x.descricao === nome);
    return p ? Number(p.custo_unitario) : padrao;
  }

  const linhas = [];
  let custoTotal = 0;
  function addLinha(desc, qtd, comp, unit, total) {
    linhas.push({ desc, qtd, composicao: comp, unitario: unit, total });
    custoTotal += total;
  }

  const trelicaNome = `Treliça TG${alturaModa} 12m`;
  const custoTrelica = custoProduto(trelicaNome, alturaModa <= 8 ? 68 : (alturaModa <= 12 ? 92 : 105));
  addLinha('Treliça', `${numBarras} barras`, `${metrosLinearesTrelica.toFixed(2)} m lineares`, custoTrelica, numBarras * custoTrelica);

  if (tiposEnchimento.has('EPS')) {
    const placasEps = Math.ceil(totalEpsLinear);
    const epsNome = `EPS H${alturaModa} placa 50x100`;
    const custoEpsPlaca = custoProduto(epsNome, 11.90);
    addLinha('EPS (isopor)', `${placasEps} placas`, `${totalEpsLinear.toFixed(2)} m lineares`, custoEpsPlaca, placasEps * custoEpsPlaca);
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

  addLinha('Cimento', `${sacosCimento} sacos`, `${numTracos} traços`, custoProduto('Cimento CP II 50kg', 37), sacosCimento * custoProduto('Cimento CP II 50kg', 37));
  addLinha('Areia Grossa', `${areiaM3.toFixed(3)} m³`, `${latasAreia} latas (18 L)`, custoProduto('Areia Grossa', 200), areiaM3 * custoProduto('Areia Grossa', 200));
  addLinha('Brita 0', `${britaM3.toFixed(3)} m³`, `${latasBrita} latas (18 L)`, custoProduto('Brita 0', 200), britaM3 * custoProduto('Brita 0', 200));
  if (comprimentosVergalhao.length > 0) {
    const descCortes = `(${comprimentosVergalhao.length} peças)`;
    addLinha('Vergalhão CA-60 6mm', `${barrasVergalhao} barras 12m`, descCortes, custoProdutoPorId(26, 25), custoTotalVergalhao);
  }

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

  return { linhas, custoTotal, areaTotal: totalArea };
}

function custoProdutoPorId(id, padrao) {
  const p = LAJE_PRODUTOS_CACHE.find(x => x.id === id);
  return p ? Number(p.custo_unitario) : padrao;
}
