// Apura: assistente do site. Botão flutuante, painel de conversa e um orbe que pisca, olha em volta e reage.
const calmo = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const orbe = tam => `<span class="orb" style="width:${tam}px;height:${tam}px;--s:${tam}px" aria-hidden="true"><span class="orb-ball"><i class="orb-swirl"></i>
<svg class="orb-face" viewBox="0 0 100 100"><g class="orb-eyes">${[37, 63].map((x, k) => `<g transform="translate(${x} 47)"><g class="orb-eye ${k ? 'r' : 'l'}"><g class="orb-lid"><rect class="orb-pill" x="-4.1" y="-10" width="8.2" height="20" rx="4.1"/><path class="orb-arc" d="M-6.2 2.8Q0-4.8 6.2 2.8"/></g></g></g>`).join('')}</g></svg>
<i class="orb-rim"></i><i class="orb-shine"></i></span></span>`;

// Vida do orbe: piscar de vez em quando, olhar para o ponteiro, humor por alguns instantes.
function vida(el) {
  const olhar = (x, y) => { el.style.setProperty('--gx', x.toFixed(3)); el.style.setProperty('--gy', y.toFixed(3)); };
  const piscar = () => { el.classList.add('blink'); setTimeout(() => el.classList.remove('blink'), 140); };
  const loop = () => setTimeout(() => { if (!document.hidden && !calmo()) piscar(); loop(); }, 2600 + Math.random() * 3400);
  loop();
  addEventListener('pointermove', e => {
    if (calmo()) return;
    const r = el.getBoundingClientRect(); if (!r.width) return;
    const dx = (e.clientX - (r.left + r.width / 2)) / innerWidth, dy = (e.clientY - (r.top + r.height / 2)) / innerHeight;
    olhar(Math.max(-1, Math.min(1, dx * 2.4)), Math.max(-1, Math.min(1, dy * 2.4)));
  }, { passive: true });
  return humor => {
    el.dataset.mood = humor;
    if (humor !== 'thinking' && humor !== 'listening') setTimeout(() => { if (el.dataset.mood === humor) el.dataset.mood = 'idle'; }, 1600);
  };
}

export function montarApura({ responder, sugestoes, limpar, abrirMunicipio }) {
  const fab = document.createElement('button');
  fab.type = 'button'; fab.className = 'apura-fab'; fab.setAttribute('aria-haspopup', 'dialog'); fab.setAttribute('aria-expanded', 'false');
  fab.innerHTML = `${orbe(34)}<span>Pergunte ao Apura</span>`;
  const painel = document.createElement('section');
  painel.className = 'apura-painel'; painel.setAttribute('role', 'dialog'); painel.setAttribute('aria-label', 'Apura, assistente do mapa'); painel.hidden = true;
  painel.innerHTML = `<header class="apura-cab">${orbe(30)}<div class="apura-id"><strong>Apura</strong><small>assistente do mapa · responde com os dados do TSE</small></div><button type="button" class="apura-x" aria-label="Fechar">×</button></header>
  <div class="apura-corpo" aria-live="polite"><div class="apura-ola">${orbe(64)}<h3>Oi, eu sou o <span>Apura</span>.</h3><p>Pergunte sobre qualquer município, estado ou o ranking. Eu acendo a resposta no mapa.</p>
  <div class="apura-sug">${sugestoes.map(s => `<button type="button">${esc(s)}</button>`).join('')}</div></div></div>
  <form class="apura-entrada"><input aria-label="Pergunta para o Apura" placeholder="Ex.: quais viraram em MG" autocomplete="off"><button type="submit" aria-label="Enviar">↑</button></form>`;
  document.body.append(painel, fab);
  const corpo = painel.querySelector('.apura-corpo'), campo = painel.querySelector('input');
  const humorFab = vida(fab.querySelector('.orb')), humor = vida(painel.querySelector('.apura-cab .orb'));
  vida(painel.querySelector('.apura-ola .orb'));

  const abrir = () => { painel.hidden = false; fab.setAttribute('aria-expanded', 'true'); fab.classList.add('aberto'); humor('happy'); setTimeout(() => campo.focus(), 60); };
  const fechar = () => { painel.hidden = true; fab.setAttribute('aria-expanded', 'false'); fab.classList.remove('aberto'); fab.focus(); };
  const msg = (cls, html) => { const m = document.createElement('div'); m.className = 'apura-msg ' + cls; m.innerHTML = html; corpo.append(m); corpo.scrollTop = corpo.scrollHeight; return m; };
  const perguntar = q => {
    q = q.trim(); if (!q) return;
    msg('eu', esc(q)); campo.value = ''; humor('thinking');
    const pensando = msg('apura pensando', '<i></i><i></i><i></i>');
    setTimeout(() => {
      pensando.remove();
      const html = responder(q);
      if (html) { msg('apura', html + '<button type="button" class="apura-limpar">Limpar o mapa</button>'); humor('excited'); humorFab('happy'); }
      else { msg('apura', 'Não entendi essa. Tente por estado, quem virou, vencedor, margem, maiores cidades ou top do ranking.'); humor('confused'); }
    }, calmo() ? 0 : 520);
  };
  fab.onclick = () => painel.hidden ? abrir() : fechar();
  painel.querySelector('.apura-x').onclick = fechar;
  painel.querySelector('form').onsubmit = e => { e.preventDefault(); perguntar(campo.value); };
  campo.addEventListener('focus', () => humor('listening'));
  campo.addEventListener('blur', () => humor('idle'));
  painel.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });
  corpo.addEventListener('click', e => {
    const s = e.target.closest('.apura-sug button'); if (s) return perguntar(s.textContent);
    if (e.target.closest('.apura-limpar')) return limpar();
    const b = e.target.closest('[data-i]'); if (b) abrirMunicipio(+b.dataset.i);
  });
  return { abrir, fechar };
}
