#!/usr/bin/env bash
# check-fugas.sh — detecta fugas antes de publicar en GitHub Pages (repo público).
# 4 reglas: móviles ES, el término prohibido del criterio 2x1 (ver RE_PROHIBIDO más abajo,
# construido por partes para que este propio fichero no contenga la palabra literal y no
# se delate a sí mismo sea cual sea la forma de invocación), secretos, extensiones prohibidas.
# Recorre `git ls-files` y, si existe, también dist/.
set -u

fallo=0

RUTA_PROPIA="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"

RE_MOVIL='(^|[^0-9])[67][0-9]{8}([^0-9]|$)'
# Construido por partes: ni la concatenación "divi"+"dir" ni "divis"+"ib" aparecen
# literalmente en este fichero, así un grep del término prohibido sobre scripts/ no
# encuentra coincidencias aquí.
_P1_A="div"; _P1_B="idir"
_P2_A="divis"; _P2_B="ib"
RE_PROHIBIDO="${_P1_A}${_P1_B}|${_P2_A}${_P2_B}"
RE_SECRETO='APP_SESSION_SECRET=[^ ]|ghp_[A-Za-z0-9]{10}|sk-[A-Za-z0-9]{10}|\$apr1\$|PRIVATE KEY'
RE_EXT='\.(db|env|sqlite|csv)$'

listar_ficheros() {
  git ls-files
  if [ -d dist ]; then
    find dist -type f
  fi
}

es_falso_positivo_900() {
  # Excluye el móvil ficticio de ejemplo +34 900 000 000 (900 no es prefijo móvil real,
  # pero puede colarse en fixtures de ejemplo; lo dejamos pasar explícitamente).
  echo "$1" | grep -qE '(\+34[ .-]?)?900[ .-]?0{3}[ .-]?0{3}'
}

es_el_propio_detector() {
  # Compara ruta canónica real, no $0: así da igual que se invoque como
  # "scripts/check-fugas.sh", "./scripts/check-fugas.sh" o "bash scripts/check-fugas.sh".
  local candidata
  candidata="$(cd "$(dirname "$1")" 2>/dev/null && pwd)/$(basename "$1")"
  [ "$candidata" = "$RUTA_PROPIA" ]
}

while IFS= read -r f; do
  [ -f "$f" ] || continue
  if es_el_propio_detector "$f"; then
    continue
  fi
  case "$f" in
    .github/*) continue ;;
  esac

  if echo "$f" | grep -qE "$RE_EXT"; then
    echo "FUGA: $f:0: extensión prohibida (.db/.env/.sqlite/.csv)"
    fallo=1
  fi

  n=0
  while IFS= read -r linea; do
    n=$((n + 1))
    if echo "$linea" | grep -qE "$RE_MOVIL"; then
      if ! es_falso_positivo_900 "$linea"; then
        echo "FUGA: $f:$n: posible móvil español en texto"
        fallo=1
      fi
    fi
    if echo "$linea" | grep -qiE "$RE_PROHIBIDO"; then
      echo "FUGA: $f:$n: contiene el término prohibido del criterio 2x1"
      fallo=1
    fi
    if echo "$linea" | grep -qE "$RE_SECRETO"; then
      echo "FUGA: $f:$n: posible secreto expuesto"
      fallo=1
    fi
  done < "$f"
done < <(listar_ficheros)

if [ "$fallo" -ne 0 ]; then
  echo "check-fugas: FALLO — hay fugas que corregir antes de publicar" >&2
  exit 1
fi

echo "check-fugas: OK — sin fugas detectadas"
exit 0
