// node vp1/site/calc.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodeTopo } from './calc.js';

const ler = f => JSON.parse(readFileSync(new URL(f, import.meta.url)));
const sp = decodeTopo(ler('../dados/sp-municipios.topo.json'));
assert.equal(sp.length, 645);
assert.ok(sp.every(g => g.rings.length && g.rings[0].length > 3));
const [lon, lat] = sp[0].rings[0][0];
assert.ok(lon > -54 && lon < -44 && lat > -26 && lat < -19, 'coordenadas dentro de SP');
const uf = decodeTopo(ler('br-uf.topo.json'));
assert.equal(uf.length, 27);
assert.ok(uf.every(g => g.props.lx > -75 && g.props.lx < -28 && g.props.ly > -34 && g.props.ly < 6), 'ponto de rótulo dentro do Brasil');
console.log('ok');
