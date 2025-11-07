#!/bin/bash

# Export Onboarding Agents - Shell Script
# This script runs the Node.js export script to retrieve agent onboarding data

echo "🚀 Exporting Agent Onboarding Data from Digital Ocean Database"
echo "================================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Installing dependencies..."
    npm install
fi

# Navigate to server directory if it exists and has its own package.json
if [ -d "server" ] && [ -f "server/package.json" ]; then
    echo "📂 Found server directory with package.json"
    cd server
    
    # Check if server node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "⚠️  Server node_modules not found. Installing dependencies..."
        npm install
    fi
    
    # Run the export script
    echo "📊 Running export script..."
    node scripts/export-onboarding-agents.js
    
else
    # Run from root directory
    echo "📊 Running export script..."
    node scripts/export-onboarding-agents.js
fi

echo ""
echo "✨ Export process completed!"
echo "📁 Check the 'exports' folder for your files"





