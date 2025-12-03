#!/bin/bash

# Root Certificate Extraction Script for ESP32
DOMAIN="cides06.gm.fh-koeln.de"
CERT_OUTPUT_DIR="esp32-certs"

echo "🔐 Extracting Root Certificate for ESP32"
echo "========================================"
echo "Domain: $DOMAIN"
echo ""

# Create certificates directory
mkdir -p "$CERT_OUTPUT_DIR"

# Extract the full certificate chain
echo "📥 Downloading certificate chain..."
openssl s_client -showcerts -servername "$DOMAIN" -connect "$DOMAIN:443" < /dev/null 2>/dev/null > "$CERT_OUTPUT_DIR/chain.pem"

# Extract individual certificates from the chain
echo "🔗 Extracting individual certificates..."
cat "$CERT_OUTPUT_DIR/chain.pem" | awk 'split_after==1{n++;split_after=0} /-----END CERTIFICATE-----/ {split_after=1} {print > ("'$CERT_OUTPUT_DIR'/cert" n ".pem")}'

# The root certificate is usually the last one in the chain
ROOT_CERT_FILE=""
CERT_COUNT=$(ls -1 "$CERT_OUTPUT_DIR"/cert*.pem 2>/dev/null | wc -l)

if [ $CERT_COUNT -gt 0 ]; then
    # Find the root certificate (self-signed)
    for cert_file in "$CERT_OUTPUT_DIR"/cert*.pem; do
        if [ -s "$cert_file" ]; then
            subject=$(openssl x509 -in "$cert_file" -noout -subject 2>/dev/null)
            issuer=$(openssl x509 -in "$cert_file" -noout -issuer 2>/dev/null)
            
            if [ "$subject" = "$issuer" ]; then
                ROOT_CERT_FILE="$cert_file"
                echo "🎯 Found root certificate: $cert_file"
                break
            fi
        fi
    done
    
    # If no self-signed cert found, use the last certificate (common for Let's Encrypt)
    if [ -z "$ROOT_CERT_FILE" ]; then
        ROOT_CERT_FILE="$CERT_OUTPUT_DIR/cert$((CERT_COUNT-1)).pem"
        echo "📋 Using last certificate in chain: $ROOT_CERT_FILE"
    fi
else
    echo "❌ No certificates found in chain"
    exit 1
fi

# Copy the root certificate to a standard name
cp "$ROOT_CERT_FILE" "$CERT_OUTPUT_DIR/root_ca.pem"

# Create C header file for ESP32
echo "📝 Creating C header file for ESP32..."
cat > "$CERT_OUTPUT_DIR/root_ca.h" << EOF
#ifndef ROOT_CA_H
#define ROOT_CA_H

// Root CA certificate for HTTPS connections
// Domain: $DOMAIN
// Generated: $(date)

const char* root_ca = 
EOF

# Add the certificate content with proper C string formatting
# Each line gets quotes and \n, last line doesn't get trailing \
awk '{
    if (NR > 1) print "\"" prev "\\n\""
    prev = $0
}
END {
    if (prev) print "\"" prev "\\n\";"
}' "$CERT_OUTPUT_DIR/root_ca.pem" >> "$CERT_OUTPUT_DIR/root_ca.h"

# Close the header
cat >> "$CERT_OUTPUT_DIR/root_ca.h" << 'EOF'

#endif // ROOT_CA_H
EOF

# Show certificate info
echo ""
echo "📋 Certificate Information:"
echo "=========================="
openssl x509 -in "$CERT_OUTPUT_DIR/root_ca.pem" -noout -subject -issuer -dates

echo ""
echo "✅ Certificate extraction complete!"
echo ""
echo "📁 Files created:"
echo "   - $CERT_OUTPUT_DIR/root_ca.pem    (PEM format)"
echo "   - $CERT_OUTPUT_DIR/root_ca.h      (ESP32 C header)"
echo ""
echo "🔧 Usage in ESP32 code:"
echo '   #include "root_ca.h"'
echo '   client.setCACert(root_ca);'
echo ""

# Check certificate validity
EXPIRY=$(openssl x509 -in "$CERT_OUTPUT_DIR/root_ca.pem" -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || echo "0")
CURRENT_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))

if [ $DAYS_LEFT -gt 0 ]; then
    echo "⏰ Certificate expires in $DAYS_LEFT days ($EXPIRY)"
else
    echo "⚠️  Certificate may be expired or date parsing failed"
fi

# Clean up temporary files
rm -f "$CERT_OUTPUT_DIR"/cert*.pem "$CERT_OUTPUT_DIR/chain.pem"
