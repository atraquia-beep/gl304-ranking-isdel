# VP1 · dados: "Quem virou de lado desde 2022"

Municípios que trocaram o vencedor do 2º turno presidencial entre 2022 (13 Lula × 22 Bolsonaro) e 2026 (13 Lula × 22 Flávio Bolsonaro).

## Como gerar

```
python vp1/dados/coletar.py     # baixa e cacheia em vp1/dados/_cache/ (fora do git)
python vp1/dados/montar.py      # gera sp.json, br.json, sp-municipios.topo.json (usa npx mapshaper)
python vp1/dados/test_montar.py # checagens
```

## Fontes (todas públicas, acessadas em 29/10/2026)

| Dado | URL |
|---|---|
| Votos por candidato, município e zona, 2026 (TSE, dados abertos, gerado 28/10/2026) | https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2026.zip |
| Idem, 2022 | https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2022.zip |
| Aptos, comparecimento e votos válidos por município e zona, 2026 | https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_munzona/detalhe_votacao_munzona_2026.zip |
| Idem, 2022 | https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_munzona/detalhe_votacao_munzona_2022.zip |
| Totais oficiais por UF, 2026 (portal de resultados, só para checagem) | https://resultados.tse.jus.br/oficial/ele2026/6258/dados/sp/sp-c0001-e006258-u.json (trocar `sp` pela UF) |
| Lista de municípios e população Censo 2022 (IBGE, SIDRA tabela 4714) | https://apisidra.ibge.gov.br/values/t/4714/n6/all/v/93/p/2022 |
| Malha municipal de SP 2022 (IBGE) | https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2022/UFs/SP/SP_Municipios_2022.zip |
| ISDEL SP (cópia do professor) | https://drive.google.com/uc?export=download&id=1OWOpjw4lU9fN2JYNEYhjM16LFqla0x7_ |

Uso só o arquivo `_BR.csv` de cada zip do TSE (cargos federais), filtrado em `NR_TURNO=2`, `CD_CARGO=1` (Presidente), sem o exterior (`SG_UF=ZZ`). Linhas de voto em trânsito entram na soma do município.

A API `servicodados.ibge.gov.br` (localidades e malhas v3) não respondeu a partir do ambiente de coleta (conexão derrubada). Usei as mesmas informações do IBGE por outros canais oficiais: SIDRA para a lista de municípios e geoftp para a malha.

## Definições

- `margem = (votos 13 − votos 22) / válidos`. Positivo = 13 venceu.
- `virou = 1` quando os dois anos têm vencedor e ele mudou. Empate conta como "sem vencedor": Marquinho (PR) empatou em 2026 (1.530 × 1.530) e Irati (SC) e Guará (SP) empataram em 2022; nenhum deles conta como virada.
- `validos` = `QT_TOTAL_VOTOS_VALIDOS`, `comparecimento` = `QT_COMPARECIMENTO`, `eleitorado` = `QT_APTOS`, todos do arquivo de detalhe.
- Arrays ordenados por código IBGE.

## De-para TSE → IBGE

O TSE usa código de município próprio. Casei por UF + nome normalizado (sem acento, só letras, maiúsculas):

- 5.557 municípios casaram direto.
- 13 casados à mão (lista comentada em `DEPARA_MANUAL`, `montar.py`): diferença de grafia (ex. Munhoz de Mello/Melo, São Luís/Luiz do Paraitinga, Espigão do Oeste/D'Oeste) e um renomeado (Boa Saúde/RN = Januário Cicco).
- 1 descartado: Boa Esperança do Norte (MT, código TSE 73709), criado depois do Censo 2022: não tem código IBGE 2022 nem votação em 2022. Tinha 945 votos 13 e 2.353 votos 22 em 2026.
- Resultado: 5.570 municípios em `br.json` (todos os do IBGE 2022), 645 em `sp.json`.

## ISDEL

A planilha tem 646 linhas para 645 municípios: a linha extra é o cabeçalho (não há duplicata; os 645 nomes são únicos). Chave por nome; 643 casaram direto e 2 à mão (Florínia → Florínea, São Luís → São Luiz do Paraitinga). Colunas usadas: `educacao` = Educação, `densidade` = Densidade Empresarial, `tecido` = **Tecido Social** (a planilha também tem Tecido Empresarial; confirmar qual o André quer), `gestao` = Gestão Pública, `isdel` = ISDEL.

## Malha

`sp-municipios.topo.json`: shapefile IBGE 2022 → TopoJSON (mapshaper 0.6.102, simplificação 4% com `keep-shapes`, quantização 1e5), camada `municipios`, propriedade `ibge` (inteiro). 290 KB, 645 polígonos, mesmos códigos do `sp.json`.

## Checagens

| Checagem | Resultado |
|---|---|
| Votos 13 + 22 = válidos, por município (duas tabelas independentes do TSE) | bate em todos (5.570 em 2022, 5.571 em 2026) |
| Total nacional do CSV (com exterior) = portal TSE 2026 | 64.256.232 × 59.826.041, bate |
| Total nacional do CSV 2022 = resultado oficial | 60.345.999 × 58.206.354, bate |
| Soma por UF do `br.json` = portal TSE 2026 (votos 13, 22 e comparecimento) | 26 UFs exatas; MT difere em 945 / 2.353 / 3.331, exatamente Boa Esperança do Norte |
| SP 2026 = portal TSE | 12.119.274 × 14.139.178, bate (teste) |
| SP 2022 = resultado oficial | 11.519.882 × 14.216.587, bate (teste) |

## Estatística descritiva

**Viradas**

| | Municípios | Viraram | Para o 13 | Para o 22 | 13 venceu em 2022 | 13 venceu em 2026 |
|---|---|---|---|---|---|---|
| SP | 645 | 33 (5,1%) | 4 | 29 | 97 | 72 |
| Brasil | 5.570 | 309 (5,5%) | 31 | 278 | 3.123 | 2.875 |

As 4 viradas de SP para o 13 são todas de cidades médias e grandes (São Vicente, Poá, Ribeirão Pires, Mongaguá); as 29 para o 22 são quase todas cidades pequenas (maior: Itaí, 13 mil votos).

**Margem (13 − 22) / válidos, por município**

| | Média | DP | Mín | Mediana | Máx |
|---|---|---|---|---|---|
| SP 2022 | −18,3 pp | 16,2 | −62,4 | −20,3 | +44,6 |
| SP 2026 | −20,0 pp | 15,1 | −60,5 | −22,2 | +37,2 |
| SP variação | −1,7 pp | 4,3 | −22,7 | −1,4 | +8,9 |
| Brasil 2022 | +11,8 pp | 37,5 | −78,0 | +7,2 | +87,7 |
| Brasil 2026 | +7,5 pp | 37,3 | −81,1 | +2,2 | +84,7 |
| Brasil variação | −4,4 pp | 5,6 | −31,7 | −4,1 | +15,3 |

Médias simples por município (não ponderadas por eleitor). Em 2026, 64 municípios de SP (467 no Brasil) ficaram com margem abaixo de 5 pp; 25 (178) abaixo de 2 pp.

**Abstenção 2026** (1 − comparecimento/aptos): SP média 19,7% (DP 2,5; 11,7% a 30,6%); Brasil média 19,4% (DP 4,4).

**ISDEL SP**: média 0,373 (DP 0,050; mín 0,253; mediana 0,365; máx 0,796).
