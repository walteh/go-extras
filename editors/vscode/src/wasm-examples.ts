import * as vscode from "vscode";
import { GenericWasmWrapper, WasmConfig } from "./wasm";

// Example 1: Using the wrapper for a formatter module
export class FormatterWasmWrapper extends GenericWasmWrapper {
	constructor(outputChannel: vscode.OutputChannel) {
		const config: WasmConfig = {
			moduleName: "formatter",
			wasmFileName: "formatter.wasm",
			extensionId: "mycompany.formatter-extension",
			tempDirPrefix: "formatter-",
			globalInitializedVar: "formatter_initialized",
			globalModuleVar: "formatter",
		};
		super(outputChannel, config);
	}

	async format(content: string, filePath: string, formatType: string): Promise<string> {
		return this.callFunction("fmt", formatType, filePath, content);
	}
}

// Example 2: Using the wrapper for a linter module
export class LinterWasmWrapper extends GenericWasmWrapper {
	constructor(outputChannel: vscode.OutputChannel) {
		const config: WasmConfig = {
			moduleName: "linter",
			wasmFileName: "linter.wasm",
			extensionId: "mycompany.linter-extension",
			tempDirPrefix: "linter-",
			globalInitializedVar: "linter_initialized",
			globalModuleVar: "linter",
		};
		super(outputChannel, config);
	}

	async lint(content: string, filePath: string): Promise<any[]> {
		return this.callFunction("lint", filePath, content);
	}

	async fix(content: string, filePath: string): Promise<string> {
		return this.callFunction("fix", filePath, content);
	}
}

// Example 3: Using the wrapper for a code generator
export class GeneratorWasmWrapper extends GenericWasmWrapper {
	constructor(outputChannel: vscode.OutputChannel) {
		const config: WasmConfig = {
			moduleName: "generator",
			wasmFileName: "generator.wasm",
			extensionId: "mycompany.generator-extension",
			tempDirPrefix: "gen-",
			globalInitializedVar: "generator_initialized",
			globalModuleVar: "generator",
		};
		super(outputChannel, config);
	}

	async generate(template: string, data: object): Promise<string> {
		return this.callFunction("generate", template, JSON.stringify(data));
	}

	async validate(template: string): Promise<boolean> {
		return this.callFunction("validate", template);
	}
}

// Example 4: Usage in VS Code extension
export class MyExtension {
	private outputChannel: vscode.OutputChannel;
	private formatter: FormatterWasmWrapper;
	private linter: LinterWasmWrapper;

	constructor(context: vscode.ExtensionContext) {
		this.outputChannel = vscode.window.createOutputChannel("My Extension");
		this.formatter = new FormatterWasmWrapper(this.outputChannel);
		this.linter = new LinterWasmWrapper(this.outputChannel);
	}

	async activate(context: vscode.ExtensionContext) {
		// Initialize both WASM modules
		await Promise.all([this.formatter.initialize(context), this.linter.initialize(context)]);

		// Register commands
		const formatCommand = vscode.commands.registerCommand("myext.format", async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) return;

			const document = editor.document;
			const content = document.getText();

			try {
				const formatted = await this.formatter.format(content, document.fileName, "default");
				const edit = new vscode.WorkspaceEdit();
				const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(content.length));
				edit.replace(document.uri, fullRange, formatted);
				await vscode.workspace.applyEdit(edit);
			} catch (error) {
				vscode.window.showErrorMessage(`Formatting failed: ${error}`);
			}
		});

		const lintCommand = vscode.commands.registerCommand("myext.lint", async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) return;

			const document = editor.document;
			const content = document.getText();

			try {
				const issues = await this.linter.lint(content, document.fileName);
				// Handle lint results...
				vscode.window.showInformationMessage(`Found ${issues.length} issues`);
			} catch (error) {
				vscode.window.showErrorMessage(`Linting failed: ${error}`);
			}
		});

		context.subscriptions.push(formatCommand, lintCommand);
	}
}

// Example 5: Simple direct usage
export async function exampleDirectUsage(context: vscode.ExtensionContext) {
	const outputChannel = vscode.window.createOutputChannel("Direct WASM");

	// Create a wrapper for any Go WASM module
	const wasmWrapper = new GenericWasmWrapper(outputChannel, {
		moduleName: "mytools",
		wasmFileName: "mytools.wasm",
		extensionId: "mycompany.mytools-extension",
	});

	// Initialize
	await wasmWrapper.initialize(context);

	// Call any function exposed by the Go WASM module
	try {
		const result1 = await wasmWrapper.callFunction("processText", "Hello, World!");
		const result2 = await wasmWrapper.callFunction("calculate", 42, 24);
		const result3 = await wasmWrapper.callFunction("transform", { input: "data" });

		console.log("Results:", result1, result2, result3);
	} catch (error) {
		console.error("WASM call failed:", error);
	}
}
