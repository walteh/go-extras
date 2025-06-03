/**
 * Type definitions for Go Extras debug functionality
 */

import * as vscode from "vscode";

/**
 * Enhanced Go debug configuration with shim support
 */
export interface GoExtrasDebugConfiguration extends vscode.DebugConfiguration {
	type: "go";
	request: "launch" | "attach";
	mode?: "test" | "debug" | "remote";
	program?: string;
	args?: string[];
	env?: { [key: string]: string };
	enableShimDebugging?: boolean;
	shimPort?: number;
	shimBinary?: string;
}

/**
 * Shim detection result
 */
export interface ShimDetectionResult {
	hasShimInteraction: boolean;
	shimPaths: string[];
	testFiles: string[];
	importPaths: string[];
}

/**
 * Delve server configuration
 */
export interface DelveServerConfig {
	port: number;
	host: string;
	pid?: number;
	binary?: string;
	workingDir: string;
}

/**
 * Debug session metadata for tracking nested sessions
 */
export interface DebugSessionMetadata {
	sessionId: string;
	isShimSession: boolean;
	parentSessionId?: string;
	shimConfig?: DelveServerConfig;
	testConfig?: GoExtrasDebugConfiguration;
}

/**
 * Port allocation result
 */
export interface PortAllocation {
	port: number;
	cleanup: () => void;
}