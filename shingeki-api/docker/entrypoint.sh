#!/bin/sh
set -e

cd /var/www/html

echo "Waiting for MySQL at ${DB_HOST:-mysql}:${DB_PORT:-3306}..."
until php -r "
  try {
    new PDO(
      'mysql:host=${DB_HOST:-mysql};port=${DB_PORT:-3306}',
      '${DB_USERNAME:-root}',
      '${DB_PASSWORD:-secret}'
    );
    exit(0);
  } catch (Throwable \$e) {
    exit(1);
  }
" 2>/dev/null; do
  sleep 2
done

php artisan package:discover --ansi
php artisan migrate --force

if [ "${RUN_DB_SEED:-false}" = "true" ]; then
  php artisan db:seed --force
fi

php artisan storage:link --force 2>/dev/null || true

exec "$@"
