/**
 * Go Extras VS Code Extension
 *
 * This extension provides various enhancements for Go development in VS Code,
 * including CodeLens functionality, reference counting, and navigation helpers.
 *
 * Features:
 * - Reference count CodeLens for Go symbols
 * - "Go to definition" CodeLens
 * - Reuses existing Go extension's gopls instance (no embedded server)
 * - Lightweight footprint with minimal dependencies
 * - Extensible architecture for additional Go development tools
 */

import * as vscode from "vscode";

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
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext) {
	outputChannel.appendLine("Go Extras extension activated");

	// Create CodeLens provider
	const codeLensProvider = new GoExtrasCodeLensProvider();

	// Register CodeLens provider for Go files
	const codeLensProviderDisposable = vscode.languages.registerCodeLensProvider(
		{ scheme: "file", language: "go" },
		codeLensProvider
	);

	// Register show references command
	const showReferencesCommand = vscode.commands.registerCommand("go-extras.showReferences", showReferences);

	// Register refresh command (for debugging/testing)
	const refreshCommand = vscode.commands.registerCommand("go-extras.refresh", () => {
		codeLensProvider.refresh();
		outputChannel.appendLine("Go Extras CodeLens refreshed");
	});

	// Listen for configuration changes
	const configListener = vscode.workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration("go-extras")) {
			codeLensProvider.refresh();
			outputChannel.appendLine("Go Extras configuration changed, refreshing");
		}
	});

	// Add subscriptions
	context.subscriptions.push(codeLensProviderDisposable, showReferencesCommand, refreshCommand, configListener);

	outputChannel.appendLine("Go Extras extension ready");
}

/**
 * Extension deactivation
 */
export function deactivate() {
	outputChannel.appendLine("Go Extras extension deactivated");
}
