FROM php:8.4-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends libsqlite3-dev curl \
    && docker-php-ext-install pdo_sqlite \
    && rm -rf /var/lib/apt/lists/* \
    && a2enmod rewrite

WORKDIR /var/www/html

COPY public/ /var/www/html/
COPY includes/ /var/www/includes/
COPY storage/ /var/www/storage/
COPY bootstrap.php /var/www/bootstrap.php

RUN mkdir -p /var/www/data \
    && chown -R www-data:www-data /var/www/data /var/www/storage

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["apache2-foreground"]
