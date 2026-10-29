// Malha TopoJSON -> anéis de coordenadas (sem DOM). O ranking vem do notebook (vp1/notebook/ranking.json).

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
