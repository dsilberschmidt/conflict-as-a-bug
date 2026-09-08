#!/usr/bin/env bash
# Smoke test manual para el SummaryPoller.
#
# Crea un caso sin summary, abre el navegador en su página de detalle para que
# el SummaryPoller empiece a hacer polling, espera 5 segundos y recién entonces
# dispara la generación del resumen. Permite observar el indicador de actividad
# ("Generating summary…") y verificar que el polling actualiza la página solo,
# sin tener que competir contra el timing manualmente.
#
# Uso:
#   ./web/scripts/test-summary-poller.sh
#   BASE_URL=https://conflict-as-a-bug.vercel.app ./web/scripts/test-summary-poller.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
CASE_ID="test-poller-$(date +%s)"

curl -s -X POST "$BASE_URL/api/cases" \
  -H "Content-Type: application/json" \
  -d "{\"caseId\":\"$CASE_ID\",\"envelope\":{\"version\":\"v1\",\"algorithm\":\"AES-256-GCM\",\"iv\":\"dGVzdGl2MTIz\",\"ciphertext\":\"dGVzdGNpcGhlcnRleHQ=\"}}" \
  > /dev/null

(xdg-open "$BASE_URL/showcase/$CASE_ID" 2>/dev/null || open "$BASE_URL/showcase/$CASE_ID" 2>/dev/null) &

sleep 5

curl -s -X POST "$BASE_URL/api/cases/$CASE_ID/summary/generate" \
  -H "Content-Type: application/json" \
  -d '{"text": "A wanted to book flights early, B was waiting on a work schedule confirmation."}' \
  > /dev/null

echo "Listo. Caso: $CASE_ID — mirá la pestaña que se abrió."
