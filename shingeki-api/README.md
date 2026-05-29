# Shingeki API

Backend Laravel do monorepo [Shingeki](../README.md).

Documentação de setup, execução e endpoints: [README na raiz](../README.md).

## Desenvolvimento local

```bash
composer install
cp ../.env.example ../.env
# Windows: New-Item -ItemType Junction -Path .env -Target ..\.env -Force
php artisan key:generate
composer test
```
