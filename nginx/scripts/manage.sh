#!/bin/bash
# =============================================================================
# Nginx Management Script
# Common operations for Nginx management
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Show usage
usage() {
    echo "Usage: $0 COMMAND [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  start           Start Nginx"
    echo "  stop            Stop Nginx"
    echo "  restart         Restart Nginx"
    echo "  reload          Reload configuration"
    echo "  status          Show Nginx status"
    echo "  test            Test configuration"
    echo "  logs            Show access logs"
    echo "  errors          Show error logs"
    echo "  enable SITE     Enable a site"
    echo "  disable SITE    Disable a site"
    echo "  list-sites      List available sites"
    echo "  connections     Show active connections"
    echo "  version         Show Nginx version"
    echo ""
    exit 1
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This command requires root privileges"
        exit 1
    fi
}

# Commands
cmd_start() {
    check_root
    print_status "Starting Nginx..."
    
    if command -v systemctl &> /dev/null; then
        systemctl start nginx
    else
        service nginx start
    fi
    
    print_success "Nginx started"
}

cmd_stop() {
    check_root
    print_status "Stopping Nginx..."
    
    if command -v systemctl &> /dev/null; then
        systemctl stop nginx
    else
        service nginx stop
    fi
    
    print_success "Nginx stopped"
}

cmd_restart() {
    check_root
    print_status "Restarting Nginx..."
    
    if nginx -t; then
        if command -v systemctl &> /dev/null; then
            systemctl restart nginx
        else
            service nginx restart
        fi
        print_success "Nginx restarted"
    else
        print_error "Configuration test failed. Nginx not restarted."
        exit 1
    fi
}

cmd_reload() {
    check_root
    print_status "Reloading Nginx configuration..."
    
    if nginx -t; then
        if command -v systemctl &> /dev/null; then
            systemctl reload nginx
        else
            nginx -s reload
        fi
        print_success "Nginx configuration reloaded"
    else
        print_error "Configuration test failed. Not reloading."
        exit 1
    fi
}

cmd_status() {
    echo ""
    echo "Nginx Status"
    echo "============"
    
    if command -v systemctl &> /dev/null; then
        systemctl status nginx --no-pager
    else
        if pgrep nginx > /dev/null; then
            echo "Nginx is running"
            pgrep -a nginx
        else
            echo "Nginx is not running"
        fi
    fi
}

cmd_test() {
    print_status "Testing Nginx configuration..."
    nginx -t
}

cmd_logs() {
    local lines=${1:-50}
    print_status "Showing last $lines lines of access log..."
    tail -n "$lines" /var/log/nginx/access.log 2>/dev/null || \
    tail -n "$lines" /var/log/nginx/ollama-manager.access.log 2>/dev/null || \
    print_error "Access log not found"
}

cmd_errors() {
    local lines=${1:-50}
    print_status "Showing last $lines lines of error log..."
    tail -n "$lines" /var/log/nginx/error.log 2>/dev/null || \
    tail -n "$lines" /var/log/nginx/ollama-manager.error.log 2>/dev/null || \
    print_error "Error log not found"
}

cmd_enable() {
    check_root
    local site=$1
    
    if [[ -z "$site" ]]; then
        print_error "Please specify a site to enable"
        exit 1
    fi
    
    if [[ ! -f "/etc/nginx/sites-available/${site}.conf" ]] && \
       [[ ! -f "/etc/nginx/sites-available/${site}" ]]; then
        print_error "Site not found: $site"
        exit 1
    fi
    
    local conf_file=$(ls /etc/nginx/sites-available/${site}* 2>/dev/null | head -1)
    local conf_name=$(basename "$conf_file")
    
    ln -sf "$conf_file" "/etc/nginx/sites-enabled/$conf_name"
    print_success "Site enabled: $site"
    
    print_status "Testing configuration..."
    if nginx -t; then
        cmd_reload
    fi
}

cmd_disable() {
    check_root
    local site=$1
    
    if [[ -z "$site" ]]; then
        print_error "Please specify a site to disable"
        exit 1
    fi
    
    rm -f "/etc/nginx/sites-enabled/${site}"* 2>/dev/null
    print_success "Site disabled: $site"
    
    print_status "Testing configuration..."
    if nginx -t; then
        cmd_reload
    fi
}

cmd_list_sites() {
    echo ""
    echo "Available Sites"
    echo "==============="
    
    if [[ -d /etc/nginx/sites-available ]]; then
        for site in /etc/nginx/sites-available/*; do
            if [[ -f "$site" ]]; then
                name=$(basename "$site")
                if [[ -L "/etc/nginx/sites-enabled/$name" ]]; then
                    echo -e "  ${GREEN}●${NC} $name (enabled)"
                else
                    echo -e "  ${RED}○${NC} $name (disabled)"
                fi
            fi
        done
    else
        echo "No sites-available directory found"
    fi
}

cmd_connections() {
    echo ""
    echo "Active Connections"
    echo "=================="
    
    if command -v ss &> /dev/null; then
        ss -tlnp | grep nginx
    else
        netstat -tlnp | grep nginx
    fi
    
    echo ""
    echo "Connection Count:"
    ss -s 2>/dev/null | grep -E "(TCP|ESTAB)" || netstat -an | grep ESTABLISHED | wc -l
}

cmd_version() {
    nginx -v
    nginx -V 2>&1 | head -5
}

# Main
case "${1:-}" in
    start)      cmd_start ;;
    stop)       cmd_stop ;;
    restart)    cmd_restart ;;
    reload)     cmd_reload ;;
    status)     cmd_status ;;
    test)       cmd_test ;;
    logs)       cmd_logs "${2:-50}" ;;
    errors)     cmd_errors "${2:-50}" ;;
    enable)     cmd_enable "$2" ;;
    disable)    cmd_disable "$2" ;;
    list-sites) cmd_list_sites ;;
    connections) cmd_connections ;;
    version)    cmd_version ;;
    *)          usage ;;
esac
