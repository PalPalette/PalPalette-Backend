#!/bin/bash

# Generate SSL certificates for development
# This script creates self-signed certificates for local HTTPS development

set -e

CERT_DIR="./ssl"
DOMAIN="localhost"

echo "🔐 Generating SSL certificates for development..."

# Create ssl directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Generate private key
openssl genrsa -out "$CERT_DIR/private-key.pem" 2048

# Generate certificate signing request
openssl req -new -key "$CERT_DIR/private-key.pem" -out "$CERT_DIR/cert.csr" -subj "/C=US/ST=Development/L=Development/O=PalPalette/OU=Development/CN=$DOMAIN"

# Generate self-signed certificate
openssl x509 -req -in "$CERT_DIR/cert.csr" -signkey "$CERT_DIR/private-key.pem" -out "$CERT_DIR/certificate.pem" -days 365 -extensions v3_req -extfile <(cat <<EOF
[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = 127.0.0.1
DNS.3 = 0.0.0.0
IP.1 = 127.0.0.1
IP.2 = ::1
EOF
)

# Clean up CSR file
rm "$CERT_DIR/cert.csr"

# Set appropriate permissions
chmod 600 "$CERT_DIR/private-key.pem"
chmod 644 "$CERT_DIR/certificate.pem"

echo "✅ SSL certificates generated successfully!"
echo "📁 Certificate files created in: $CERT_DIR/"
echo "   - certificate.pem (public certificate)"
echo "   - private-key.pem (private key)"
echo ""
echo "⚠️  Note: These are self-signed certificates for development only."
echo "   Your browser will show a security warning that you can safely bypass."
echo ""
echo "🚀 You can now start the server with HTTPS enabled by setting:"
echo "   HTTPS_ENABLED=true in your .env file"