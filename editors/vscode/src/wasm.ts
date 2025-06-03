import * as path from "path";
import * as vscode from "vscode";
import * as fs from "fs";
import { exec, execSync } from "child_process";
import { tmpdir } from "os";
import { tryCatch } from "./try-catch";

// Generic WASM result interface
interface WasmResult {
	result: any;
	error: string | undefined;
}

// Generic Go WASM interface
declare global {
	interface Go {
		importObject: WebAssembly.Imports & {
			gojs: {
				"syscall/js.finalizeRef": (v_ref: any) => void;
			};
		};
		run: (instance: any) => void;
	}

	var wasm_initialized: boolean;
	var wasm_module: any;
	var wasm_log: (message: string) => void;
	var wasm_exec: (cmd: string, data: string, tempFiles: string) => string;
}

// Configuration interface for the WASM wrapper
export interface WasmConfig {
	moduleName: string; // Name of the WASM module (e.g., "retab", "myapp")
	wasmFileName: string; // Name of the .wasm file (e.g., "retab.wasm")
	extensionId?: string; // VS Code extension ID for version detection
	tempDirPrefix?: string; // Prefix for temporary directories
	initializationTimeout?: number; // Initialization timeout in milliseconds
	globalInitializedVar?: string; // Name of the global initialization variable
	globalModuleVar?: string; // Name of the global module variable
}

// Generic WASM wrapper class
export class GenericWasmWrapper {
	private go: Go | null = null;
	private initialized = false;
	private outputChannel: vscode.OutputChannel;
	private config: WasmConfig;

	constructor(outputChannel: vscode.OutputChannel, config: WasmConfig) {
		this.outputChannel = outputChannel;
		this.config = {
			tempDirPrefix: "wasm-",
			initializationTimeout: 5000,
			globalInitializedVar: "wasm_initialized",
			globalModuleVar: "wasm_module",
			...config,
		};
	}

	private log(message: string) {
		this.outputChannel.appendLine(`[wasm:${this.config.moduleName}] ${message}`);
	}

	private async waitForInit(timeout: number = this.config.initializationTimeout!): Promise<void> {
		this.log("Waiting for WASM initialization...");
		const start = Date.now();
		const globalVar = this.config.globalInitializedVar!;

		while (!(globalThis as any)[globalVar]) {
			if (Date.now() - start > timeout) {
				throw new Error("Timeout waiting for WASM initialization");
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		this.log("WASM initialization complete");
	}

	async initialize(context: vscode.ExtensionContext): Promise<void> {
		if (this.initialized) {
			return;
		}

		this.log("Initializing WASM module...");
		try {
			// Load and execute wasm_exec.js
			let wasmExecPath = path.join(context.extensionPath, "out", "wasm_exec.js");
			const wasmExecPathTinygo = path.join(context.extensionPath, "out", "wasm_exec.tinygo.js");

			let useTinygo = false;

			// Check if TinyGo version exists
			if (fs.existsSync(wasmExecPathTinygo)) {
				wasmExecPath = wasmExecPathTinygo;
				useTinygo = true;
			}

			const wasmExecContent = await vscode.workspace.fs.readFile(vscode.Uri.file(wasmExecPath));
			let wasmExecContentString = wasmExecContent.toString();

			if (useTinygo) {
				// TinyGo memory leak prevention
				// https://github.com/tinygo-org/tinygo/issues/1140#issuecomment-1314608377
				wasmExecContentString = wasmExecContentString.replace(
					'"syscall/js.finalizeRef":',
					`"syscall/js.finalizeRef": (v_ref) => {
						const id = mem().getUint32(unboxValue(v_ref), true);
						this._goRefCounts[id]--;
						if (this._goRefCounts[id] === 0) {
							const v = this._values[id];
							this._values[id] = null;
							this._ids.delete(v);
							this._idPool.push(id);
						}
					},
					"syscall/js.finalizeRef-tinygo":`
				);
			}

			// Create Go runtime
			this.log("Creating Go runtime...");
			this.go = new (Function(`
				${wasmExecContentString}
				return Go;
			`)())();

			if (!this.go) {
				throw new Error("Failed to create Go runtime");
			}

			// Set up global functions for WASM module to call
			globalThis.wasm_log = (message: string) => {
				this.outputChannel.appendLine(`[wasm:console.log] ${message}`);
			};

			globalThis.wasm_exec = (cmd: string, data: string, tempFiles: string): string => {
				return this.executeCommand(cmd, data, tempFiles);
			};

			// Load and instantiate the WASM module
			const wasmPath = path.join(context.extensionPath, "out", this.config.wasmFileName);
			this.log(`Loading WASM module from ${wasmPath}`);

			const wasmBuffer = await vscode.workspace.fs.readFile(vscode.Uri.file(wasmPath));
			this.log(`WASM module loaded, size: ${wasmBuffer.length} bytes`);

			const wasmModule = await WebAssembly.compile(wasmBuffer);
			this.log("WASM module compiled");

			const instance = await WebAssembly.instantiate(wasmModule, this.go.importObject);
			this.log("WASM module instantiated");

			this.go.run(instance);
			this.log("WASM module started");

			// Wait for initialization to complete
			await this.waitForInit();
			this.log("WASM module fully initialized");
			this.initialized = true;
		} catch (err) {
			this.log(`Error initializing WASM: ${err}`);
			throw err;
		}
	}

	private executeCommand(cmd: string, data: string, tempFiles: string): string {
		const tempFilesJson = JSON.parse(tempFiles);
		const tempFilesMap = new Map(Object.entries(tempFilesJson));

		const tmpDir = fs.mkdtempSync(path.join(tmpdir(), this.config.tempDirPrefix!));
		this.log(`Created temp directory: ${tmpDir}`);

		try {
			// Create temporary files
			for (const [key, value] of tempFilesMap.entries()) {
				const filePath = path.join(tmpDir, key);
				fs.writeFileSync(filePath, value as string);
				this.log(`Created temp file: ${filePath}`);
			}

			this.log(`Executing command: ${cmd}`);

			// Execute the command
			const result = execSync(cmd, {
				input: data,
				cwd: tmpDir,
			});

			this.log(`Command executed, result length: ${result.toString().length}`);
			return result.toString();
		} catch (error) {
			this.log(`Error executing command: ${error}`);
			throw error;
		} finally {
			// Clean up temporary files
			try {
				fs.rmSync(tmpDir, { recursive: true });
				this.log(`Cleaned up temp directory: ${tmpDir}`);
			} catch (cleanupError) {
				this.log(`Warning: Failed to clean up temp directory: ${cleanupError}`);
			}
		}
	}

	// Generic method to call any WASM function
	async callFunction(functionName: string, ...args: any[]): Promise<any> {
		this.log(`Calling WASM function: ${functionName}`);

		// Ensure WASM is initialized
		if (!this.initialized || !(globalThis as any)[this.config.globalInitializedVar!]) {
			const error = "WASM module not fully initialized";
			this.log(error);
			throw new Error(error);
		}

		const moduleVar = this.config.globalModuleVar!;
		if (!this.go || !(globalThis as any)[moduleVar]?.[functionName]) {
			const error = `WASM module not properly initialized or ${moduleVar}.${functionName} not available`;
			this.log(error);
			throw new Error(error);
		}

		try {
			this.log(`Calling ${moduleVar}.${functionName}...`);
			const response = (globalThis as any)[moduleVar][functionName](...args);
			this.log(`${functionName} response received`);

			if (!response) {
				this.log(`${functionName} response is undefined`);
				throw new Error(`${functionName} response is undefined`);
			}

			if (response.error) {
				this.log(`Error: ${response.error}`);
				throw new Error(response.error);
			}

			this.log(`${functionName} call complete`);
			return response.result || response;
		} catch (err) {
			const error = `WASM function call error: ${err}`;
			this.log(error);
			throw new Error(error);
		}
	}

	async getVersion(context: vscode.ExtensionContext): Promise<string> {
		if (this.config.extensionId) {
			const extension = vscode.extensions.getExtension(this.config.extensionId);
			return extension?.packageJSON.version || "unknown";
		}
		return "unknown";
	}

	isInitialized(): boolean {
		return this.initialized && (globalThis as any)[this.config.globalInitializedVar!];
	}

	getModuleName(): string {
		return this.config.moduleName;
	}
}
