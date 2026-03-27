#!/bin/sh
set -e

# 1. Clear the "Ghost" config cache from the build stage
echo "Clearing config cache..."
php artisan config:clear
php artisan cache:clear

# 2. Sync the database with TiDB
echo "Running migrations..."
php artisan migrate --force

# 3. Start the server (using the CMD passed from Dockerfile)
echo "Starting AmaniBrew..."
exec "$@"