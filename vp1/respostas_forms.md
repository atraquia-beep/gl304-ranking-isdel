# Respostas para copiar nos formulários (o André envia)

## 2.1 Coleta de dados sobre dúvidas de código Python no Projeto P1
https://forms.gle/4b571KmtfvewQD2p9

- **Nome do representante:** André Traquia
- **Email:** a185759@dac.unicamp.br
- **Q1 – Principais dificuldades com geração de código Python:**
  Ler arquivos grandes do TSE (ZIP de 470 a 620 MB, CSV em latin-1 com separador ";") sem estourar a memória, e manter o código reprodutível quando a IA gera trechos diferentes a cada pedido. Também é difícil validar se o código gerado pela IA soma os votos certos (turno, cargo, exterior).
- **Q2 – Base de dados:**
  Sim, site oficial e base pública. Portal de Dados Abertos do TSE (https://dadosabertos.tse.jus.br; arquivos votacao_candidato_munzona_2022 e 2026 e detalhe_votacao_munzona_2026 em https://cdn.tse.jus.br/estatistica/sead/odsele/), API de malhas e localidades do IBGE (https://servicodados.ibge.gov.br) e ISDEL SP (planilha disponibilizada pelo professor). Formato: **A (Excel/CSV)** e **B (API)**.
- **Q3 – O que não consegue em TRATAMENTO E ANÁLISE:**
  Juntar o ISDEL (chave por nome do município, sem código IBGE) com as bases do TSE e do IBGE sem perder municípios por diferença de acento ou grafia. Tratar municípios criados depois de 2022 (ex.: Boa Esperança do Norte-MT). Definir pesos e funções de preferência do PROMETHEE II com justificativa e análise de sensibilidade.
- **Q4 – O que não consegue em CRIAÇÃO DE MAPAS:**
  Deixar leve um mapa coroplético com 5.570 municípios (GeoJSON pesado no folium/HTML) e sincronizar dois mapas lado a lado (dual map 2022 × 2026) com a mesma escala de cores.
- **Q5 – O que não consegue em DASHBOARDS / elementos gráficos nos mapas:**
  Popups HTML com mini-gráfico (barras 2022 × 2026) dentro do pin, legenda customizada no LayerControl para alternar os dois rankings e versão responsiva para celular.

## 2.2 Link do Roteiro do Projeto 1 (até 23:59 de 29/10)
https://forms.gle/p1CWh2GdwGCtHzbH8

- **Nome do representante:** André Traquia
- **Email:** a185759@dac.unicamp.br
- **Q1 – Link do roteiro (Google Drive):** [LINK DO DRIVE – entra depois do upload]
- **Q2 – Integrantes:** André Traquia, Vinícius [SOBRENOME], Victor Olivetti
