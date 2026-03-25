# Use PHP 8.2 CLI with required extensions
FROM php:8.2-cli

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    unzip \
    git \
    curl \
    libzip-dev \
    npm \
    && docker-php-ext-install pdo pdo_mysql zip

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Copy project files
COPY . .

# Install PHP and Node dependencies
RUN composer install --no-dev --optimize-autoloader
RUN npm install
RUN npm run build

# Expose port (Render will set $PORT)
EXPOSE 3000

# Start Laravel using built-in PHP server
CMD ["php", "-S", "0.0.0.0:3000", "-t", "public"]