#!/bin/bash

# Node.js application setup script
echo "🚀 Setting up Node.js application environment..."

# Update system packages
sudo apt-get update -y

# Install Node.js 20 (required by the application)
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Navigate to workspace
cd /mnt/persist/workspace

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

# Install additional test dependencies that might be missing
echo "📦 Installing additional test dependencies..."
npm install --save-dev node-fetch

# Set up environment variables for testing
echo "🔧 Setting up environment variables..."
export NODE_ENV=test
export JWT_SECRET=test-secret-key-for-testing
export DB_CLIENT=better-sqlite3
export DB_FILENAME=test-db
export CRM_DB_HOST=localhost
export CRM_DB_NAME=crm_test
export CRM_DB_USER=test
export CRM_DB_PASSWORD=test

# Add environment variables to profile
echo 'export NODE_ENV=test' >> $HOME/.profile
echo 'export JWT_SECRET=test-secret-key-for-testing' >> $HOME/.profile
echo 'export DB_CLIENT=better-sqlite3' >> $HOME/.profile
echo 'export DB_FILENAME=test-db' >> $HOME/.profile
echo 'export CRM_DB_HOST=localhost' >> $HOME/.profile
echo 'export CRM_DB_NAME=crm_test' >> $HOME/.profile
echo 'export CRM_DB_USER=test' >> $HOME/.profile
echo 'export CRM_DB_PASSWORD=test' >> $HOME/.profile

# Create test database directory
mkdir -p db

# Initialize database for testing
echo "🗄️ Setting up test database..."
npm run migrate

echo "✅ Setup completed successfully!"