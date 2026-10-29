"""Gera mock/sp.json FICTÍCIO no formato de vp1/dados/sp.json, a partir da malha em mock/.

Uso: python3 vp1/site/mock/gerar_mock.py
Votos e ISDEL são aleatórios (semente fixa); só códigos e nomes são reais.
"""
import json, math, random
from pathlib import Path

aqui = Path(__file__).parent
topo = json.loads((aqui / "sp-municipios.topo.json").read_text())
geoms = next(iter(topo["objects"].values()))["geometries"]
rnd = random.Random(2026)

ibge = [g["properties"]["ibge"] for g in geoms]
nome = [g["properties"]["nome"] for g in geoms]
n = len(ibge)

def turno(eleitorado, margem):
    comp = [round(e * rnd.uniform(0.74, 0.86)) for e in eleitorado]
    val = [round(c * rnd.uniform(0.92, 0.97)) for c in comp]
    v13 = [round(v * (1 + m) / 2) for v, m in zip(val, margem)]
    return {"13": v13, "22": [v - a for v, a in zip(val, v13)], "validos": val,
            "comparecimento": comp, "eleitorado": eleitorado}

el22 = [9300000 if c == 3550308 else max(1000, round(math.exp(rnd.gauss(9.6, 1.2)))) for c in ibge]
el26 = [round(e * rnd.uniform(1.0, 1.05)) for e in el22]
m22 = [max(-0.9, min(0.9, rnd.gauss(-0.14, 0.16))) for _ in ibge]
m26 = [max(-0.9, min(0.9, m + rnd.gauss(0.03, 0.06))) for m in m22]
t22, t26 = turno(el22, m22), turno(el26, m26)

def margem(t):
    return [round((a - b) / v, 4) for a, b, v in zip(t["13"], t["22"], t["validos"])]

comp = {k: [round(rnd.random(), 3) for _ in ibge] for k in ("educacao", "densidade", "tecido", "gestao")}
comp["isdel"] = [round(sum(comp[k][i] for k in ("educacao", "densidade", "tecido", "gestao")) / 4, 3) for i in range(n)]
mg22, mg26 = margem(t22), margem(t26)

out = {"versao": 1, "gerado": "2026-10-29T00:00:00Z",
       "fontes": {"aviso": "DADOS FICTÍCIOS para desenvolvimento. Só códigos e nomes IBGE são reais."},
       "n": n, "ibge": ibge, "nome": nome, "t22": t22, "t26": t26,
       "virou": [int((a > 0) != (b > 0)) for a, b in zip(mg22, mg26)],
       "margem22": mg22, "margem26": mg26, "isdel": comp}
(aqui / "sp.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
print(n, "municípios;", sum(out["virou"]), "viraram")
