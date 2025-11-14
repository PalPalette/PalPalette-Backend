#!/bin/bash

# SSL Certificate Monitoring Script for PalPalette
# Checks certificate expiration and sends alerts

DOMAIN=${1:-"your-domain.com"}
CERT_FILE="ssl/certs/palpalette.crt"
DAYS_WARNING=30  # Warn when certificate expires in 30 days or less

echo "🔍 SSL Certificate Status for $DOMAIN"
echo "======================================"

# Check if certificate file exists
if [ ! -f "$CERT_FILE" ]; then
    echo "❌ Certificate file not found: $CERT_FILE"
    exit 1
fi

# Get certificate expiration date
EXPIRY_DATE=$(openssl x509 -enddate -noout -in "$CERT_FILE" | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))

echo "📅 Certificate expires: $EXPIRY_DATE"
echo "⏰ Days until expiration: $DAYS_LEFT"

# Check certificate chain completeness
CERT_COUNT=$(openssl crl2pkcs7 -nocrl -certfile "$CERT_FILE" | openssl pkcs7 -print_certs -noout | grep -c "subject=" || echo "0")
echo "🔗 Certificate chain contains: $CERT_COUNT certificates"

if [ "$CERT_COUNT" -lt 2 ]; then
    echo "⚠️  WARNING: Certificate chain may be incomplete (iOS devices may fail to connect)"
    echo "Expected: 2+ certificates (domain + intermediate + optional root)"
else
    echo "✅ Certificate chain appears complete"
fi

# Test SSL connectivity
echo "🔍 Testing SSL connectivity..."
if openssl s_client -connect "$DOMAIN:443" -verify_return_error < /dev/null 2>/dev/null; then
    echo "✅ SSL connection test passed"
else
    echo "❌ SSL connection test failed - iOS devices will likely fail to connect"
fi

if [ $DAYS_LEFT -lt 0 ]; then
    echo "🚨 CRITICAL: Certificate has EXPIRED!"
    echo "Run immediately: ./renew-ssl.sh $DOMAIN"
    exit 2
elif [ $DAYS_LEFT -lt $DAYS_WARNING ]; then
    echo "⚠️  WARNING: Certificate expires in $DAYS_LEFT days"
    echo "Consider running: ./renew-ssl.sh $DOMAIN"
    exit 1
else
    echo "✅ Certificate is valid ($DAYS_LEFT days remaining)"
fi

# Check if auto-renewal cron job is installed
if crontab -l 2>/dev/null | grep -q "renew-ssl.sh"; then
    echo "✅ Auto-renewal cron job is installed"
else
    echo "⚠️  Auto-renewal cron job not found"
    echo "Run: ./deploy.sh $DOMAIN to set it up"
fi

# Show last renewal attempt
if [ -f "/var/log/palpalette-ssl-renewal.log" ]; then
    echo ""
    echo "📝 Last renewal log entries:"
    tail -5 /var/log/palpalette-ssl-renewal.log
fi