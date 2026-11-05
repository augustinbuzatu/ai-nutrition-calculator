@echo off
rem For the maintainer: applies new database migrations to the Supabase project.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run.ps1" -Script update-database
pause
