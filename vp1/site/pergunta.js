// "Pergunte ao mapa": regras locais (sem modelo de linguagem) que viram filtro + ordem sobre os JSON.

export const UFS = { RO: 'rondonia', AC: 'acre', AM: 'amazonas', RR: 'roraima', PA: 'para', AP: 'amapa', TO: 'tocantins', MA: 'maranhao', PI: 'piaui', CE: 'ceara', RN: 'rio grande do norte', PB: 'paraiba', PE: 'pernambuco', AL: 'alagoas', SE: 'sergipe', BA: 'bahia', MG: 'minas gerais', ES: 'espirito santo', RJ: 'rio de janeiro', SP: 'sao paulo', PR: 'parana', SC: 'santa catarina', RS: 'rio grande do sul', MS: 'mato grosso do sul', MT: 'mato grosso', GO: 'goias', DF: 'distrito federal' };
// Nomes compostos antes dos curtos ("mato grosso do sul" antes de "mato grosso", "rio grande do norte" antes de "para").
const NOMES = Object.entries(UFS).sort((a, b) => b[1].length - a[1].length);
export const SUGESTOES = ['Quais viraram em MG', 'Top 10 em SP', 'Margem menor que 1 ponto', 'Maiores cidades que viraram para o 13'];

export const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// q: texto; br/sp: {d, uf[]} (br pode faltar); rank: {br, sp}, cada um {prom, soma} = índices em ordem (bloco pode faltar).
// Devolve {escopo, idx, total, titulo} ou null se nenhuma regra reconhecer a pergunta.
export function perguntar(q, { br, sp, rank }) {
  const t = ' ' + norm(q) + ' ', partes = [];
  let uf = null;
  // Sempre com preposição antes: "para o 13" não pode virar Pará, nem "se" Sergipe.
  const PREP = '(?:em|no|na|de|do|da|nos|nas)';
  for (const [sig, nome] of NOMES) if (new RegExp(` ${PREP} ${nome} `).test(t)) { uf = sig; break; }
  if (!uf) uf = [...t.matchAll(new RegExp(` ${PREP} ([a-z]{2})(?= )`, 'g'))].map(x => x[1].toUpperCase()).find(s => UFS[s]) || null;
  const ano = / 2022 /.test(t) ? '22' : '26';
  const n = +(t.match(/ top ?(\d+) /)?.[1] || t.match(/ (\d+) (?:maiores|menores|primeir|mais) /)?.[1] || 0);
  const maiores = / maior(es)? (cidades|municipios)| maiores /.test(t) && !/ margem maior /.test(t), menores = / menores /.test(t);

  // Ranking: SP (com ISDEL) quando a pergunta cita SP; senão, Brasil
  const bl = uf === 'SP' || !rank?.br ? 'sp' : 'br';
  if (/ (top|ranking|prioridade)/.test(t) && !maiores && !menores && rank?.[bl]) {
    const metodo = / soma /.test(t) ? 'soma' : 'prom';
    const k = n || 10;
    return { escopo: bl, idx: rank[bl][metodo].slice(0, k), total: k, titulo: `Top ${k} do ranking ${bl === 'sp' ? 'de SP' : 'do Brasil'} (${metodo === 'soma' ? 'soma ponderada' : 'PROMETHEE II'})` };
  }

  const base = br || sp, d = base.d, f = [];
  if (uf) { f.push(i => base.uf[i] === uf); partes.push(uf); }
  const virou = / vir(ou|aram|ada|adas|ar) /.test(t);
  const para = t.match(/ para o (13|22) /)?.[1];
  if (virou) { f.push(i => d.virou[i] === 1); partes.push('viraram'); }
  if (para) { f.push(i => para === '13' ? d.margem26[i] > 0 : d.margem26[i] < 0); partes.push(`${virou ? 'para o' : 'vencidos pelo'} ${para}`); }
  const venc = !para && t.match(/ (?:venceu|ganhou|vitoria do|vitorias do) (?:o )?(13|22) | (13|22) (?:venceu|ganhou) /);
  if (venc) { const c = venc[1] || venc[2]; f.push(i => c === '13' ? d['margem' + ano][i] > 0 : d['margem' + ano][i] < 0); partes.push(`${c} venceu em 20${ano}`); }
  const mg = t.match(/ margem (menor|abaixo|inferior|maior|acima|superior) (?:que |de |a |do que )?(\d+(?:[.,]\d+)?) ?(pontos?|p\.? ?p\.?|%)? /);
  if (mg) {
    const lim = parseFloat(mg[2].replace(',', '.')) / 100, menor = /menor|abaixo|inferior/.test(mg[1]);
    f.push(i => menor ? Math.abs(d['margem' + ano][i]) < lim : Math.abs(d['margem' + ano][i]) > lim);
    partes.push(`margem ${menor ? '<' : '>'} ${mg[2]} p.p. em 20${ano}`);
  }
  if (!f.length && !maiores && !menores) return null;

  const idx = d.ibge.map((_, i) => i).filter(i => f.every(g => g(i)));
  const el = d.t26.eleitorado;
  if (menores) idx.sort((a, b) => el[a] - el[b]);
  else if (mg && !maiores) idx.sort((a, b) => Math.abs(d['margem' + ano][a]) - Math.abs(d['margem' + ano][b]));
  else idx.sort((a, b) => el[b] - el[a]);
  if (maiores || menores) partes.push(`${maiores ? 'maiores' : 'menores'} por eleitorado`);
  const total = idx.length;
  return { escopo: br ? 'br' : 'sp', idx: n ? idx.slice(0, n) : idx, total: n ? Math.min(n, total) : total, titulo: partes.join(' · ') };
}
