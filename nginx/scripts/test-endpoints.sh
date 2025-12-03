#!/bin/bash
# =============================================================================
# Endpoint Testing Script
# Tests all Nginx reverse proxy endpoints
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Default values
BASE_URL="http://localhost"
VERBOSE=false
TIMEOUT=10

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            BASE_URL="$2"
            shift 2
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --url URL        Base URL to test (default: http://localhost)"
            echo "  --verbose, -v    Show detailed output"
            echo "  --timeout SEC    Request timeout in seconds (default: 10)"
            echo ""
            exit 0
            ;;
        *)
            shift
            ;;
    esac
done

# Counters
PASSED=0
FAILED=0
TOTAL=0

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data=$5
    
    TOTAL=$((TOTAL + 1))
    
    echo -n "  Testing $method $endpoint... "
    
    if [[ "$method" == "POST" ]] && [[ -n "$data" ]]; then
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
            --connect-timeout $TIMEOUT \
            -X $method \
            -H "Content-Type: application/json" \
            -d "$data" \
            "${BASE_URL}${endpoint}" 2>/dev/null || echo "000")
    else
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
            --connect-timeout $TIMEOUT \
            -X $method \
            "${BASE_URL}${endpoint}" 2>/dev/null || echo "000")
    fi
    
    if [[ "$RESPONSE" == "$expected_status" ]] || [[ "$expected_status" == "*" && "$RESPONSE" != "000" ]]; then
        echo -e "${GREEN}PASS${NC} (HTTP $RESPONSE)"
        PASSED=$((PASSED + 1))
        if $VERBOSE; then
            echo -e "    ${CYAN}→ $description${NC}"
        fi
    elif [[ "$RESPONSE" == "000" ]]; then
        echo -e "${YELLOW}SKIP${NC} (Connection failed)"
        if $VERBOSE; then
            echo -e "    ${CYAN}→ $description${NC}"
        fi
    else
        echo -e "${RED}FAIL${NC} (Expected $expected_status, got $RESPONSE)"
        FAILED=$((FAILED + 1))
        if $VERBOSE; then
            echo -e "    ${CYAN}→ $description${NC}"
        fi
    fi
}

# Nginx status check
check_nginx_status() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Checking Nginx Status${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}\n"
    
    if command -v systemctl &> /dev/null; then
        if systemctl is-active --quiet nginx; then
            echo -e "  Nginx Status: ${GREEN}Running${NC}"
        else
            echo -e "  Nginx Status: ${RED}Not Running${NC}"
            echo -e "  ${YELLOW}Start with: sudo systemctl start nginx${NC}"
        fi
    else
        if pgrep nginx > /dev/null; then
            echo -e "  Nginx Status: ${GREEN}Running${NC}"
        else
            echo -e "  Nginx Status: ${RED}Not Running${NC}"
        fi
    fi
}

# Test configuration
test_nginx_config() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Testing Nginx Configuration${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}\n"
    
    if nginx -t 2>&1 | grep -q "successful"; then
        echo -e "  Configuration Test: ${GREEN}PASS${NC}"
    else
        echo -e "  Configuration Test: ${RED}FAIL${NC}"
        nginx -t 2>&1 | sed 's/^/    /'
    fi
}

# Main tests
run_tests() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Testing Endpoints: $BASE_URL${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
    
    # Frontend Tests
    echo -e "\n${CYAN}Frontend (React/Vite)${NC}"
    test_endpoint "GET" "/" "*" "Main frontend page"
    
    # Health Check
    echo -e "\n${CYAN}Health Check${NC}"
    test_endpoint "GET" "/health" "*" "Backend health endpoint"
    
    # API Documentation
    echo -e "\n${CYAN}API Documentation${NC}"
    test_endpoint "GET" "/docs" "*" "Swagger UI documentation"
    test_endpoint "GET" "/redoc" "*" "ReDoc documentation"
    test_endpoint "GET" "/openapi.json" "*" "OpenAPI schema"
    
    # Authentication API
    echo -e "\n${CYAN}Authentication API (/api/auth)${NC}"
    test_endpoint "GET" "/api/auth/me" "401" "Get current user (requires auth)"
    test_endpoint "GET" "/api/auth/users" "401" "List users (requires auth)"
    
    # Models API
    echo -e "\n${CYAN}Models API (/api/models)${NC}"
    test_endpoint "GET" "/api/models" "*" "List models"
    test_endpoint "GET" "/api/models/running/list" "*" "List running models"
    
    # System API
    echo -e "\n${CYAN}System API (/api/system)${NC}"
    test_endpoint "GET" "/api/system/health" "*" "System health"
    test_endpoint "GET" "/api/system/cpu" "*" "CPU information"
    test_endpoint "GET" "/api/system/memory" "*" "Memory information"
    test_endpoint "GET" "/api/system/disk" "*" "Disk information"
    test_endpoint "GET" "/api/system/resources" "*" "All resources"
    
    # Metrics API
    echo -e "\n${CYAN}Metrics API (/api/metrics)${NC}"
    test_endpoint "GET" "/api/metrics" "*" "Get all metrics"
    test_endpoint "GET" "/api/metrics/summary" "*" "Metrics summary"
    
    # Logs API
    echo -e "\n${CYAN}Logs API (/api/logs)${NC}"
    test_endpoint "GET" "/api/logs/system" "*" "System logs"
    test_endpoint "GET" "/api/logs/models" "*" "Models logs list"
    
    # Sessions API
    echo -e "\n${CYAN}Sessions API (/api/session)${NC}"
    test_endpoint "GET" "/api/session" "*" "List sessions"
    
    # Process API
    echo -e "\n${CYAN}Process API (/api/process)${NC}"
    test_endpoint "GET" "/api/process" "*" "List processes"
    
    # Cache API
    echo -e "\n${CYAN}Cache API (/api/cache)${NC}"
    test_endpoint "GET" "/api/cache/stats" "*" "Cache statistics"
    
    # Backup API
    echo -e "\n${CYAN}Backup API (/api/backup)${NC}"
    test_endpoint "GET" "/api/backup/history" "*" "Backup history"
}

# Print summary
print_summary() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Test Summary${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════${NC}\n"
    
    echo -e "  Total Tests:  $TOTAL"
    echo -e "  ${GREEN}Passed:${NC}       $PASSED"
    echo -e "  ${RED}Failed:${NC}       $FAILED"
    
    if [[ $FAILED -eq 0 ]] && [[ $PASSED -gt 0 ]]; then
        echo -e "\n  ${GREEN}All tests passed successfully!${NC}"
    elif [[ $PASSED -eq 0 ]]; then
        echo -e "\n  ${YELLOW}No tests passed. Check if services are running.${NC}"
    else
        echo -e "\n  ${YELLOW}Some tests failed. Check the output above.${NC}"
    fi
}

# Main
main() {
    echo ""
    echo "=============================================="
    echo "  Nginx Endpoint Testing Script"
    echo "  Ollama Manager"
    echo "=============================================="
    
    check_nginx_status
    
    if [[ $EUID -eq 0 ]]; then
        test_nginx_config
    fi
    
    run_tests
    print_summary
}

main "$@"
