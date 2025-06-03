# Quick Setup Guide for Cursor Background Agent

This is a step-by-step guide to get Cursor's background agent working with this project.

## Prerequisites

1. **Cursor IDE** - Download from [cursor.com](https://cursor.com)
2. **Privacy Mode** - Must be turned OFF in Cursor settings
3. **GitHub Account** - For repository access

## Step-by-Step Setup

### 1. Open Cursor Background Agents

-   Open Cursor in this project
-   Press `Cmd + '` (Mac) or `Ctrl + '` (Windows/Linux)
-   Click "New Background Agent"

### 2. GitHub Connection Setup

-   Grant Cursor read-write access to this repository
-   This allows the agent to clone, modify, and push changes
-   ⚠️ **Security Note**: Only grant access to repositories you trust with Cursor

### 3. Environment Configuration

Choose **Declarative Setup** and configure:

#### Base Environment

-   **Method**: Declarative (Dockerfile)
-   **Dockerfile Path**: `./.cursor/Dockerfile`

#### Maintenance Commands

-   **Install Command**: `./.cursor/install.sh`
-   **Description**: "Install and update project dependencies"

#### Startup Commands

-   **Start Command**: `./.cursor/start.sh`
-   **Description**: "Start background services and prepare environment"

#### Terminal Sessions

Configure three terminals as defined in `environment.json`:

1. **Main Terminal**

    - **Name**: `main`
    - **Command**: `cd /workspace && echo 'Go Extras Development Environment Ready' && echo 'Run: task --list to see available commands' && bash`
    - **Description**: "Main development terminal for go-extras project"

2. **VS Code Extension Terminal**

    - **Name**: `vscode-extension`
    - **Command**: `cd /workspace/editors/vscode && echo 'VS Code Extension Development' && echo 'Available commands:' && echo '  bun run build - Build extension' && echo '  bun run watch - Watch mode' && echo '  bun run test - Run tests' && bash`
    - **Description**: "VS Code extension development terminal"

3. **Go Tools Terminal**
    - **Name**: `go-tools`
    - **Command**: `cd /workspace && echo 'Go Tools Development' && echo 'Available tools:' && echo '  go build - Build Go projects' && echo '  dlv debug - Debug with Delve' && echo '  task build - Run build tasks' && bash`
    - **Description**: "Go development and debugging terminal"

### 4. Test the Setup

After configuration:

1. The agent will build the Docker environment (may take 5-10 minutes first time)
2. Scripts will run to install dependencies
3. Terminal sessions should show welcome messages
4. Test basic commands:
    ```bash
    go tool task --list     # Should show available tasks
    go version              # Should show Go 1.24+
    bun --version           # Should show Bun version
    go tool dlv version     # Should show Delve version
    ```

### 5. Using the Agent

Once set up:

-   **View Agent Status**: `Cmd + '` (or `Ctrl + '`)
-   **Enter Agent Environment**: `Cmd + ;` (or `Ctrl + ;`)
-   **Agent Actions**: Give natural language instructions
-   **Review Changes**: Agent commits to branches for review

## Quick Commands Reference

### Go Tools (via go tool command)

```bash
go tool task --list           # Show all tasks
go tool task go:tidy          # Tidy all Go modules
go tool dlv debug             # Start Delve debugger
go tool golangci-lint run     # Run Go linter
```

### VS Code Extension (from `editors/vscode/`)

```bash
bun run build                 # Build extension
bun run watch                 # Watch mode
bun run test                  # Run tests
bunx vsce pack                # Package extension
bunx eslint .                 # Lint TypeScript code
```

### Standard Go Development

```bash
go build ./...                # Build all packages
go test ./...                 # Run all tests
go mod tidy                   # Clean dependencies
```

## Troubleshooting

### Agent Won't Start

-   Check GitHub permissions are granted
-   Verify privacy mode is OFF
-   Check Cursor logs for errors

### Build Failures

-   Ensure scripts are executable: `chmod +x .cursor/*.sh`
-   Check Dockerfile syntax
-   Verify all dependencies are included

### Missing Tools

-   Update Dockerfile with missing packages
-   Modify install.sh for additional setup
-   Rebuild environment after changes

### Environment Issues

-   Use `Cmd + ;` to access agent terminal directly
-   Check environment variables are set correctly
-   Verify PATH includes all tool directories

## Getting Help

1. **Cursor Documentation**: [docs.cursor.com/background-agent](https://docs.cursor.com/background-agent)
2. **Cursor Forum**: [forum.cursor.com](https://forum.cursor.com)
3. **Project Issues**: Check GitHub issues for project-specific problems
4. **Discord**: Cursor's #background-agent channel

## What's Next?

Once your agent is working:

1. **Try Basic Tasks**: Ask the agent to run tests or build the extension
2. **Code Review**: Let the agent make small improvements and review its changes
3. **Development Workflow**: Use the agent for development tasks while you focus on architecture
4. **Advanced Features**: Explore using the agent for debugging and testing complex scenarios

The agent is particularly useful for:

-   Running repetitive build/test cycles
-   Setting up complex debugging scenarios
-   Managing multiple terminal sessions
-   Handling dependency updates and maintenance tasks
