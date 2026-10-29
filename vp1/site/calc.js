// Cálculos puros (sem DOM): malha TopoJSON, critérios e as duas metodologias de ranking.

// TopoJSON -> lista de anéis [[lon,lat],...] por geometria, na ordem do objeto.
export function decodeTopo(topo) {
  const t = topo.transform;
  const arcs = topo.arcs.map(arc => {
    let x = 0, y = 0;
    return arc.map(p => t ? (x += p[0], y += p[1], [x * t.scale[0] + t.translate[0], y * t.scale[1] + t.translate[1]]) : p);
  });
  const ring = idx => idx.flatMap((i, k) => {
    const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
    return k ? a.slice(1) : a;
  });
  const geoms = Object.values(topo.objects)[0].geometries;
  return geoms.map(g => ({
    props: g.properties,
    rings: g.type === 'Polygon' ? g.arcs.map(ring) : g.type === 'MultiPolygon' ? g.arcs.flat().map(ring) : [],
  }));
}

// Critérios do ranking; dir = +1 maior é melhor, -1 menor é melhor.
export const CRITERIOS = [
  { id: 'virou', nome: 'Virou', dir: 1, peso: 0.2, v: d => d.virou },
  { id: 'margem', nome: '|Margem 2026|', dir: -1, peso: 0.2, v: d => d.margem26.map(Math.abs) },
  { id: 'eleitorado', nome: 'Eleitorado 2026', dir: 1, peso: 0.2, v: d => d.t26.eleitorado },
  { id: 'abstencao', nome: 'Abstenção 2026', dir: 1, peso: 0.2, v: d => d.t26.comparecimento.map((c, i) => 1 - c / d.t26.eleitorado[i]) },
  { id: 'isdel', nome: 'ISDEL', dir: 1, peso: 0.2, v: d => d.isdel.isdel },
];

// Soma ponderada sobre critérios normalizados min-max (0 = pior, 1 = melhor).
export function somaPonderada(cols, dirs, pesos) {
  const n = cols[0].length, s = new Float64Array(n);
  cols.forEach((c, k) => {
    const lo = Math.min(...c), hi = Math.max(...c), r = hi - lo || 1;
    for (let i = 0; i < n; i++) s[i] += pesos[k] * (dirs[k] > 0 ? c[i] - lo : hi - c[i]) / r;
  });
  return Array.from(s);
}

function bound(arr, v, upper) {
  let lo = 0, hi = arr.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < v || (upper && arr[mid] === v)) lo = mid + 1; else hi = mid; }
  return lo;
}

// PROMETHEE II, função usual: P_k(a,b) = 1 se f_k(a) > f_k(b). Mesma lógica do app da Atividade 4.
export function promethee(cols, dirs, pesos) {
  const n = cols[0].length, tot = pesos.reduce((a, b) => a + b, 0), phi = new Float64Array(n);
  cols.forEach((c, k) => {
    const wk = pesos[k] / tot / (n - 1), v = c.map(x => dirs[k] * x), sorted = v.slice().sort((a, b) => a - b);
    for (let i = 0; i < n; i++) phi[i] += wk * (bound(sorted, v[i], false) - (n - bound(sorted, v[i], true)));
  });
  return Array.from(phi);
}

// Índices em ordem decrescente de nota; empate desempata por nome.
export function ordem(nota, nomes) {
  return nota.map((_, i) => i).sort((a, b) => nota[b] - nota[a] || nomes[a].localeCompare(nomes[b], 'pt-BR'));
}
