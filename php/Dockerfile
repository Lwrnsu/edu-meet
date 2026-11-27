FROM php:zts-alpine3.24
RUN docker-php-ext-install mysqli pdo_mysql
WORKDIR /app
COPY . .
EXPOSE 8000
CMD ["php", "-S", "0.0.0.0:8000"]
