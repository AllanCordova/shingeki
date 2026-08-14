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

echo "Waiting for RabbitMQ at ${RABBITMQ_HOST:-rabbitmq}:${RABBITMQ_PORT:-5672}..."
until php -r "
  \$errno = 0;
  \$errstr = '';
  \$fp = @fsockopen('${RABBITMQ_HOST:-rabbitmq}', (int) '${RABBITMQ_PORT:-5672}', \$errno, \$errstr, 2);
  if (\$fp) {
    fclose(\$fp);
    exit(0);
  }
  exit(1);
" 2>/dev/null; do
  sleep 2
done

php artisan package:discover --ansi
php artisan migrate --force

if [ "${RUN_DB_SEED:-false}" = "true" ]; then
  php artisan db:seed --force
fi

exec "$@"
