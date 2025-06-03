#!/bin/bash

# Cursor Background Agent Install Script
# Simple setup using Go 1.24+ tool directive and Bun

set -e

echo "🚀 Setting up Go Extras development environment..."
cd /workspace

# Verify Go and Bun are available
echo "🔍 Verifying tools..."
if command -v go > /dev/null 2>&1; then
	echo "✅ Go: $(go version)"
else
	echo "❌ Go not found"
	exit 1
fi

if command -v bun > /dev/null 2>&1; then
	echo "✅ Bun: $(bun --version)"
else
	echo "❌ Bun not found"
	exit 1
fi

# Update Go modules
if [ -f "go.mod" ]; then
	echo "📦 Updating root Go modules..."
	go mod download
	go mod tidy
fi

# Set up Go tools from tools/go.mod
if [ -d "tools" ] && [ -f "tools/go.mod" ]; then
	echo "🔧 Setting up Go tools..."
	cd tools
	go mod download
	go mod tidy
	echo "✅ Go tools available via 'go tool <name>'"
	cd /workspace
fi

# Set up VS Code extension
if [ -d "editors/vscode" ] && [ -f "editors/vscode/package.json" ]; then
	echo "📋 Setting up VS Code extension..."
	cd editors/vscode
	bun install
	bun run build
	echo "✅ VS Code extension built"
	cd /workspace
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Available commands:"
echo "  go tool task --list     # Show tasks"
echo "  go tool dlv --help      # Delve debugger"
echo "  cd editors/vscode       # Go to extension"
echo "  bun run build           # Build extension"
echo ""
