# Generic Go WASM Wrapper for VS Code Extensions

This package provides a generic WASM wrapper that allows VS Code extensions to easily integrate with Go programs compiled to WebAssembly.

## Features

-   **Generic & Configurable**: Works with any Go WASM module
-   **TypeScript Support**: Full type safety and IntelliSense
-   **Error Handling**: Comprehensive error handling with logging
-   **TinyGo Support**: Automatic detection and memory leak prevention
-   **Temporary File Management**: Built-in support for temp files and command execution
-   **Multiple Modules**: Support for loading multiple WASM modules in the same extension

## Quick Start

### 1. Basic Usage

```typescript
import { GenericWasmWrapper, WasmConfig } from "./wasm";

const outputChannel = vscode.window.createOutputChannel("My Extension");
const wasmWrapper = new GenericWasmWrapper(outputChannel, {
	moduleName: "mytools",
	wasmFileName: "mytools.wasm",
	extensionId: "mycompany.mytools-extension",
});

// Initialize the WASM module
await wasmWrapper.initialize(context);

// Call any function exposed by your Go WASM module
const result = await wasmWrapper.callFunction("processText", "Hello, World!");
```

### 2. Custom Wrapper Classes

Create specific wrapper classes for different types of functionality:

```typescript
export class FormatterWasmWrapper extends GenericWasmWrapper {
	constructor(outputChannel: vscode.OutputChannel) {
		const config: WasmConfig = {
			moduleName: "formatter",
			wasmFileName: "formatter.wasm",
			extensionId: "mycompany.formatter-extension",
			globalInitializedVar: "formatter_initialized",
			globalModuleVar: "formatter",
		};
		super(outputChannel, config);
	}

	async format(content: string, filePath: string, formatType: string): Promise<string> {
		return this.callFunction("fmt", formatType, filePath, content);
	}
}
```

## Configuration Options

### WasmConfig Interface

```typescript
interface WasmConfig {
	moduleName: string; // Name for logging and identification
	wasmFileName: string; // Name of the .wasm file in /out directory
	extensionId?: string; // VS Code extension ID for version detection
	tempDirPrefix?: string; // Prefix for temporary directories (default: "wasm-")
	initializationTimeout?: number; // Timeout in milliseconds (default: 5000)
	globalInitializedVar?: string; // Global var name for initialization (default: "wasm_initialized")
	globalModuleVar?: string; // Global var name for module (default: "wasm_module")
}
```

### Required Global Variables in Go

Your Go WASM module must expose these global variables:

```go
package main

import (
	"syscall/js"
)

var initialized = false
var module = make(map[string]interface{})

func main() {
	// Set up your functions
	module["processText"] = js.FuncOf(processText)
	module["calculate"] = js.FuncOf(calculate)

	// Export to global scope
	js.Global().Set("wasm_module", module)
	js.Global().Set("wasm_initialized", true)
	initialized = true

	// Keep the program running
	<-make(chan bool)
}

func processText(this js.Value, args []js.Value) interface{} {
	input := args[0].String()
	result := "Processed: " + input

	return map[string]interface{}{
		"result": result,
		"error":  nil,
	}
}
```

## Advanced Features

### Multiple WASM Modules

You can load multiple WASM modules in the same extension:

```typescript
export class MyExtension {
	private formatter: FormatterWasmWrapper;
	private linter: LinterWasmWrapper;
	private generator: GeneratorWasmWrapper;

	async activate(context: vscode.ExtensionContext) {
		// Initialize all modules in parallel
		await Promise.all([
			this.formatter.initialize(context),
			this.linter.initialize(context),
			this.generator.initialize(context),
		]);
	}
}
```

### Command Execution Support

The wrapper includes built-in support for executing commands with temporary files:

```go
// In your Go WASM module
func executeCommand(this js.Value, args []js.Value) interface{} {
	cmd := args[0].String()
	data := args[1].String()
	tempFiles := args[2].String() // JSON object of filename -> content

	// This will call the global wasm_exec function provided by the wrapper
	result := js.Global().Call("wasm_exec", cmd, data, tempFiles)

	return map[string]interface{}{
		"result": result.String(),
		"error":  nil,
	}
}
```

### Error Handling

The wrapper provides comprehensive error handling:

```typescript
try {
	const result = await wasmWrapper.callFunction("riskyOperation", data);
	console.log("Success:", result);
} catch (error) {
	console.error("WASM operation failed:", error);
	vscode.window.showErrorMessage(`Operation failed: ${error.message}`);
}
```

## File Structure

Your VS Code extension should have this structure:

```
your-extension/
├── src/
│   ├── extension.ts          # Main extension file
│   ├── wasm.ts              # Generic WASM wrapper
│   └── your-wrapper.ts      # Your specific wrapper classes
├── out/
│   ├── wasm_exec.js         # Go's WASM runtime (or wasm_exec.tinygo.js)
│   ├── your-module.wasm     # Your compiled Go WASM module
│   └── ...                  # Compiled TypeScript files
└── package.json
```

## Building Go WASM Modules

### Standard Go

```bash
GOOS=js GOARCH=wasm go build -o your-module.wasm main.go
cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" ./out/
```

### TinyGo

```bash
tinygo build -o your-module.wasm -target wasm main.go
cp "$(tinygo env TINYGOROOT)/targets/wasm_exec.js" ./out/wasm_exec.tinygo.js
```

## Debugging

Enable detailed logging by checking the output channel:

```typescript
const outputChannel = vscode.window.createOutputChannel("My Extension");
// All WASM operations will be logged to this channel
```

The wrapper automatically detects whether you're using standard Go or TinyGo and applies appropriate optimizations.

## Examples

See `wasm-examples.ts` for complete working examples of:

-   Formatter wrapper
-   Linter wrapper
-   Code generator wrapper
-   Direct usage patterns
-   Multiple module management

## Best Practices

1. **Initialize Early**: Initialize WASM modules during extension activation
2. **Error Handling**: Always wrap WASM calls in try-catch blocks
3. **Performance**: Cache WASM wrapper instances, don't recreate them
4. **Logging**: Use the output channel for debugging
5. **Memory**: Be mindful of memory usage with large data transfers
6. **Timeouts**: Set appropriate initialization timeouts based on module size

## Troubleshooting

### Common Issues

1. **"WASM module not fully initialized"**: Ensure your Go module sets the global variables correctly
2. **"Timeout waiting for WASM initialization"**: Increase the timeout or check your Go module's main function
3. **"Function not available"**: Verify the function is exported in your Go module's global object
4. **Memory leaks with TinyGo**: The wrapper automatically applies memory leak prevention patches

### Debug Steps

1. Check the output channel for detailed logs
2. Verify your .wasm file exists in the `/out` directory
3. Confirm your Go module exports the expected global variables
4. Test with a minimal Go WASM module first
