"""Baixa as fontes públicas do VP1 para vp1/dados/_cache/ (cacheia: não rebaixa o que já existe).

Uso: python vp1/dados/coletar.py
"""
import pathlib, subprocess, time, zipfile

CACHE = pathlib.Path(__file__).parent / "_cache"
TSE = "https://cdn.tse.jus.br/estatistica/sead/odsele"
FONTES = {
    # TSE, dados abertos: votos por candidato e detalhe (comparecimento, aptos, válidos) por município e zona
    "votacao_candidato_munzona_2022.zip": f"{TSE}/votacao_candidato_munzona/votacao_candidato_munzona_2022.zip",
    "votacao_candidato_munzona_2026.zip": f"{TSE}/votacao_candidato_munzona/votacao_candidato_munzona_2026.zip",
    "detalhe_votacao_munzona_2022.zip": f"{TSE}/detalhe_votacao_munzona/detalhe_votacao_munzona_2022.zip",
    "detalhe_votacao_munzona_2026.zip": f"{TSE}/detalhe_votacao_munzona/detalhe_votacao_munzona_2026.zip",
    # TSE, portal de resultados: totais oficiais de SP em 2026 (usado só na checagem)
    "tse_res_sp_2026.json": "https://resultados.tse.jus.br/oficial/ele2026/6258/dados/sp/sp-c0001-e006258-u.json",
    # IBGE: lista oficial de municípios (código + nome - UF) e população Censo 2022, SIDRA tabela 4714
    "sidra_4714.json": "https://apisidra.ibge.gov.br/values/t/4714/n6/all/v/93/p/2022",
    # IBGE: malha municipal 2022 de SP (shapefile)
    "SP_Municipios_2022.zip": "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2022/UFs/SP/SP_Municipios_2022.zip",
    # ISDEL SP (cópia do professor)
    "isdel_sp.xlsx": "https://drive.google.com/uc?export=download&id=1OWOpjw4lU9fN2JYNEYhjM16LFqla0x7_",
}
# só o arquivo de cargos federais (presidente) de cada zip do TSE
EXTRAIR = {f"{k}.zip": f"{k}_BR.csv" for k in (
    "votacao_candidato_munzona_2022", "votacao_candidato_munzona_2026",
    "detalhe_votacao_munzona_2022", "detalhe_votacao_munzona_2026")}


def baixar(nome, url):
    destino = CACHE / nome
    if destino.exists() and destino.stat().st_size > 0:
        return
    for tentativa in range(5):
        # curl com -C - retoma downloads grandes cortados no meio
        r = subprocess.run(["curl", "-fsSL", "--http1.1", "-C", "-", "-o", str(destino), url])
        if r.returncode == 0:
            break
        time.sleep(2 ** (tentativa + 1))
    else:
        raise SystemExit(f"falhou: {url}")
    time.sleep(1)  # servidores públicos devolvem 429 se apertar


if __name__ == "__main__":
    CACHE.mkdir(exist_ok=True)
    for nome, url in FONTES.items():
        print("baixando", nome)
        baixar(nome, url)
    for z, membro in EXTRAIR.items():
        if not (CACHE / membro).exists():
            zipfile.ZipFile(CACHE / z).extract(membro, CACHE)
    zipfile.ZipFile(CACHE / "SP_Municipios_2022.zip").extractall(CACHE / "SP_Municipios_2022")
    print("ok:", sorted(p.name for p in CACHE.iterdir()))
