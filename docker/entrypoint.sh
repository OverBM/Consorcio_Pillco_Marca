#!/bin/sh
set -e

php artisan package:discover --ansi
php artisan config:cache
php artisan view:cache

exec /usr/local/bin/frankenphp run --config /etc/caddy/Caddyfile
