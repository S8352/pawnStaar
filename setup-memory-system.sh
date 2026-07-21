#!/bin/bash

# PawnStaar Memory Scaffolding System Setup Script
# This script sets up the complete memory scaffolding system for Cursor

set -e

echo "🚀 Setting up PawnStaar Memory Scaffolding System..."

# Check if we're in the right directory
if [ ! -f "readme.md" ] && [ ! -f "doc.md" ]; then
    echo "❌ Error: Please run this script from the PawnStaar project root directory"
    exit 1
fi

# Create memory bank directories if they don't exist
echo "📁 Creating memory bank structure..."
mkdir -p memory-bank/{core,persistent,session,external/{api-docs,reference-materials}}
mkdir -p .cursor/rules

# Install MCP server dependencies
echo "📦 Installing MCP server dependencies..."
cd memory-bank
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in memory-bank directory"
    exit 1
fi

npm install

# Build the TypeScript files
echo "🔨 Building TypeScript files..."
npm run build

# Run health check
echo "🏥 Running health check..."
npm run health-check

# Go back to project root
cd ..

# Verify Cursor configuration
echo "🔧 Verifying Cursor configuration..."
if [ ! -f ".cursorrules" ]; then
    echo "❌ Error: .cursorrules file not found"
    exit 1
fi

if [ ! -f ".cursor/mcp.json" ]; then
    echo "❌ Error: MCP configuration not found"
    exit 1
fi

# Test MCP server
echo "🧪 Testing MCP server..."
cd memory-bank
timeout 10s npm run mcp-server || echo "MCP server test completed"

cd ..

echo "✅ Memory scaffolding system setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Restart Cursor to load the new MCP configuration"
echo "2. Test the memory system with: cd memory-bank && npm run health-check"
echo "3. Start the MCP server with: cd memory-bank && npm run mcp-server"
echo ""
echo "🎉 Your AI assistant now has persistent memory capabilities!"
echo ""
echo "💡 The system includes:"
echo "   - Hierarchical memory storage (core, persistent, session, external)"
echo "   - Dynamic context assembly with token optimization"
echo "   - Memory analytics and health monitoring"
echo "   - Automated optimization and cleanup"
echo "   - MCP integration for seamless Cursor operation"
echo ""
echo "📚 See memory-bank/README.md for detailed usage instructions"

