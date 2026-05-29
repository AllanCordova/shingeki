# Shingeki API

Backend Laravel do monorepo [Shingeki](../README.md).

Documentação de setup, execução e endpoints: [README na raiz](../README.md).

## Desenvolvimento local

```bash
composer install
cp ../.env.example ../.env
cp ../.env .env
php artisan key:generate
composer test
```
