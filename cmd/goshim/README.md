# GoShim: Enhanced Go Wrapper

A lightweight Go wrapper that enhances the standard `go` command with development workflow improvements and stdio logging capabilities.

## Purpose

GoShim serves as a drop-in replacement for the `go` command that:

-   **Prevents recursion** when wrapper tools are symlinked as `go`
-   **Provides stdio logging** for debugging and development workflows
-   **Integrates with workspace-aware tooling** via `go.work` detection
-   **Embeds common development tasks** like optimized `mod tidy` operations
-   **Supports go tool integration** via embedded command routing

## Quick Start

### Basic Usage (Drop-in Replacement)

```bash
# Use exactly like the go command
./goshim version
./goshim mod tidy
./goshim test ./...
./goshim run main.go
```

### Workspace-Aware Mod Operations

```bash
# Optimized mod tidy across all workspace modules
./goshim mod tidy

# Upgrade all workspace modules
./goshim mod upgrade
```

### With stdio Logging

```bash
# Enable stdio logging for debugging
./goshim -pipe-stdio test -v ./...

# With verbose output
./goshim -verbose -pipe-stdio run main.go
```

## Key Features

### Safe Go Resolution

-   Automatically finds the real `go` binary while avoiding recursion
-   Filters workspace directory from PATH to prevent self-execution
-   Handles symlink scenarios gracefully

### Workspace Integration

-   Detects workspace root via `go.work` or `go.mod` files
-   Optimized operations across multi-module workspaces
-   Embedded task system for common development workflows

### Development Workflow Support

-   stdio logging to `.log/goshim/` directory with timestamps
-   Verbose mode for debugging wrapper behavior
-   Integration with existing `task` and tool systems

## Command Line Options

-   `-verbose`: Enable verbose logging of wrapper operations
-   `-pipe-stdio`: Enable stdio logging to timestamped files
-   `-go-executable`: Override go binary path (useful for testing)

## Integration

GoShim is designed to work with:

-   **VS Code Go extension**: Transparent replacement in development workflows
-   **Task runners**: Embedded mod operations and tool routing
-   **CI/CD systems**: Drop-in replacement with enhanced logging
-   **Development tools**: Safe wrapper for tool chains that exec `go`

## Workspace Structure Support

Works with standard Go workspace layouts:

```
project/
├── go.work              # Workspace root detection
├── go.mod               # Fallback module detection
├── tools/
│   └── go.mod          # Tool dependencies
└── cmd/
    └── goshim/         # This wrapper
```

GoShim automatically detects the workspace root and adjusts operations accordingly, ensuring consistent behavior across different workspace configurations.
