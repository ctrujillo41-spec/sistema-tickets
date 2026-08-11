#!/usr/bin/env bash
# Fase 9 (Endurecimiento): prueba de carga ligera contra producción.
#
# El sandbox donde corre el asistente tiene la salida de red restringida a
# una lista blanca de dominios y no puede alcanzar *.vercel.app ni
# *.supabase.co directamente (curl/autocannon devuelven 403 del proxy), así
# que esta prueba se corre desde una terminal normal (la misma donde se
# hacen los `git push`).
#
# Requiere Node.js (ya lo tienes, es el mismo que usas para `npm run dev`).
# Usa `autocannon` vía npx, no hace falta instalar nada de forma permanente.
#
# Uso:
#   bash scripts/load-test.sh
#   bash scripts/load-test.sh https://tu-dominio.vercel.app
#
# Qué mide: la página de login (pública, la que reciben todos los usuarios
# antes de entrar, incluida la redirección de SSO) bajo distintos niveles
# de concurrencia. Para una herramienta interna de una PyME (unas pocas
# decenas de personas como mucho, nunca todas al mismo segundo), probar con
# 10-50 conexiones concurrentes es representativo de sobra.

set -e

URL="${1:-https://sistema-tickets-five.vercel.app}"

echo "== Prueba de carga: $URL/login =="
echo

echo "--- Carga ligera: 10 conexiones, 20 segundos ---"
npx --yes autocannon -c 10 -d 20 "$URL/login"

echo
echo "--- Carga moderada: 30 conexiones, 20 segundos ---"
npx --yes autocannon -c 30 -d 20 "$URL/login"

echo
echo "--- Pico: 50 conexiones, 15 segundos ---"
npx --yes autocannon -c 50 -d 15 "$URL/login"

echo
echo "== Listo =="
echo "Qué revisar en cada bloque:"
echo "  - 'Non 2xx-3xx responses': debería ser 0 (o muy cercano a 0)."
echo "  - 'Latency' p99: tiempo de respuesta del 99% de las peticiones. Para una"
echo "    página server-rendered en Vercel, unos cientos de ms es normal;"
echo "    varios segundos sostenidos en el bloque de 50 conexiones sería señal"
echo "    de alerta para el volumen de esta herramienta."
echo "  - 'Req/Sec': cuántas peticiones por segundo aguantó sin degradarse."
