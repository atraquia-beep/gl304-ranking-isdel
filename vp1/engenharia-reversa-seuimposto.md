# Engenharia reversa: "Apuração 2026" (seuimposto.com, marca Pandora)

Coleta em 28 e 29/10/2026. São duas fontes de evidência:

- **[OBS]** visto por mim com acesso público: headers, robots.txt, imagens com URL conhecida, DNS, certificados e JSON do TSE. Nenhuma tentativa de passar pela checagem de navegador.
- **[HAR]** tirado do arquivo HAR que o André exportou do Chrome (19 requisições, 29/10/2026 00:02 UTC). A análise foi feita na sessão principal e chegou a esta sessão como resumo. **Não revalidei o HAR aqui** porque o arquivo não está neste container.
- **[INF]** inferência minha.

---

## 0. Resumo em 6 linhas

1. **Um coletor próprio em Python** lê os arquivos do TSE e publica feeds JSON enxutos no próprio domínio. O navegador nunca fala com o TSE. [HAR + OBS: CSP com `connect-src 'self'`]
2. **"Ao vivo" é polling em CDN**: o app busca `/feed/*.json` a cada 5 s, faz isso a cada 120 s com a aba escondida e pode usar WebSocket para push. A Cloudflare segura a carga com `s-maxage` de 1–5 s. [HAR]
3. **O front é Preact + htm** (JSX sem etapa de build), dividido em três bundles. Um deles é o **TopoJSON dos 5.570 municípios** embutido em JS. [HAR]
4. **O mapa é desenhado em canvas 2D com `Path2D`**, na projeção Policônica do Brasil. Não usa Leaflet, MapLibre nem D3. [HAR]
5. **Os feeds vêm em formato colunar**, com arrays paralelos na ordem do TopoJSON: 95 KB para o país inteiro. [HAR]
6. **O site roda na Cloudflare** com assets de hash e cache de 1 ano. As fontes são Faustina + Geist auto-hospedadas, com tema escuro e claro. [OBS + HAR]

---

## 1. Dados e "ao vivo"

| Item | Fonte | Detalhe |
|---|---|---|
| Coletor | [HAR] | Scripts Python `data/*.py`, citados em comentários dos bundles (`data/turno2.py`, `data/turno1_mun.py`). Eles leem o TSE e geram os feeds. |
| O navegador não chama o TSE | [OBS] | O CSP do app (que vazou num 404 de `/1turno/robots.txt`) permite `connect-src 'self'` + Cloudflare Insights + Google Ads, sem `resultados.tse.jus.br`. |
| Configuração do cliente | [HAR] | `window.APURACAO = {modo:"ao-vivo", feed:["/feed/"], intervalo:5, turno:2, painelProjecao:true, ...}` |
| Polling | [HAR] | 5 s nesta noite (padrão de 15 s), 120 s com a aba escondida. WebSocket opcional. |
| Cache CDN dos feeds | [HAR] | `public, max-age=14400, s-maxage=1..5, stale-while-revalidate=30, stale-if-error=600`. A borda renova a cada poucos segundos e, se a origem cair, serve o último feed por até 10 min. |
| Cache do próprio TSE | [OBS] | `br-c0001-e006258-u.json`: `max-age=7` com ETag. `ele-c.json`: `max-age=49`. O TSE devolve 429 se as requisições se acumularem. |
| Estado final do 2º turno no TSE | [OBS] | `dg=25/10/2026 hg=23:27:02`, `s.pst="100,00"`. |

**Feeds observados no HAR:**

| Arquivo | Tamanho | Conteúdo |
|---|---|---|
| `/feed/agora.json` | 7 KB | Totais do Brasil e por UF: seções, totalizadas, eleitorado, apurado, comparecimento, brancos, nulos, votos por número, situação |
| `/feed/municipios.json` | 95 KB | **Colunar**: `{br:{n:5570, f:[], l:[], m:[], v:[]}, zz:{n:186, ...}}`. São arrays paralelos na ordem do TopoJSON (`zz` = exterior) |
| `/feed/historico.json` | — | 205 pontos da noite (série da apuração) |
| `/feed/exterior-bu.json` | — | 85 cidades no exterior (ex.: Lisboa, 103 seções) |
| `/feed/interno/projecao.json` | — | Probabilidade por país/UF, `faixa98`, `sd`, "chamada" e hora da chamada |
| `POST /api/vivo` | — | Contador de pessoas online (`{n:1066}`) |

**Lição de arquitetura.** O formato colunar na mesma ordem da malha dispensa join no cliente: o índice *i* do array é o polígono *i* do TopoJSON. É por isso que 5.570 municípios cabem em 95 KB.

## 2. Stack do front

| Item | Fonte | Detalhe |
|---|---|---|
| Framework | [HAR] | **Preact + htm** (templates em tagged template literals, sem transpilar JSX) |
| Bundles | [HAR] | `mapa.*.js` 1,37 MB (`window.BRASIL` = TopoJSON dos 5.570 municípios), `dados.*.js` 563 KB (`window.CANDIDATOS`, gerado por `data/turno2.py`), `app.*.js` 532 KB |
| Extras | [HAR] | `t1mun.*.js` (1º turno por município, para a leitura "Mudança" 1º→2º turno), `zonas.*.js` (zonas eleitorais com área aproximada pelos locais de votação, porque o TSE não publica os limites), retratos em `.webp` |
| Mapa | [HAR] | **Canvas 2D + `Path2D`**: 17 `getContext("2d")`, 20 `Path2D`, 32 `requestAnimationFrame`. Projeção Policônica do Brasil. Sem Leaflet, MapLibre ou D3 |
| Tipografia | [HAR] | **Faustina** (serifa, títulos) + **Geist** (sans, UI), auto-hospedadas em woff2 |
| Paleta (tokens) | [HAR] | Escuro: `--bg #0F0E0D`, `--fg #FAFAF9`, `--panel #151412`. Claro: `--bg #F1F0EE`, `--fg #111010`. "Apurado" em verde `--apur` (`#3DD68C` no escuro / `#0C8A4C` no claro) |
| Cores dos candidatos | [OBS] | Na og:image: vermelho para Lula e azul para Flávio (valores exatos não extraídos) |
| Ads e analytics | [OBS] | Google AdSense (`ads.txt`: `pub-5449617679729441`), CMP Funding Choices, Cloudflare Web Analytics |
| Segurança | [OBS] | CSP estrito com 3 hashes de script inline, HSTS, `X-Frame-Options DENY`, `nosniff`, `Referrer-Policy no-referrer` |

## 3. Telas, rotas e UX

| Item | Fonte | Detalhe |
|---|---|---|
| Edições | [OBS] | `/` = 2º turno. `/1turno/` = 1º turno (4/10), com assets próprios em `/1turno/assets/` |
| Escopo | [OBS] | Presidente, governadores, Senado, por município, mais o exterior |
| Rotas | [OBS]/[INF] | Hash (`#presidente`). As outras abas seguem o mesmo padrão, mas os nomes exatos não foram listados no resumo do HAR |
| Leituras do mapa | [HAR] | Resultado, "Mudança" 1º→2º turno, zonas eleitorais, painel de projeção com probabilidade e "chamada" |
| "% apurado" | [HAR] | Vem de `agora.json` (seções totalizadas / seções), destacado no verde `--apur` |
| Pessoas online | [HAR] | `POST /api/vivo` |
| Mobile | [OBS] | A mensagem de fallback cita "Chrome ou Safari do celular". O robots libera bots de preview (WhatsApp, Telegram etc.), ou seja, a distribuição é por compartilhamento |
| Estados de empate e município selecionado | — | Não detalhados no resumo do HAR |

## 4. Hospedagem e deploy

| Item | Fonte | Detalhe |
|---|---|---|
| CDN/DNS | [OBS] | Cloudflare (NS `jasper`/`luciana`, IPs 104.21.x / 172.67.x, `cf-ray`, NEL) |
| Entrada na Cloudflare | [OBS] | Certificados Google Trust Services (Universal SSL) emitidos em **04/10/2026**, dia do 1º turno. O domínio é antigo (certificados desde 2025) e foi reaproveitado |
| Assets | [OBS]/[HAR] | Nome com hash de 10 hex (`og.674f267f9d.jpg`), `public, max-age=31536000, immutable`, `cf-cache-status: HIT` |
| HTML | [OBS] | `no-cache` |
| Gate de navegador | [OBS] | Clientes não reconhecidos como navegador recebem uma casca sem JS (CSP `default-src 'none'`), e os demais caminhos devolvem 403 |
| SEO e IA | [OBS] | O robots libera só `/`, `/1turno/`, `/ads.txt` e `/og-2t.jpg` para Google/Bing, e declara `Content-Signal: ai-train=no, ai-input=no` |

## 5. Plano de replicação para o GL304 (ideia 033: 2022 × 2026)

**Copiar a arquitetura, sem o "ao vivo":**

1. **Um script Python** gera um JSON colunar estático por município para 2022 e 2026 (dados abertos do TSE), com ISDEL e ranking. Os arrays seguem a mesma ordem da malha.
2. **Uma página estática** (GitHub Pages) lê esses arquivos. Não precisa de servidor, polling ou proxy.
3. **Mapa em TopoJSON** da malha do IBGE, simplificada (mapshaper). Começar por SP. Desenhar em canvas com `Path2D` ou, se o grupo preferir, usar Leaflet.
4. **Leitura "Mudança" 2022→2026**: a cor mostra se o vencedor trocou e a intensidade mostra a variação de margem.
5. **Ranking** em tabela ordenável, sincronizado com o clique no mapa.

**Fazer diferente:**

- Sem gate de navegador, ads, CMP ou contador online.
- O **Folium no Colab** continua sendo a entrega do programa para a nota. O site é vitrine.
- **Não copiar** código, fontes, retratos, marca nem textos deles. Usar só as ideias de arquitetura.

**Riscos:**

- Correspondência entre os códigos de município do TSE e do IBGE. É o principal ponto de quebra.
- Peso da malha: sem simplificação, ela passa de 20 MB.
- 429 do TSE: preferir os arquivos de dados abertos (CSV) em vez da API de resultados.

## Fontes

- [OBS] `https://seuimposto.com/` (headers e casca), `/1turno/`, `/robots.txt`, `/ads.txt`, og:images, 404 em `/1turno/robots.txt` (CSP do app). DNS via DoH da Cloudflare. Certificados via crt.sh. TSE: `oficial/comum/config/ele-c.json` e `oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json`.
- [HAR] Captura do André no Chrome, analisada na sessão principal.
- A Wayback Machine falhou (reset/429). A busca na web por "seuimposto.com"/"Pandora apuração" não trouxe nada relevante.
