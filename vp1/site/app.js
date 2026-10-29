import { decodeTopo, CRITERIOS, somaPonderada, promethee, ordem } from './calc.js';

const $ = s => document.querySelector(s);
const nf = new Intl.NumberFormat('pt-BR');
const pct = (x, d = 1) => (100 * x).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%';
const pp = m => (Math.abs(100 * m)).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' p.p.';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const CAND = { 22: { 13: 'Lula', 22: 'Bolsonaro' }, 26: { 13: 'Lula', 22: 'Flávio' } };

// Dados reais quando a outra sessão publicar vp1/dados/; até lá, o mock fictício.
async function carregar() {
  const get = u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
  try { return { d: await get('../dados/sp.json'), topo: await get('../dados/sp-municipios.topo.json'), mock: false }; }
  catch { return { d: await get('mock/sp.json'), topo: await get('mock/sp-municipios.topo.json'), mock: true }; }
}

const { d, topo, mock } = await carregar();
$('#aviso').hidden = !mock;
const N = d.n;
const geo = decodeTopo(topo);
const pos = new Map(d.ibge.map((c, i) => [String(c), i]));
const prop = g => String(g.props.ibge ?? g.props.id ?? g.props.codarea);

// Path2D por município, na ordem dos arrays de dados (municípios sem malha ficam sem desenho).
let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
geo.forEach(g => g.rings.forEach(r => r.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); })));
const kx = Math.cos((y0 + y1) / 2 * Math.PI / 180), W = (x1 - x0) * kx, H = y1 - y0;
const paths = new Array(N).fill(null);
geo.forEach(g => {
  const i = pos.get(prop(g)); if (i === undefined) return;
  const p = new Path2D();
  g.rings.forEach(r => r.forEach(([x, y], k) => p[k ? 'lineTo' : 'moveTo']((x - x0) * kx, y1 - y)));
  paths[i] = p;
});

// Ranking
const cols = CRITERIOS.map(c => c.v(d)), dirs = CRITERIOS.map(c => c.dir), pesos = CRITERIOS.map(c => c.peso);
const soma = somaPonderada(cols, dirs, pesos), phi = promethee(cols, dirs, pesos);
const ordSoma = ordem(soma, d.nome), ordProm = ordem(phi, d.nome);
const posSoma = new Array(N), posProm = new Array(N);
ordSoma.forEach((i, k) => posSoma[i] = k + 1); ordProm.forEach((i, k) => posProm[i] = k + 1);
const top10 = new Set([...ordSoma.slice(0, 10), ...ordProm.slice(0, 10)]);

// Cores vêm dos tokens do tema ativo
let cor = {};
const lerCores = () => { const cs = getComputedStyle(document.documentElement); ['c13', 'c22', 'neutro', 'acento', 'fg', 'bg'].forEach(k => cor[k] = cs.getPropertyValue('--' + k).trim()); };
const hex = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, k) => Math.round(v + (B[k] - v) * t)).join(',')})`; };
const porMargem = m => mix(cor.neutro, m > 0 ? cor.c13 : cor.c22, 0.3 + 0.7 * Math.min(1, Math.abs(m) / 0.4));

let ano = '26';
const mapas = {
  mapa: { fill: i => porMargem(ano === '22' ? d.margem22[i] : d.margem26[i]), sel: null },
  mudanca: { fill: i => d.virou[i] ? (d.margem26[i] > 0 ? cor.c13 : cor.c22) : cor.neutro, sel: null },
  ranking: { fill: i => !top10.has(i) ? cor.neutro : mix(cor.neutro, cor.acento, posSoma[i] <= 10 && posProm[i] <= 10 ? 1 : 0.55), sel: null },
};

function desenhar(id) {
  const cv = document.querySelector(`[data-mapa="${id}"]`), m = mapas[id], dpr = devicePixelRatio || 1;
  const w = cv.clientWidth, h = w * H / W;
  cv.style.aspectRatio = W / H;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const ctx = cv.getContext('2d'), s = w / W * 0.98;
  m.t = [dpr * s, 0, 0, dpr * s, dpr * w * 0.01, dpr * h * 0.01];
  ctx.setTransform(...m.t);
  ctx.lineWidth = 0.6 / s; ctx.strokeStyle = cor.bg; ctx.lineJoin = 'round';
  paths.forEach((p, i) => { if (!p) return; ctx.fillStyle = m.fill(i); ctx.fill(p); ctx.stroke(p); });
  if (m.sel !== null && paths[m.sel]) { ctx.lineWidth = 2.5 / s; ctx.strokeStyle = cor.fg; ctx.stroke(paths[m.sel]); }
  m.ctx = ctx;
}
const desenharTodos = () => { lerCores(); Object.keys(mapas).forEach(desenhar); legendas(); };

function legendas() {
  const sw = (c, t) => `<span><i style="background:${c}"></i>${t}</span>`;
  const c = CAND[ano];
  $('#leg-mapa').innerHTML = sw(porMargem(0.4), `${c[13]} (13), margem grande`) + sw(porMargem(0.02), '13, apertado') + sw(porMargem(-0.02), '22, apertado') + sw(porMargem(-0.4), `${c[22]} (22), margem grande`);
  $('#leg-rank').innerHTML = sw(cor.acento, 'Top 10 nas duas') + sw(mix(cor.neutro, cor.acento, 0.55), 'Top 10 em uma só');
}

function card(id, i) {
  mapas[id].sel = i; desenhar(id);
  const linha = (a, t) => {
    const v = d['t' + a], m = d['margem' + a];
    return `<tr><td>20${a}</td><td class="t13">${nf.format(v['13'][i])}</td><td class="t22">${nf.format(v['22'][i])}</td><td>${m[i] > 0 ? '13' : '22'} +${pp(m[i])}</td></tr>`;
  };
  document.querySelector(`[data-card="${id}"]`).innerHTML =
    `<h3>${esc(d.nome[i])}</h3><table><thead><tr><th>Ano</th><th>Votos 13</th><th>Votos 22</th><th>Margem</th></tr></thead><tbody>${linha('22')}${linha('26')}</tbody></table>` +
    `<span class="selo ${d.virou[i] ? 'sim' : ''}">${d.virou[i] ? 'Virou' : 'Não virou'}</span> ` +
    `<span class="nota">Ranking: ${posSoma[i]}º na soma ponderada · ${posProm[i]}º no PROMETHEE II</span>`;
}

// Toque/clique no mapa
document.querySelectorAll('canvas.mapa').forEach(cv => cv.addEventListener('click', e => {
  const id = cv.dataset.mapa, m = mapas[id], r = cv.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  const x = (e.clientX - r.left) * dpr, y = (e.clientY - r.top) * dpr;
  m.ctx.setTransform(...m.t);
  const i = paths.findIndex(p => p && m.ctx.isPointInPath(p, x, y));
  if (i >= 0) card(id, i);
}));

// Busca (caminho de teclado para o mapa)
$('#municipios').innerHTML = d.nome.map(n => `<option value="${esc(n)}">`).join('');
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const idxNome = new Map(d.nome.map((n, i) => [norm(n), i]));
document.querySelector('[data-busca="mapa"]').addEventListener('change', e => {
  const i = idxNome.get(norm(e.target.value)); if (i !== undefined) card('mapa', i);
});

document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => {
  ano = b.dataset.ano;
  document.querySelectorAll('.seg button').forEach(x => x.setAttribute('aria-pressed', x === b));
  desenhar('mapa'); legendas();
}));

// Capa: frente a frente
function placar(a) {
  const v = d['t' + a], m = d['margem' + a], c = CAND[a];
  const tot13 = v['13'].reduce((s, x) => s + x, 0), tot22 = v['22'].reduce((s, x) => s + x, 0), tot = tot13 + tot22;
  const mun13 = m.filter(x => x > 0).length, mun22 = m.filter(x => x < 0).length;
  return `<div class="ano"><h3>2º turno 20${a}</h3><div class="lados">
    <div class="lado"><div class="nm t13">${c[13]} · 13</div><div class="n t13">${mun13}</div><div class="p">municípios · ${pct(tot13 / tot)} dos válidos</div></div>
    <div class="lado d"><div class="nm t22">22 · ${c[22]}</div><div class="n t22">${mun22}</div><div class="p">municípios · ${pct(tot22 / tot)} dos válidos</div></div>
  </div><div class="barra" aria-hidden="true"><i style="width:${100 * mun13 / N}%;background:var(--c13)"></i><i style="flex:1"></i><i style="width:${100 * mun22 / N}%;background:var(--c22)"></i></div></div>`;
}
$('#ff').innerHTML = placar('22') + placar('26');
const nv = d.virou.reduce((s, x) => s + x, 0);
const para13 = d.virou.filter((v, i) => v && d.margem26[i] > 0).length;
$('#viraram').innerHTML = `<strong>${nv}</strong> dos ${N} municípios trocaram de vencedor: ${para13} passaram para o 13 e ${nv - para13} para o 22.`;

// Mudança: lista dos que viraram, maior variação primeiro
const viraram = d.virou.map((v, i) => i).filter(i => d.virou[i]).sort((a, b) => Math.abs(d.margem26[b] - d.margem22[b]) - Math.abs(d.margem26[a] - d.margem22[a]));
const itemMud = i => `<li><button type="button" data-i="${i}"><span>${esc(d.nome[i])}</span><small>${d.margem22[i] > 0 ? '13' : '22'} → <b class="${d.margem26[i] > 0 ? 't13' : 't22'}">${d.margem26[i] > 0 ? '13' : '22'}</b> · Δ ${pp(d.margem26[i] - d.margem22[i])}</small></button></li>`;
$('#lista-mud').innerHTML = viraram.slice(0, 12).map(itemMud).join('');
$('#mais-mud').hidden = viraram.length <= 12;
$('#mais-mud summary').textContent = `Ver os outros ${viraram.length - 12}`;
$('#resto-mud').innerHTML = viraram.slice(12).map(itemMud).join('');
$('#mudanca').addEventListener('click', e => { const b = e.target.closest('.lista button'); if (b) card('mudanca', +b.dataset.i); });

// Ranking: top 10 com barras
function barras(el, ord, nota, fmt) {
  const top = ord.slice(0, 10), lo = Math.min(...nota), hi = nota[top[0]];
  el.innerHTML = top.map((i, k) => `<li><button type="button" data-i="${i}"><span class="pos">${k + 1}</span><span class="nm">${esc(d.nome[i])}</span><span class="v">${fmt(nota[i])}</span><span class="b"><i style="width:${100 * (nota[i] - lo) / (hi - lo || 1)}%"></i></span></button></li>`).join('');
  el.addEventListener('click', e => { const b = e.target.closest('button'); if (b) card('ranking', +b.dataset.i); });
}
const f3 = x => x.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
barras($('#top-soma'), ordSoma, soma, f3);
barras($('#top-prom'), ordProm, phi, x => 'φ ' + f3(x));
const comuns = ordSoma.slice(0, 10).filter(i => posProm[i] <= 10).length;
$('#concord').textContent = `${comuns} de 10 municípios aparecem no top 10 das duas metodologias. Barras relativas ao 1º colocado de cada lista.`;

$('#fontes-dados').textContent = mock ? 'Os números exibidos são fictícios (mock de desenvolvimento).' : `Dados gerados em ${new Date(d.gerado).toLocaleDateString('pt-BR')}.`;

// Tema
$('#tema').addEventListener('click', () => {
  const escuro = getComputedStyle(document.documentElement).colorScheme === 'dark';
  document.documentElement.dataset.theme = escuro ? 'light' : 'dark';
  try { localStorage.setItem('tema', document.documentElement.dataset.theme); } catch {}
  desenharTodos();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', desenharTodos);
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(desenharTodos, 100); });
desenharTodos();
