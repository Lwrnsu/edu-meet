#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PHP_PID=""
SPRING_PID=""

cleanup() {
  echo ""
  echo "Stopping servers..."
  [ -n "$SPRING_PID" ] && kill -0 "$SPRING_PID" 2>/dev/null && kill "$SPRING_PID" 2>/dev/null || true
  [ -n "$PHP_PID" ] && kill -0 "$PHP_PID" 2>/dev/null && kill "$PHP_PID" 2>/dev/null || true
  for port in 8080 3000; do
    PIDS=$(lsof -ti :$port 2>/dev/null || true)
    [ -n "$PIDS" ] && kill -9 $PIDS 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

echo "1/5 Checking XAMPP MySQL (port 3306)..."
if ! nc -z 127.0.0.1 3306 >/dev/null 2>&1; then
  echo "ERROR: MySQL is not running. Open XAMPP, click Start on MySQL Database, and run bash demo.sh again."
  exit 1
fi

echo "2/5 Starting PHP API server on http://127.0.0.1:3000..."
OLD_3000=$(lsof -ti :3000 2>/dev/null || true)
[ -n "$OLD_3000" ] && kill -9 $OLD_3000 2>/dev/null || true
PHP_BIN=$(command -v php || echo "/Applications/XAMPP/xamppfiles/bin/php")
PHP_CLI_SERVER_WORKERS=4 "$PHP_BIN" -S 127.0.0.1:3000 -t "$ROOT_DIR" > /tmp/edumeet-php.log 2>&1 &
PHP_PID=$!
sleep 1
PHP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/backend/edu-meet/php/api/auth/school_login.php || echo "000")
if [ "$PHP_CODE" = "000" ] || [ "$PHP_CODE" = "403" ] || [ "$PHP_CODE" = "404" ]; then
  echo "ERROR: PHP server returned HTTP $PHP_CODE. Check /tmp/edumeet-php.log"
  exit 1
fi
echo "    PHP API ready (HTTP $PHP_CODE)"

echo "3/5 Checking Redis (port 6379)..."
REDIS_CLI="$HOME/redis-stable/src/redis-cli"
REDIS_SRV="$HOME/redis-stable/src/redis-server"
if [ "$("$REDIS_CLI" ping 2>/dev/null)" != "PONG" ]; then
  "$REDIS_SRV" --daemonize yes --dir /tmp
  sleep 1
fi
echo "    Redis: $("$REDIS_CLI" ping)"

echo "4/5 Starting Spring Boot backend on http://localhost:8080..."
OLD_8080=$(lsof -ti :8080 2>/dev/null || true)
[ -n "$OLD_8080" ] && kill -9 $OLD_8080 2>/dev/null || true

cd "$ROOT_DIR/backend/edu-meet"
chmod +x ./mvnw
PHP_API="http://127.0.0.1:3000/backend/edu-meet/php/api"
./mvnw spring-boot:run -Dspring-boot.run.arguments="--app.php.login-url=$PHP_API/auth/login.php --app.php.system-admin-login-url=$PHP_API/auth/system_admin_login.php --app.php.school-login-url=$PHP_API/auth/school_login.php --app.php.college-admin-login-url=$PHP_API/auth/school_login.php --app.php.signup-url=$PHP_API/auth/signup.php --app.php.base-url=$PHP_API" > /tmp/edumeet-spring.log 2>&1 &
SPRING_PID=$!

for i in $(seq 1 60); do
  if curl -s http://localhost:8080/api/health >/dev/null 2>&1; then
    echo "    Spring Boot ready on http://localhost:8080"
    break
  fi
  if ! kill -0 "$SPRING_PID" 2>/dev/null; then
    echo "ERROR: Spring Boot failed to start. Last log lines:"
    tail -n 25 /tmp/edumeet-spring.log
    exit 1
  fi
  sleep 1
done

echo "5/5 Starting React frontend and opening http://localhost:5173..."
(sleep 2 && open "http://localhost:5173" >/dev/null 2>&1) &
cd "$ROOT_DIR/frontend/edu-meet"
npm run dev
