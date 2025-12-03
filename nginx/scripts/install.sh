#!/bin/bash
# =============================================================================
# Nginx Installation and Setup Script
# Ollama Manager - Production Ready
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Detect OS
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    elif type lsb_release >/dev/null 2>&1; then
        OS=$(lsb_release -si)
        VER=$(lsb_release -sr)
    else
        OS=$(uname -s)
        VER=$(uname -r)
    fi
    print_status "Detected OS: $OS $VER"
}

# Install Nginx
install_nginx() {
    print_status "Installing Nginx..."
    
    if command -v apt-get &> /dev/null; then
        # Debian/Ubuntu
        apt-get update
        apt-get install -y nginx openssl
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL/Fedora
        yum install -y epel-release
        yum install -y nginx openssl
    elif command -v dnf &> /dev/null; then
        # Fedora
        dnf install -y nginx openssl
    elif command -v apk &> /dev/null; then
        # Alpine
        apk add nginx openssl
    elif command -v pacman &> /dev/null; then
        # Arch Linux
        pacman -Sy --noconfirm nginx openssl
    else
        print_error "Unsupported package manager. Please install Nginx manually."
        exit 1
    fi
    
    print_success "Nginx installed successfully"
}

# Backup existing configuration
backup_config() {
    if [[ -f /etc/nginx/nginx.conf ]]; then
        print_status "Backing up existing Nginx configuration..."
        BACKUP_DIR="/etc/nginx/backup_$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        cp -r /etc/nginx/* "$BACKUP_DIR/" 2>/dev/null || true
        print_success "Backup created at $BACKUP_DIR"
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p /etc/nginx/sites-available
    mkdir -p /etc/nginx/sites-enabled
    mkdir -p /etc/nginx/snippets
    mkdir -p /etc/nginx/ssl
    mkdir -p /etc/nginx/conf.d
    mkdir -p /var/log/nginx
    mkdir -p /var/www/certbot
    
    print_success "Directories created"
}

# Copy configuration files
copy_config() {
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    NGINX_DIR="$(dirname "$SCRIPT_DIR")"
    
    print_status "Copying configuration files..."
    
    # Copy main nginx.conf
    cp "$NGINX_DIR/nginx.conf" /etc/nginx/nginx.conf
    
    # Copy site configurations
    cp "$NGINX_DIR/sites-available/"*.conf /etc/nginx/sites-available/ 2>/dev/null || true
    
    # Copy snippets
    cp "$NGINX_DIR/snippets/"*.conf /etc/nginx/snippets/ 2>/dev/null || true
    
    # Copy SSL certificates if they exist
    if [[ -d "$NGINX_DIR/ssl" ]]; then
        cp "$NGINX_DIR/ssl/"* /etc/nginx/ssl/ 2>/dev/null || true
    fi
    
    print_success "Configuration files copied"
}

# Enable site
enable_site() {
    local site_name=${1:-ollama-manager}
    
    print_status "Enabling site: $site_name..."
    
    # Remove default site if exists
    rm -f /etc/nginx/sites-enabled/default
    
    # Create symbolic link
    ln -sf /etc/nginx/sites-available/${site_name}.conf /etc/nginx/sites-enabled/
    
    print_success "Site $site_name enabled"
}

# Set permissions
set_permissions() {
    print_status "Setting file permissions..."
    
    chown -R root:root /etc/nginx
    chmod -R 644 /etc/nginx
    chmod 755 /etc/nginx
    chmod 755 /etc/nginx/sites-available
    chmod 755 /etc/nginx/sites-enabled
    chmod 755 /etc/nginx/snippets
    chmod 755 /etc/nginx/ssl
    chmod 600 /etc/nginx/ssl/* 2>/dev/null || true
    
    chown -R nginx:nginx /var/log/nginx 2>/dev/null || chown -R www-data:www-data /var/log/nginx 2>/dev/null || true
    
    print_success "Permissions set"
}

# Test Nginx configuration
test_config() {
    print_status "Testing Nginx configuration..."
    
    if nginx -t; then
        print_success "Nginx configuration test passed"
        return 0
    else
        print_error "Nginx configuration test failed"
        return 1
    fi
}

# Start/Restart Nginx
restart_nginx() {
    print_status "Restarting Nginx..."
    
    if command -v systemctl &> /dev/null; then
        systemctl enable nginx
        systemctl restart nginx
        systemctl status nginx --no-pager
    else
        service nginx restart
    fi
    
    print_success "Nginx restarted"
}

# Main installation
main() {
    echo "=============================================="
    echo "  Nginx Installation Script"
    echo "  Ollama Manager"
    echo "=============================================="
    echo ""
    
    check_root
    detect_os
    install_nginx
    backup_config
    create_directories
    copy_config
    enable_site "ollama-manager"
    set_permissions
    
    if test_config; then
        restart_nginx
        echo ""
        print_success "Nginx installation completed successfully!"
        echo ""
        echo "Next steps:"
        echo "  1. Update upstream server ports in /etc/nginx/nginx.conf if needed"
        echo "  2. Generate SSL certificates using ./generate-ssl.sh"
        echo "  3. Test with: curl http://localhost/"
    else
        print_error "Please fix the configuration errors and run 'sudo nginx -t' again"
        exit 1
    fi
}

# Run main function
main "$@"
