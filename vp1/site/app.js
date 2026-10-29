import { decodeTopo, CRITERIOS, somaPonderada, promethee, ordem } from './calc.js';

const $ = s => document.querySelector(s);
const nf = new Intl.NumberFormat('pt-BR');
const pct = (x, d = 1) => (100 * x).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%';
const pp = m => (Math.abs(100 * m)).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' p.p.';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const lado = m => m > 0 ? '13' : m < 0 ? '22' : '=';
const CAND = { 22: { 13: 'Lula', 22: 'Bolsonaro' }, 26: { 13: 'Lula', 22: 'Flávio' } };
const UF = { 11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO', 21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA', 31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF' };

// Dados reais em vp1/dados/; o mock fictício só cobre SP e só entra se os reais faltarem.
const get = u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
const tenta = p => p.catch(() => null);
const [spReal, spTopo, brD, brTopo] = await Promise.all(['sp.json', 'sp-municipios.topo.json', 'br.json', 'br-municipios.topo.json'].map(f => tenta(get('../dados/' + f))));
const mock = !spReal || !spTopo;
const sp = mock ? { d: await get('mock/sp.json'), topo: await get('mock/sp-municipios.topo.json') } : { d: spReal, topo: spTopo };
$('#aviso').hidden = !mock;

// Path2D por município, na ordem dos arrays de dados.
function geometria({ d, topo }) {
  const geo = decodeTopo(topo), pos = new Map(d.ibge.map((c, i) => [String(c), i]));
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  geo.forEach(g => g.rings.forEach(r => r.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); })));
  const kx = Math.cos((y0 + y1) / 2 * Math.PI / 180), paths = new Array(d.n).fill(null);
  geo.forEach(g => {
    const i = pos.get(String(g.props.ibge)); if (i === undefined) return;
    const p = new Path2D();
    g.rings.forEach(r => r.forEach(([x, y], k) => p[k ? 'lineTo' : 'moveTo']((x - x0) * kx, y1 - y)));
    paths[i] = p;
  });
  const nomes = d.nome.map((n, i) => `${n} (${UF[String(d.ibge[i]).slice(0, 2)]})`);
  return { d, paths, W: (x1 - x0) * kx, H: y1 - y0, nomes };
}
const ESC = { sp: geometria(sp) };
if (brD && brTopo) ESC.br = geometria({ d: brD, topo: brTopo });
let atual = ESC.br ? 'br' : 'sp';

// Ranking (só SP, onde há ISDEL)
const D = sp.d, N = D.n;
const cols = CRITERIOS.map(c => c.v(D)), dirs = CRITERIOS.map(c => c.dir), pesos = CRITERIOS.map(c => c.peso);
const soma = somaPonderada(cols, dirs, pesos), phi = promethee(cols, dirs, pesos);
const ordSoma = ordem(soma, D.nome), ordProm = ordem(phi, D.nome);
const posSoma = new Array(N), posProm = new Array(N);
ordSoma.forEach((i, k) => posSoma[i] = k + 1); ordProm.forEach((i, k) => posProm[i] = k + 1);
const top10 = new Set([...ordSoma.slice(0, 10), ...ordProm.slice(0, 10)]);
const spIdx = new Map(D.ibge.map((c, i) => [c, i]));
const comuns = ordSoma.slice(0, 10).filter(i => posProm[i] <= 10).length;
// Antes do log: mesma soma com eleitorado linear (PROMETHEE não muda, pois só usa a ordem).
const iEl = CRITERIOS.findIndex(c => c.id === 'eleitorado');
const somaLin = somaPonderada(cols.map((c, k) => k === iEl ? D.t26.eleitorado : c), dirs, pesos);
const topLin = ordem(somaLin, D.nome).slice(0, 10), topLog = ordSoma.slice(0, 10);
const comunsLin = topLin.filter(i => posProm[i] <= 10).length;
const entraram = topLog.filter(i => !topLin.includes(i)).map(i => D.nome[i]), sairam = topLin.filter(i => !topLog.includes(i)).map(i => D.nome[i]);
const spearman = 1 - 6 * posSoma.reduce((s, r, i) => s + (r - posProm[i]) ** 2, 0) / (N * (N * N - 1));

// Cores vêm dos tokens do tema ativo
const cor = {};
const lerCores = () => { const cs = getComputedStyle(document.documentElement); ['c13', 'c22', 'neutro', 'acento', 'fg', 'bg'].forEach(k => cor[k] = cs.getPropertyValue('--' + k).trim()); };
const hex = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, k) => Math.round(v + (B[k] - v) * t)).join(',')})`; };
const porMargem = m => m ? mix(cor.neutro, m > 0 ? cor.c13 : cor.c22, 0.3 + 0.7 * Math.min(1, Math.abs(m) / 0.4)) : cor.neutro;

let ano = '26';
const mapas = {
  mapa: { g: () => ESC[atual], fill: (d, i) => porMargem(ano === '22' ? d.margem22[i] : d.margem26[i]), sel: null },
  mudanca: { g: () => ESC[atual], fill: (d, i) => d.virou[i] ? (d.margem26[i] > 0 ? cor.c13 : cor.c22) : cor.neutro, sel: null },
  ranking: { g: () => ESC.sp, fill: (d, i) => !top10.has(i) ? cor.neutro : mix(cor.neutro, cor.acento, posSoma[i] <= 10 && posProm[i] <= 10 ? 1 : 0.55), sel: null },
};

function desenhar(id) {
  const cv = document.querySelector(`[data-mapa="${id}"]`), m = mapas[id], { d, paths, W, H } = m.g(), dpr = devicePixelRatio || 1;
  cv.style.aspectRatio = W / H;
  const w = cv.clientWidth, h = w * H / W;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const ctx = cv.getContext('2d'), s = w / W * 0.98;
  m.t = [dpr * s, 0, 0, dpr * s, dpr * w * 0.01, dpr * h * 0.01];
  ctx.setTransform(...m.t);
  ctx.lineWidth = (d.n > 1000 ? 0.25 : 0.6) / s; ctx.strokeStyle = cor.bg; ctx.lineJoin = 'round';
  paths.forEach((p, i) => { if (!p) return; ctx.fillStyle = m.fill(d, i); ctx.fill(p); ctx.stroke(p); });
  if (m.sel !== null && paths[m.sel]) { ctx.lineWidth = 2.5 / s; ctx.strokeStyle = cor.fg; ctx.stroke(paths[m.sel]); }
  m.ctx = ctx;
}

function legendas() {
  const sw = (c, t) => `<span><i style="background:${c}"></i>${t}</span>`, c = CAND[ano];
  $('#leg-mapa').innerHTML = sw(porMargem(0.4), `${c[13]} (13), margem grande`) + sw(porMargem(0.02), '13, apertado') + sw(porMargem(-0.02), '22, apertado') + sw(porMargem(-0.4), `${c[22]} (22), margem grande`);
  $('#leg-rank').innerHTML = sw(cor.acento, 'Top 10 nas duas') + sw(mix(cor.neutro, cor.acento, 0.55), 'Top 10 em uma só');
}

function card(id, i) {
  const m = mapas[id], { d, nomes } = m.g();
  m.sel = i; desenhar(id);
  const linha = a => {
    const v = d['t' + a], mg = d['margem' + a][i];
    return `<tr><td>20${a}</td><td class="t13">${nf.format(v['13'][i])}</td><td class="t22">${nf.format(v['22'][i])}</td><td>${mg ? `${lado(mg)} +${pp(mg)}` : 'empate'}</td></tr>`;
  };
  const j = spIdx.get(d.ibge[i]);
  document.querySelector(`[data-card="${id}"]`).innerHTML =
    `<h3>${esc(nomes[i])}</h3><table><thead><tr><th>Ano</th><th>Votos 13</th><th>Votos 22</th><th>Margem</th></tr></thead><tbody>${linha('22')}${linha('26')}</tbody></table>` +
    `<span class="selo ${d.virou[i] ? 'sim' : ''}">${d.virou[i] ? 'Virou' : 'Não virou'}</span> ` +
    (j === undefined ? '' : `<span class="nota">Ranking SP: ${posSoma[j]}º na soma ponderada · ${posProm[j]}º no PROMETHEE II</span>`);
}

// Toque/clique no mapa
document.querySelectorAll('canvas.mapa').forEach(cv => cv.addEventListener('click', e => {
  const id = cv.dataset.mapa, m = mapas[id], r = cv.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  const x = (e.clientX - r.left) * dpr, y = (e.clientY - r.top) * dpr;
  m.ctx.setTransform(...m.t);
  const i = m.g().paths.findIndex(p => p && m.ctx.isPointInPath(p, x, y));
  if (i >= 0) card(id, i);
}));

// Busca (caminho de teclado para o mapa)
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
document.querySelector('[data-busca="mapa"]').addEventListener('change', e => {
  const q = norm(e.target.value), { nomes } = ESC[atual];
  const i = nomes.findIndex(n => norm(n) === q || norm(n.replace(/ \(..\)$/, '')) === q);
  if (i >= 0) card('mapa', i);
});

document.querySelectorAll('[data-ano]').forEach(b => b.addEventListener('click', () => {
  ano = b.dataset.ano;
  document.querySelectorAll('[data-ano]').forEach(x => x.setAttribute('aria-pressed', x === b));
  desenhar('mapa'); legendas();
}));

function placar(d, a) {
  const v = d['t' + a], m = d['margem' + a], c = CAND[a];
  const tot13 = v['13'].reduce((s, x) => s + x, 0), tot22 = v['22'].reduce((s, x) => s + x, 0), tot = tot13 + tot22;
  const mun13 = m.filter(x => x > 0).length, mun22 = m.filter(x => x < 0).length;
  return `<div class="ano"><h3>2º turno 20${a}</h3><div class="lados">
    <div class="lado"><div class="nm t13">${c[13]} · 13</div><div class="n t13">${nf.format(mun13)}</div><div class="p">municípios · ${pct(tot13 / tot)} dos válidos</div></div>
    <div class="lado d"><div class="nm t22">22 · ${c[22]}</div><div class="n t22">${nf.format(mun22)}</div><div class="p">municípios · ${pct(tot22 / tot)} dos válidos</div></div>
  </div><div class="barra" aria-hidden="true"><i style="width:${100 * mun13 / d.n}%;background:var(--c13)"></i><i style="flex:1"></i><i style="width:${100 * mun22 / d.n}%;background:var(--c22)"></i></div></div>`;
}

const itemMud = (d, nomes) => i => `<li><button type="button" data-i="${i}"><span>${esc(nomes[i])}</span><small>${lado(d.margem22[i])} → <b class="${d.margem26[i] > 0 ? 't13' : 't22'}">${lado(d.margem26[i])}</b> · Δ ${pp(d.margem26[i] - d.margem22[i])}</small></button></li>`;

// Tudo que depende do escopo (Brasil ou SP)
function trocarEscopo(e) {
  atual = e;
  document.querySelectorAll('[data-esc]').forEach(x => x.setAttribute('aria-pressed', x.dataset.esc === e));
  const { d, nomes } = ESC[e];
  $('#esc-nome').textContent = e === 'br' ? 'Brasil' : 'São Paulo';
  $('#esc-lead').textContent = e === 'br' ? 'Municípios brasileiros' : 'Municípios paulistas';
  $('#ff').innerHTML = placar(d, '22') + placar(d, '26');
  const nv = d.virou.reduce((s, x) => s + x, 0), para13 = d.virou.filter((v, i) => v && d.margem26[i] > 0).length;
  $('#viraram').innerHTML = `<strong>${nf.format(nv)}</strong> dos ${nf.format(d.n)} municípios trocaram de vencedor: ${nf.format(para13)} passaram para o 13 e ${nf.format(nv - para13)} para o 22.`;
  $('#municipios').innerHTML = nomes.map(n => `<option value="${esc(n)}">`).join('');
  const vir = d.virou.map((_, i) => i).filter(i => d.virou[i]).sort((a, b) => Math.abs(d.margem26[b] - d.margem22[b]) - Math.abs(d.margem26[a] - d.margem22[a]));
  $('#lista-mud').innerHTML = vir.slice(0, 12).map(itemMud(d, nomes)).join('');
  $('#mais-mud').hidden = vir.length <= 12;
  $('#mais-mud summary').textContent = `Ver os outros ${nf.format(vir.length - 12)}`;
  $('#resto-mud').innerHTML = vir.slice(12).map(itemMud(d, nomes)).join('');
  mapas.mapa.sel = mapas.mudanca.sel = null;
  document.querySelector('[data-card="mapa"]').innerHTML = document.querySelector('[data-card="mudanca"]').innerHTML = '';
  desenhar('mapa'); desenhar('mudanca');
}
document.querySelectorAll('[data-esc]').forEach(b => { b.hidden = !ESC[b.dataset.esc]; b.addEventListener('click', () => trocarEscopo(b.dataset.esc)); });
$('#mudanca').addEventListener('click', e => { const b = e.target.closest('.lista button'); if (b) card('mudanca', +b.dataset.i); });

// Ranking: top 10 com barras
function barras(el, ord, nota, fmt) {
  const top = ord.slice(0, 10), lo = Math.min(...nota), hi = nota[top[0]];
  el.innerHTML = top.map((i, k) => `<li><button type="button" data-i="${i}"><span class="pos">${k + 1}</span><span class="nm">${esc(D.nome[i])}</span><span class="v">${fmt(nota[i])}</span><span class="b"><i style="width:${100 * (nota[i] - lo) / (hi - lo || 1)}%"></i></span></button></li>`).join('');
  el.addEventListener('click', e => { const b = e.target.closest('button'); if (b) card('ranking', +b.dataset.i); });
}
const f3 = x => x.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
barras($('#top-soma'), ordSoma, soma, f3);
barras($('#top-prom'), ordProm, phi, x => 'φ ' + f3(x));
$('#concord').textContent = `${comuns} de 10 municípios aparecem no top 10 das duas metodologias. Barras relativas ao 1º colocado de cada lista.`;
const lst = a => a.length ? a.join(', ') : 'nenhum';
$('#antes-depois').innerHTML = `Antes e depois do log no eleitorado: o top 10 coincide em <strong>${comunsLin} de 10</strong> municípios com eleitorado linear e em <strong>${comuns} de 10</strong> com log.`;
$('#antes-depois-nota').textContent = `O log mudou o top 10 da soma ponderada (entraram: ${lst(entraram)}; saíram: ${lst(sairam)}) e não muda o PROMETHEE II, que usa só a ordem. A divergência que sobra é de natureza: a soma usa a intensidade das diferenças, e "virou" (0 ou 1) vale um salto de 0,2 que nenhum outro critério alcança; o PROMETHEE com função usual só conta quem supera quem. Nos 645 municípios os dois rankings concordam bem (Spearman ${spearman.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}); a discordância está no topo.`;
$('#fontes-dados').textContent = mock ? 'Os números exibidos são fictícios (mock de desenvolvimento).' : `Dados gerados em ${new Date(D.gerado).toLocaleDateString('pt-BR')}. Detalhes da coleta e checagens em vp1/dados/LEIAME.md.`;

const desenharTodos = () => { lerCores(); Object.keys(mapas).forEach(desenhar); legendas(); };
$('#tema').addEventListener('click', () => {
  const escuro = getComputedStyle(document.documentElement).colorScheme === 'dark';
  document.documentElement.dataset.theme = escuro ? 'light' : 'dark';
  try { localStorage.setItem('tema', document.documentElement.dataset.theme); } catch {}
  desenharTodos();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', desenharTodos);
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(desenharTodos, 100); });
lerCores(); legendas(); trocarEscopo(atual); desenhar('ranking');
