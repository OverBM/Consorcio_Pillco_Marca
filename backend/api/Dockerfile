# Dockerfile para módulo Backend (Laboratorio DevOps)
FROM php:8.4-cli

ARG PORT=3000
ENV PORT=${PORT}

RUN apt-get update && apt-get install -y \
    libpq-dev \
    git \
    unzip \
    && docker-php-ext-install pdo pdo_pgsql

WORKDIR /app
COPY . /app

EXPOSE ${PORT}
CMD php artisan serve --host=0.0.0.0 --port=${PORT}
