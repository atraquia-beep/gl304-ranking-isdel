// node vp1/site/pergunta.test.mjs — esperados conferidos à parte em Python sobre vp1/dados/br.json
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { perguntar, SUGESTOES } from './pergunta.js';

const ler = f => JSON.parse(readFileSync(new URL('../dados/' + f, import.meta.url)));
const UF = { 15: 'PA', 31: 'MG', 35: 'SP' };
const comUf = d => ({ d, uf: d.ibge.map(c => UF[String(c).slice(0, 2)] || '??') });
const br = comUf(ler('br.json')), sp = comUf(ler('sp.json'));
const rank = { prom: [5, 4, 3, 2, 1, 0, 6, 7, 8, 9, 10, 11], soma: [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0] };
const P = q => perguntar(q, { br, sp, rank });

// As quatro sugestões da tela
assert.equal(P('Quais viraram em MG').total, 56);
assert.deepEqual(P('Top 10 em SP'), { escopo: 'sp', idx: rank.prom.slice(0, 10), total: 10, titulo: 'Top 10 do ranking de SP (PROMETHEE II)' });
assert.equal(P('Margem menor que 1 ponto').total, 86);
const v13 = P('Maiores cidades que viraram para o 13');
assert.equal(v13.total, 31);
assert.equal(br.d.nome[v13.idx[0]], 'Rio de Janeiro');
SUGESTOES.forEach(s => assert.ok(P(s), s));

// Variações
assert.equal(P('viraram no Pará').total, 9);              // "para" com preposição = UF
assert.equal(P('viraram para o 13').total, 31);           // "para o" não é Pará
assert.equal(P('quais viraram em minas gerais').total, 56);
assert.equal(P('onde o 13 venceu em 2022 em SP').total, 97);
assert.equal(P('margem menor que 1,0 p.p.').total, 86);
assert.equal(P('top 5 soma').idx.length, 5);
assert.deepEqual(P('top 3 pela soma').idx, rank.soma.slice(0, 3));
assert.equal(P('5 maiores que viraram').idx.length, 5);
assert.equal(P('qual a cor do céu'), null);
console.log('ok');
