#!/bin/bash

# Test runner for FrenPet gasless functionality
# Run all tests or specific test categories

set -e

echo "🧪 FrenPet Gasless Test Suite"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run a test
run_test() {
    local test_file=$1
    local test_name=$2
    
    echo -e "${YELLOW}Running: ${test_name}${NC}"
    if node "$test_file"; then
        echo -e "${GREEN}✅ ${test_name} passed${NC}\n"
        return 0
    else
        echo -e "${RED}❌ ${test_name} failed${NC}\n"
        return 1
    fi
}

# Parse arguments
if [ "$1" == "core" ]; then
    echo "Running CORE tests only..."
    echo ""
    run_test "test-zero-eth-gasless.js" "Zero ETH Test"
    run_test "test-basic-gasless.js" "Basic Gasless Flow"
    run_test "test-delegation-simple.js" "Delegation Test"
elif [ "$1" == "mobile" ]; then
    echo "Running MOBILE tests..."
    echo ""
    run_test "test-mobile-gasless.js" "Mobile Flow Test"
    run_test "test-session-key-signing.js" "Session Key Test"
    run_test "test-porto-app-flow.js" "Porto App Flow"
elif [ "$1" == "all" ]; then
    echo "Running ALL tests..."
    echo ""
    run_test "test-zero-eth-gasless.js" "Zero ETH Test"
    run_test "test-basic-gasless.js" "Basic Gasless Flow"
    run_test "test-delegation-simple.js" "Delegation Test"
    run_test "test-mobile-gasless.js" "Mobile Flow Test"
    run_test "test-session-key-signing.js" "Session Key Test"
    run_test "test-session-keys.js" "Comprehensive Session Keys"
    run_test "test-porto-app-flow.js" "Porto App Flow"
    run_test "test-eoa-signing.js" "EOA Signing"
    run_test "test-simple-gasless.js" "Simple Gasless"
elif [ "$1" == "quick" ]; then
    echo "Running QUICK sanity check..."
    echo ""
    run_test "test-zero-eth-gasless.js" "Zero ETH Test"
else
    echo "Usage: ./run-tests.sh [core|mobile|all|quick]"
    echo ""
    echo "  core   - Run core gasless functionality tests"
    echo "  mobile - Run mobile-specific tests"
    echo "  all    - Run all tests"
    echo "  quick  - Run quick sanity check (zero ETH test only)"
    echo ""
    echo "Individual tests can also be run directly:"
    echo "  node test-zero-eth-gasless.js"
    echo ""
    exit 1
fi

echo ""
echo "🎉 Test run complete!"