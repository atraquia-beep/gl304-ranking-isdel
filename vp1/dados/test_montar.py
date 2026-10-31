"""Checagens mínimas dos JSON gerados. Uso: python -m pytest vp1/dados/test_montar.py  (ou python test_montar.py)"""
import json, pathlib

AQUI = pathlib.Path(__file__).parent
sp = json.loads((AQUI / "sp.json").read_text(encoding="utf-8"))
br = json.loads((AQUI / "br.json").read_text(encoding="utf-8"))


def arrays(d):
    for k, v in d.items():
        if isinstance(v, list):
            yield k, v
        elif isinstance(v, dict) and k != "fontes":
            yield from ((f"{k}.{kk}", vv) for kk, vv in arrays(v))


def test_tamanhos():
    for d in (sp, br):
        assert {len(v) for _, v in arrays(d)} == {d["n"]}
    assert sp["n"] == 645 and br["n"] == 5570
    assert len(set(sp["ibge"])) == 645 and all(c // 100000 == 35 for c in sp["ibge"])


def test_total_sp_2026_igual_tse():
    # totais oficiais do estado no portal de resultados do TSE (sp-c0001-e006258-u.json)
    tse = json.loads((AQUI / "_cache/tse_res_sp_2026.json").read_text(encoding="utf-8"))
    cand = {c["n"]: int(c["vap"]) for a in tse["carg"][0]["agr"] for p in a["par"] for c in p["cand"]}
    assert sum(sp["t26"]["13"]) == cand["13"] == 12119274
    assert sum(sp["t26"]["22"]) == cand["22"] == 14139178
    assert sum(sp["t26"]["comparecimento"]) == int(tse["e"]["c"])


def test_total_sp_2022_igual_tse():
    # resultado oficial TSE 2022, 2º turno, SP (o portal de 2022 não está mais no ar)
    assert sum(sp["t22"]["13"]) == 11519882
    assert sum(sp["t22"]["22"]) == 14216587


def test_malhas_casam_com_json():
    for nome, d in (("sp-municipios.topo.json", sp), ("br-municipios.topo.json", br)):
        t = json.loads((AQUI / nome).read_text(encoding="utf-8"))
        assert [g["properties"]["ibge"] for g in t["objects"]["municipios"]["geometries"]] == d["ibge"]


def test_virou_coerente():
    for d in (sp, br):
        for v, a, b in zip(d["virou"], d["margem22"], d["margem26"]):
            assert v == int(a * b < 0)



def test_virou_1o_turno_coerente():
    # 1º turno: 13 + 22 nunca passa dos válidos (há outros candidatos) e "virou1" = sinal da margem mudou
    for d in (sp, br):
        assert all(a + b <= v for a, b, v in zip(d["t1"]["13"], d["t1"]["22"], d["t1"]["validos"]))
        for v, a, b in zip(d["virou1"], d["margem1"], d["margem26"]):
            assert v == int(a * b < 0)
    assert sum(br["virou1"]) == 212

if __name__ == "__main__":
    for nome, f in list(globals().items()):
        if nome.startswith("test_"):
            f(); print("ok", nome)
