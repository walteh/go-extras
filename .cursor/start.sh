#!/bin/bash

# Cursor Background Agent Start Script
# Simple environment preparation

set -e

echo "🔄 Starting Go Extras development environment..."
cd /workspace

# Basic environment setup
export GOPATH="${GOPATH:-$HOME/go}"
export GOBIN="${GOBIN:-$GOPATH/bin}"
export PATH="$GOBIN:$PATH"

# Create workspace if needed
mkdir -p "$GOPATH/src" "$GOPATH/bin" "$GOPATH/pkg"

# Quick verification
echo "✅ Environment ready!"
echo "  Go: $(go version 2> /dev/null || echo 'not found')"
echo "  Bun: $(bun --version 2> /dev/null || echo 'not found')"
echo "  Working directory: $(pwd)"
echo ""
echo "Quick commands:"
echo "  go tool task --list"
echo "  cd editors/vscode && bun run build"
echo ""
