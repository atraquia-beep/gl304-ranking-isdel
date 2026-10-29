// node vp1/site/calc.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodeTopo, somaPonderada, promethee, ordem } from './calc.js';

// 3 alternativas, 2 critérios: A domina, C é dominada.
const cols = [[3, 2, 1], [10, 20, 30]], dirs = [1, -1], pesos = [0.5, 0.5], nomes = ['A', 'B', 'C'];
assert.deepEqual(ordem(somaPonderada(cols, dirs, pesos), nomes), [0, 1, 2]);
const phi = promethee(cols, dirs, pesos);
assert.deepEqual(phi, [1, 0, -1]);
assert.ok(Math.abs(phi.reduce((a, b) => a + b)) < 1e-12, 'fluxos líquidos somam zero');
// empate não conta como preferência
assert.deepEqual(promethee([[1, 1]], [1], [1]), [0, 0]);

const geo = decodeTopo(JSON.parse(readFileSync(new URL('./mock/sp-municipios.topo.json', import.meta.url))));
assert.equal(geo.length, 645);
assert.ok(geo.every(g => g.rings.length && g.rings[0].length > 3));
const [lon, lat] = geo[0].rings[0][0];
assert.ok(lon > -54 && lon < -44 && lat > -26 && lat < -19, 'coordenadas dentro de SP');
console.log('ok');
