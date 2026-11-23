#!/bin/sh
set -e

php artisan package:discover --ansi
php artisan config:cache
php artisan view:cache

exec frankenphp run --config /etc/caddy/Caddyfile
