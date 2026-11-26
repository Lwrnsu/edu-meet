#!/usr/bin/env bash
API=${API:-http://localhost:8080}
PHP_API=${PHP_API:-http://localhost/edu-meet/backend/edu-meet/php/api}
LOGIN_PATH=${LOGIN_PATH:-php-school-login}
pass(){ echo "  PASS  $1"; }; fail(){ echo "  FAIL  $1"; FAILED=1; }
FAILED=0

echo "1) Redis up?"
[ "$(redis-cli ping 2>/dev/null)" = "PONG" ] && pass "redis-cli ping" || { fail "Redis not running"; exit 1; }

echo "2) Login through Spring ($LOGIN_PATH)"
RESP=$(curl -si -X POST "$API/api/auth/$LOGIN_PATH" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
CODE=$(echo "$RESP" | head -1 | awk '{print $2}')
AUTH=$(echo "$RESP" | tr -d '\r' | grep -i '^authorization:' | sed 's/^[Aa]uthorization: *//')
TOKEN=${AUTH#Bearer }
[ "$CODE" = "200" ] && pass "HTTP 200" || fail "login HTTP $CODE (check email/password, PHP/XAMPP + MySQL running)"
[ -n "$TOKEN" ] && pass "got Redis token ($TOKEN)" || { fail "no Authorization header"; exit 1; }

echo "3) TTL in Redis (expect about 86400)"
TTL=$(redis-cli ttl "auth:token:$TOKEN")
echo "  TTL = $TTL"
[ "$TTL" -gt 86300 ] && [ "$TTL" -le 86400 ] && pass "24h expiry" || fail "TTL is $TTL, not ~86400"

echo "4) Still logged in after 35 seconds? (the old ~30s bug)"
sleep 35
C=$(curl -s -o /dev/null -w '%{http_code}' "$API/api/auth/logIn/cached" -H "Authorization: $AUTH")
[ "$C" = "200" ] && pass "logIn/cached = 200 after 35s" || fail "logIn/cached = $C after 35s"
echo "  TTL after refresh = $(redis-cli ttl "auth:token:$TOKEN")"

echo "5) PHP middleware accepts the Redis token (anything except 401 is good)"
C=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$PHP_API/auth/request_password_otp.php" \
  -H "Authorization: $AUTH" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\"}")
[ "$C" != "401" ] && pass "PHP returned $C (not 401)" || fail "PHP returned 401"

echo "6) Logout deletes the key"
C=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/api/auth/logOut" -H "Authorization: $AUTH")
[ "$C" = "200" ] && pass "logOut = 200" || fail "logOut = $C"
C=$(curl -s -o /dev/null -w '%{http_code}' "$API/api/auth/logIn/cached" -H "Authorization: $AUTH")
[ "$C" = "401" ] && pass "token rejected after logout" || fail "expected 401, got $C"
[ "$(redis-cli exists "auth:token:$TOKEN")" = "0" ] && pass "key gone from Redis" || fail "key still in Redis"


login_token(){ # $1 path  $2 email  $3 password -> prints "Bearer <token>"
  curl -si -X POST "$API/api/auth/$1" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$2\",\"password\":\"$3\"}" | tr -d '\r' | grep -i '^authorization:' | sed 's/^[Aa]uthorization: *//'
}
http(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }

echo "7) Redis value holds id + role + user info"
AUTH2=$(login_token "$LOGIN_PATH" "$EMAIL" "$PASSWORD"); TOKEN2=${AUTH2#Bearer }
VAL=$(redis-cli get "auth:token:$TOKEN2"); echo "  value = $VAL"
UID_=$(echo "$VAL" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
echo "$VAL" | grep -q '"role":"' && pass "role is in the value" || fail "no role in value"
echo "$VAL" | grep -q '"user":{' && pass "user info is in the value" || fail "no user info in value"
[ "$(redis-cli sismember "auth:user:$UID_" "$TOKEN2")" = "1" ] && pass "token indexed in auth:user:$UID_" || fail "token not in auth:user:$UID_"

echo "8) Updating the user's info updates Redis"
CUR=$(curl -s "$API/api/php/users?id=$UID_" -H "Authorization: $AUTH2")
FIRST=$(echo "$CUR" | grep -o '"first_name":"[^"]*"' | head -1 | cut -d'"' -f4)
LAST=$(echo "$CUR" | grep -o '"last_name":"[^"]*"' | head -1 | cut -d'"' -f4)
MAIL=$(echo "$CUR" | grep -o '"email":"[^"]*"' | head -1 | cut -d'"' -f4)
put_name(){ http -X PUT "$API/api/php/users?id=$UID_" -H "Authorization: $AUTH2" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$MAIL\",\"first_name\":\"$1\",\"last_name\":\"$LAST\"}"; }
if [ -z "$FIRST" ] || [ -z "$LAST" ] || [ -z "$MAIL" ]; then
  fail "could not read the user from /api/php/users?id=$UID_"
else
  C=$(put_name "Synctest"); [ "$C" = "200" ] && pass "PUT user = 200" || fail "PUT user = $C"
  redis-cli get "auth:token:$TOKEN2" | grep -q '"first_name":"Synctest"' && pass "Redis now has first_name Synctest" || fail "Redis value not updated"
  redis-cli get "auth:token:$TOKEN2" | grep -q '"role":"' && pass "role kept after update" || fail "role lost after update"
  C=$(put_name "$FIRST"); [ "$C" = "200" ] && pass "restored original name" || fail "restore name = $C"
  redis-cli get "auth:token:$TOKEN2" | grep -q "\"first_name\":\"$FIRST\"" && pass "Redis has original name again" || fail "Redis not restored"
fi

echo "9) Changing the user's role/membership clears their Redis session"
MID=$(curl -s "$API/api/php/school-memberships?user_id=$UID_" -H "Authorization: $AUTH2" | grep -o '"membership_id":[0-9]*' | head -1 | cut -d: -f2)
URID=$(curl -s "$API/api/php/user-roles?user_id=$UID_" -H "Authorization: $AUTH2" | grep -o '"user_role_id":[0-9]*' | head -1 | cut -d: -f2)
if [ -n "$MID" ]; then
  C=$(http -X PATCH "$API/api/php/school-memberships?id=$MID" -H "Authorization: $AUTH2" -H 'Content-Type: application/json' -d '{}')
  [ "$C" = "200" ] && pass "PATCH school-membership = 200 (no data changed)" || fail "PATCH school-membership = $C"
elif [ -n "$URID" ]; then
  RID=$(curl -s "$API/api/php/user-roles?id=$URID" -H "Authorization: $AUTH2" | grep -o '"role_id":[0-9]*' | head -1 | cut -d: -f2)
  C=$(http -X PUT "$API/api/php/user-roles?id=$URID" -H "Authorization: $AUTH2" -H 'Content-Type: application/json' -d "{\"role_id\":$RID}")
  [ "$C" = "200" ] && pass "PUT user-role = 200 (same role)" || fail "PUT user-role = $C"
else
  echo "  SKIP  this account has no membership or user-role row"; C=skip
fi
if [ "$C" != "skip" ]; then
  [ "$(redis-cli exists "auth:token:$TOKEN2")" = "0" ] && pass "session cleared, user must log in again for the new role" || fail "session still in Redis"
  [ "$(redis-cli exists "auth:user:$UID_")" = "0" ] && pass "user index cleared" || fail "auth:user:$UID_ still in Redis"
  [ "$(http "$API/api/auth/logIn/cached" -H "Authorization: $AUTH2")" = "401" ] && pass "old token rejected" || fail "old token still accepted"
fi

echo "10) Deleting a user removes their Redis session (uses a throwaway user)"
AUTH3=$(login_token "$LOGIN_PATH" "$EMAIL" "$PASSWORD")
TMAIL="synctest.$(date +%s)@example.com"
CR=$(curl -s -X POST "$API/api/php/users" -H "Authorization: $AUTH3" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$TMAIL\",\"first_name\":\"Synctest\",\"last_name\":\"Temp\",\"password\":\"Temp12345\"}")
TID=$(echo "$CR" | grep -o '"user_id":[0-9]*' | head -1 | cut -d: -f2)
if [ -z "$TID" ]; then
  fail "could not create throwaway user: $CR"
else
  AUTHT=$(login_token php-login "$TMAIL" "Temp12345"); TOKT=${AUTHT#Bearer }
  [ "$(redis-cli exists "auth:token:$TOKT")" = "1" ] && pass "throwaway user is logged in (key in Redis)" || fail "throwaway login failed (check LOGIN path php-login)"
  C=$(http -X DELETE "$API/api/php/users?id=$TID" -H "Authorization: $AUTH3")
  case "$C" in 2??) pass "DELETE user = $C";; *) fail "DELETE user = $C";; esac
  [ "$(redis-cli exists "auth:token:$TOKT")" = "0" ] && pass "deleted user's key gone from Redis" || fail "deleted user's key still in Redis"
  [ "$(http "$API/api/auth/logIn/cached" -H "Authorization: $AUTHT")" = "401" ] && pass "deleted user's token rejected" || fail "deleted user's token still accepted"
fi
http -X POST "$API/api/auth/logOut" -H "Authorization: $AUTH3" >/dev/null

[ $FAILED = 0 ] && echo "ALL GOOD" || echo "SOME TESTS FAILED"
