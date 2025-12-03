#!/bin/bash
# =============================================================================
# SSL Certificate Generation Script
# Supports Self-Signed and Let's Encrypt certificates
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

# Default values
SSL_DIR="/etc/nginx/ssl"
DOMAIN="localhost"
CERT_DAYS=365
KEY_SIZE=4096

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --days)
            CERT_DAYS="$2"
            shift 2
            ;;
        --type)
            CERT_TYPE="$2"
            shift 2
            ;;
        --email)
            EMAIL="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --domain DOMAIN    Domain name (default: localhost)"
            echo "  --days DAYS        Certificate validity in days (default: 365)"
            echo "  --type TYPE        Certificate type: self-signed or letsencrypt"
            echo "  --email EMAIL      Email for Let's Encrypt notifications"
            echo ""
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Create SSL directory
mkdir -p "$SSL_DIR"

# Generate Self-Signed Certificate
generate_self_signed() {
    print_status "Generating self-signed SSL certificate for $DOMAIN..."
    
    # Generate private key
    openssl genrsa -out "$SSL_DIR/server.key" $KEY_SIZE
    
    # Create certificate signing request (CSR)
    openssl req -new -key "$SSL_DIR/server.key" \
        -out "$SSL_DIR/server.csr" \
        -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=$DOMAIN"
    
    # Create configuration file for SAN
    cat > "$SSL_DIR/openssl.cnf" << EOF
[req]
default_bits = $KEY_SIZE
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[dn]
C = US
ST = State
L = City
O = Organization
OU = Unit
CN = $DOMAIN

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = *.$DOMAIN
DNS.3 = localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF
    
    # Generate self-signed certificate
    openssl x509 -req -days $CERT_DAYS \
        -in "$SSL_DIR/server.csr" \
        -signkey "$SSL_DIR/server.key" \
        -out "$SSL_DIR/server.crt" \
        -extensions req_ext \
        -extfile "$SSL_DIR/openssl.cnf"
    
    # Set permissions
    chmod 600 "$SSL_DIR/server.key"
    chmod 644 "$SSL_DIR/server.crt"
    
    # Cleanup
    rm -f "$SSL_DIR/server.csr" "$SSL_DIR/openssl.cnf"
    
    print_success "Self-signed certificate generated!"
    echo ""
    echo "Certificate: $SSL_DIR/server.crt"
    echo "Private Key: $SSL_DIR/server.key"
    echo ""
    print_warning "Note: Self-signed certificates will show browser warnings."
    print_warning "For production, use Let's Encrypt certificates."
}

# Generate DH Parameters
generate_dhparam() {
    print_status "Generating DH parameters (this may take a few minutes)..."
    
    if [[ ! -f "$SSL_DIR/dhparam.pem" ]]; then
        openssl dhparam -out "$SSL_DIR/dhparam.pem" 2048
        chmod 644 "$SSL_DIR/dhparam.pem"
        print_success "DH parameters generated: $SSL_DIR/dhparam.pem"
    else
        print_warning "DH parameters already exist, skipping..."
    fi
}

# Install and configure Let's Encrypt
setup_letsencrypt() {
    if [[ -z "$EMAIL" ]]; then
        print_error "Email is required for Let's Encrypt. Use --email option."
        exit 1
    fi
    
    if [[ "$DOMAIN" == "localhost" ]]; then
        print_error "Let's Encrypt requires a valid domain name, not localhost."
        exit 1
    fi
    
    print_status "Setting up Let's Encrypt for $DOMAIN..."
    
    # Install certbot
    if command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    elif command -v yum &> /dev/null; then
        yum install -y certbot python3-certbot-nginx
    elif command -v dnf &> /dev/null; then
        dnf install -y certbot python3-certbot-nginx
    else
        print_error "Please install certbot manually."
        exit 1
    fi
    
    # Obtain certificate
    certbot --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive
    
    # Setup auto-renewal
    if command -v systemctl &> /dev/null; then
        systemctl enable certbot.timer
        systemctl start certbot.timer
    else
        # Add cron job for renewal
        (crontab -l 2>/dev/null; echo "0 0,12 * * * certbot renew --quiet") | crontab -
    fi
    
    print_success "Let's Encrypt certificate obtained!"
    echo ""
    echo "Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    echo "Private Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
    echo ""
    echo "Auto-renewal has been configured."
}

# Main function
main() {
    echo "=============================================="
    echo "  SSL Certificate Generator"
    echo "=============================================="
    echo ""
    
    # Check if running as root for system directories
    if [[ "$SSL_DIR" == "/etc/nginx/ssl" ]] && [[ $EUID -ne 0 ]]; then
        print_warning "Not running as root. Using local nginx/ssl directory."
        SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
        SSL_DIR="$(dirname "$SCRIPT_DIR")/ssl"
        mkdir -p "$SSL_DIR"
    fi
    
    case "${CERT_TYPE:-self-signed}" in
        self-signed|self)
            generate_self_signed
            generate_dhparam
            ;;
        letsencrypt|le)
            setup_letsencrypt
            ;;
        *)
            print_error "Unknown certificate type: $CERT_TYPE"
            echo "Valid types: self-signed, letsencrypt"
            exit 1
            ;;
    esac
    
    echo ""
    print_status "Don't forget to update your Nginx configuration to use the new certificates!"
    print_status "Then run: sudo nginx -t && sudo systemctl reload nginx"
}

main "$@"
