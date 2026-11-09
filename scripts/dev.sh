#!/usr/bin/env bash
# Prepares env files, dependencies and Docker (profile stack), then starts the API and the client.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

build_args=()
if [[ "${1:-}" == "--build" ]]; then
  build_args+=(--build)
fi

copy_if_missing() {
  local source="$1"
  local dest="$2"
  if [[ ! -f "$dest" ]]; then
    cp "$source" "$dest"
    echo "Criado ${dest}"
  fi
}

env_value() {
  local file="$1"
  local key="$2"
  local line value=""
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" == "${key}="* ]] || continue
    value="${line#"${key}="}"
    value="${value%\"}"
    value="${value#\"}"
  done < "$file"
  printf '%s' "$value"
}

set_env_if_empty() {
  local file="$1"
  local key="$2"
  local value="$3"
  local current tmp found=0
  current="$(env_value "$file" "$key")"
  if [[ -n "$current" ]]; then
    return 0
  fi

  tmp="$(mktemp)"
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" == "${key}="* ]]; then
      printf '%s=%s\n' "$key" "$value"
      found=1
    else
      printf '%s\n' "$line"
    fi
  done < "$file" > "$tmp"
  if [[ "$found" -eq 0 ]]; then
    printf '%s=%s\n' "$key" "$value" >> "$tmp"
  fi
  mv "$tmp" "$file"
  echo "Definido ${key} em ${file}"
}

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker não está no PATH." >&2
  exit 1
fi
if ! command -v php >/dev/null 2>&1 || ! command -v composer >/dev/null 2>&1; then
  echo "PHP e Composer precisam estar no PATH." >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "npm não está no PATH." >&2
  exit 1
fi

copy_if_missing .env.example .env
copy_if_missing apps/api/.env.example apps/api/.env
copy_if_missing apps/client/.env.example apps/client/.env.local

browser_key="$(env_value .env BROWSER_STATE_KEY)"
if [[ -z "$browser_key" ]]; then
  browser_key="$(openssl rand -base64 32)"
fi
set_env_if_empty .env BROWSER_STATE_KEY "$browser_key"
set_env_if_empty apps/api/.env BROWSER_STATE_KEY "$browser_key"

capture_token="$(env_value .env CAPTURE_SERVICE_TOKEN)"
if [[ -z "$capture_token" ]]; then
  capture_token="$(openssl rand -hex 32)"
fi
set_env_if_empty .env CAPTURE_SERVICE_TOKEN "$capture_token"
set_env_if_empty apps/api/.env CAPTURE_SERVICE_TOKEN "$capture_token"
set_env_if_empty apps/api/.env CAPTURE_SERVICE_URL "http://127.0.0.1:7900"
set_env_if_empty apps/api/.env CAPTURE_NOVNC_PUBLIC_URL "http://127.0.0.1:6080/vnc.html?autoconnect=1&resize=scale"
set_env_if_empty apps/api/.env BROWSER_CAPTURE_TTL_MINUTES "15"

echo "Subindo Docker (MySQL, RabbitMQ, consumers e workers)..."
docker compose --profile stack up -d --remove-orphans --wait "${build_args[@]}" &
docker_pid=$!

echo "Instalando dependências..."
npm install &
npm_root_pid=$!
npm install --prefix apps/client &
npm_client_pid=$!
(cd apps/api && composer install --no-interaction) &
composer_pid=$!

fail=0
wait "$npm_root_pid" || fail=1
wait "$npm_client_pid" || fail=1
wait "$composer_pid" || fail=1
wait "$docker_pid" || fail=1
if [[ "$fail" -ne 0 ]]; then
  echo "Falha ao preparar o ambiente." >&2
  exit 1
fi

host_port_published() {
  local container="$1"
  local host_port="$2"
  docker port "$container" 2>/dev/null | grep -Eq ":${host_port}($|[^0-9])"
}

ensure_host_port() {
  local container="$1"
  local service="$2"
  local host_port="$3"
  if host_port_published "$container" "$host_port"; then
    return 0
  fi

  echo "A porta ${host_port} de ${service} não está publicada no host. Recriando o container..."
  if ! docker compose up -d --force-recreate --wait --no-deps "$service"; then
    echo "Não foi possível publicar ${service} em 127.0.0.1:${host_port}. Outro processo está usando essa porta." >&2
    ss -ltnp 2>/dev/null | grep ":${host_port} " || true
    exit 1
  fi
  if ! host_port_published "$container" "$host_port"; then
    echo "${service} subiu sem publicar 127.0.0.1:${host_port}." >&2
    ss -ltnp 2>/dev/null | grep ":${host_port} " || true
    exit 1
  fi
  recreated_ports=1
}

db_port="$(env_value apps/api/.env DB_PORT)"
rabbit_port="$(env_value .env RABBITMQ_PORT)"
db_port="${db_port:-3306}"
rabbit_port="${rabbit_port:-5672}"
recreated_ports=0
ensure_host_port shingeki-mysql mysql "$db_port"
ensure_host_port shingeki-rabbitmq rabbitmq "$rabbit_port"
if [[ "$recreated_ports" -eq 1 ]]; then
  docker compose --profile stack restart api-consumers sast-worker dast-worker dast-worker-2 >/dev/null
fi

if [[ -z "$(env_value apps/api/.env APP_KEY)" ]]; then
  (cd apps/api && php artisan key:generate)
fi

(cd apps/api && php artisan migrate --force)
(cd apps/api && php artisan storage:link)
docker compose restart api-consumers >/dev/null

db_name="$(env_value .env DB_DATABASE)"
db_password="$(env_value .env DB_PASSWORD)"
user_count="$(docker compose exec -T mysql mysql -N -uroot -p"${db_password}" "${db_name}" -e 'SELECT COUNT(*) FROM users' 2>/dev/null || true)"
if [[ "$user_count" == "0" ]]; then
  echo "Banco sem usuários. Rode: npm run seed"
fi

echo "API http://127.0.0.1:8000/api"
echo "Client http://localhost:3000"
echo "RabbitMQ http://localhost:15672"
exec npm run dev:servers
