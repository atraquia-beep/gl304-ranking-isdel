"""Monta vp1/dados/sp.json e vp1/dados/br.json (formato colunar) a partir de _cache/.

Uso: python vp1/dados/coletar.py && python vp1/dados/montar.py
"""
import datetime, json, pathlib, re, subprocess, unicodedata
import pandas as pd

AQUI = pathlib.Path(__file__).parent
CACHE = AQUI / "_cache"

# TSE (código TSE) -> IBGE: nomes que não casam por grafia; conferidos um a um
DEPARA_MANUAL = {
    92690: 5203500,  # GO BOM JESUS = Bom Jesus de Goiás
    41092: 3105509,  # MG BARÃO DE MONTE ALTO = Barão do Monte Alto
    44571: 3122900,  # MG DONA EUSÉBIA = Dona Euzébia
    53031: 3165206,  # MG SÃO THOMÉ DAS LETRAS = São Tomé das Letras
    91553: 5107800,  # MT SANTO ANTÔNIO DO LEVERGER = Santo Antônio de Leverger
    4120: 1502954,   # PA ELDORADO DOS CARAJÁS = Eldorado do Carajás
    77119: 4116307,  # PR MUNHOZ DE MELLO = Munhoz de Melo
    17035: 2405306,  # RN BOA SAÚDE = Januário Cicco (renomeado)
    337: 1100346,    # RO ALVORADA DO OESTE = Alvorada D'Oeste
    256: 1100098,    # RO ESPIGÃO DO OESTE = Espigão D'Oeste
    3158: 1400605,   # RR SÃO LUIZ = São Luiz do Anauá
    31011: 2800100,  # SE AMPARO DE SÃO FRANCISCO = Amparo do São Francisco
    71013: 3550001,  # SP SÃO LUÍS DO PARAITINGA = São Luiz do Paraitinga
}
# ISDEL (nome na planilha) -> nome IBGE
ISDEL_MANUAL = {"Florínia": "Florínea", "São Luís do Paraitinga": "São Luiz do Paraitinga"}
# colunas do ISDEL usadas no site (chave no JSON -> coluna na planilha)
ISDEL_COLS = {"educacao": "Educação", "densidade": "Densidade Empresarial",
              "tecido": "Tecido Empresarial", "gestao": "Gestão Pública", "isdel": "ISDEL"}
FONTES = {
    "tse_2026": "https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2026.zip",
    "tse_2022": "https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2022.zip",
    "tse_detalhe_2026": "https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_munzona/detalhe_votacao_munzona_2026.zip",
    "tse_detalhe_2022": "https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_munzona/detalhe_votacao_munzona_2022.zip",
    "ibge_municipios": "https://apisidra.ibge.gov.br/values/t/4714/n6/all/v/93/p/2022",
    "ibge_malha": "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2022/UFs/SP/SP_Municipios_2022.zip",
    "isdel": "https://drive.google.com/uc?export=download&id=1OWOpjw4lU9fN2JYNEYhjM16LFqla0x7_",
}


def norm(s):
    return re.sub(r"[^A-Z]", "", unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().upper())


def ibge():
    s = pd.DataFrame(json.load(open(CACHE / "sidra_4714.json"))[1:])  # 1ª linha do SIDRA é cabeçalho
    return pd.DataFrame({"ibge": s.D1C.astype(int), "nome": s.D1N.str[:-5], "uf": s.D1N.str[-2:]})


def turno2(ano):
    """Presidente, 2º turno, por código TSE de município (exterior 'ZZ' fora)."""
    v = pd.read_csv(CACHE / f"votacao_candidato_munzona_{ano}_BR.csv", sep=";", encoding="latin1",
                    usecols=["NR_TURNO", "CD_CARGO", "SG_UF", "CD_MUNICIPIO", "NM_MUNICIPIO",
                             "NR_CANDIDATO", "QT_VOTOS_NOMINAIS_VALIDOS"])
    v = v[(v.NR_TURNO == 2) & (v.CD_CARGO == 1) & (v.SG_UF != "ZZ")]
    p = v.pivot_table(index="CD_MUNICIPIO", columns="NR_CANDIDATO", values="QT_VOTOS_NOMINAIS_VALIDOS", aggfunc="sum")
    assert list(p.columns) == [13, 22], p.columns
    d = pd.read_csv(CACHE / f"detalhe_votacao_munzona_{ano}_BR.csv", sep=";", encoding="latin1",
                    usecols=["NR_TURNO", "CD_CARGO", "SG_UF", "CD_MUNICIPIO", "QT_APTOS",
                             "QT_COMPARECIMENTO", "QT_TOTAL_VOTOS_VALIDOS"])
    d = d[(d.NR_TURNO == 2) & (d.CD_CARGO == 1) & (d.SG_UF != "ZZ")].groupby("CD_MUNICIPIO").sum(numeric_only=True)
    out = pd.DataFrame({"13": p[13], "22": p[22], "validos": d.QT_TOTAL_VOTOS_VALIDOS,
                        "comparecimento": d.QT_COMPARECIMENTO, "eleitorado": d.QT_APTOS}).fillna(0).astype(int)
    # duas tabelas independentes do TSE precisam bater
    assert (out["13"] + out["22"] == out.validos).all()
    tse = v.groupby("CD_MUNICIPIO").agg(uf=("SG_UF", "first"), nome_tse=("NM_MUNICIPIO", "first"))
    return out.join(tse)


def depara(tse):
    ib = ibge()
    ib["k"] = ib.uf + ib.nome.map(norm)
    t = tse[["uf", "nome_tse"]].copy()
    t["ibge"] = (t.uf + t.nome_tse.map(norm)).map(ib.set_index("k").ibge)
    t["ibge"] = t.ibge.fillna(t.index.to_series().map(DEPARA_MANUAL))
    return t.ibge, ib


def bloco(df):
    return {c: df[c].tolist() for c in ["13", "22", "validos", "comparecimento", "eleitorado"]}


def montar():
    t22, t26 = turno2(2022), turno2(2026)
    cod, ib = depara(t26)
    base = t22.join(t26, lsuffix="_22", rsuffix="_26", how="inner")  # só municípios com as duas eleições
    base["ibge"] = cod
    sem_par = sorted(set(t22.index) ^ set(t26.index)) + base.index[base.ibge.isna()].tolist()
    base = base.dropna(subset=["ibge"])
    base["ibge"] = base.ibge.astype(int)
    assert base.ibge.is_unique
    base = base.merge(ib[["ibge", "nome"]], on="ibge").sort_values("ibge").reset_index(drop=True)
    m22 = (base["13_22"] - base["22_22"]) / base["validos_22"]
    m26 = (base["13_26"] - base["22_26"]) / base["validos_26"]
    # virou = os dois anos têm vencedor e ele mudou; empate conta como "sem vencedor"
    base["virou"] = ((m22 != 0) & (m26 != 0) & ((m22 > 0) != (m26 > 0))).astype(int)
    base["margem22"], base["margem26"] = m22.round(5), m26.round(5)
    return base, sem_par


def colunar(df, isdel=None):
    t = lambda suf: bloco(df[[f"{c}_{suf}" for c in ["13", "22", "validos", "comparecimento", "eleitorado"]]]
                          .rename(columns=lambda c: c.rsplit("_", 1)[0]))
    out = {"versao": 1, "gerado": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
           "fontes": FONTES, "n": len(df), "ibge": df.ibge.tolist(), "nome": df.nome.tolist(),
           "t22": t("22"), "t26": t("26"), "virou": df.virou.tolist(),
           "margem22": df.margem22.tolist(), "margem26": df.margem26.tolist()}
    if isdel is not None:
        out["isdel"] = {k: isdel[c].round(5).tolist() for k, c in ISDEL_COLS.items()}
    return out


def isdel_sp(sp):
    x = pd.read_excel(CACHE / "isdel_sp.xlsx")
    x["k"] = x["Municípios"].replace(ISDEL_MANUAL).map(norm)
    assert x.k.is_unique and len(x) == 645
    y = sp[["nome"]].assign(k=sp.nome.map(norm)).merge(x, on="k", how="left", validate="1:1")
    assert y[ISDEL_COLS.values()].notna().all().all(), y[y.ISDEL.isna()].nome.tolist()
    return y


def salvar(obj, nome):
    (AQUI / nome).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    br, sem_par = montar()
    sp = br[br.ibge // 100000 == 35].reset_index(drop=True)
    salvar(colunar(br), "br.json")
    salvar(colunar(sp, isdel_sp(sp)), "sp.json")
    # malhas IBGE -> TopoJSON simplificado (precisa de node/npx); 4300001/4300002 são as lagoas dos Patos e Mirim
    for uf, pct, saida in [("SP", "4%", "sp-municipios.topo.json"), ("BR", "0.6%", "br-municipios.topo.json")]:
        subprocess.run(["npx", "-y", "mapshaper@0.6.102", str(CACHE / f"{uf}_Municipios_2022/{uf}_Municipios_2022.shp"),
                        "encoding=utf8", "-each", "ibge=+CD_MUN", "-filter", "ibge!=4300001 && ibge!=4300002",
                        "-filter-fields", "ibge", "-rename-layers", "municipios", "-simplify", pct, "keep-shapes",
                        "-sort", "ibge", "-o", "format=topojson", "quantization=1e5", str(AQUI / saida)], check=True)
    print("sem par TSE<->IBGE (fora):", sem_par)
    print(f"BR n={len(br)} viraram={br.virou.sum()} | SP n={len(sp)} viraram={sp.virou.sum()}")
