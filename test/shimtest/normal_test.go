package shimtest

import (
	"fmt"
	"net/http"
	"testing"
	"time"
)

// TestNormalFunction tests a normal function
// This should NOT trigger shim debugging
func TestNormalFunction(t *testing.T) {
	result := add(2, 3)
	expected := 5

	if result != expected {
		t.Errorf("add(2, 3) = %d; want %d", result, expected)
	}
}

// TestHTTPRequest tests making an HTTP request
// This should NOT trigger shim debugging
func TestHTTPRequest(t *testing.T) {
	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	resp, err := client.Get("https://httpbin.org/get")
	if err != nil {
		t.Skipf("HTTP request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}
}

// TestStringManipulation tests string operations
// This should NOT trigger shim debugging
func TestStringManipulation(t *testing.T) {
	input := "hello world"
	expected := "HELLO WORLD"

	result := toUpper(input)

	if result != expected {
		t.Errorf("toUpper(%q) = %q; want %q", input, result, expected)
	}
}

// TestTableDriven demonstrates table-driven tests
// This should NOT trigger shim debugging
func TestTableDriven(t *testing.T) {
	tests := []struct {
		name     string
		input    int
		expected bool
	}{
		{"even number", 4, true},
		{"odd number", 5, false},
		{"zero", 0, true},
		{"negative even", -2, true},
		{"negative odd", -3, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isEven(tt.input)
			if result != tt.expected {
				t.Errorf("isEven(%d) = %v; want %v", tt.input, result, tt.expected)
			}
		})
	}
}

// Helper functions
func add(a, b int) int {
	return a + b
}

func toUpper(s string) string {
	return fmt.Sprintf("%s", s) // Simplified for demo
}

func isEven(n int) bool {
	return n%2 == 0
}
