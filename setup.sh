#!/bin/bash

# Hospital Appointment Management System Setup Script
# This script helps set up the complete system

echo "🏥 Hospital Appointment Management System Setup"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Node.js is installed
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_status "Node.js is installed: $NODE_VERSION"
    else
        print_error "Node.js is not installed. Please install Node.js v16 or higher."
        exit 1
    fi
}

# Check if MySQL is installed
check_mysql() {
    if command -v mysql &> /dev/null; then
        MYSQL_VERSION=$(mysql --version)
        print_status "MySQL is installed: $MYSQL_VERSION"
    else
        print_error "MySQL is not installed. Please install MySQL v8.0 or higher."
        exit 1
    fi
}

# Check if npm is installed
check_npm() {
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_status "npm is installed: $NPM_VERSION"
    else
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
}

# Install backend dependencies
install_backend() {
    print_info "Installing backend dependencies..."
    if npm install; then
        print_status "Backend dependencies installed successfully"
    else
        print_error "Failed to install backend dependencies"
        exit 1
    fi
}

# Install frontend dependencies
install_frontend() {
    print_info "Installing frontend dependencies..."
    cd frontend
    if npm install; then
        print_status "Frontend dependencies installed successfully"
        cd ..
    else
        print_error "Failed to install frontend dependencies"
        exit 1
    fi
}

# Create environment file
create_env() {
    print_info "Creating environment file..."
    if [ ! -f .env ]; then
        cp env.example .env
        print_status "Environment file created from template"
        print_warning "Please update .env with your database credentials"
    else
        print_warning "Environment file already exists"
    fi
}

# Setup database
setup_database() {
    print_info "Setting up database..."
    
    # Check if .env exists
    if [ ! -f .env ]; then
        print_error "Environment file not found. Please run setup first."
        exit 1
    fi
    
    # Source environment variables
    source .env
    
    # Test database connection
    print_info "Testing database connection..."
    if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" &> /dev/null; then
        print_status "Database connection successful"
    else
        print_error "Database connection failed. Please check your credentials in .env"
        exit 1
    fi
    
    # Create database if it doesn't exist
    print_info "Creating database if it doesn't exist..."
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;" 2>/dev/null
    
    # Run database setup script
    print_info "Running database setup script..."
    if node scripts/setupDatabase.js; then
        print_status "Database setup completed successfully"
    else
        print_error "Database setup failed"
        exit 1
    fi
}

# Run tests
run_tests() {
    print_info "Running system tests..."
    if node test_system.js; then
        print_status "All tests passed"
    else
        print_warning "Some tests failed. Please check the output above."
    fi
}

# Start services
start_services() {
    print_info "Starting services..."
    print_info "Backend will start on http://localhost:5000"
    print_info "Frontend will start on http://localhost:3000"
    print_info "Press Ctrl+C to stop all services"
    
    # Start backend in background
    npm start &
    BACKEND_PID=$!
    
    # Wait a moment for backend to start
    sleep 3
    
    # Start frontend
    cd frontend
    npm start &
    FRONTEND_PID=$!
    
    # Wait for user to stop
    wait
}

# Main setup function
main() {
    echo "Starting setup process..."
    echo ""
    
    # Check prerequisites
    print_info "Checking prerequisites..."
    check_node
    check_mysql
    check_npm
    echo ""
    
    # Install dependencies
    print_info "Installing dependencies..."
    install_backend
    install_frontend
    echo ""
    
    # Create environment file
    create_env
    echo ""
    
    # Setup database
    setup_database
    echo ""
    
    # Run tests
    run_tests
    echo ""
    
    # Ask if user wants to start services
    read -p "Do you want to start the services now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_services
    else
        print_info "Setup completed! You can start the services manually:"
        print_info "Backend: npm start"
        print_info "Frontend: cd frontend && npm start"
    fi
}

# Handle script arguments
case "${1:-}" in
    "install")
        check_node
        check_npm
        install_backend
        install_frontend
        create_env
        ;;
    "database")
        setup_database
        ;;
    "test")
        run_tests
        ;;
    "start")
        start_services
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  install   - Install dependencies and create environment file"
        echo "  database  - Setup database schema and sample data"
        echo "  test      - Run system tests"
        echo "  start     - Start backend and frontend services"
        echo "  help      - Show this help message"
        echo ""
        echo "If no command is provided, the full setup process will run."
        ;;
    *)
        main
        ;;
esac
