@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0test-redis.ps1" %*
