# Cursor Background Agent Setup

This directory contains the configuration files needed to set up Cursor's background agent functionality for the `go-extras` project.

## Overview

Cursor's background agents allow you to spawn asynchronous agents that can edit and run code in a remote environment. This setup provides a consistent, reproducible development environment with all the necessary tools for Go development and VS Code extension development.

## Files

-   **`environment.json`** - Main configuration file that defines the agent environment
-   **`Dockerfile`** - Docker image definition for the development environment (declarative setup)
-   **`install.sh`** - Script run each time a new agent session starts to install/update dependencies
-   **`start.sh`** - Script run after install to start background services
-   **`README.md`** - This documentation

## Environment Setup

### Declarative Setup (Recommended)

The `Dockerfile` provides a simple, declarative development environment with:

-   **Base**: Ubuntu 24.10 with essential system tools
-   **Go**: Version 1.24+ (manually installed, required for tool directive)
-   **Bun**: Latest version (for TypeScript/Node.js ecosystem)
-   **Go Tools**: Available via `go tool <name>` from `tools/go.mod`
-   **VS Code Tools**: Available via `bun`/`bunx` from `package.json`
-   **User**: Non-root `bgagent` user with sudo access

This approach minimizes complexity while providing all necessary tools via Go's tool directive and Bun.

### Interactive Setup Alternative

If you prefer interactive setup, Cursor will guide you through manually installing dependencies on a base Ubuntu image and taking a snapshot.

## Configuration Details

### Environment Variables

The environment is configured with:

-   `GOPATH` and `GOBIN` properly set
-   Node.js and Bun available
-   All development tools in PATH

### Terminal Sessions

Three pre-configured terminal sessions:

1. **main** - General development terminal with task runner
2. **vscode-extension** - VS Code extension development (Bun-based)
3. **go-tools** - Go development and debugging with Delve

### Install Command

The `install.sh` script:

-   Verifies Go 1.24+ and Bun are available
-   Updates Go modules and sets up tools from `tools/go.mod`
-   Installs VS Code extension dependencies with Bun
-   Builds the VS Code extension
-   Simple verification and help output

### Start Command

The `start.sh` script:

-   Sets up environment variables
-   Creates necessary directories
-   Prepares the environment for development
-   Shows environment status

## Usage

### First Time Setup

1. Open Cursor in your project
2. Hit `Cmd + '` (or `Ctrl + '`) to open background agents
3. Choose "New Background Agent"
4. Follow the setup wizard
5. Choose "Declarative setup" and point to this `Dockerfile`
6. Configure GitHub connection for repo access
7. Set install command to: `./.cursor/install.sh`
8. Set start command to: `./.cursor/start.sh`
9. Configure terminal sessions as defined in `environment.json`

### Using the Agent

Once set up:

-   Hit `Cmd + '` to see agent status and spawn new agents
-   Hit `Cmd + ;` to view agent status and enter the remote environment
-   The agent can edit files, run commands, and manage the development environment
-   All changes are pushed to GitHub branches for easy review

### Available Commands

In any terminal session:

```bash
# Go tools (via go tool command)
go tool task --list           # Show all available tasks
go tool task go:tidy          # Tidy all Go modules
go tool dlv debug             # Start Delve debugger
go tool golangci-lint run     # Run Go linter

# VS Code extension development (from editors/vscode/)
bun run build                 # Build extension
bun run watch                 # Watch mode for development
bun run test                  # Run extension tests
bunx vsce pack                # Package extension
bunx eslint .                 # Lint TypeScript code

# Standard Go development
go build ./...                # Build all Go packages
go mod tidy                   # Clean up Go modules

# Git workflow (agent can commit/push)
git status                    # Check status
git add .                     # Stage changes
git commit -m "message"       # Commit changes
git push                      # Push to remote branch
```

## Security Considerations

⚠️ **Important Security Notes**:

1. **GitHub Access**: The agent requires read-write access to your repository
2. **Code Execution**: The agent can run arbitrary commands in the environment
3. **Remote Environment**: Your code runs in Cursor's AWS infrastructure
4. **Data Storage**: Prompts and environments are stored by Cursor (if privacy mode is off)
5. **Secrets**: Any secrets needed should be configured through Cursor's encrypted storage

## Troubleshooting

### Common Issues

1. **Environment Not Starting**: Check that scripts are executable (`chmod +x .cursor/*.sh`)
2. **Missing Tools**: Verify Dockerfile includes all required dependencies
3. **Permission Issues**: Ensure the `developer` user has proper permissions
4. **Build Failures**: Check that install script properly sets up dependencies

### Debug Steps

1. Check agent logs in Cursor's background agent panel
2. Verify environment.json syntax is valid
3. Test scripts locally before committing
4. Ensure GitHub connection is properly configured

### Manual Environment Access

You can SSH into the agent environment using Cursor's interface to debug setup issues manually.

## Updates and Maintenance

### Updating the Environment

To update the development environment:

1. Modify the `Dockerfile` with new dependencies
2. Update `install.sh` if new setup steps are needed
3. Test changes locally if possible
4. Commit changes - the agent will rebuild on next session

### Version Management

The setup uses:

-   Ubuntu 24.10 as base
-   Go 1.24.0 (manually installed for tool directive support)
-   Bun (latest available)
-   Go tools defined in `tools/go.mod` (versioned and reproducible)
-   TypeScript tools defined in `package.json` (versioned and reproducible)

All development tools are versioned through Go modules and package.json, ensuring reproducible builds with minimal setup complexity.

## Integration with Project

This agent setup is specifically designed for the `go-extras` project structure:

-   **Root Level**: Task runner, Go modules
-   **`editors/vscode/`**: VS Code extension development with Bun
-   **`tools/`**: Go tool dependencies
-   **`.cursor/`**: Agent configuration (this directory)

The environment supports both the current CodeLens functionality and planned debug integration features outlined in the project issues.
