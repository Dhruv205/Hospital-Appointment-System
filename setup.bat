@echo off
REM Hospital Appointment Management System Setup Script for Windows
REM This script helps set up the complete system

echo 🏥 Hospital Appointment Management System Setup
echo ==============================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js v16 or higher.
    pause
    exit /b 1
) else (
    echo ✅ Node.js is installed
)

REM Check if MySQL is installed
mysql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ MySQL is not installed. Please install MySQL v8.0 or higher.
    pause
    exit /b 1
) else (
    echo ✅ MySQL is installed
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm.
    pause
    exit /b 1
) else (
    echo ✅ npm is installed
)

echo.
echo ℹ️  Installing backend dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
) else (
    echo ✅ Backend dependencies installed successfully
)

echo.
echo ℹ️  Installing frontend dependencies...
cd frontend
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
) else (
    echo ✅ Frontend dependencies installed successfully
)
cd ..

echo.
echo ℹ️  Creating environment file...
if not exist .env (
    copy env.example .env
    echo ✅ Environment file created from template
    echo ⚠️  Please update .env with your database credentials
) else (
    echo ⚠️  Environment file already exists
)

echo.
echo ℹ️  Setup completed!
echo.
echo 📋 Next steps:
echo 1. Update .env file with your database credentials
echo 2. Run: node scripts/setupDatabase.js
echo 3. Start backend: npm start
echo 4. Start frontend: cd frontend ^&^& npm start
echo.
echo 🧪 To run tests: node test_system.js
echo.
pause
