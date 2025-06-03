/**
 * Debug configuration provider for Go Extras with shim debugging support
 */

import * as vscode from "vscode";
import { ShimDetector } from "./shimDetector";
import { ShimLauncher } from "./shimLauncher";
import { SessionManager } from "./sessionManager";
import { GoExtrasDebugConfiguration } from "./types";

export class GoExtrasDebugProvider implements vscode.DebugConfigurationProvider {
	private readonly outputChannel: vscode.OutputChannel;
	private readonly shimDetector: ShimDetector;
	private readonly shimLauncher: ShimLauncher;
	private readonly sessionManager: SessionManager;

	constructor(outputChannel: vscode.OutputChannel) {
		this.outputChannel = outputChannel;
		this.shimDetector = new ShimDetector(outputChannel);
		this.shimLauncher = ShimLauncher.getInstance(outputChannel);
		this.sessionManager = new SessionManager(outputChannel);
	}

	/**
	 * Resolve debug configuration - this is where we intercept and enhance Go debug requests
	 */
	async resolveDebugConfiguration(
		folder: vscode.WorkspaceFolder | undefined,
		config: vscode.DebugConfiguration,
		token?: vscode.CancellationToken
	): Promise<vscode.DebugConfiguration | null | undefined> {
		try {
			// Only enhance test mode configurations
			if (config.mode !== "test") {
				this.outputChannel.appendLine(`Passing through non-test debug config: ${config.mode}`);
				return config;
			}

			const goExtrasConfig = config as GoExtrasDebugConfiguration;
			
			this.outputChannel.appendLine(`Analyzing debug configuration for shim interaction...`);
			
			// Detect if this test interacts with containerd shims
			const shimDetection = await this.shimDetector.analyzeTestCode(goExtrasConfig);

			if (!shimDetection.hasShimInteraction) {
				this.outputChannel.appendLine(`No shim interaction detected, using standard debug config`);
				return config;
			}

			this.outputChannel.appendLine(`Shim interaction detected! Enhancing debug configuration...`);

			// Ensure workspace folder is available
			if (!folder) {
				this.outputChannel.appendLine(`No workspace folder available for shim debugging`);
				return config;
			}

			// Start the shim debug server
			const shimConfig = await this.shimLauncher.ensureShimServer(folder.uri.fsPath);
			
			// Register this as a test session that will have shim debugging
			// We'll do this in the session started handler since we don't have the session ID yet
			
			// Store shim config for later use in session management
			(config as any).__shimConfig = shimConfig;
			(config as any).__workspaceFolder = folder;
			
			this.outputChannel.appendLine(
				`Enhanced debug config with shim server on port ${shimConfig.port}`
			);

			// Return the original config - we'll spawn the nested session after this starts
			return config;

		} catch (error) {
			this.outputChannel.appendLine(`Error resolving debug configuration: ${error}`);
			// Return original config as fallback
			return config;
		}
	}

	/**
	 * Handle session started event to create nested shim sessions
	 */
	async onSessionStarted(session: vscode.DebugSession): Promise<void> {
		try {
			const config = session.configuration as GoExtrasDebugConfiguration;
			
			// Check if this session has shim configuration attached
			const shimConfig = (config as any).__shimConfig;
			const workspaceFolder = (config as any).__workspaceFolder;
			
			if (!shimConfig || !workspaceFolder) {
				return;
			}

			this.outputChannel.appendLine(`Setting up shim debugging for session: ${session.name}`);

			// Register the test session
			this.sessionManager.registerTestSession(session.id, config, shimConfig);

			// Create the nested shim debug session
			const success = await this.sessionManager.createShimSession(
				session, 
				shimConfig, 
				workspaceFolder
			);

			if (success) {
				this.outputChannel.appendLine(
					`Successfully created nested shim debug session for ${session.name}`
				);
			} else {
				this.outputChannel.appendLine(
					`Failed to create nested shim debug session for ${session.name}`
				);
			}

		} catch (error) {
			this.outputChannel.appendLine(`Error handling session start: ${error}`);
		}
	}

	/**
	 * Provide initial debug configurations (for launch.json)
	 */
	provideDebugConfigurations(
		folder: vscode.WorkspaceFolder | undefined,
		token?: vscode.CancellationToken
	): vscode.ProviderResult<vscode.DebugConfiguration[]> {
		return [
			{
				name: "Go: Debug Test with Shim Support",
				type: "go",
				request: "launch",
				mode: "test",
				program: "${workspaceFolder}",
				enableShimDebugging: true,
			},
			{
				name: "Go: Debug Test (Auto-detect Shims)",
				type: "go",
				request: "launch",
				mode: "test",
				program: "${workspaceFolder}",
			},
		];
	}

	/**
	 * Get the session manager for external access
	 */
	getSessionManager(): SessionManager {
		return this.sessionManager;
	}

	/**
	 * Get the shim launcher for external access
	 */
	getShimLauncher(): ShimLauncher {
		return this.shimLauncher;
	}

	/**
	 * Dispose of resources
	 */
	dispose(): void {
		this.sessionManager.dispose();
		this.shimLauncher.stopAllServers();
	}
}