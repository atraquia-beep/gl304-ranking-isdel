# Junta o 2º turno presidencial 2022 (Lula x Bolsonaro) e 2026 (Lula x Flávio) por município
# CD_MUNICIPIO vem com ou sem zeros à esquerda conforme o arquivo; normalizado com lstrip("0").
# a partir dos dados abertos do TSE e conta quem virou de lado. Uso: python3 -I viradas.py <pasta_dl>
import csv, io, json, sys, zipfile, collections

D = sys.argv[1]
tse2ibge = {m["cd"].lstrip("0"): (a["cd"].upper(), m["cdi"], m["nm"])
            for a in json.load(open(f"{D}/mun.json"))["abr"] for m in a["mu"]}

def ler(zipname, member):
    return csv.DictReader(io.TextIOWrapper(zipfile.ZipFile(f"{D}/{zipname}").open(member), "latin1"), delimiter=";")

def votos(zipname, member):
    v = collections.defaultdict(lambda: [0, 0])  # [13, 22]
    for r in ler(zipname, member):
        if r["NR_TURNO"] == "2" and r["CD_CARGO"] == "1" and r["SG_UF"] != "ZZ":
            v[r["CD_MUNICIPIO"].lstrip("0")][r["NR_CANDIDATO"] == "22"] += int(r["QT_VOTOS_NOMINAIS_VALIDOS"])
    return v

v22 = votos("vc22.zip", "votacao_candidato_munzona_2022_BR.csv")
v26 = votos("vc26.zip", "votacao_candidato_munzona_2026_BR.csv")
apt, abst = collections.Counter(), collections.Counter()
for r in ler("dv26.zip", "detalhe_votacao_munzona_2026_BR.csv"):
    if r["NR_TURNO"] == "2" and r["SG_UF"] != "ZZ":
        apt[r["CD_MUNICIPIO"].lstrip("0")] += int(r["QT_APTOS"])
        abst[r["CD_MUNICIPIO"].lstrip("0")] += int(r["QT_ABSTENCOES"])

novos = set(v26) - set(v22)  # municípios instalados depois de 2022 não têm base de comparação
assert not set(v22) - set(v26)
print("fora da comparação (sem 2022):", [tse2ibge[c] for c in novos])
rows = []
for cd in v22:
    uf, ibge, nome = tse2ibge[cd]
    (l22, b22), (l26, b26) = v22[cd], v26[cd]
    m22 = (l22 - b22) / (l22 + b22)  # margem a favor do 13, em fração dos válidos
    m26 = (l26 - b26) / (l26 + b26)
    rows.append(dict(uf=uf, ibge=ibge, municipio=nome, lula22=l22, bolsonaro22=b22, lula26=l26, flavio26=b26,
                     margem22=round(m22, 4), margem26=round(m26, 4), virou=int((m22 > 0) != (m26 > 0)),
                     aptos26=apt[cd], abstencao26=round(abst[cd] / apt[cd], 4)))

with open(f"{D}/viradas.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=rows[0]); w.writeheader(); w.writerows(rows)

# validação: Adamantina-SP conferida contra a API de resultados do TSE (5260 x 14667, 25498 aptos, 4922 abst.)
ad = next(r for r in rows if r["ibge"] == "3500105")
assert (ad["lula26"], ad["flavio26"], ad["aptos26"]) == (5260, 14667, 25498), ad

for nome, sub in [("Brasil", rows), ("SP", [r for r in rows if r["uf"] == "SP"])]:
    vir = [r for r in sub if r["virou"]]
    p13 = sum(1 for r in vir if r["margem26"] > 0)
    print(f"{nome}: {len(sub)} municípios, {len(vir)} viraram ({p13} para o 13, {len(vir)-p13} para o 22); "
          f"aptos nos que viraram: {sum(r['aptos26'] for r in vir):,}; margem 2026 < 5 p.p.: {sum(abs(r['margem26'])<0.05 for r in sub)}")
print("Totais 2022:", sum(x[0] for x in v22.values()), sum(x[1] for x in v22.values()),
      "| 2026:", sum(x[0] for x in v26.values()), sum(x[1] for x in v26.values()))
