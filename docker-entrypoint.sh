#!/bin/sh
set -e

# Run migrations
echo "Running migrations..."
php artisan migrate --force

# Start the application
echo "Starting application..."
exec "$@"