#!/bin/sh
set -e

php /var/www/bootstrap.php

exec "$@"
