# Go Extras

A collection of useful Go development tools, utilities, and VS Code extensions to enhance your Go development workflow.

## Components

### VS Code Extensions

#### Go Extras (`editors/vscode/`)

A comprehensive VS Code extension that provides various enhancements for Go development.

**Current Features:**

-   **CodeLens Enhancements**: Reference counts and quick navigation for Go symbols
-   **Lightweight Integration**: Reuses existing Go extension's gopls instance
-   **Configurable Display**: Customize which features to show

**Planned Features:**

-   Cross-boundary debugging tools for containerd shims
-   Enhanced Go development utilities
-   WASM-based Go tools integration

**Installation:** Available on the VS Code Marketplace as "Go Extras"

## Development

This project uses a monorepo structure with different tools and extensions organized by category:

-   `editors/` - Editor extensions and plugins
-   `tools/` - Command-line utilities
-   `docs/` - Documentation and guides

### Building

Each component has its own build system. See individual README files for specific instructions.

## Contributing

Contributions are welcome! Please read our contributing guidelines and ensure your changes include appropriate tests.

## License

Apache 2.0 - See [LICENSE](LICENSE) for details.
