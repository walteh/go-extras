/**
 * Shim launcher for managing Delve servers for shim debugging
 */

import * as vscode from "vscode";
import * as cp from "child_process";
import * as net from "net";
import { DelveServerConfig, PortAllocation } from "./types";

export class ShimLauncher {
	private readonly outputChannel: vscode.OutputChannel;
	private activeServers = new Map<number, cp.ChildProcess>();
	private static instance: ShimLauncher;

	constructor(outputChannel: vscode.OutputChannel) {
		this.outputChannel = outputChannel;
	}

	/**
	 * Get singleton instance
	 */
	static getInstance(outputChannel: vscode.OutputChannel): ShimLauncher {
		if (!ShimLauncher.instance) {
			ShimLauncher.instance = new ShimLauncher(outputChannel);
		}
		return ShimLauncher.instance;
	}

	/**
	 * Ensure a Delve server is running for shim debugging
	 */
	async ensureShimServer(workspaceRoot: string): Promise<DelveServerConfig> {
		try {
			// Check if we can reuse an existing server
			const existingPort = process.env.GO_EXTRAS_DLV_PORT;
			if (existingPort && await this.isPortReachable(parseInt(existingPort))) {
				this.outputChannel.appendLine(`Reusing existing Delve server on port ${existingPort}`);
				return {
					port: parseInt(existingPort),
					host: "127.0.0.1",
					workingDir: workspaceRoot,
				};
			}

			// Allocate a new port
			const portAllocation = await this.allocatePort();
			
			// Start a new Delve server
			const server = await this.startDelveServer(portAllocation.port, workspaceRoot);
			
			// Store the port for reuse
			process.env.GO_EXTRAS_DLV_PORT = portAllocation.port.toString();
			
			this.outputChannel.appendLine(`Started Delve server on port ${portAllocation.port}`);
			
			return {
				port: portAllocation.port,
				host: "127.0.0.1",
				pid: server.pid,
				workingDir: workspaceRoot,
			};
		} catch (error) {
			this.outputChannel.appendLine(`Error starting Delve server: ${error}`);
			throw error;
		}
	}

	/**
	 * Start a headless Delve server
	 */
	private async startDelveServer(port: number, workingDir: string): Promise<cp.ChildProcess> {
		return new Promise((resolve, reject) => {
			const dlvPath = vscode.workspace.getConfiguration("go-extras").get("debug.dlvPath", "dlv");
			
			// Use goshim if available, otherwise fallback to dlv
			const command = this.getGoshimPath(workingDir) || dlvPath;
			
			const args = [
				"dap",
				"--headless",
				"--accept-multiclient",
				"--continue",
				`--listen=127.0.0.1:${port}`,
			];

			this.outputChannel.appendLine(`Starting Delve server: ${command} ${args.join(" ")}`);

			const server = cp.spawn(command, args, {
				cwd: workingDir,
				stdio: ["pipe", "pipe", "pipe"],
				env: {
					...process.env,
					// Ensure the shim can find go binary
					PATH: process.env.PATH,
				},
			});

			server.stdout?.on("data", (data) => {
				this.outputChannel.appendLine(`Delve stdout: ${data.toString()}`);
			});

			server.stderr?.on("data", (data) => {
				const output = data.toString();
				this.outputChannel.appendLine(`Delve stderr: ${output}`);
				
				// Check if server started successfully
				if (output.includes("API server listening") || output.includes(`listening on ${port}`)) {
					this.activeServers.set(port, server);
					resolve(server);
				}
			});

			server.on("error", (error) => {
				this.outputChannel.appendLine(`Delve server error: ${error}`);
				reject(error);
			});

			server.on("exit", (code) => {
				this.outputChannel.appendLine(`Delve server exited with code ${code}`);
				this.activeServers.delete(port);
			});

			// Give the server time to start
			setTimeout(() => {
				if (!this.activeServers.has(port)) {
					reject(new Error("Delve server failed to start within timeout"));
				}
			}, 5000);
		});
	}

	/**
	 * Get path to goshim if available
	 */
	private getGoshimPath(workspaceRoot: string): string | null {
		try {
			const goshimPath = require("path").join(workspaceRoot, "goshim");
			if (require("fs").existsSync(goshimPath)) {
				return goshimPath;
			}
		} catch (error) {
			// Ignore errors, fallback to dlv
		}
		return null;
	}

	/**
	 * Allocate a free port for the Delve server
	 */
	private async allocatePort(): Promise<PortAllocation> {
		return new Promise((resolve, reject) => {
			const server = net.createServer();
			
			server.listen(0, "127.0.0.1", () => {
				const address = server.address();
				if (address && typeof address === "object") {
					const port = address.port;
					server.close(() => {
						resolve({
							port,
							cleanup: () => {
								// Cleanup is handled by server lifecycle
							},
						});
					});
				} else {
					server.close();
					reject(new Error("Failed to allocate port"));
				}
			});

			server.on("error", (error) => {
				reject(error);
			});
		});
	}

	/**
	 * Check if a port is reachable
	 */
	private async isPortReachable(port: number): Promise<boolean> {
		return new Promise((resolve) => {
			const socket = new net.Socket();
			
			socket.setTimeout(1000);
			
			socket.on("connect", () => {
				socket.destroy();
				resolve(true);
			});
			
			socket.on("timeout", () => {
				socket.destroy();
				resolve(false);
			});
			
			socket.on("error", () => {
				resolve(false);
			});
			
			socket.connect(port, "127.0.0.1");
		});
	}

	/**
	 * Stop a Delve server
	 */
	async stopServer(port: number): Promise<void> {
		const server = this.activeServers.get(port);
		if (server) {
			this.outputChannel.appendLine(`Stopping Delve server on port ${port}`);
			server.kill("SIGTERM");
			this.activeServers.delete(port);
		}
	}

	/**
	 * Stop all active servers
	 */
	async stopAllServers(): Promise<void> {
		for (const [port, server] of this.activeServers) {
			this.outputChannel.appendLine(`Stopping Delve server on port ${port}`);
			server.kill("SIGTERM");
		}
		this.activeServers.clear();
	}

	/**
	 * Get active server ports
	 */
	getActiveServerPorts(): number[] {
		return Array.from(this.activeServers.keys());
	}
}