/**
 * Go Extras VS Code Extension
 *
 * This extension provides various enhancements for Go development in VS Code,
 * including CodeLens functionality, reference counting, navigation helpers,
 * and cross-boundary debugging for containerd shims.
 *
 * Features:
 * - Reference count CodeLens for Go symbols
 * - "Go to definition" CodeLens
 * - Cross-boundary debugging for Go tests that interact with containerd shims
 * - Automatic shim detection and nested debug session management
 * - Reuses existing Go extension's gopls instance (no embedded server)
 * - Lightweight footprint with minimal dependencies
 * - Extensible architecture for additional Go development tools
 */

import * as vscode from "vscode";
import { GoExtrasDebugProvider } from "./debug/provider";

// Create output channel for debugging
const outputChannel = vscode.window.createOutputChannel("Go Extras");

/**
 * CodeLens provider for Go files
 */
class GoExtrasCodeLensProvider implements vscode.CodeLensProvider {
	private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
	public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

	constructor() {}

	/**
	 * Provide CodeLens for the document
	 */
	public async provideCodeLenses(
		document: vscode.TextDocument,
		token: vscode.CancellationToken
	): Promise<vscode.CodeLens[]> {
		const config = vscode.workspace.getConfiguration("go-extras");

		if (!config.get("codeLens.enabled", true)) {
			return [];
		}

		const showReferences = config.get("codeLens.showReferences", true);
		const showDefinitions = config.get("codeLens.showDefinitions", true);

		if (!showReferences && !showDefinitions) {
			return [];
		}

		try {
			const symbols = await this.getDocumentSymbols(document);
			const codeLenses: vscode.CodeLens[] = [];

			for (const symbol of symbols) {
				if (this.isSupportedSymbol(symbol)) {
					const range = symbol.selectionRange;

					if (showReferences) {
						const referencesLens = new vscode.CodeLens(range);
						referencesLens.command = {
							title: "$(loading~spin) refs",
							command: "",
						};
						codeLenses.push(referencesLens);
					}

					if (showDefinitions) {
						const definitionLens = new vscode.CodeLens(range);
						definitionLens.command = {
							title: "$(arrow-right) definition",
							command: "editor.action.revealDefinition",
						};
						codeLenses.push(definitionLens);
					}
				}
			}

			return codeLenses;
		} catch (error) {
			outputChannel.appendLine(`Error providing CodeLenses: ${error}`);
			return [];
		}
	}

	/**
	 * Resolve CodeLens (fetch reference counts)
	 */
	public async resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken): Promise<vscode.CodeLens> {
		if (!codeLens.command || codeLens.command.title.includes("definition")) {
			return codeLens;
		}

		try {
			const document = await vscode.workspace.openTextDocument(vscode.window.activeTextEditor?.document.uri!);
			const position = codeLens.range.start;

			const references = await vscode.commands.executeCommand<vscode.Location[]>(
				"vscode.executeReferenceProvider",
				document.uri,
				position
			);

			const refCount = references ? references.length : 0;
			codeLens.command = {
				title: `${refCount} refs`,
				command: "go-extras.showReferences",
				arguments: [document.uri, position, references],
			};

			return codeLens;
		} catch (error) {
			outputChannel.appendLine(`Error resolving CodeLens: ${error}`);
			codeLens.command = {
				title: "? refs",
				command: "",
			};
			return codeLens;
		}
	}

	/**
	 * Get document symbols using VS Code API
	 */
	private async getDocumentSymbols(document: vscode.TextDocument): Promise<vscode.DocumentSymbol[]> {
		try {
			const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
				"vscode.executeDocumentSymbolProvider",
				document.uri
			);
			return symbols || [];
		} catch (error) {
			outputChannel.appendLine(`Error getting document symbols: ${error}`);
			return [];
		}
	}

	/**
	 * Check if symbol is supported for CodeLens
	 */
	private isSupportedSymbol(symbol: vscode.DocumentSymbol): boolean {
		const supportedKinds = [
			vscode.SymbolKind.Function,
			vscode.SymbolKind.Method,
			vscode.SymbolKind.Interface,
			vscode.SymbolKind.Field, // For exported struct fields
		];

		return supportedKinds.includes(symbol.kind);
	}

	/**
	 * Refresh CodeLenses
	 */
	public refresh(): void {
		this._onDidChangeCodeLenses.fire();
	}
}

/**
 * Show references command handler
 */
async function showReferences(uri: vscode.Uri, position: vscode.Position, references: vscode.Location[]) {
	if (!references || references.length === 0) {
		vscode.window.showInformationMessage("No references found");
		return;
	}

	await vscode.commands.executeCommand("editor.action.showReferences", uri, position, references);
}

/**
 * Toggle shim debugging command handler
 */
async function toggleShimDebugging() {
	const config = vscode.workspace.getConfiguration("go-extras");
	const current = config.get("debug.autoDetectShims", true);
	
	await config.update("debug.autoDetectShims", !current, vscode.ConfigurationTarget.Workspace);
	
	const status = !current ? "enabled" : "disabled";
	vscode.window.showInformationMessage(`Shim debugging auto-detection ${status}`);
	outputChannel.appendLine(`Shim debugging auto-detection ${status}`);
}

// Global debug provider instance
let debugProvider: GoExtrasDebugProvider | undefined;

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext) {
	outputChannel.appendLine("Go Extras extension activated");

	// Create CodeLens provider
	const codeLensProvider = new GoExtrasCodeLensProvider();

	// Create debug provider
	debugProvider = new GoExtrasDebugProvider(outputChannel);

	// Register CodeLens provider for Go files
	const codeLensProviderDisposable = vscode.languages.registerCodeLensProvider(
		{ scheme: "file", language: "go" },
		codeLensProvider
	);

	// Register debug configuration provider for Go type
	// This intercepts ALL Go debug requests, including from test manager UI
	const debugProviderDisposable = vscode.debug.registerDebugConfigurationProvider(
		"go", 
		debugProvider,
		vscode.DebugConfigurationProviderTriggerKind.Initial
	);

	// Listen for debug session events to handle nested session creation
	const debugSessionStartedListener = vscode.debug.onDidStartDebugSession(async (session) => {
		if (session.type === "go" && debugProvider) {
			await debugProvider.onSessionStarted(session);
		}
	});

	// Register show references command
	const showReferencesCommand = vscode.commands.registerCommand("go-extras.showReferences", showReferences);

	// Register refresh command (for debugging/testing)
	const refreshCommand = vscode.commands.registerCommand("go-extras.refresh", () => {
		codeLensProvider.refresh();
		outputChannel.appendLine("Go Extras CodeLens refreshed");
	});

	// Register toggle shim debugging command
	const toggleShimCommand = vscode.commands.registerCommand("go-extras.toggleShimDebugging", toggleShimDebugging);

	// Listen for configuration changes
	const configListener = vscode.workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration("go-extras")) {
			codeLensProvider.refresh();
			outputChannel.appendLine("Go Extras configuration changed, refreshing");
		}
	});

	// Add subscriptions
	context.subscriptions.push(
		codeLensProviderDisposable,
		debugProviderDisposable,
		debugSessionStartedListener,
		showReferencesCommand,
		refreshCommand,
		toggleShimCommand,
		configListener
	);

	outputChannel.appendLine("Go Extras extension ready with cross-boundary debugging support");
}

/**
 * Extension deactivation
 */
export function deactivate() {
	outputChannel.appendLine("Go Extras extension deactivating...");
	
	// Clean up debug provider resources
	if (debugProvider) {
		debugProvider.dispose();
		debugProvider = undefined;
	}
	
	outputChannel.appendLine("Go Extras extension deactivated");
}
