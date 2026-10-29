---
title: "GL304 · Projeto 1 · Roteiro do vídeo"
subtitle: "Onde a eleição de 2030 vai ser decidida"
---

**Disciplina:** GL304 Métodos Quantitativos Aplicados, turma B, prof. Anibal Tavares de Azevedo (Unicamp, FCA)\
**Grupo:** André Traquia, Vinícius [SOBRENOME], Victor Olivetti · **Representante:** André Traquia\
**Versão:** 29/10/2026 · **Status:** roteiro. Os números entre [colchetes] saem do programa e entram quando ele rodar.

# 1. Tema e dor (Q2)

**Título do vídeo:** Onde a eleição de 2030 vai ser decidida

**Decisor:** a coordenação nacional de campanha de qualquer partido. O método é o mesmo para qualquer candidato: os critérios medem disputa e tamanho, não lado político.

**Dor:** o Brasil tem 5.570 municípios e a campanha tem verba, agenda do candidato e equipe limitadas. Hoje a escolha de onde ir costuma partir de feeling ou de olhar só as capitais. O erro tem custo: ir onde a vitória ou a derrota já é certa queima dinheiro e dias de agenda que não mudam o resultado.

**Decisão que o produto apoia:** quais municípios priorizar para presença do candidato, mídia local e mobilização de comparecimento no ciclo de 2030.

**Fato que abre o vídeo (dado real, TSE):** entre o 2º turno de 2022 (Lula × Bolsonaro) e o de 2026 (Lula × Flávio Bolsonaro), **310 municípios trocaram de vencedor**, onde votam **9,36 milhões de eleitores aptos**. Em 279 deles o vencedor passou a ser o candidato 22 e em 31 o 13. Mesmo assim, o 13 ganhou com margem maior no total nacional. Isso mostra que contar municípios não basta: é preciso ponderar tamanho e margem. Em **464 municípios** a margem de 2026 ficou abaixo de 5 pontos percentuais.

**Recorte SP (bloco ISDEL):** 33 dos 645 municípios viraram (29 para o 22, 4 para o 13), com 625.523 eleitores aptos. Os maiores: São Vicente (256 mil aptos, margem 2026 de 0,75 p.p.), Poá, Ribeirão Pires (0,15 p.p.) e Mongaguá.

**Alternativas:** os 5.569 municípios com dado nos dois anos. Boa Esperança do Norte (MT) foi instalado depois de 2022 e fica fora da comparação.

**Critérios do ranking nacional (TSE):**

| # | Critério | Cálculo | Sentido | Peso (soma ponderada) |
|---|---|---|---|---|
| C1 | Disputa em 2026 | \|margem 2026\| em p.p. dos votos válidos | menor é melhor | 0,30 |
| C2 | Eleitorado | eleitores aptos 2026 | maior é melhor | 0,25 |
| C3 | Virou de lado | 1 se o vencedor de 2022 ≠ o de 2026 | maior é melhor | 0,15 |
| C4 | Volatilidade | \|margem 2026 − margem 2022\| | maior é melhor | 0,15 |
| C5 | Abstenção 2026 | abstenções / aptos (voto a mobilizar) | maior é melhor | 0,15 |

**Bloco SP:** C1 a C5 mais os quatro fatores do ISDEL (Educação, Densidade Empresarial, Tecido Empresarial, Gestão Pública). A leitura é de capacidade local: mais base empresarial e gestão estruturada significam mais associações comerciais, imprensa local e lideranças para levar a mensagem, ou seja, menor custo por eleitor alcançado. Os pesos ficam [a definir no grupo]. Proposta: 60% eleitoral e 40% ISDEL.

**Dois rankings, como pede o enunciado:** (1) soma ponderada com normalização mín.–máx., no estilo do ISDEL; (2) PROMETHEE II com os mesmos critérios e pesos (fluxo líquido φ). Comparamos os dois: quem está no top 10 dos dois é aposta robusta, e quem aparece só em um é sensível ao método.

**Ganho do produto:**

- Tempo: a análise manual de 5.570 municípios em planilha levaria [X horas], o programa roda em [Y min] e se atualiza a cada eleição só trocando o arquivo do TSE.
- Financeiro (pesa mais na nota): realocar [Z%] da verba de agenda e mídia de municípios definidos (margem > 20 p.p.) para o top 100. A estimativa usa o teto de gastos do 2º turno [valor do TSE para 2030 ou referência de 2026] e precisa ser apresentada como cenário, não como promessa.

# 2. Mapas e o que cada um mostra (Q3)

| # | Mapa / gráfico | O que mostra | Pergunta que responde |
|---|---|---|---|
| M1 | Dual map 2022 × 2026 (lado a lado, sincronizado), vermelho = 13, azul = 22, intensidade = margem | O "frente a frente": onde o mapa mudou de cor | Onde a eleição mudou? |
| M2 | Coroplético do ranking soma ponderada (escala sequencial pelo índice 0–1) | Prioridade de cada município | Onde concentrar a campanha? |
| M3 | Coroplético PROMETHEE II (φ líquido, escala divergente) | Mesma decisão por outro método | O ranking muda com o método? |
| M4 | Dual map M2 × M3 com camadas (LayerControl) | Concordância e discordância entre métodos | Quais escolhas são robustas? |
| M5 | Pins nas 10 primeiras com popup HTML (votos 22/26, margem, aptos, abstenção, posição nos dois rankings) | Ficha de decisão por município | Por que este município está no topo? |
| M6 | Gráfico de barras: top 10 por método + barras de municípios que viraram por UF | Estatística de apoio | Quanto pesa cada estado? |
| M7 | Bloco SP: coroplético com ISDEL + eleitoral, pins top 10 | Aplicação com o índice do professor | O ISDEL muda a prioridade em SP? |

Estética: inspirada em painéis de apuração (fundo quase preto #0F0E0D, título serifado, vermelho × azul), mobile first. Texto e cores apartidários: as cores seguem a convenção usada pela imprensa para cada número de urna.

# 3. Fontes de dados e tratamento (Q4)

| Base | Endereço | Formato | Tratamento |
|---|---|---|---|
| TSE, votação por candidato, município e zona, 2022 (2º turno, eleição 545) | https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2022.zip (dadosabertos.tse.jus.br) | CSV (latin-1, ";") dentro de ZIP de 620 MB | Arquivo `_BR` (cargos nacionais), filtro turno 2 e cargo 1, soma das zonas por município, exterior (ZZ) excluído |
| TSE, mesma base, 2026 (2º turno, eleição 6258) | https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2026.zip | CSV em ZIP | Idem. Os códigos de município vêm com zeros à esquerda neste arquivo e foram normalizados |
| TSE, detalhe da votação por município e zona, 2026 | https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_munzona/detalhe_votacao_munzona_2026.zip | CSV em ZIP | Aptos e abstenções do 2º turno somados por município |
| TSE, cadastro de municípios do sistema de resultados (código TSE ↔ código IBGE) | https://resultados.tse.jus.br/oficial/ele2026/6258/config/mun-e006258-cm.json | JSON (API) | Chave de ligação TSE → IBGE |
| IBGE, malha municipal | https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=municipio&formato=application/vnd.geo+json&qualidade=minima (SP: .../malhas/estados/35?...) | GeoJSON (API) | Junção pelo código IBGE de 7 dígitos |
| IBGE, localidades | https://servicodados.ibge.gov.br/api/v1/localidades/municipios | JSON (API) | Nome, UF e região para popups e filtros |
| ISDEL SP (cópia do professor, 645 municípios) | https://drive.google.com/uc?export=download&id=1OWOpjw4lU9fN2JYNEYhjM16LFqla0x7_ | XLSX | Chave = nome do município, sem código: normalizar acento e caixa e validar 645/645 contra o IBGE |

**Validação já feita (29/10):** o total do 2º turno de 2022 no Brasil (sem exterior) é Lula 60.193.094 × Bolsonaro 58.061.090. Em Adamantina-SP, a contagem de 2026 do CSV bate com a API de resultados do TSE (5.260 × 14.667, 25.498 aptos). A junção TSE → IBGE fecha 5.570/5.570, sem município sem código. Programa: `vp1/viradas.py` no repositório do grupo.

**Estatística descritiva prevista:** média, mediana e desvio das margens 2022 e 2026, histograma da volatilidade, abstenção média (19,4% por município em 2026) e correlação entre os dois rankings (Spearman), com o número exato entre [colchetes] até rodar.

# 4. Fluxos de IA (Q5)

| IA | Para quê | Controle humano |
|---|---|---|
| Claude (Claude Code) | Achar e baixar as bases do TSE e do IBGE, escrever o código de fusão e validação, rascunhar o roteiro | O grupo confere os números contra a fonte oficial (validação Adamantina, totais nacionais) |
| [ChatGPT / Gemini / Copilot, conforme o grupo usar] | [revisar código, gerar a capa, revisar a fala] | [quem revisa] |
| [Ferramenta de capa, ex.: Canva com IA] | Capa do vídeo | Grupo escolhe entre 3 opções |

Regra do grupo: nenhum número vai para o vídeo sem sair do programa ou da fonte oficial.

# 5. Cenas do vídeo (meta de [6] min, confirmar o limite no enunciado)

| # | Tempo | Quem fala | Fala (resumo) | Tela |
|---|---|---|---|---|
| 1 | 0:00–0:30 | André | "Em 2026, 310 municípios mudaram de lado. 9 milhões de eleitores. Se você coordena uma campanha, onde você vai em 2030?" | Capa → dual map 2022 × 2026 escurecendo os que não viraram |
| 2 | 0:30–1:10 | André | Dor: 5.570 municípios, verba e agenda limitadas, custo de ir onde já está decidido. Decisor e decisão | Contador 5.570 → 310 → top 10, ícones de verba e agenda |
| 3 | 1:10–1:50 | Victor | Fontes oficiais: TSE (dados abertos) + IBGE (API) + ISDEL. Como validamos | Tabela de fontes, print do CSV, check de validação |
| 4 | 1:50–2:30 | Victor | O que é o ISDEL e seus 4 fatores; por que entra no bloco SP | Infográfico dos 4 fatores, mapa ISDEL SP |
| 5 | 2:30–3:30 | Vinícius | Código Python: leitura do ZIP, filtro 2º turno, margem, normalização, soma ponderada e PROMETHEE II (fórmula de φ na tela) | Tela do notebook com trechos destacados |
| 6 | 3:30–4:00 | Vinícius | Georreferência: API do IBGE, junção pelo código de 7 dígitos, escala de cores ligada ao índice | GeoJSON → mapa coroplético |
| 7 | 4:00–5:00 | André | Comparação dos dois rankings em dual map com camadas. Top 10 robusto × sensível ao método. Pins com popup | Dual map M2 × M3, clique em 2 pins, gráfico de barras |
| 8 | 5:00–5:30 | Victor | Bloco SP: o que muda quando o ISDEL entra (São Vicente, Ribeirão Pires…) | Mapa SP, antes × depois |
| 9 | 5:30–6:00 | André | Ganho: tempo [X h → Y min] e financeiro [cenário]. Limites: o passado não garante 2030 e o método é apartidário | Card de ganhos, link do app, créditos |

**Capa (critério E):** fundo #0F0E0D, título serifado grande "Onde 2030 será decidida", dois meio-mapas do Brasil (2022 | 2026) em vermelho × azul, selo "310 municípios viraram". Sem rosto de candidato e sem logo de partido.

**Descrição do vídeo:** "Ranking dos municípios brasileiros mais decisivos para a campanha presidencial de 2030, com dados abertos do TSE (2º turno 2022 e 2026) e malhas do IBGE. Dois métodos (soma ponderada e PROMETHEE II), mapas comparados e aplicação com o ISDEL em SP. GL304, Unicamp, 2026."

# 6. Divisão de tarefas

| Integrante | Tarefas | Prazo |
|---|---|---|
| André Traquia | Fusão TSE 2022 × 2026 (feito), critérios C1–C5, soma ponderada, cenas 1, 2, 7 e 9, edição final | 30/10 a [data de entrega] |
| Vinícius [SOBRENOME] | PROMETHEE II, mapas (folium: coroplético, dual map, LayerControl, pins com popup), cenas 5 e 6 | 30/10 a [data] |
| Victor Olivetti | ISDEL SP (junção por nome + validação 645/645), estatística descritiva e gráficos de barras, capa, cenas 3, 4 e 8 | 30/10 a [data] |

Marcos: 30/10 base fundida e critérios fechados · [01/11] rankings e mapas · [03/11] gravação · [05/11] edição e revisão · [data de entrega do vídeo].

# 7. Riscos e limites (para o grupo, não para o vídeo)

- **ISDEL como critério de campanha** é o elo mais fraco: o professor pode perguntar por que desenvolvimento econômico define prioridade eleitoral. A justificativa é capacidade e custo de alcance. Se não convencer, o ISDEL vira só desempate em SP.
- **Pesos são escolha do decisor.** Mostrar uma análise de sensibilidade (pesos ±10%) evita a crítica de "ranking arbitrário".
- **Leitura apartidária:** o vídeo não comenta mérito de candidato, só a geometria da disputa.
- **Chave do ISDEL por nome:** acentos e grafias diferentes (ex.: "Embu das Artes", "Mogi Mirim") quebram a junção. Validar 645/645.
