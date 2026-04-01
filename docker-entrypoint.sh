#!/bin/sh
set -e

echo "Starting Laravel container..."

# Clear only safe caches
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

# Run migrations
php artisan migrate --force || true

# Rebuild config cache
php artisan config:cache || true

# Start app
exec "$@"
