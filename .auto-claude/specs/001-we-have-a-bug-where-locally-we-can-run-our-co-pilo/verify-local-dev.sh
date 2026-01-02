#!/bin/bash
# Verification Script for Local Development Environment
# Subtask: 1-2 - Test local development environment works correctly with wrangler dev
#
# Run this script to verify the local development environment is working.
# Usage: bash .auto-claude/specs/001-we-have-a-bug-where-locally-we-can-run-our-co-pilo/verify-local-dev.sh

set -e

echo "========================================"
echo "ISS Copilot - Local Dev Verification"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0

pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASS_COUNT++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAIL_COUNT++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
}

echo "Step 1: Pre-flight Checks"
echo "-------------------------"

# Check critical files exist
if [ -f "src/routes/iss/copilot.tsx" ]; then
    pass "Route file exists: src/routes/iss/copilot.tsx"
else
    fail "Route file missing: src/routes/iss/copilot.tsx"
fi

if [ -f "src/lib/copilot/agent.ts" ]; then
    pass "Agent file exists: src/lib/copilot/agent.ts"
else
    fail "Agent file missing: src/lib/copilot/agent.ts"
fi

if [ -f "wrangler.jsonc" ]; then
    pass "Wrangler config exists"
else
    fail "Wrangler config missing"
fi

# Check AI binding configuration
if grep -q '"binding": "AI"' wrangler.jsonc; then
    pass "AI binding configured in wrangler.jsonc"
else
    fail "AI binding NOT configured in wrangler.jsonc"
fi

# Check node_modules exists
if [ -d "node_modules" ]; then
    pass "Dependencies installed (node_modules exists)"
else
    fail "Dependencies NOT installed - run: npm install"
fi

echo ""
echo "Step 2: Type & Lint Checks"
echo "--------------------------"

# Run TypeScript check
if npm run type-check 2>&1 | grep -q "error"; then
    fail "TypeScript errors found"
else
    pass "TypeScript check passed"
fi

# Run linting
if npm run check 2>&1 | grep -q "Found"; then
    warn "Linting issues found (non-blocking)"
else
    pass "Lint check passed"
fi

echo ""
echo "Step 3: Start Dev Server (Manual)"
echo "----------------------------------"

echo "Starting development server..."
echo ""
echo "  npm run dev"
echo ""
echo "Wait for the server to start, then proceed to Step 4."
echo ""
echo "Press Enter when the server is running..."
read -r

echo ""
echo "Step 4: Browser Verification"
echo "----------------------------"
echo ""
echo "Open: http://localhost:3000/iss/copilot"
echo ""
echo "Verify the following (answer y/n for each):"
echo ""

read -p "Page loads without errors? (y/n): " ans1
if [ "$ans1" = "y" ]; then pass "Page loads"; else fail "Page load"; fi

read -p "OBSERVATION COPILOT header visible? (y/n): " ans2
if [ "$ans2" = "y" ]; then pass "Header visible"; else fail "Header not visible"; fi

read -p "Chat input visible at bottom? (y/n): " ans3
if [ "$ans3" = "y" ]; then pass "Chat input visible"; else fail "Chat input not visible"; fi

read -p "Suggested questions visible? (y/n): " ans4
if [ "$ans4" = "y" ]; then pass "Suggested prompts visible"; else fail "Suggested prompts not visible"; fi

read -p "Browser DevTools shows NO console errors? (y/n): " ans5
if [ "$ans5" = "y" ]; then pass "No console errors"; else fail "Console errors present"; fi

echo ""
echo "Step 5: Functional Test"
echo "-----------------------"
echo ""
echo "Try sending a test message: 'What is the ISS?'"
echo ""

read -p "Did the AI respond with information about the ISS? (y/n): " ans6
if [ "$ans6" = "y" ]; then pass "AI responds correctly"; else fail "AI did not respond"; fi

echo ""
echo "========================================"
echo "VERIFICATION SUMMARY"
echo "========================================"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED - Local dev environment verified!${NC}"
    echo ""
    echo "Subtask 1-2 can be marked as COMPLETED."
    exit 0
else
    echo -e "${RED}✗ SOME CHECKS FAILED - Please fix issues above.${NC}"
    exit 1
fi
