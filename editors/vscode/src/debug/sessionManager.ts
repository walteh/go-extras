/**
 * Session manager for tracking and managing nested debug sessions
 */

import * as vscode from "vscode";
import { DebugSessionMetadata, DelveServerConfig, GoExtrasDebugConfiguration } from "./types";

export class SessionManager {
	private readonly outputChannel: vscode.OutputChannel;
	private activeSessions = new Map<string, DebugSessionMetadata>();
	private sessionListeners: vscode.Disposable[] = [];

	constructor(outputChannel: vscode.OutputChannel) {
		this.outputChannel = outputChannel;
		this.setupSessionListeners();
	}

	/**
	 * Setup debug session event listeners
	 */
	private setupSessionListeners(): void {
		this.sessionListeners.push(
			vscode.debug.onDidStartDebugSession(this.onSessionStarted.bind(this)),
			vscode.debug.onDidTerminateDebugSession(this.onSessionTerminated.bind(this))
		);
	}

	/**
	 * Handle debug session started event
	 */
	private onSessionStarted(session: vscode.DebugSession): void {
		const metadata = this.activeSessions.get(session.id);
		if (metadata) {
			this.outputChannel.appendLine(
				`Debug session started: ${session.name} (${metadata.isShimSession ? "shim" : "test"} session)`
			);
		}
	}

	/**
	 * Handle debug session terminated event
	 */
	private onSessionTerminated(session: vscode.DebugSession): void {
		const metadata = this.activeSessions.get(session.id);
		if (metadata) {
			this.outputChannel.appendLine(
				`Debug session terminated: ${session.name} (${metadata.isShimSession ? "shim" : "test"} session)`
			);

			// Clean up nested sessions if this was a parent session
			if (!metadata.isShimSession) {
				this.cleanupNestedSessions(session.id);
			}

			this.activeSessions.delete(session.id);
		}
	}

	/**
	 * Register a test debug session
	 */
	registerTestSession(
		sessionId: string,
		config: GoExtrasDebugConfiguration,
		shimConfig?: DelveServerConfig
	): void {
		const metadata: DebugSessionMetadata = {
			sessionId,
			isShimSession: false,
			testConfig: config,
			shimConfig,
		};

		this.activeSessions.set(sessionId, metadata);
		this.outputChannel.appendLine(`Registered test debug session: ${sessionId}`);
	}

	/**
	 * Register a shim debug session
	 */
	registerShimSession(
		sessionId: string,
		parentSessionId: string,
		shimConfig: DelveServerConfig
	): void {
		const metadata: DebugSessionMetadata = {
			sessionId,
			isShimSession: true,
			parentSessionId,
			shimConfig,
		};

		this.activeSessions.set(sessionId, metadata);
		this.outputChannel.appendLine(`Registered shim debug session: ${sessionId} (parent: ${parentSessionId})`);
	}

	/**
	 * Create and start a nested shim debug session
	 */
	async createShimSession(
		parentSession: vscode.DebugSession,
		shimConfig: DelveServerConfig,
		workspaceFolder: vscode.WorkspaceFolder
	): Promise<boolean> {
		try {
			const shimDebugConfig: vscode.DebugConfiguration = {
				type: "go",
				name: `Shim Debug (${shimConfig.port})`,
				request: "launch",
				mode: "remote",
				remotePath: "",
				port: shimConfig.port,
				host: shimConfig.host,
				// This creates a nested session under the parent
				suppressMultipleSessionWarnings: true,
			};

			this.outputChannel.appendLine(
				`Starting nested shim debug session on port ${shimConfig.port}`
			);

			// Start the nested debug session
			const shimSession = await vscode.debug.startDebugging(
				workspaceFolder,
				shimDebugConfig,
				{ parentSession: parentSession }
			);

			if (shimSession) {
				// Wait for the session to be assigned an ID
				setTimeout(() => {
					const sessions = vscode.debug.activeDebugSession ? [vscode.debug.activeDebugSession] : [];
					const nestedSessions = sessions.filter(s => s.parentSession?.id === parentSession.id);
					
					if (nestedSessions.length > 0) {
						const newShimSession = nestedSessions[nestedSessions.length - 1];
						this.registerShimSession(newShimSession.id, parentSession.id, shimConfig);
					}
				}, 100);

				return true;
			}

			return false;
		} catch (error) {
			this.outputChannel.appendLine(`Error creating shim debug session: ${error}`);
			return false;
		}
	}

	/**
	 * Clean up nested sessions for a parent session
	 */
	private cleanupNestedSessions(parentSessionId: string): void {
		const nestedSessions = Array.from(this.activeSessions.values()).filter(
			metadata => metadata.parentSessionId === parentSessionId
		);

		for (const metadata of nestedSessions) {
			this.outputChannel.appendLine(`Cleaning up nested session: ${metadata.sessionId}`);
			this.activeSessions.delete(metadata.sessionId);
		}
	}

	/**
	 * Get session metadata
	 */
	getSessionMetadata(sessionId: string): DebugSessionMetadata | undefined {
		return this.activeSessions.get(sessionId);
	}

	/**
	 * Get all active test sessions
	 */
	getActiveTestSessions(): DebugSessionMetadata[] {
		return Array.from(this.activeSessions.values()).filter(metadata => !metadata.isShimSession);
	}

	/**
	 * Get all active shim sessions
	 */
	getActiveShimSessions(): DebugSessionMetadata[] {
		return Array.from(this.activeSessions.values()).filter(metadata => metadata.isShimSession);
	}

	/**
	 * Get nested sessions for a parent session
	 */
	getNestedSessions(parentSessionId: string): DebugSessionMetadata[] {
		return Array.from(this.activeSessions.values()).filter(
			metadata => metadata.parentSessionId === parentSessionId
		);
	}

	/**
	 * Check if a session has shim debugging enabled
	 */
	hasShimDebugging(sessionId: string): boolean {
		const metadata = this.activeSessions.get(sessionId);
		return metadata?.shimConfig !== undefined;
	}

	/**
	 * Dispose of all listeners
	 */
	dispose(): void {
		for (const listener of this.sessionListeners) {
			listener.dispose();
		}
		this.sessionListeners = [];
		this.activeSessions.clear();
	}
}