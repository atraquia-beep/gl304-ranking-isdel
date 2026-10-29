#!/bin/sh
# Gera a malha dos estados (contornos + ponto de rótulo) dissolvendo a malha municipal do IBGE.
# Uso, na raiz do repo: sh vp1/site/gerar_uf.sh   (precisa de: npx mapshaper@0.6.102)
npx -y mapshaper@0.6.102 vp1/dados/br-municipios.topo.json \
  -each 'uf=Math.floor(ibge/100000)' -dissolve uf \
  -each 'lx=+this.innerX.toFixed(3), ly=+this.innerY.toFixed(3)' \
  -o format=topojson quantization=1e5 vp1/site/br-uf.topo.json
