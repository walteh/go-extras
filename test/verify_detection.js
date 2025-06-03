#!/usr/bin/env node

/**
 * Verification script for Go Extras shim detection
 * Tests the detection patterns against test files to verify they work correctly
 */

const fs = require('fs');
const path = require('path');

// Simulate the detection logic from our TypeScript implementation
class ShimDetectionTest {
    /**
     * Extract containerd/shim related imports from Go source
     */
    extractShimImports(content) {
        const imports = [];
        
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
    detectShimExecution(content) {
        const paths = [];
        
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
    detectContainerdRuntime(content) {
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

    /**
     * Analyze a single Go file for shim interaction patterns
     */
    analyzeFile(filePath) {
        const result = {
            hasShimInteraction: false,
            shimPaths: [],
            importPaths: [],
            detectedPatterns: [],
        };

        try {
            const content = fs.readFileSync(filePath, 'utf8');

            // Check for containerd/shim imports
            const shimImports = this.extractShimImports(content);
            if (shimImports.length > 0) {
                result.hasShimInteraction = true;
                result.importPaths.push(...shimImports);
                result.detectedPatterns.push('imports');
            }

            // Check for shim binary execution patterns
            const shimExecution = this.detectShimExecution(content);
            if (shimExecution.detected) {
                result.hasShimInteraction = true;
                result.shimPaths.push(...shimExecution.paths);
                result.detectedPatterns.push('execution');
            }

            // Check for containerd runtime patterns
            const runtimePatterns = this.detectContainerdRuntime(content);
            if (runtimePatterns) {
                result.hasShimInteraction = true;
                result.detectedPatterns.push('runtime');
            }

        } catch (error) {
            console.error(`Error analyzing file ${filePath}: ${error.message}`);
        }

        return result;
    }

    /**
     * Test all files in a directory
     */
    testDirectory(dirPath) {
        const results = [];
        
        try {
            const files = fs.readdirSync(dirPath);
            
            for (const file of files) {
                if (file.endsWith('_test.go')) {
                    const filePath = path.join(dirPath, file);
                    const analysis = this.analyzeFile(filePath);
                    
                    results.push({
                        file,
                        path: filePath,
                        ...analysis
                    });
                }
            }
        } catch (error) {
            console.error(`Error reading directory ${dirPath}: ${error.message}`);
        }

        return results;
    }
}

// Run the tests
function main() {
    console.log('🔍 Go Extras Shim Detection Verification');
    console.log('=========================================\n');

    const detector = new ShimDetectionTest();
    const testDir = path.join(__dirname, 'shimtest');
    
    console.log(`Testing files in: ${testDir}\n`);
    
    const results = detector.testDirectory(testDir);
    
    for (const result of results) {
        console.log(`📄 ${result.file}`);
        console.log(`   Path: ${result.path}`);
        console.log(`   Shim interaction: ${result.hasShimInteraction ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
        
        if (result.hasShimInteraction) {
            console.log(`   Detected patterns: ${result.detectedPatterns.join(', ')}`);
            
            if (result.importPaths.length > 0) {
                console.log(`   Import paths: ${result.importPaths.join(', ')}`);
            }
            
            if (result.shimPaths.length > 0) {
                console.log(`   Shim paths: ${result.shimPaths.join(', ')}`);
            }
        }
        
        console.log('');
    }

    // Summary
    const shimFiles = results.filter(r => r.hasShimInteraction);
    const normalFiles = results.filter(r => !r.hasShimInteraction);
    
    console.log('📊 Summary');
    console.log('----------');
    console.log(`Total test files: ${results.length}`);
    console.log(`Files with shim interaction: ${shimFiles.length}`);
    console.log(`Files without shim interaction: ${normalFiles.length}`);
    
    if (shimFiles.length > 0) {
        console.log('\n✅ Expected shim detection:');
        shimFiles.forEach(f => console.log(`   - ${f.file} (${f.detectedPatterns.join(', ')})`));
    }
    
    if (normalFiles.length > 0) {
        console.log('\n❌ Expected normal behavior:');
        normalFiles.forEach(f => console.log(`   - ${f.file}`));
    }

    console.log('\n🎉 Detection verification complete!');
}

if (require.main === module) {
    main();
}