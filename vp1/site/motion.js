// Movimento: números que contam até o valor, e o "polegar" de vidro que desliza nos seletores.
const calmo = matchMedia('(prefers-reduced-motion: reduce)');
const NUM = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g;
const ler = s => +s.replace(/\./g, '').replace(',', '.');
const casas = s => (s.split(',')[1] || '').length;
const fmt = (x, d) => x.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const ease = t => 1 - Math.pow(1 - t, 4);

// Troca o texto de `el` por `novo`, fazendo cada número contar a partir do texto anterior (ou de zero).
export function contar(el, novo, { de, dur = 1100, instantaneo = false } = {}) {
  if (!el) return;
  cancelAnimationFrame(el._raf);
  const antes = (de ?? el._alvo ?? '').match(NUM) || [];
  el._alvo = novo;
  const partes = novo.split(NUM), alvos = novo.match(NUM) || [];
  if (instantaneo || calmo.matches || !alvos.length || antes.join() === alvos.join()) { el.textContent = novo; return; }
  const ini = alvos.map((a, k) => (antes[k] !== undefined ? ler(antes[k]) : 0));
  let t0 = 0;
  const passo = now => {
    t0 ||= now;
    const t = Math.min(1, (now - t0) / dur), e = ease(t);
    el.textContent = partes.reduce((s, p, k) => s + p + (k < alvos.length ? fmt(ini[k] + (ler(alvos[k]) - ini[k]) * e, casas(alvos[k])) : ''), '');
    if (t < 1) el._raf = requestAnimationFrame(passo); else el.textContent = novo;
  };
  el._raf = requestAnimationFrame(passo);
}

// Anima a partir de zero todos os elementos que casam com `sel` dentro de `raiz`, em cascata.
export function contarTudo(raiz, sel, passoMs = 40) {
  raiz?.querySelectorAll(sel).forEach((el, k) => {
    const alvo = el.textContent;
    el.textContent = alvo.replace(NUM, m => fmt(0, casas(m)));
    setTimeout(() => contar(el, alvo, { de: el.textContent }), k * passoMs);
  });
}

// Polegar de vidro: um por grupo de botões com aria-pressed, segue o botão ativo com mola.
function polegar(grupo) {
  const th = document.createElement('span');
  th.className = 'thumb'; th.setAttribute('aria-hidden', 'true');
  grupo.prepend(th);
  const mover = (anim = true) => {
    const b = grupo.querySelector('[aria-pressed="true"]');
    th.style.opacity = b ? 1 : 0;
    if (!b) return;
    const novo = `translate(${b.offsetLeft}px, ${b.offsetTop}px)`;
    if (anim && th.style.transform && th.style.transform !== novo && !calmo.matches) {
      th.classList.remove('squish'); void th.offsetWidth; th.classList.add('squish');
    }
    th.style.width = b.offsetWidth + 'px'; th.style.height = b.offsetHeight + 'px';
    th.style.transform = novo;
  };
  new MutationObserver(() => mover()).observe(grupo, { attributes: true, subtree: true, attributeFilter: ['aria-pressed'] });
  new ResizeObserver(() => mover(false)).observe(grupo);
  document.fonts?.ready.then(() => mover(false));
  mover(false);
}
document.querySelectorAll('.tabs, .seg, .anos').forEach(polegar);
