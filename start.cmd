@echo off
rem Double-click to start the app: it checks Node.js and the dependencies,
rem installs what is missing, asks once for the AI key, and opens the browser.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run.ps1" -Script start
if errorlevel 1 pause
