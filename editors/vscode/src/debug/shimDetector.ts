/**
 * Shim detector for identifying tests that interact with containerd shims
 */

import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";
import { ShimDetectionResult, GoExtrasDebugConfiguration } from "./types";

export class ShimDetector {
	private readonly outputChannel: vscode.OutputChannel;

	constructor(outputChannel: vscode.OutputChannel) {
		this.outputChannel = outputChannel;
	}

	/**
	 * Analyze test code to determine if it interacts with containerd shims
	 */
	async analyzeTestCode(config: GoExtrasDebugConfiguration): Promise<ShimDetectionResult> {
		const result: ShimDetectionResult = {
			hasShimInteraction: false,
			shimPaths: [],
			testFiles: [],
			importPaths: [],
		};

		try {
			// Skip analysis if auto-detection is disabled
			const autoDetect = vscode.workspace.getConfiguration("go-extras").get("debug.autoDetectShims", true);
			if (!autoDetect) {
				this.outputChannel.appendLine("Shim auto-detection disabled in settings");
				return result;
			}

			// If explicitly enabled in config, return true
			if (config.enableShimDebugging === true) {
				this.outputChannel.appendLine("Shim debugging explicitly enabled in debug configuration");
				result.hasShimInteraction = true;
				return result;
			}

			const testFiles = await this.findTestFiles(config.program || ".");
			result.testFiles = testFiles;

			for (const testFile of testFiles) {
				const analysis = await this.analyzeFile(testFile);
				if (analysis.hasShimInteraction) {
					result.hasShimInteraction = true;
					result.shimPaths.push(...analysis.shimPaths);
					result.importPaths.push(...analysis.importPaths);
				}
			}

			this.outputChannel.appendLine(
				`Shim detection complete: ${result.hasShimInteraction ? "DETECTED" : "NOT DETECTED"} (analyzed ${testFiles.length} test files)`
			);

			return result;
		} catch (error) {
			this.outputChannel.appendLine(`Error during shim detection: ${error}`);
			return result;
		}
	}

	/**
	 * Find all test files in the program directory
	 */
	private async findTestFiles(programPath: string): Promise<string[]> {
		const testFiles: string[] = [];

		try {
			const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(programPath));
			if (!workspaceFolder) {
				return testFiles;
			}

			const pattern = new vscode.RelativePattern(workspaceFolder, "**/*_test.go");
			const files = await vscode.workspace.findFiles(pattern, "**/vendor/**");

			for (const file of files) {
				testFiles.push(file.fsPath);
			}
		} catch (error) {
			this.outputChannel.appendLine(`Error finding test files: ${error}`);
		}

		return testFiles;
	}

	/**
	 * Analyze a single Go file for shim interaction patterns
	 */
	private async analyzeFile(filePath: string): Promise<ShimDetectionResult> {
		const result: ShimDetectionResult = {
			hasShimInteraction: false,
			shimPaths: [],
			testFiles: [filePath],
			importPaths: [],
		};

		try {
			const content = await fs.readFile(filePath, "utf8");

			// Check for containerd/shim imports
			const shimImports = this.extractShimImports(content);
			if (shimImports.length > 0) {
				result.hasShimInteraction = true;
				result.importPaths.push(...shimImports);
			}

			// Check for shim binary execution patterns
			const shimExecution = this.detectShimExecution(content);
			if (shimExecution.detected) {
				result.hasShimInteraction = true;
				result.shimPaths.push(...shimExecution.paths);
			}

			// Check for containerd runtime patterns
			const runtimePatterns = this.detectContainerdRuntime(content);
			if (runtimePatterns) {
				result.hasShimInteraction = true;
			}

		} catch (error) {
			this.outputChannel.appendLine(`Error analyzing file ${filePath}: ${error}`);
		}

		return result;
	}

	/**
	 * Extract containerd/shim related imports from Go source
	 */
	private extractShimImports(content: string): string[] {
		const imports: string[] = [];
		
		// Patterns for containerd/shim related imports
		const importPatterns = [
			/github\.com\/containerd\/containerd/g,
			/github\.com\/containerd\/containerd\/v2/g,
			/github\.com\/containerd\/containerd\/shim/g,
			/github\.com\/containerd\/containerd\/v2\/shim/g,
			/github\.com\/containerd\/shim/g,
			/github\.com\/containerd\/ttrpc/g,
			/github\.com\/containerd\/fifo/g,
		];

		for (const pattern of importPatterns) {
			const matches = content.match(pattern);
			if (matches) {
				imports.push(...matches);
			}
		}

		return [...new Set(imports)]; // Remove duplicates
	}

	/**
	 * Detect shim binary execution patterns in code
	 */
	private detectShimExecution(content: string): { detected: boolean; paths: string[] } {
		const paths: string[] = [];
		
		// Patterns for shim execution
		const execPatterns = [
			/exec\.Command.*["\'].*shim.*["\']/g,
			/exec\.CommandContext.*["\'].*shim.*["\']/g,
			/containerd.*shim/g,
			/runc.*shim/g,
			/\.shim\b/g,
		];

		for (const pattern of execPatterns) {
			const matches = content.match(pattern);
			if (matches) {
				// Try to extract binary paths from matches
				for (const match of matches) {
					const pathMatch = match.match(/["\']([^"\']*shim[^"\']*)["\']/) || match.match(/(\S*shim\S*)/);
					if (pathMatch && pathMatch[1]) {
						paths.push(pathMatch[1]);
					}
				}
			}
		}

		return {
			detected: paths.length > 0,
			paths: [...new Set(paths)],
		};
	}

	/**
	 * Detect containerd runtime interaction patterns
	 */
	private detectContainerdRuntime(content: string): boolean {
		const runtimePatterns = [
			/containerd\.New/,
			/runtime\.TaskCreate/,
			/runtime\.TaskStart/,
			/shim\.Init/,
			/shim\.Create/,
			/shim\.Start/,
			/ttrpc\.NewClient/,
			/fifo\.OpenFifo/,
		];

		return runtimePatterns.some(pattern => pattern.test(content));
	}
}