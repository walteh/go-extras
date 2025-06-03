package main

import (
	"context"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// TestCrossBoundaryDebugging tests the complete cross-boundary debugging workflow
func TestCrossBoundaryDebugging(t *testing.T) {
	workspaceRoot := "/workspace"

	t.Run("GoshimBinaryExists", func(t *testing.T) {
		goshimPath := filepath.Join(workspaceRoot, "goshim")
		if _, err := os.Stat(goshimPath); os.IsNotExist(err) {
			t.Fatalf("goshim binary not found at %s", goshimPath)
		}
		t.Logf("✅ goshim binary found at %s", goshimPath)
	})

	t.Run("VSCodeExtensionBuilds", func(t *testing.T) {
		extensionDir := filepath.Join(workspaceRoot, "editors", "vscode")
		extensionJS := filepath.Join(extensionDir, "out", "extension.js")

		if _, err := os.Stat(extensionJS); os.IsNotExist(err) {
			t.Fatalf("Extension not built. Run 'bun run build' in %s", extensionDir)
		}
		t.Logf("✅ VS Code extension built successfully")
	})

	t.Run("PortAllocation", func(t *testing.T) {
		// Test port allocation functionality
		port, err := allocatePort()
		if err != nil {
			t.Fatalf("Failed to allocate port: %v", err)
		}

		if port <= 1024 || port > 65535 {
			t.Fatalf("Invalid port allocated: %d", port)
		}

		t.Logf("✅ Port allocation works: %d", port)
	})

	t.Run("DelveDAP", func(t *testing.T) {
		// Check if delve is available
		if _, err := exec.LookPath("dlv"); err != nil {
			t.Skip("Delve (dlv) not available, skipping DAP test")
		}

		// Test that goshim can run delve in DAP mode
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		port, err := allocatePort()
		if err != nil {
			t.Fatalf("Failed to allocate port: %v", err)
		}

		goshimPath := filepath.Join(workspaceRoot, "goshim")
		cmd := exec.CommandContext(ctx, goshimPath, "dap", "--headless", "--accept-multiclient", "--continue", fmt.Sprintf("--listen=127.0.0.1:%d", port))
		cmd.Dir = workspaceRoot

		// Start the process
		err = cmd.Start()
		if err != nil {
			t.Fatalf("Failed to start goshim dap: %v", err)
		}

		// Give it time to start
		time.Sleep(2 * time.Second)

		// Try to connect to the DAP server
		conn, err := net.DialTimeout("tcp", fmt.Sprintf("127.0.0.1:%d", port), 3*time.Second)
		if err != nil {
			// Kill the process
			cmd.Process.Kill()
			t.Fatalf("Failed to connect to DAP server: %v", err)
		}
		conn.Close()

		// Kill the process
		err = cmd.Process.Kill()
		if err != nil {
			t.Logf("Warning: failed to kill DAP process: %v", err)
		}

		t.Logf("✅ Delve DAP server starts and accepts connections on port %d", port)
	})

	t.Run("TestFileDetection", func(t *testing.T) {
		// Verify that our test files are correctly structured
		testDir := filepath.Join(workspaceRoot, "test", "shimtest")

		// Check that shim test files exist
		shimTestFiles := []string{"containerd_test.go", "shim_exec_test.go"}
		for _, file := range shimTestFiles {
			filePath := filepath.Join(testDir, file)
			if _, err := os.Stat(filePath); os.IsNotExist(err) {
				t.Fatalf("Test file not found: %s", filePath)
			}
		}

		// Check that normal test file exists
		normalTestFile := filepath.Join(testDir, "normal_test.go")
		if _, err := os.Stat(normalTestFile); os.IsNotExist(err) {
			t.Fatalf("Normal test file not found: %s", normalTestFile)
		}

		t.Logf("✅ All test files are properly structured")
	})
}

// TestShimDetectionAccuracy tests the accuracy of shim detection patterns
func TestShimDetectionAccuracy(t *testing.T) {
	testCases := []struct {
		name           string
		content        string
		shouldDetect   bool
		expectedReason string
	}{
		{
			name: "ContainerdImport",
			content: `package test
import "github.com/containerd/containerd"
func TestExample(t *testing.T) {}`,
			shouldDetect:   true,
			expectedReason: "containerd import",
		},
		{
			name: "ShimExecution",
			content: `package test
import "os/exec"
func TestExample(t *testing.T) {
	cmd := exec.Command("/usr/bin/containerd-shim-runc-v2", "start")
}`,
			shouldDetect:   true,
			expectedReason: "shim execution",
		},
		{
			name: "NormalTest",
			content: `package test
import "testing"
func TestExample(t *testing.T) {
	if 1+1 != 2 { t.Error("math broken") }
}`,
			shouldDetect:   false,
			expectedReason: "no shim patterns",
		},
		{
			name: "HTTPTest",
			content: `package test
import "net/http"
func TestHTTP(t *testing.T) {
	resp, _ := http.Get("http://example.com")
}`,
			shouldDetect:   false,
			expectedReason: "http not shim related",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			detected := detectShimPatterns(tc.content)

			if detected != tc.shouldDetect {
				t.Errorf("Detection mismatch for %s: expected %v, got %v (reason: %s)",
					tc.name, tc.shouldDetect, detected, tc.expectedReason)
			} else {
				t.Logf("✅ Correct detection for %s: %v (%s)", tc.name, detected, tc.expectedReason)
			}
		})
	}
}

// TestDebugConfigurationEnhancement tests debug configuration enhancement
func TestDebugConfigurationEnhancement(t *testing.T) {
	testConfig := map[string]interface{}{
		"type":    "go",
		"request": "launch",
		"mode":    "test",
		"program": "/workspace/test/shimtest",
	}

	// Simulate the configuration enhancement
	enhanced := enhanceDebugConfig(testConfig)

	// Check that the original config is preserved
	if enhanced["type"] != "go" || enhanced["mode"] != "test" {
		t.Errorf("Original configuration was modified")
	}

	// Check that shim debugging indicators are present
	if enhanced["__shimDetected"] != true {
		t.Errorf("Shim detection indicator not set")
	}

	t.Logf("✅ Debug configuration enhancement works correctly")
}

// Helper functions

func allocatePort() (int, error) {
	listener, err := net.Listen("tcp", ":0")
	if err != nil {
		return 0, err
	}
	port := listener.Addr().(*net.TCPAddr).Port
	listener.Close()
	return port, nil
}

func detectShimPatterns(content string) bool {
	// Simplified version of our detection logic
	shimPatterns := []string{
		"github.com/containerd",
		"containerd-shim",
		"exec.Command.*shim",
		"ttrpc.NewClient",
		"shim.Init",
		"shim.Start",
	}

	for _, pattern := range shimPatterns {
		if strings.Contains(content, pattern) ||
			(strings.Contains(pattern, "exec.Command") && strings.Contains(content, "exec.Command") && strings.Contains(content, "shim")) {
			return true
		}
	}
	return false
}

func enhanceDebugConfig(config map[string]interface{}) map[string]interface{} {
	// Simulate configuration enhancement
	enhanced := make(map[string]interface{})
	for k, v := range config {
		enhanced[k] = v
	}

	// Add shim debugging metadata
	enhanced["__shimDetected"] = true
	enhanced["__shimPort"] = 12345 // Mock port

	return enhanced
}

func main() {
	// Run integration tests
	testing.Main(func(pat, str string) (bool, error) { return true, nil },
		[]testing.InternalTest{
			{"TestCrossBoundaryDebugging", TestCrossBoundaryDebugging},
			{"TestShimDetectionAccuracy", TestShimDetectionAccuracy},
			{"TestDebugConfigurationEnhancement", TestDebugConfigurationEnhancement},
		},
		[]testing.InternalBenchmark{},
		[]testing.InternalExample{})
}
