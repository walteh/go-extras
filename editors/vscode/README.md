# Go Extras VS Code Extension

A VS Code extension that provides various enhancements for Go development. Part of the [go-extras](https://github.com/walteh/go-extras) project - a collection of useful Go development tools and VS Code extensions.

## Prerequisites

-   VS Code 1.89.0 or higher
-   Go extension for VS Code (golang.go)

## Features

### CodeLens Enhancements

-   **Reference Count CodeLens**: Shows how many times functions, methods, interfaces, and exported struct fields are referenced
-   **Go to Definition CodeLens**: Quick navigation to symbol definitions
-   **Lightweight Integration**: Reuses existing Go extension's gopls instance (no additional language servers)
-   **Configurable Display**: Customize which CodeLens features to show

### Additional Features (Coming Soon)

-   Cross-boundary debugging tools
-   Enhanced Go development utilities
-   WASM-based Go tools integration

## Installation

1. Install the extension from the VS Code Marketplace
2. Ensure you have the official Go extension installed
3. Open a Go file to see enhancements in action

## Usage

### CodeLens

The extension automatically activates when you open Go files. You'll see:

-   Reference counts displayed above functions, methods, interfaces, and exported fields
-   "Go to definition" links for quick navigation
-   Clickable CodeLens that show reference locations when clicked

## Configuration

Configure the extension through VS Code settings:

```json
{
	"go-extras.codeLens.enabled": true,
	"go-extras.codeLens.showReferences": true,
	"go-extras.codeLens.showDefinitions": true
}
```

### Available Settings

-   `go-extras.codeLens.enabled`: Enable/disable CodeLens functionality (default: `true`)
-   `go-extras.codeLens.showReferences`: Show reference count CodeLens (default: `true`)
-   `go-extras.codeLens.showDefinitions`: Show "go to definition" CodeLens (default: `true`)

## Supported Symbols

The CodeLens provider works with:

-   Functions
-   Methods
-   Interfaces
-   Exported struct fields

## Development

This extension is part of the go-extras project. For development setup:

```bash
cd editors/vscode
bun install
bun run build
```

### Commands

-   `bun run build`: Build the extension
-   `bun run watch`: Watch mode for development
-   `bun run test`: Run tests
-   `bun run package`: Package for distribution

## Contributing

This is part of the larger go-extras project. See the main [repository](https://github.com/walteh/go-extras) for contribution guidelines.

## License

Apache 2.0 - See [LICENSE](../../LICENSE) for more information.
