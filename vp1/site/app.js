import { decodeTopo } from './calc.js';
import { perguntar, SUGESTOES } from './pergunta.js';
import { contar, contarTudo } from './motion.js';
import { montarApura } from './apura.js';

const $ = s => document.querySelector(s);
const nf = new Intl.NumberFormat('pt-BR');
const dec = (x, d = 1) => x.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const pp = m => dec(Math.abs(100 * m)) + ' p.p.';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const lado = m => m > 0 ? '13' : m < 0 ? '22' : '=';
const CAND = [{ 13: 'Lula', 22: 'Bolsonaro' }, { 13: 'Lula', 22: 'Flávio' }];  // [2022, 2026]
const UF = { 11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO', 21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA', 31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF' };
const UFNOME = { RO: 'Rondônia', AC: 'Acre', AM: 'Amazonas', RR: 'Roraima', PA: 'Pará', AP: 'Amapá', TO: 'Tocantins', MA: 'Maranhão', PI: 'Piauí', CE: 'Ceará', RN: 'Rio Grande do Norte', PB: 'Paraíba', PE: 'Pernambuco', AL: 'Alagoas', SE: 'Sergipe', BA: 'Bahia', MG: 'Minas Gerais', ES: 'Espírito Santo', RJ: 'Rio de Janeiro', SP: 'São Paulo', PR: 'Paraná', SC: 'Santa Catarina', RS: 'Rio Grande do Sul', MS: 'Mato Grosso do Sul', MT: 'Mato Grosso', GO: 'Goiás', DF: 'Distrito Federal' };
const REGIAO = { 1: 'N', 2: 'NE', 3: 'SE', 4: 'S', 5: 'CO' };
const CALLOUTS = ['RN', 'PB', 'PE', 'AL', 'SE', 'ES', 'RJ'];
const FAIXAS = [0.10, 0.25, 0.45];  // limites de |margem|: até 10, 25, 45 e acima
const movimento = !matchMedia('(prefers-reduced-motion: reduce)').matches;
const celular = matchMedia('(max-width: 1023px)');

// Dados
const get = u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
const [BR, SP, brTopo, spTopo, ufTopo, RK] = await Promise.all([
  get('../dados/br.json'), get('../dados/sp.json'), get('../dados/br-municipios.topo.json'), get('../dados/sp-municipios.topo.json'),
  get('br-uf.topo.json'), get('../notebook/ranking.json').catch(() => null),
]);

// Geometria: projeção equirretangular corrigida pela latitude média do recorte
function projecao(geos) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  geos.forEach(g => g.rings.forEach(r => r.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); })));
  const kx = Math.cos((y0 + y1) / 2 * Math.PI / 180);
  return { p: ([x, y]) => [(x - x0) * kx, y1 - y], W: (x1 - x0) * kx, H: y1 - y0 };
}
const caminho = (g, P) => { const p = new Path2D(); g.rings.forEach(r => r.forEach((pt, k) => { const [x, y] = P.p(pt); p[k ? 'lineTo' : 'moveTo'](x, y); })); return p; };

function totais(d, idx) {
  const s = { 0: { 13: 0, 22: 0 }, 1: { 13: 0, 22: 0 } };
  idx.forEach(i => { s[0][13] += d.t22['13'][i]; s[0][22] += d.t22['22'][i]; s[1][13] += d.t26['13'][i]; s[1][22] += d.t26['22'][i]; });
  return s;
}
const margemT = (s, a) => (s[a][13] - s[a][22]) / (s[a][13] + s[a][22]);

function montar(d, topo, soUf) {
  const geo = decodeTopo(topo), ufGeo = decodeTopo(ufTopo).filter(g => !soUf || g.props.uf === soUf);
  const P = projecao(soUf ? ufGeo : geo), pos = new Map(d.ibge.map((c, i) => [c, i]));
  const mun = new Array(d.n).fill(null);
  geo.forEach(g => { const i = pos.get(+g.props.ibge); if (i !== undefined) mun[i] = caminho(g, P); });
  const uf = d.ibge.map(c => UF[String(c).slice(0, 2)]);
  const ufs = ufGeo.map(g => {
    const sig = UF[g.props.uf], idx = d.ibge.map((_, i) => i).filter(i => uf[i] === sig);
    return { sig, path: caminho(g, P), lp: P.p([g.props.lx, g.props.ly]), idx, s: totais(d, idx), viraram: idx.filter(i => d.virou[i]).length };
  });
  const r = RK?.[soUf ? 'sp' : 'br'];
  const ordem = k => r ? d.ibge.map((_, i) => i).sort((a, b) => r['pos_' + k][a] - r['pos_' + k][b]) : [];  // ordem e empates do notebook
  return {
    d, mun, ufs, P, uf, nomes: d.nome.map((n, i) => `${n} (${uf[i]})`), s: totais(d, d.ibge.map((_, i) => i)),
    rank: r && { soma: ordem('soma'), phi: ordem('phi'), pos: { soma: r.pos_soma, phi: r.pos_phi }, nota: { soma: r.soma, phi: r.phi } },
  };
}
const ESC = { br: montar(BR, brTopo, null), sp: montar(SP, spTopo, 35) };
const spIdx = new Map(SP.ibge.map((c, i) => [c, i])), brIdx = new Map(BR.ibge.map((c, i) => [c, i]));

// Estado da tela
const S = { esc: 'br', t: 1, met: 'phi', sel: null, ufSel: null, realce: null, view: { k: 1, x: 0, y: 0 } };
const E = () => ESC[S.esc];
const modoUF = () => celular.matches && S.esc === 'br';
const mInterp = (d, i) => d.margem22[i] + (d.margem26[i] - d.margem22[i]) * S.t;
const sInterp = s => ({ 13: s[0][13] + (s[1][13] - s[0][13]) * S.t, 22: s[0][22] + (s[1][22] - s[0][22]) * S.t });

// Cores: tokens do tema + 4 faixas por lado
const cor = {};
const hex = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, k) => Math.round(v + (B[k] - v) * t)).join(',')})`; };
const INT = [0.32, 0.55, 0.78, 1];
function lerCores() {
  const cs = getComputedStyle(document.documentElement);
  ['c13', 'c22', 'neutro', 'fg', 'bg', 'painel', 'mut', 'contorno'].forEach(k => cor[k] = cs.getPropertyValue('--' + k).trim());
  cor.f13 = INT.map(t => mix(cor.neutro, cor.c13, t)); cor.f22 = INT.map(t => mix(cor.neutro, cor.c22, t));
  cor.apagado = mix(cor.neutro, cor.painel, 0.6);
}
const faixa = m => { const a = Math.abs(m); return a < FAIXAS[0] ? 0 : a < FAIXAS[1] ? 1 : a < FAIXAS[2] ? 2 : 3; };
const corMargem = m => m === 0 ? cor.neutro : (m > 0 ? cor.f13 : cor.f22)[faixa(m)];

// Mapa em canvas
const cv = $('#mapa'), wrap = $('#mapa-wrap');
let base = null;  // {s, ox, oy, w, h}
function desenhar() {
  const { d, mun, ufs, P } = E(), dpr = devicePixelRatio || 1, w = wrap.clientWidth, h = wrap.clientHeight;
  if (!w || !h) return;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const comCallout = S.esc === 'br', padR = comCallout ? 74 : 16, padT = 40, padB = celular.matches ? 92 : 20;
  const s0 = Math.min((w - 16 - padR) / P.W, (h - padT - padB) / P.H);
  base = { s: s0, ox: 16 + (w - 16 - padR - P.W * s0) / 2, oy: padT + (h - padT - padB - P.H * s0) / 2, w, h };
  const { k, x, y } = S.view, s = s0 * k;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (base.ox * k + x), dpr * (base.oy * k + y));
  ctx.lineJoin = 'round';
  const realceUf = S.realce && new Set([...S.realce].map(i => E().uf[i]));
  if (modoUF()) {
    ufs.forEach(u => { const st = sInterp(u.s); ctx.fillStyle = realceUf && !realceUf.has(u.sig) ? cor.apagado : corMargem((st[13] - st[22]) / (st[13] + st[22])); ctx.fill(u.path); });
  } else {
    ctx.lineWidth = (d.n > 1000 ? 0.3 : 0.7) / s; ctx.strokeStyle = cor.painel;
    mun.forEach((p, i) => { if (!p) return; ctx.fillStyle = S.realce && !S.realce.has(i) ? cor.apagado : corMargem(mInterp(d, i)); ctx.fill(p); if (d.n < 1000 || k > 2) ctx.stroke(p); });
  }
  ctx.strokeStyle = cor.contorno; ctx.lineWidth = (S.esc === 'br' ? 1.2 : 2) / s;
  ufs.forEach(u => ctx.stroke(u.path));
  ctx.strokeStyle = cor.fg; ctx.lineWidth = 2.4 / s;
  if (S.sel !== null && mun[S.sel] && !modoUF()) ctx.stroke(mun[S.sel]);
  if (S.ufSel) ctx.stroke(ufs.find(u => u.sig === S.ufSel).path);
  if (realceUf && modoUF()) ufs.filter(u => realceUf.has(u.sig)).forEach(u => ctx.stroke(u.path));

  // Rótulos e callouts em coordenadas de tela
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (S.esc !== 'br') return;
  const tela = ([px, py]) => [(px * s0 + base.ox) * k + x, (py * s0 + base.oy) * k + y];
  const pct = u => { const st = sInterp(u.s), v = Math.max(st[13], st[22]) / (st[13] + st[22]); return { txt: Math.round(100 * v) + '%', c: st[13] >= st[22] ? cor.c13 : cor.c22 }; };
  ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  ufs.filter(u => !CALLOUTS.includes(u.sig) && (u.sig !== 'DF' || k > 1.5)).forEach(u => {
    const [lx, ly] = tela(u.lp), p = pct(u);
    ctx.font = `600 ${celular.matches ? 10 : 11}px Geist, system-ui`; ctx.lineWidth = 3; ctx.strokeStyle = cor.painel; ctx.fillStyle = cor.fg;
    ctx.strokeText(u.sig, lx, ly - 1); ctx.fillText(u.sig, lx, ly - 1);
    ctx.font = `500 ${celular.matches ? 9 : 10}px Geist, system-ui`; ctx.fillStyle = cor.fg;
    ctx.strokeText(p.txt, lx, ly + 10); ctx.fillText(p.txt, lx, ly + 10);
  });
  if (k !== 1) return;  // callouts só na visão inteira
  const alvos = CALLOUTS.map(sig => ufs.find(u => u.sig === sig)).map(u => ({ u, pt: tela(u.lp) })).sort((a, b) => a.pt[1] - b.pt[1]);
  let yAnt = -Infinity;
  alvos.forEach(a => { a.y = Math.max(a.pt[1], yAnt + 26); yAnt = a.y; });
  const desloca = Math.max(0, yAnt + 14 - (h - padB)); alvos.forEach(a => a.y -= desloca);
  const bx = w - 66;
  alvos.forEach(({ u, pt, y: by }) => {
    const p = pct(u);
    ctx.strokeStyle = cor.mut; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pt[0], pt[1]); ctx.lineTo(bx, by); ctx.stroke();
    ctx.fillStyle = p.c; ctx.beginPath(); ctx.roundRect(bx, by - 10, 56, 20, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '600 10.5px Geist, system-ui'; ctx.textAlign = 'center';
    ctx.fillText(`${u.sig} ${p.txt}`, bx + 28, by + 4);
    ctx.fillStyle = cor.fg; ctx.beginPath(); ctx.arc(pt[0], pt[1], 2, 0, 7); ctx.fill();
  });
}
let pedido = 0;
const redesenhar = () => { if (!pedido) pedido = requestAnimationFrame(() => { pedido = 0; desenhar(); }); };
new ResizeObserver(redesenhar).observe(wrap);

// Toque, arrasto e zoom
function acerto(cx, cy) {
  const { k, x, y } = S.view, s = base.s * k, ctx = cv.getContext('2d');
  ctx.setTransform(s, 0, 0, s, base.ox * k + x, base.oy * k + y);
  if (modoUF()) return { uf: E().ufs.find(u => ctx.isPointInPath(u.path, cx, cy))?.sig };
  return { i: E().mun.findIndex(p => p && ctx.isPointInPath(p, cx, cy)) };
}
let arrasto = null;
cv.addEventListener('pointerdown', e => { arrasto = { x: e.clientX, y: e.clientY, vx: S.view.x, vy: S.view.y, moveu: false }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', e => {
  if (!arrasto) return;
  const dx = e.clientX - arrasto.x, dy = e.clientY - arrasto.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) arrasto.moveu = true;
  if (arrasto.moveu && S.view.k > 1) { S.view.x = arrasto.vx + dx; S.view.y = arrasto.vy + dy; redesenhar(); }
});
cv.addEventListener('pointerup', e => {
  const a = arrasto; arrasto = null;
  if (!a || a.moveu) return;
  const r = cv.getBoundingClientRect(), h = acerto(e.clientX - r.left, e.clientY - r.top);
  if (h.uf) selecionarUF(h.uf); else if (h.i >= 0) selecionar(h.i);
});
// Mantém o centro da tela parado: ponto c em tela fica em c após mudar k
function zoomCentro(f) {
  const k0 = S.view.k, k = Math.min(12, Math.max(1, k0 * f));
  if (k === 1) { S.view = { k: 1, x: 0, y: 0 }; return redesenhar(); }
  const cx = base.w / 2, cy = base.h / 2;
  const bx = (cx - S.view.x) / k0, by = (cy - S.view.y) / k0;  // ponto em "tela base" sob o centro
  S.view = { k, x: cx - bx * k, y: cy - by * k };
  redesenhar();
}
$('#zmais').onclick = () => zoomCentro(1.6); $('#zmenos').onclick = () => zoomCentro(1 / 1.6);
$('#zreset').onclick = () => { S.view = { k: 1, x: 0, y: 0 }; redesenhar(); };
cv.addEventListener('keydown', e => {
  const passo = 40, mapa = { ArrowLeft: [passo, 0], ArrowRight: [-passo, 0], ArrowUp: [0, passo], ArrowDown: [0, -passo] }[e.key];
  if (mapa && S.view.k > 1) { S.view.x += mapa[0]; S.view.y += mapa[1]; redesenhar(); e.preventDefault(); }
  else if (e.key === '+' || e.key === '=') zoomCentro(1.6);
  else if (e.key === '-') zoomCentro(1 / 1.6);
  else if (e.key === '0') $('#zreset').click();
});

// Placar, legenda, linha do tempo
const mi = x => x >= 1e6 ? dec(x / 1e6) + ' mi' : nf.format(Math.round(x));
function placar() {
  const { s, d } = E(), st = sInterp(s), tot = st[13] + st[22], a = S.t < 0.5 ? 0 : 1, c = CAND[a];
  $('#nm13').textContent = c[13]; $('#nm22').textContent = c[22];
  $('#b13').style.width = (100 * st[13] / tot) + '%'; $('#brasa').style.left = (100 * st[13] / tot) + '%'; $('#b22').style.width = (100 * st[22] / tot) + '%';
  const so = { instantaneo: S.t > 0 && S.t < 1 };  // arrastando a linha do tempo: sem contagem
  contar($('#v13'), `${dec(100 * st[13] / tot, 2)}%`, so); contar($('#vv13'), `${nf.format(st[13])} votos`, so);
  contar($('#v22'), `${dec(100 * st[22] / tot, 2)}%`, so); contar($('#vv22'), `${nf.format(st[22])} votos`, so);
  contar($('#frase'), `${nf.format(d.virou.reduce((x, v) => x + v, 0))} municípios viraram de lado`, so);
  document.querySelectorAll('[data-ano]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.ano === a && (S.t === 0 || S.t === 1))));
  $('#t').value = Math.round(S.t * 1000);
  $('#t-rot').textContent = S.t === 0 ? '2022' : S.t === 1 ? '2026' : `transição · ${Math.round(S.t * 100)}%`;
  // Legenda: contagem por lado no ano exibido + 4 faixas
  const m = d.ibge.map((_, i) => mInterp(d, i)), n13 = m.filter(x => x > 0).length, n22 = m.filter(x => x < 0).length;
  const sw = cs => cs.map(x => `<i style="background:${x}"></i>`).join('');
  const antes = [...document.querySelectorAll('#legenda .cont span')].map(e => e.textContent);
  $('#legenda').innerHTML = `<div class="cont"><span class="t13">${c[13]} ${nf.format(n13)}</span><span class="t22">${c[22]} ${nf.format(n22)}</span><span style="color:var(--mut);font-weight:400">municípios</span></div>` +
    `<div class="faixas"><small></small><small>até 10</small><small>25</small><small>45</small><small>+45</small><span class="t13">13</span>${sw(cor.f13)}<span class="t22">22</span>${sw(cor.f22)}</div>`;
  document.querySelectorAll('#legenda .cont span').forEach((e, k) => antes[k] && contar(e, e.textContent, { de: antes[k], ...so }));
}
let anim = 0;
function irPara(alvo) {
  cancelAnimationFrame(anim);
  if (!movimento) { S.t = alvo; placar(); return redesenhar(); }
  const t0 = S.t, ini = performance.now(), dur = 1800 * Math.abs(alvo - t0) || 1;
  const passo = now => { const f = Math.min(1, (now - ini) / dur); S.t = t0 + (alvo - t0) * (f < .5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2); placar(); desenhar(); if (f < 1) anim = requestAnimationFrame(passo); else { S.t = alvo; placar(); } };
  anim = requestAnimationFrame(passo);
}
document.querySelectorAll('[data-ano]').forEach(b => b.onclick = () => irPara(+b.dataset.ano));
$('#t').addEventListener('input', e => { cancelAnimationFrame(anim); S.t = e.target.value / 1000; placar(); redesenhar(); });
$('#play').onclick = () => { S.t = 0; placar(); irPara(1); };

// Painel esquerdo: ranking e "o que mudou"
function ranking() {
  const R = E().rank, nomes = S.esc === 'br' ? E().nomes : E().d.nome;
  document.querySelectorAll('[data-met]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.met === S.met)));
  if (!R) { $('#rank').innerHTML = ''; $('#rank-nota').textContent = 'Ranking indisponível: vp1/notebook/ranking.json não carregou.'; return; }
  const ord = R[S.met].slice(0, 10), nota = R.nota[S.met], lo = Math.min(...nota), hi = nota[ord[0]];
  $('#rank').innerHTML = ord.map(i => `<li><button type="button" data-i="${i}"${i === S.sel ? ' aria-current="true"' : ''}><span class="p">${R.pos[S.met][i]}</span><span>${esc(nomes[i])}</span><span class="v">${S.met === 'phi' ? 'φ ' : ''}${dec(nota[i], 3)}</span><span class="b"><i style="width:${100 * (nota[i] - lo) / (hi - lo || 1)}%"></i></span></button></li>`).join('');
  const chave = S.esc + S.met;
  if (chave !== ranking.k) { ranking.k = chave; $('#rank').classList.remove('entra'); void $('#rank').offsetWidth; $('#rank').classList.add('entra'); contarTudo($('#rank'), '.v', 45); }
  const outro = S.met === 'soma' ? 'phi' : 'soma', comuns = ord.filter(i => R.pos[outro][i] <= 10).length;
  $('#rank-nota').textContent = `${comuns} de 10 também estão no top 10 do ${outro === 'phi' ? 'PROMETHEE II' : 'soma ponderada'}. ${S.esc === 'sp' ? 'Bloco SP: inclui o ISDEL.' : 'Brasil: 5 critérios eleitorais.'}`;
}
$('#rank').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { selecionar(+b.dataset.i); if (celular.matches) aba('mapa'); } });
document.querySelectorAll('[data-met]').forEach(b => b.onclick = () => { S.met = b.dataset.met; ranking(); });

const delta = s => margemT(s, 1) - margemT(s, 0);
const dTxt = x => `<span class="${x > 0 ? 't13' : 't22'}">${x > 0 ? '13' : '22'} +${dec(Math.abs(100 * x))}</span>`;
function mudou() {
  queueMicrotask(() => { contarTudo($('#regioes'), 'li > span', 60); contarTudo($('#ufbars'), '.n', 15); });
  const { d, ufs, s, nomes } = E();
  if (S.esc === 'br') {
    const reg = Object.entries(REGIAO).map(([c, nome]) => [nome, totais(d, d.ibge.map((_, i) => i).filter(i => String(d.ibge[i])[0] === c))]);
    $('#regioes').innerHTML = [['Brasil', s], ...reg].map(([n, st]) => `<li><b>${n}</b>${dTxt(delta(st))}</li>`).join('');
    const linhas = ufs.map(u => [u.sig, delta(u.s)]).sort((a, b) => b[1] - a[1]);
    const mx = Math.max(...linhas.map(l => Math.abs(l[1])));
    $('#ufbars').innerHTML = linhas.map(([sig, x]) => `<li><span>${sig}</span><span class="trilho"><i style="${x > 0 ? 'left:50%' : 'right:50%'};width:${50 * Math.abs(x) / mx}%;background:var(${x > 0 ? '--c13' : '--c22'})"></i></span><span class="n">${x > 0 ? '+' : '−'}${dec(Math.abs(100 * x))}</span></li>`).join('');
  } else {
    $('#regioes').innerHTML = `<li><b>São Paulo</b>${dTxt(delta(s))}</li>`;
    const linhas = d.ibge.map((_, i) => [i, d.margem26[i] - d.margem22[i]]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 12);
    const mx = Math.abs(linhas[0][1]);
    $('#ufbars').innerHTML = linhas.map(([i, x]) => `<li style="grid-template-columns:7.5em 1fr 3.6em"><span title="${esc(d.nome[i])}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(d.nome[i])}</span><span class="trilho"><i style="${x > 0 ? 'left:50%' : 'right:50%'};width:${50 * Math.abs(x) / mx}%;background:var(${x > 0 ? '--c13' : '--c22'})"></i></span><span class="n">${x > 0 ? '+' : '−'}${dec(Math.abs(100 * x))}</span></li>`).join('');
  }
}

// Por região: quem venceu em 2026, com quanto, barra com marca de 50% e variação desde 2022
function porRegiao() {
  const { d, s } = E();
  const linhas = S.esc === 'br'
    ? [['Brasil', s], ...Object.entries(REGIAO).map(([c, n]) => [{ N: 'Norte', NE: 'Nordeste', SE: 'Sudeste', S: 'Sul', CO: 'Centro-Oeste' }[n], totais(d, d.ibge.map((_, i) => i).filter(i => String(d.ibge[i])[0] === c))])]
    : [['São Paulo', s], ['Capital', totais(d, d.nome.map((n, i) => i).filter(i => d.nome[i] === 'São Paulo'))], ['Interior', totais(d, d.nome.map((n, i) => i).filter(i => d.nome[i] !== 'São Paulo'))]];
  $('#porreg').innerHTML = linhas.map(([nome, st]) => {
    const t = st[1][13] + st[1][22], p13 = st[1][13] / t, v = p13 >= .5 ? 13 : 22, pv = v === 13 ? p13 : 1 - p13;
    const dl = 100 * (delta(st) / 2) * (v === 13 ? 1 : -1);
    return `<li><span class="anel" aria-hidden="true"><i>100</i></span><span class="rn">${nome}</span><span class="rv t${v}"><b class="tag">${v}</b><span class="pc">${dec(100 * pv)}%</span></span><span class="rd">${dl >= 0 ? '+' : '−'}${dec(Math.abs(dl))}</span><span class="rb"><i style="width:${100 * p13}%"></i><em></em></span></li>`;
  }).join('');
  queueMicrotask(() => contarTudo($('#porreg'), '.pc', 50));
}

// Seleção: card do município ou do estado, e pílula
function linhaAno(v13, v22, a) { const m = (v13 - v22) / (v13 + v22); return `<tr><td>${a}</td><td class="t13">${nf.format(v13)}</td><td class="t22">${nf.format(v22)}</td><td>${m ? `${lado(m)} +${pp(m)}` : 'empate'}</td></tr>`; }
const tabela = rows => `<table><thead><tr><th>Ano</th><th>Votos 13</th><th>Votos 22</th><th>Margem</th></tr></thead><tbody>${rows}</tbody></table>`;
function mostrarCard(html) {
  const c = $('#card'); c.hidden = false;
  c.innerHTML = `<button type="button" class="fechar" aria-label="Fechar">×</button>` + html;
  c.querySelector('.fechar').onclick = () => { c.hidden = true; S.sel = null; S.ufSel = null; pilula(); ranking(); redesenhar(); };
}
function posicoes(ibge) {
  const out = [];
  [['br', brIdx, 'Brasil'], ['sp', spIdx, 'SP']].forEach(([k, mp, nome]) => {
    const R = ESC[k].rank, j = mp.get(ibge);
    if (R && j !== undefined) out.push(`Ranking ${nome}: ${R.pos.soma[j]}º na soma · ${R.pos.phi[j]}º no PROMETHEE`);
  });
  return out.map(t => `<p class="nota">${t}</p>`).join('');
}
function selecionar(i) {
  const { d, nomes } = E();
  S.sel = i; S.ufSel = null;
  mostrarCard(`<h3>${esc(nomes[i])}</h3>` + tabela(linhaAno(d.t22['13'][i], d.t22['22'][i], 2022) + linhaAno(d.t26['13'][i], d.t26['22'][i], 2026)) +
    `<span class="selo ${d.virou[i] ? 'sim' : ''}">${d.virou[i] ? 'Virou' : 'Não virou'}</span>` + posicoes(d.ibge[i]));
  pilula(); ranking(); redesenhar();
}
function selecionarUF(sig) {
  const u = E().ufs.find(x => x.sig === sig);
  S.ufSel = sig; S.sel = null;
  mostrarCard(`<h3>${UFNOME[sig]}</h3>` + tabela(linhaAno(u.s[0][13], u.s[0][22], 2022) + linhaAno(u.s[1][13], u.s[1][22], 2026)) +
    `<p class="nota">${nf.format(u.viraram)} de ${nf.format(u.idx.length)} municípios viraram de lado.</p>`);
  pilula(); redesenhar();
}
function pilula() {
  const { d, nomes, rank } = E(), p = $('#pilula');
  if (S.ufSel) { const u = E().ufs.find(x => x.sig === S.ufSel); p.textContent = `${UFNOME[S.ufSel]} · ${u.viraram} municípios viraram`; p.dataset.i = ''; return; }
  const i = S.sel ?? rank?.phi[0];
  if (i === undefined) { p.textContent = ''; return; }
  p.dataset.i = i;
  p.textContent = `${S.sel === null ? '1º do ranking · ' : ''}${S.esc === 'br' ? nomes[i] : d.nome[i]} ${d.virou[i] ? 'virou' : 'não virou'} · margem ${pp(d.margem26[i])} em 2026`;
}
$('#pilula').onclick = e => { const i = e.currentTarget.dataset.i; if (i !== '') selecionar(+i); };

// Apura: o assistente responde e acende os municípios no mapa
const blocoPerg = k => ({ d: ESC[k].d, uf: ESC[k].uf });
function responder(q) {
  const rank = { br: ESC.br.rank && { prom: ESC.br.rank.phi, soma: ESC.br.rank.soma }, sp: ESC.sp.rank && { prom: ESC.sp.rank.phi, soma: ESC.sp.rank.soma } };
  const r = perguntar(q, { br: blocoPerg('br'), sp: blocoPerg('sp'), rank });
  if (!r) return null;
  if (r.escopo !== S.esc) trocarEscopo(r.escopo);
  S.realce = new Set(r.idx); redesenhar();
  const { d, nomes } = E(), mais = r.idx.length - 8;
  return `<p class="tit">${esc(r.titulo)}</p><p class="num"><span class="n">${nf.format(r.total)}</span> <small>município${r.total === 1 ? '' : 's'} acesos no mapa</small></p>` +
    `<ol>${r.idx.slice(0, 8).map(i => `<li><button type="button" data-i="${i}"><span>${esc(nomes[i])}</span><small>${lado(d.margem22[i])}→${lado(d.margem26[i])} · ${pp(d.margem26[i])}</small></button></li>`).join('')}</ol>` +
    (mais > 0 ? `<p class="nota">e mais ${nf.format(mais)}.</p>` : '');
}
const apura = montarApura({
  responder, sugestoes: SUGESTOES,
  limpar: () => { S.realce = null; redesenhar(); },
  abrirMunicipio: i => { selecionar(i); if (celular.matches) aba('mapa'); },
});
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
$('#busca').addEventListener('change', e => {
  const q = norm(e.target.value), { nomes } = E();
  const i = nomes.findIndex(n => norm(n) === q || norm(n.replace(/ \(..\)$/, '')) === q);
  if (i >= 0) { selecionar(i); if (celular.matches) aba('mapa'); }
});

// Escopo, abas, tema, tela cheia
function trocarEscopo(k) {
  S.esc = k; S.sel = null; S.ufSel = null; S.realce = null; S.view = { k: 1, x: 0, y: 0 };
  document.querySelectorAll('[data-esc]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.esc === k)));
  $('#municipios').innerHTML = E().nomes.map(n => `<option value="${esc(n)}">`).join('');
  $('#card').hidden = true;
  placar(); ranking(); mudou(); porRegiao(); pilula(); redesenhar();
}
document.querySelectorAll('[data-esc]').forEach(b => b.onclick = () => trocarEscopo(b.dataset.esc));

function aba(nome) {
  if (nome === 'metodo') { $('#metodo').showModal(); return; }
  if (nome === 'perguntar') { apura.abrir(); return; }
  document.body.dataset.aba = nome;
  document.querySelectorAll('[data-aba]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.aba === nome)));
  if (nome === 'mapa') redesenhar();
}
document.querySelectorAll('.abas [data-aba]').forEach(b => b.onclick = () => aba(b.dataset.aba));
$('#abre-metodo').onclick = () => $('#metodo').showModal();
// No celular o card flutua sobre o mapa; no desktop fica na coluna direita
const posCard = () => (celular.matches ? wrap : $('.col.dir')).appendChild($('#card'));
celular.addEventListener('change', () => { posCard(); redesenhar(); });

$('#tema').onclick = () => {
  const escuro = getComputedStyle(document.documentElement).colorScheme === 'dark';
  document.documentElement.dataset.theme = escuro ? 'light' : 'dark';
  try { localStorage.setItem('tema', document.documentElement.dataset.theme); } catch {}
  lerCores(); placar(); redesenhar();
};
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { lerCores(); placar(); redesenhar(); });
if (!document.fullscreenEnabled) $('#cheia').hidden = true;
$('#cheia').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();

// Critérios e pesos do notebook
const crit = c => c ? `<ul>${Object.entries(c).map(([n, p]) => `<li>${esc(n)} · <strong>${dec(100 * p, 0)}%</strong></li>`).join('')}</ul>` : '';
$('#criterios').innerHTML = RK?.criterios ? `<h3>Brasil</h3>${crit(RK.criterios.br)}<h3>São Paulo (com ISDEL)</h3>${crit(RK.criterios.sp)}` : '<p class="nota">Critérios indisponíveis.</p>';

lerCores(); posCard(); trocarEscopo('br');
document.fonts?.ready.then(redesenhar);
