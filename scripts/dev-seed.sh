#!/usr/bin/env bash
# Создаёт дев-комнату с игроками и печатает токены для разработки фронта.
# Использование: scripts/dev-seed.sh [игроков 1..8] [адрес API]
# Пример: scripts/dev-seed.sh 4 http://localhost:8080/api/v1
set -euo pipefail

API="${2:-http://localhost:8080/api/v1}"
COUNT="${1:-4}"

if [ "$COUNT" -lt 1 ] || [ "$COUNT" -gt 8 ]; then
  echo "игроков: от 1 до 8 (шафл требует минимум 3)" >&2
  exit 1
fi

NAMES=("Оля" "Аня" "Боря" "Вера" "Гоша" "Даша" "Женя" "Коля")

print_player() {
  python3 -c '
import json, sys
p = json.load(sys.stdin)["player"]
role = "организатор" if p["isOrganizer"] else "игрок"
print("  %-8s avatar=%-2d %-11s token=%s" % (p["name"], p["avatar"], role, p["token"]))'
}

CREATED=$(curl -fsS -X POST "$API/rooms" -H 'content-type: application/json' \
  -d '{"name":"Дев-комната","budget":200000,"organizerName":"Оля","avatar":1}')

CODE=$(printf '%s' "$CREATED" | python3 -c 'import json,sys; print(json.load(sys.stdin)["room"]["code"])')

echo "Комната: $CODE"
printf '%s' "$CREATED" | print_player

for ((i = 1; i < COUNT; i++)); do
  NAME="${NAMES[$i]}"
  AVATAR=$(( (i * 5) % 32 ))
  JOINED=$(curl -fsS -X POST "$API/rooms/$CODE/join" -H 'content-type: application/json' \
    -d "{\"name\":\"$NAME\",\"avatar\":$AVATAR}")
  printf '%s' "$JOINED" | print_player
done

echo
echo "WS:         ws://localhost:8080/api/v1/rooms/$CODE/ws?token=<token>"
echo "Шафл (орг): curl -X POST $API/rooms/$CODE/shuffle -H 'authorization: Bearer <токен организатора>'"
