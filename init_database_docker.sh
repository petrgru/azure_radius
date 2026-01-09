#!/bin/bash

# =====================================================
# Docker Database Initialization Script
# =====================================================
# This script initializes the database for RADIUS server
# running in Docker containers
# =====================================================

set -e

echo "🔧 RADIUS Server - Database Initialization"
echo "=========================================="
echo ""

# Check if init_database.sql exists
if [ ! -f "init_database.sql" ]; then
    echo "❌ Error: init_database.sql not found in current directory"
    exit 1
fi

# Function to show usage
show_usage() {
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  1) MySQL in Docker (separate container)"
    echo "  2) MySQL external (Azure/AWS/Remote)"
    echo "  3) Custom docker-compose service"
    echo ""
}

# Function to initialize with MySQL in Docker
init_mysql_docker() {
    read -p "Enter MySQL container name [mysql]: " MYSQL_CONTAINER
    MYSQL_CONTAINER=${MYSQL_CONTAINER:-mysql}
    
    read -p "Enter MySQL root password: " -s MYSQL_PASSWORD
    echo ""
    
    read -p "Enter database name: " DB_NAME
    
    echo ""
    echo "📦 Copying SQL script to container..."
    docker cp init_database.sql "$MYSQL_CONTAINER:/tmp/init_database.sql"
    
    echo "🔄 Executing initialization script..."
    docker exec -i "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_PASSWORD" "$DB_NAME" < init_database.sql
    
    echo "✅ Database initialized successfully!"
    
    # Verify
    echo ""
    echo "📋 Verifying tables..."
    docker exec -i "$MYSQL_CONTAINER" mysql -u root -p"$MYSQL_PASSWORD" "$DB_NAME" -e "SHOW TABLES;"
}

# Function to initialize with external MySQL
init_mysql_external() {
    read -p "Enter RADIUS container name [azure-radius-updated]: " RADIUS_CONTAINER
    RADIUS_CONTAINER=${RADIUS_CONTAINER:-azure-radius-updated}
    
    echo ""
    echo "Using environment variables from container..."
    echo "Make sure DB_HOST, DB_USER, DB_PASSWORD, DB_NAME are set in your .env file"
    echo ""
    
    read -p "Press Enter to continue..."
    
    echo "🔄 Executing initialization script..."
    docker exec -i "$RADIUS_CONTAINER" sh -c 'mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME' < init_database.sql
    
    echo "✅ Database initialized successfully!"
}

# Function to initialize with docker-compose
init_docker_compose() {
    read -p "Enter MySQL service name from docker-compose.yml [mysql]: " SERVICE_NAME
    SERVICE_NAME=${SERVICE_NAME:-mysql}
    
    read -p "Enter database name: " DB_NAME
    
    read -p "Enter MySQL root password: " -s MYSQL_PASSWORD
    echo ""
    
    echo "🔄 Executing initialization script via docker-compose..."
    cat init_database.sql | docker-compose exec -T "$SERVICE_NAME" mysql -u root -p"$MYSQL_PASSWORD" "$DB_NAME"
    
    echo "✅ Database initialized successfully!"
}

# Main menu
echo "Select initialization method:"
echo ""
show_usage
echo ""

read -p "Enter option [1-3]: " OPTION

case $OPTION in
    1)
        echo ""
        echo "Selected: MySQL in Docker"
        echo "-------------------------"
        init_mysql_docker
        ;;
    2)
        echo ""
        echo "Selected: External MySQL"
        echo "------------------------"
        init_mysql_external
        ;;
    3)
        echo ""
        echo "Selected: Docker Compose"
        echo "------------------------"
        init_docker_compose
        ;;
    *)
        echo "❌ Invalid option"
        show_usage
        exit 1
        ;;
esac

echo ""
echo "🎉 All done! You can now start your RADIUS server."
echo ""
echo "To start: docker-compose up -d"
echo "To view logs: docker-compose logs -f radius"
